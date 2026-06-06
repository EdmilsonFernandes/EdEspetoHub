import { env } from '../../../config/env';
import { normalizeTrackingCode } from './trackingCode';
import {
  ShippingTrackingEventInput,
  ShippingTrackingProvider,
  ShippingTrackingProviderInput,
  ShippingTrackingProviderResult,
  ShippingTrackingStatus,
} from './types';

const TRACK_ENDPOINT = '/Track';

const asRecord = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};

const parseEmbeddedJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const expandEmbeddedJson = (value: unknown, seen = new Set<unknown>()): unknown => {
  const parsed = parseEmbeddedJson(value);
  if (!parsed || typeof parsed !== 'object') return parsed;
  if (seen.has(parsed)) return parsed;
  seen.add(parsed);

  if (Array.isArray(parsed)) {
    return parsed.map((item) => expandEmbeddedJson(item, seen));
  }

  const record = parsed as Record<string, any>;
  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => [key, expandEmbeddedJson(entry, seen)])
  );
};

const pickString = (source: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    const value = source[key];
    if (value === null || value === undefined) continue;
    if (typeof value === 'object') continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return '';
};

const pickDateTimeString = (source: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    const value = source[key];
    if (value === null || value === undefined) continue;
    if (typeof value === 'object') {
      const record = asRecord(value);
      const nested = pickString(record, ['date', 'datetime', 'dateTime', 'createdAt', 'updatedAt']);
      if (nested) return nested;
      continue;
    }
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return '';
};

const pickLocation = (source: Record<string, any>) => {
  const direct = pickString(source, ['location', 'local', 'city', 'cidade', 'place']);
  if (direct) return direct;

  const unidade = asRecord(source.unidade);
  const endereco = asRecord(unidade.endereco);
  const city = pickString(endereco, ['cidade']);
  const uf = pickString(endereco, ['uf']);
  if (city && uf) return `${city} / ${uf}`;
  if (city) return city;

  return [pickString(unidade, ['nome', 'tipo']), pickString(endereco, ['bairro'])]
    .filter(Boolean)
    .join(' - ');
};

const parseBrazilianDateTime = (date: string, time?: string) => {
  const normalizedDate = String(date || '').trim();
  if (!normalizedDate) return null;

  const dateTime = `${normalizedDate}${time ? ` ${time}` : ''}`.trim();
  const isoCandidate = new Date(dateTime);
  if (Number.isFinite(isoCandidate.getTime())) return isoCandidate.toISOString();

  const match = dateTime.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;

  const [, day, month, year, hour = '00', minute = '00', second = '00'] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
};

