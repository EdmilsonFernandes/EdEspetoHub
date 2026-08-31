import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';
import { StorePaymentAccountService } from './StorePaymentAccountService';

export type PointTerminal = {
  id: string;
  serialNumber: string | null;
  posId: string | null;
  mpStoreId: string | null;
  externalPosId: string | null;
  operatingMode: string;
  /** true somente em modo PDV — único modo que aceita integração via API */
  integrationReady: boolean;
};

/**
 * Extrai o número de série físico do id do terminal.
 * Formato do MP: `{MODELO}__{SERIAL}` (ex.: `NEWLAND_N950__N950NCB801293324`) —
 * o serial bate com a etiqueta traseira da maquininha.
 */
export const terminalSerial = (id: string): string | null => {
  const parts = String(id || '').split('__');
  const serial = parts.length >= 2 ? parts[parts.length - 1] : '';
  return serial || null;
};

/**
 * Normaliza a resposta de `GET /terminals/v1/list`.
 * Tolera forma ausente/estranha sem explodir (terminal novo, campo do MP renomeado).
 */
export const normalizeTerminalList = (body: any): PointTerminal[] => {
  const rows = Array.isArray(body?.data?.terminals) ? body.data.terminals : [];
  return rows
    .filter((terminal: any) => Boolean(terminal?.id))
    .map((terminal: any) => ({
      id: String(terminal.id),
      serialNumber: terminalSerial(String(terminal.id)),
      posId: terminal.pos_id != null ? String(terminal.pos_id) : null,
      mpStoreId: terminal.store_id != null ? String(terminal.store_id) : null,
      externalPosId: terminal.external_pos_id != null ? String(terminal.external_pos_id) : null,
      operatingMode: String(terminal.operating_mode || 'UNDEFINED'),
      integrationReady: String(terminal.operating_mode || '').toUpperCase() === 'PDV',
    }));
};

export class MercadoPagoPointService {
  private accounts = new StorePaymentAccountService();
  private log = logger.child({ scope: 'MercadoPagoPointService' });

