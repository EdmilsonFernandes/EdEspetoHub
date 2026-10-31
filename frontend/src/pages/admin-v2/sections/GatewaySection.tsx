// Pagamentos online V2 — representação FIEL do estado real do gateway:
// status via getMercadoPagoAccount (connected/oauthConfigured/validation).
// MP indisponível aparece como pendente, nunca como disponível. OAuth usa os
// mesmos endpoints da V1; Point terminals idem.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlugsConnected } from '@phosphor-icons/react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { storeService } from '../../../services/storeService';
import { formatDateTime } from '../../../utils/format';
import { Badge } from '../../../components/reui/badge';
import { Button } from '../../../components/ui/Button';
import { FramePanel } from '../../../components/reui/frame';
import { cn } from '@/lib/utils';
import { V2ErrorRegion, V2LoadingRegion } from '../v2ui';

const CAPABILITY_LABEL: Record<string, string> = {
  pix: 'Pix',
  credit: 'Crédito online',
  debit: 'Débito online',
};

export const GatewaySection = () => {
  const { auth } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const storeId = String(auth?.store?.id || '');

  const [account, setAccount] = useState<any | null>(null);
  const [terminals, setTerminals] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const load = useCallback(() => {
    if (!storeId) return;
    setLoading(true);
    setError(false);
    storeService
      .getMercadoPagoAccount(storeId)
      .then((data: any) => {
        setAccount(data || {});
        return storeService.getPointTerminals(storeId).catch(() => null);
      })
      .then((terminalsData: any) => {
        setTerminals(Array.isArray(terminalsData?.terminals) ? terminalsData.terminals : []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load]);

  // Retorno OAuth: ?paymentAccount=connected|error (mesmo contrato da V1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = String(params.get('paymentAccount') || '').trim();
    if (!flag) return;
    if (flag === 'connected') showToast('Mercado Pago conectado com sucesso.', 'success');
    else showToast('Não foi possível conectar o Mercado Pago. Tente novamente.', 'error');
    params.delete('paymentAccount');
    const rest = params.toString();
    navigate(`${location.pathname}${rest ? `?${rest}` : ''}`, { replace: true });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connected = Boolean(account?.connected);
  const oauthConfigured = Boolean(account?.oauthConfigured);
  const validation = account?.validation || null;
  const overall = String(validation?.overallStatus || '').toUpperCase();

  const status = !oauthConfigured
    ? { label: 'Conexão pendente', tone: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400', hint: 'A conexão com o Mercado Pago ainda não foi configurada para a sua loja.' }
    : connected
      ? overall === 'READY'
        ? { label: 'Conectado e validado', tone: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', hint: 'Recebendo pagamentos online normalmente.' }
        : { label: 'Conectado', tone: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400', hint: overall === 'ERROR' ? 'Conectado com problemas na validação — confira abaixo.' : 'Conectado; confira as capacidades abaixo.' }
      : { label: 'Não conectado', tone: 'border-border bg-muted text-muted-foreground', hint: 'Conecte o Mercado Pago para receber Pix, crédito e débito online.' };

  const capabilities = useMemo(
    () =>
      ['pix', 'credit', 'debit'].map((key) => ({
        key,
        label: CAPABILITY_LABEL[key],
        available: Boolean(validation?.[key]?.available),
      })),
    [validation]
  );

  const connect = async () => {
    if (!storeId) return;
    setConnecting(true);
    try {
      const result: any = await storeService.createMercadoPagoConnectUrl(storeId);
      const url = String(result?.url || result?.connectUrl || '').trim();
      if (!url) throw new Error('Não recebemos o link de conexão. Tente novamente.');
      window.location.href = url;
    } catch (err: any) {
      showToast(String(err?.message || 'Não foi possível iniciar a conexão.'), 'error');
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!storeId) return;
    setDisconnecting(true);
    try {
      await storeService.disconnectMercadoPago(storeId);
      showToast('Mercado Pago desconectado.', 'success');
      load();
    } catch (err: any) {
      showToast(String(err?.message || 'Não foi possível desconectar.'), 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
      {loading ? (
        <V2LoadingRegion rows={3} />
      ) : error ? (
        <V2ErrorRegion message="Não foi possível carregar o estado do gateway." onRetry={load} />
      ) : (
        <>
          <FramePanel className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <PlugsConnected className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight">Mercado Pago</h2>
                    <Badge className={cn(status.tone, 'border')}>{status.label}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 max-w-lg text-sm">{status.hint}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {connected ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={disconnecting}
                    onClick={disconnect}
                  >
                    Desconectar
                  </Button>
                ) : (
                  oauthConfigured && (
                    <Button type="button" size="sm" loading={connecting} onClick={connect}>
                      Conectar Mercado Pago
                    </Button>
                  )
                )}
              </div>
            </div>
            {validation?.checkedAt && (
              <p className="text-muted-foreground text-xs">
                Última validação: {formatDateTime(validation.checkedAt)}
                {validation?.credentialMode ? ` · modo ${String(validation.credentialMode)}` : ''}
              </p>
            )}
          </FramePanel>

          {connected && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {capabilities.map((capability) => (
                <FramePanel key={capability.key} className="flex items-center justify-between gap-2 p-4">
                  <span className="text-sm font-medium">{capability.label}</span>
                  <Badge
                    className={
                      capability.available
                        ? 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'border-border bg-muted text-muted-foreground'
                    }
                  >
                    {capability.available ? 'Disponível' : 'Indisponível'}
                  </Badge>
                </FramePanel>
              ))}
            </div>
          )}

          {validation?.notes && (
            <FramePanel className="p-4">
              <h3 className="text-sm font-semibold">Observações da validação</h3>
              <p className="text-muted-foreground mt-1 text-sm">{String(validation.notes)}</p>
            </FramePanel>
          )}

          <FramePanel className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Maquininhas Point</h3>
              <Badge variant="outline" className="text-muted-foreground border-border">
                {terminals?.length ?? 0} {terminals?.length === 1 ? 'aparelho' : 'aparelhos'}
              </Badge>
            </div>
            {terminals === null ? (
              <V2LoadingRegion rows={1} />
            ) : terminals.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhuma maquininha vinculada. Vincule pelo app do Mercado Pago para cobrar no balcão.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {terminals.map((terminal: any, index: number) => (
                  <li key={terminal?.id ?? index} className="flex items-center justify-between gap-2 py-2.5">
                    <span className="min-w-0 truncate text-sm font-medium">
                      {String(terminal?.name || terminal?.id || `Point ${index + 1}`)}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {String(terminal?.status || '')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </FramePanel>
        </>
      )}
    </div>
  );
};