const normalizeStatus = (event: Record<string, any>): ShippingTrackingStatus => {
  const text = [
    pickString(event, ['status', 'type', 'event', 'title', 'descricao', 'description', 'message']),
    pickString(event, ['subStatus', 'detail', 'details', 'observacao', 'observation']),
  ]
    .join(' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  if (text.includes('entregue') || text.includes('objeto entregue')) return 'delivered';
  if (text.includes('saiu para entrega') || text.includes('em rota de entrega')) return 'out_for_delivery';
  if (text.includes('aguardando retirada') || text.includes('retirada em uma unidade')) return 'awaiting_pickup';
  if (text.includes('tentativa') || text.includes('entrega nao efetuada') || text.includes('carteiro nao atendido')) return 'delivery_attempt';
  if (text.includes('postado') || text.includes('coletado') || text.includes('objeto recebido pelos correios')) return 'posted';
  if (text.includes('encaminhado') || text.includes('transito') || text.includes('transferencia')) return 'in_transit';
  if (
    text.includes('atras') ||
    text.includes('devolvido') ||
    text.includes('extraviado') ||
    text.includes('fiscalizacao') ||
    text.includes('recusado') ||
    text.includes('falha')
  ) {
    return 'exception';
  }
  return 'in_transit';
};

const findEventArrays = (payload: unknown): Record<string, any>[][] => {
  const found: Record<string, any>[][] = [];
  const seen = new Set<unknown>();

  const visit = (value: unknown) => {
    value = parseEmbeddedJson(value);
    if (!value || seen.has(value)) return;
    if (typeof value === 'object') seen.add(value);

    if (Array.isArray(value)) {
      const objectItems = value.map(asRecord).filter((item) => Object.keys(item).length > 0);
      if (
        objectItems.length &&
        objectItems.some((item) =>
          Boolean(
            pickString(item, ['status', 'event', 'title', 'descricao', 'description', 'message']) ||
            pickString(item, ['date', 'data', 'datetime', 'dateTime', 'createdAt'])
          )
        )
      ) {
        found.push(objectItems);
      }
      value.forEach(visit);
      return;
    }

    const record = asRecord(value);
    Object.values(record).forEach(visit);
  };

  visit(payload);
  return found;
};

export const mapSiteRastreioPayloadToEvents = (payload: unknown): ShippingTrackingEventInput[] => {
  const normalizedPayload = expandEmbeddedJson(payload);
  const eventArrays = findEventArrays(normalizedPayload);
  const events = eventArrays[0] || [];

  return events
    .map((raw) => {
      const title =
        pickString(raw, ['status', 'title', 'event', 'descricao', 'description', 'message']) ||
        'Atualização da transportadora';
      const detail = pickString(raw, ['subStatus', 'detail', 'details', 'observacao', 'observation']);
      const location = pickLocation(raw);
      const eventAt =
        parseBrazilianDateTime(
          pickDateTimeString(raw, ['dtHrCriado', 'dateTime', 'datetime', 'createdAt', 'updatedAt', 'dataHora']) ||
          pickString(raw, ['date', 'data']),
          pickString(raw, ['time', 'hora'])
        ) || new Date().toISOString();

      return {
        source: 'carrier' as const,
        status: normalizeStatus(raw),
        title,
        description: detail || null,
        location: location || null,
        eventAt,
        rawPayload: raw,
      };
    })
    .filter((event) => event.title);
};

const getProviderPayloadMessage = (payload: unknown) => {
  const seen = new Set<unknown>();
  const visit = (value: unknown): string => {
    const expanded = expandEmbeddedJson(value);
    if (!expanded || typeof expanded !== 'object' || seen.has(expanded)) return '';
    seen.add(expanded);

    if (Array.isArray(expanded)) {
      for (const item of expanded) {
        const message = visit(item);
        if (message) return message;
      }
      return '';
    }

    const record = asRecord(expanded);
    if (record.erro || record.error || record.message || record.mensagem) {
      return pickString(record, ['mensagem', 'message', 'error', 'code']) || 'provider_unavailable';
    }

    for (const entry of Object.values(record)) {
      const message = visit(entry);
      if (message) return message;
    }
    return '';
  };

  return visit(payload);
};

export class SiteRastreioTrackingProvider implements ShippingTrackingProvider {
  readonly name = 'siterastreio';

  isConfigured() {
    return Boolean(String(env.shipping.siteRastreioApiKey || '').trim());
  }

  async fetchTracking(input: ShippingTrackingProviderInput): Promise<ShippingTrackingProviderResult> {
    const trackingCode = normalizeTrackingCode(input.trackingCode);
    if (!trackingCode) {
      return {
        provider: this.name,
        status: 'tracking_unavailable',
        events: [],
        unavailableReason: 'missing_tracking_code',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.shipping.siteRastreioTimeoutMs);

    try {
      const response = await fetch(`${String(env.shipping.siteRastreioBaseUrl).replace(/\/+$/, '')}${TRACK_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Apikey ${env.shipping.siteRastreioApiKey}`,
        },
        body: JSON.stringify({ code: trackingCode }),
        signal: controller.signal,
      });

      const text = await response.text();
      let payload: unknown = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = { raw: text };
      }

      if (!response.ok) {
        const record = asRecord(payload);
        const message = pickString(record, ['message', 'error', 'code']) || `http_${response.status}`;
        return {
          provider: this.name,
          status: 'tracking_unavailable',
          events: [],
          unavailableReason: message,
        };
      }

      const events = mapSiteRastreioPayloadToEvents(payload);
      const providerMessage = getProviderPayloadMessage(payload);
      return {
        provider: this.name,
        status: events[0]?.status || (providerMessage ? 'tracking_unavailable' : 'posted'),
        events,
        unavailableReason: events.length ? null : providerMessage || 'empty_tracking_events',
      };
    } catch (error: any) {
      return {
        provider: this.name,
        status: 'tracking_unavailable',
        events: [],
        unavailableReason: error?.name === 'AbortError' ? 'provider_timeout' : 'provider_error',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