  /**
   * Lista as maquininhas Point da conta Mercado Pago conectada da loja.
   * Sempre com o token OAuth do lojista (a maquininha pertence à conta dele).
   */
  async listTerminals(storeId: string, authStoreId?: string) {
    if (authStoreId && authStoreId !== storeId) throw new AppError('AUTH-003', 403);

    const accessToken = await this.accounts.getActiveAccessToken(storeId);
    if (!accessToken) {
      throw new AppError('PAY-017', 400, {
        message: 'Conecte a conta Mercado Pago da loja antes de listar maquininhas Point.',
      });
    }

    let response: Response;
    try {
      response = await fetch(`${env.mercadoPago.apiBaseUrl}/terminals/v1/list?limit=50&offset=0`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (error: any) {
      this.log.warn('Point terminals request failed', { storeId, error: error?.message });
      throw new AppError('PAY-018', 502, {
        message: 'Não foi possível falar com o Mercado Pago agora. Tente novamente em instantes.',
      });
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      this.log.warn('Point terminals list rejected', {
        storeId,
        status: response.status,
        body: bodyText.slice(0, 400),
      });
      // 403 aqui em geral = escopo "In-store Terminal List" ausente no token:
      // permissão foi adicionada à app DEPOIS da conexão — lojista precisa reconectar.
      const permissionHint =
        response.status === 403
          ? ' A conta conectada pode estar sem permissão de terminais — desconecte e reconecte o Mercado Pago da loja.'
          : '';
      throw new AppError('PAY-018', 502, {
        message: `Mercado Pago recusou listar maquininhas (HTTP ${response.status}).${permissionHint}`,
      });
    }

    const body = await response.json().catch(() => null);
    return {
      connected: true,
      terminals: normalizeTerminalList(body),
      paging: body?.paging || null,
    };
  }

  /**
   * Cria cobrança na maquininha (Orders API, type=point) — REQ-6.
   * Crédito/débito/parcelas o cliente escolhe NO terminal (design D3).
   * Expira em 5 min (REQ-5/11) — MP auto-cancela order expiradas.
   *
   * Schema da Orders API (validado em prod 31/08): `amount` é STRING com 2
   * decimais; `description` NÃO é aceito em transactions.payments; e
   * `external_reference` tem pattern que rejeita ':' — o prefixo
   * `order_payment:` vira `order-payment-` aqui (webhook casa por
   * provider_order_id, então o formato da reference não afeta o reconcile).
   */
  async createPointCharge(input: {
    storeId: string;
    accessToken: string;
    amount: number;
    terminalId: string;
    externalReference: string;
    /** Pré-seleciona a forma no terminal (Orders API config.payment_method.
     *  default_type: debit_card | credit_card | qr). Omitir = terminal
     *  pergunta ao cliente (fluxo padrão da maquininha). */
    paymentType?: 'debit_card' | 'credit_card' | 'qr';
    /** Componente único POR TENTATIVA da idempotency-key (bug de prod 31/08:
     *  recobrar o mesmo pedido com o mesmo valor reusava a key da cobrança
     *  morta e o MP recusava com 409). Caller passa o expiresAt novo da linha. */
    idempotencyToken?: string;
  }): Promise<{ orderId: string; status: string; expiresAt: Date }> {
    const idempotencyKey = `point:${input.externalReference}:${Math.round(input.amount * 100)}:${input.idempotencyToken || 'v1'}`;
    const externalReference = String(input.externalReference).replace(/[:_]/g, '-');
    let response: Response;
    try {
      response = await fetch(`${env.mercadoPago.apiBaseUrl}/v1/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          type: 'point',
          external_reference: externalReference,
          expiration_time: 'PT5M',
          transactions: {
            payments: [{ amount: input.amount.toFixed(2) }],
          },
          config: {
            point: {
              terminal_id: input.terminalId,
              // Comprovante: sempre imprimir a via do vendedor. A Orders API
              // até tem seller_ticket como default, mas deixamos explícito —
              // comprovante parou de sair em terminal de prod (31/08) e não
              // dependemos de default remoto.
              // (ticket_number foi rejeitado pelo schema real: "additionalProperties
              // 'ticket_number' not allowed" — a doc de migração cita o campo,
              // mas a API em produção não o aceita em config.point.)
              print_on_terminal: 'seller_ticket',
            },
            ...(input.paymentType
              ? { payment_method: { default_type: input.paymentType } }
              : {}),
          },
        }),
      });
    } catch (error: any) {
      this.log.warn('Point charge request failed', { storeId: input.storeId, error: error?.message });
      throw new AppError('PAY-018', 502, {
        message: 'Não foi possível falar com o Mercado Pago agora. Tente novamente.',
      });
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      this.log.warn('Point charge rejected', {
        storeId: input.storeId,
        status: response.status,
        body: bodyText.slice(0, 400),
      });
      const hint =
        response.status === 403
          ? ' A conta conectada pode estar sem permissão — desconecte e reconecte o Mercado Pago da loja.'
          : response.status === 404
            ? ' Maquininha não encontrada — confira se o terminal está no modo PDV.'
            : '';
      throw new AppError('PAY-018', 502, {
        message: `Mercado Pago recusou a cobrança na maquininha (HTTP ${response.status}).${hint}`,
      });
    }

    const order: any = await response.json().catch(() => null);
    const orderId = String(order?.id || '');
    if (!orderId) {
      throw new AppError('PAY-018', 502, { message: 'Mercado Pago não retornou o id da cobrança.' });
    }
    return {
      orderId,
      status: String(order?.status || 'OPEN'),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };
  }

  /** Consulta a order Point no MP (reconcile REQ-21 / webhook REQ-8). */
  async getPointOrder(accessToken: string, mpOrderId: string): Promise<any> {
    let response: Response;
    try {
      response = await fetch(`${env.mercadoPago.apiBaseUrl}/v1/orders/${encodeURIComponent(mpOrderId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (error: any) {
      this.log.warn('Point order lookup failed', { mpOrderId, error: error?.message });
      return null;
    }
    if (!response.ok) {
      this.log.warn('Point order lookup rejected', { mpOrderId, status: response.status });
      return null;
    }
    return response.json().catch(() => null);
  }

  /**
   * Imprime conteúdo custom na maquininha (API de ações do terminal —
   * POST /terminals/v1/actions, type=print, subtype=custom). Best-effort:
   * terminal offline/expirado não bloqueia nada — ação morre no MP sozinha.
   * content: 100–4096 chars, tags {b} {w} {s} {br} {center} {qr} {pdf417}.
   */
  async printTerminalAction(input: {
    storeId: string;
    accessToken: string;
    terminalId: string;
    externalReference: string;
    content: string;
  }): Promise<boolean> {
    if (input.content.length < 100 || input.content.length > 4096) {
      this.log.warn('Point print action invalid content length', {
        storeId: input.storeId,
        len: input.content.length,
      });
      return false;
    }
    const reference = String(input.externalReference).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    try {
      const response = await fetch(`${env.mercadoPago.apiBaseUrl}/terminals/v1/actions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `print:${reference}`,
        },
        body: JSON.stringify({
          type: 'print',
          external_reference: reference,
          config: { point: { terminal_id: input.terminalId, subtype: 'custom' } },
          content: input.content,
        }),
      });
      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        this.log.warn('Point print action rejected', {
          storeId: input.storeId,
          status: response.status,
          body: bodyText.slice(0, 200),
        });
        return false;
      }
      return true;
    } catch (error: any) {
      this.log.warn('Point print action failed', { storeId: input.storeId, error: error?.message });
      return false;
    }
  }

  /** Cancela a order Point (REQ-18) — best-effort; expirada cancela sozinha no MP. */
  async cancelPointCharge(accessToken: string, mpOrderId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${env.mercadoPago.apiBaseUrl}/v1/orders/${encodeURIComponent(mpOrderId)}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': `pointcancel:${mpOrderId}`,
          },
        }
      );
      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        this.log.warn('Point charge cancel rejected', { mpOrderId, status: response.status, body: bodyText.slice(0, 200) });
        return false;
      }
      return true;
    } catch (error: any) {
      this.log.warn('Point charge cancel failed', { mpOrderId, error: error?.message });
      return false;
    }
  }
}
