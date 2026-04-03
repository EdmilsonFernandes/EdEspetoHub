import { env } from '../../../config/env';
import { AppError } from '../../../errors/AppError';
import { logger } from '../../../utils/logger';
import { ShippingQuoteProviderInput, ShippingQuoteResult } from '../types';
import { ShippingQuoteProvider } from './ShippingQuoteProvider';

type MelhorEnvioService = {
  id?: number | string;
  name?: string;
  price?: number | string;
  custom_price?: number | string;
  delivery_time?: number | string;
  currency?: string;
  company?: {
    name?: string;
  };
  error?: string;
};

export class MelhorEnvioShippingQuoteProvider implements ShippingQuoteProvider {
  readonly name = 'melhor_envio';
  private log = logger.child({ scope: 'MelhorEnvioShippingQuoteProvider' });
  private accessToken = env.melhorEnvio.accessToken || '';

    /**
   * Executes is configured business logic.
   *
   * @author Edmilson Lopes
   */
isConfigured() {
    return Boolean(
      this.accessToken ||
        (env.melhorEnvio.clientId && env.melhorEnvio.clientSecret && env.melhorEnvio.refreshToken)
    );
  }

    /**
   * Executes parse price business logic.
   *
   * @author Edmilson Lopes
   */
private parsePrice(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : 0;
  }

    /**
   * Executes parse days business logic.
   *
   * @author Edmilson Lopes
   */
private parseDays(value: unknown) {
    const parsed = Math.floor(Number(value));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

    /**
   * Executes refresh token business logic.
   *
   * @author Edmilson Lopes
   */
private async refreshToken() {
    if (!env.melhorEnvio.clientId || !env.melhorEnvio.clientSecret || !env.melhorEnvio.refreshToken) {
      return false;
    }

    const baseUrl = env.melhorEnvio.baseUrl.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: env.melhorEnvio.clientId,
        client_secret: env.melhorEnvio.clientSecret,
        refresh_token: env.melhorEnvio.refreshToken,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.log.warn('Melhor Envio token refresh failed', { status: response.status, body });
      return false;
    }

    const payload = (await response.json().catch(() => ({}))) as { access_token?: string };
    if (!payload?.access_token) return false;
    this.accessToken = payload.access_token;
    this.log.info('Melhor Envio token refreshed');
    return true;
  }

    /**
   * Executes call quote business logic.
   *
   * @author Edmilson Lopes
   */
private async callQuote(input: ShippingQuoteProviderInput, retryOnUnauthorized = true): Promise<MelhorEnvioService[]> {
    const baseUrl = env.melhorEnvio.baseUrl.replace(/\/+$/, '');
    const products = input.items.map((item, index) => ({
      id: item.productId || `item-${index + 1}`,
      width: Math.max(1, Number(item.widthCm || 0)),
      height: Math.max(1, Number(item.heightCm || 0)),
      length: Math.max(1, Number(item.lengthCm || 0)),
      weight: Number((Math.max(1, Number(item.weightG || 0)) / 1000).toFixed(3)),
      insurance_value: 0,
      quantity: Math.max(1, Number(item.quantity || 1)),
    }));

    const response = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'JanoCaminho/1.0',
      },
      body: JSON.stringify({
        from: { postal_code: input.originZip },
        to: { postal_code: input.destinationZip },
        products,
        options: {
          receipt: false,
          own_hand: false,
          collect: false,
        },
        services: '1,2',
      }),
    });

    if (response.status === 401 && retryOnUnauthorized) {
      const refreshed = await this.refreshToken();
      if (refreshed) return this.callQuote(input, false);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new AppError('ORDER-004', 502, {
        message: 'Falha ao consultar frete no provedor externo.',
        provider: this.name,
        status: response.status,
        raw: body.slice(0, 400),
      });
    }

    return (await response.json().catch(() => [])) as MelhorEnvioService[];
  }

    /**
   * Calculates values for quote.
   *
   * @author Edmilson Lopes
   */
async quote(input: ShippingQuoteProviderInput): Promise<ShippingQuoteResult> {
    if (!this.accessToken && !(await this.refreshToken())) {
      throw new AppError('ORDER-004', 400, {
        message: 'Credenciais de frete postal não configuradas.',
        provider: this.name,
      });
    }

    const payload = await this.callQuote(input);
    const normalized = (Array.isArray(payload) ? payload : [])
      .filter((service) => !service?.error)
      .map((service) => {
        const serviceCode = String(service?.id || '').trim();
        const serviceName = String(service?.name || service?.company?.name || serviceCode || 'Serviço');
        const price = this.parsePrice(service?.custom_price ?? service?.price);
        const estimatedDays = this.parseDays(service?.delivery_time);
        return {
          serviceCode,
          serviceName,
          price,
          estimatedDays,
          currency: String(service?.currency || 'BRL'),
        };
      })
      .filter((service) => service.serviceCode && service.price > 0)
      .sort((a, b) => a.price - b.price);

    if (!normalized.length) {
      throw new AppError('ORDER-004', 502, {
        message: 'Provedor não retornou serviços válidos para essa rota.',
        provider: this.name,
      });
    }

    return {
      provider: this.name,
      services: normalized,
    };
  }
}
