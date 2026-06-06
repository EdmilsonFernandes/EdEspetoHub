import { EntityManager, IsNull } from 'typeorm';
import { env } from '../../../config/env';
import { AppDataSource } from '../../../config/database';
import { Order } from '../../../entities/Order';
import { OrderShipment } from '../../../entities/OrderShipment';
import { OrderShipmentEvent } from '../../../entities/OrderShipmentEvent';
import { logger } from '../../../utils/logger';
import { appendOrderTimelineEntry } from '../../../utils/orderTimeline';
import { ManualShippingTrackingProvider } from './ManualShippingTrackingProvider';
import { SiteRastreioTrackingProvider } from './SiteRastreioTrackingProvider';
import { ShippingTrackingEventInput, ShippingTrackingProvider } from './types';

const EVENT_LABELS: Record<string, { label: string; description: string }> = {
  tracking_code_added: {
    label: 'Código de rastreio informado',
    description: 'A loja informou o código para acompanhamento do envio.',
  },
  tracking_code_updated: {
    label: 'Código de rastreio atualizado',
    description: 'A loja atualizou os dados de rastreio do pedido.',
  },
  pending_posting: {
    label: 'Aguardando postagem',
    description: 'A loja está preparando o pedido para enviar pelos Correios.',
  },
  posted: {
    label: 'Pedido postado',
    description: 'O pedido foi entregue aos Correios pela loja.',
  },
  in_transit: {
    label: 'Em trânsito',
    description: 'A encomenda está a caminho do endereço informado.',
  },
  out_for_delivery: {
    label: 'Saiu para entrega',
    description: 'A encomenda saiu para entrega ao destinatário.',
  },
  awaiting_pickup: {
    label: 'Aguardando retirada',
    description: 'A encomenda está aguardando retirada em uma unidade indicada.',
  },
  delivery_attempt: {
    label: 'Tentativa de entrega',
    description: 'Houve uma tentativa de entrega registrada pela transportadora.',
  },
  delivered: {
    label: 'Entregue',
    description: 'A encomenda foi entregue ao destinatário.',
  },
  exception: {
    label: 'Atenção no envio',
    description: 'O rastreio registrou uma ocorrência que precisa de acompanhamento.',
  },
  tracking_unavailable: {
    label: 'Rastreio indisponível agora',
    description: 'As informações externas de rastreio não responderam neste momento.',
  },
};

const normalizeDate = (value?: Date | string | null) => {
  if (!value) return new Date();
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : new Date();
};

const serializeEvent = (event: OrderShipmentEvent) => ({
  id: event.id,
  source: event.source,
  status: event.status,
  title: event.title,
  description: event.description || null,
  location: event.location || null,
  eventAt: event.eventAt,
  createdAt: event.createdAt,
});

const getDateTime = (value?: Date | string | null) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.getTime() : null;
};

const getProviderCheckedAt = (shipment?: OrderShipment | null) => {
  const lastEvent = shipment?.trackingLastEvent || {};
  return (
    getDateTime((lastEvent as any)?.checkedAt) ||
    getDateTime((lastEvent as any)?.providerCheckedAt) ||
    getDateTime(shipment?.trackingLastAt) ||
    null
  );
};

const hasDeliveredCarrierEvent = (events: OrderShipmentEvent[]) =>
  events.some((event) =>
    String(event.source || '').toLowerCase() === 'carrier' &&
    String(event.status || '').toLowerCase() === 'delivered'
  );

export class ShippingTrackingService {
  private readonly log = logger.child({ scope: 'ShippingTrackingService' });
  private readonly manualProvider = new ManualShippingTrackingProvider();
  private readonly siteRastreioProvider = new SiteRastreioTrackingProvider();
  private readonly orderTerminalStatuses = new Set([ 'cancelled', 'canceled', 'done', 'finished', 'delivered' ]);

  private resolveProvider(): ShippingTrackingProvider {
    const provider = String(env.shipping.trackingProvider || 'manual').toLowerCase();
    if (['siterastreio', 'site-rastreio', 'wonca'].includes(provider)) {
      return this.siteRastreioProvider;
    }
    if (provider !== 'manual') {
      this.log.warn('Shipping tracking provider not implemented, using manual fallback', { provider });
    }
    return this.manualProvider;
  }

  private getLabel(status: string) {
    return EVENT_LABELS[status] || {
      label: 'Atualização do envio',
      description: 'Uma nova atualização foi registrada no acompanhamento postal.',
    };
  }

  private async markOrderDeliveredFromTrackingTx(
    manager: EntityManager,
    orderId: string,
    deliveredAt?: Date | string | null
  ) {
    const orderRepo = manager.getRepository(Order);
    const currentOrder = await orderRepo.findOne({ where: { id: orderId } });
    if (!currentOrder) return;

    const currentStatus = String(currentOrder.status || '').toLowerCase();
    if (this.orderTerminalStatuses.has(currentStatus)) return;

    currentOrder.status = 'delivered';
    currentOrder.statusTimeline = appendOrderTimelineEntry(currentOrder.statusTimeline, 'delivered', deliveredAt) as any;
    await orderRepo.save(currentOrder);
  }

  private async markOrderDeliveredFromTracking(orderId: string, deliveredAt?: Date | string | null) {
    await AppDataSource.transaction((manager) =>
      this.markOrderDeliveredFromTrackingTx(manager, orderId, deliveredAt)
    );
  }

  buildSummary(shipment?: OrderShipment | null, events: OrderShipmentEvent[] = []) {
    const newest = events[0] || null;
    const status = String(newest?.status || shipment?.shipmentStatus || 'pending_posting').toLowerCase();
    const label = this.getLabel(status);
    const hasTrackingCode = Boolean(String(shipment?.trackingCode || '').trim());

    return {
      status,
      label: label.label,
      description: hasTrackingCode
        ? label.description
        : 'A loja ainda vai informar o código de rastreio quando postar o pedido.',
      source: newest?.source || null,
      lastEventAt: newest?.eventAt || shipment?.trackingLastAt || null,
      hasTrackingCode,
      provider: shipment?.provider || 'manual',
      externalTrackingAvailable: hasTrackingCode,
    };
  }

  async listEvents(orderId: string) {
    const repo = AppDataSource.getRepository(OrderShipmentEvent);
    return repo.find({
      where: { orderId },
      order: { eventAt: 'DESC', createdAt: 'DESC' },
      take: 100,
    });
  }

  async recordEventTx(
    manager: EntityManager,
    orderId: string,
    event: ShippingTrackingEventInput
  ) {
    const eventRepo = manager.getRepository(OrderShipmentEvent);
    const status = String(event.status || '').trim().toLowerCase();
    if (!status) return null;
    const label = this.getLabel(status);
    const source = String(event.source || 'system').trim().toLowerCase();
    const eventAt = normalizeDate(event.eventAt);
    const title = String(event.title || label.label).trim() || label.label;
    const location = String(event.location || '').trim() || null;

    if (source === 'carrier') {
      const existing = await eventRepo.findOne({
        where: {
          orderId,
          source,
          status,
          title,
          location: location ?? IsNull(),
          eventAt,
        },
      });
      if (existing) return existing;
    }

    const entity = eventRepo.create({
      orderId,
      source,
      status,
      title,
      description: event.description !== undefined ? event.description : label.description,
      location,
      eventAt,
      rawPayload: event.rawPayload || null,
    });
    return eventRepo.save(entity);
  }

  async refreshTracking(order: Order, shipment?: OrderShipment | null) {
    if (!shipment?.trackingCode) {
      const events = await this.listEvents(order.id);
      return {
        summary: this.buildSummary(shipment, events),
        events: events.map(serializeEvent),
        provider: shipment?.provider || 'manual',
        refreshed: false,
        fallback: true,
      };
    }

    const provider = this.resolveProvider();
    const existingEvents = await this.listEvents(order.id);
    const providerConfigured = provider.isConfigured();
    const hasCarrierEvents = existingEvents.some((event) => String(event.source || '').toLowerCase() === 'carrier');
    const checkedAt = getProviderCheckedAt(shipment);
    const staleMs = env.shipping.trackingRefreshStaleMinutes * 60 * 1000;
    const isFresh = Boolean(checkedAt && Date.now() - checkedAt < staleMs);
    const terminalDelivered =
      String(shipment.shipmentStatus || '').toLowerCase() === 'delivered' ||
      Boolean(shipment.deliveredAt) ||
      hasDeliveredCarrierEvent(existingEvents);

    if (!providerConfigured || provider.name === 'manual' || isFresh || terminalDelivered) {
      if (terminalDelivered) {
        const deliveredEvent = existingEvents.find((event) =>
          String(event.source || '').toLowerCase() === 'carrier' &&
          String(event.status || '').toLowerCase() === 'delivered'
        );
        await this.markOrderDeliveredFromTracking(order.id, shipment.deliveredAt || deliveredEvent?.eventAt || null);
      }
      return {
        summary: this.buildSummary(shipment, existingEvents),
        events: existingEvents.map(serializeEvent),
        provider: provider.name,
        refreshed: false,
        fallback: !hasCarrierEvents,
        unavailableReason: providerConfigured
          ? (shipment.trackingLastEvent as any)?.unavailableReason || null
          : 'carrier_provider_not_configured',
      };
    }

    let providerResult = null as Awaited<ReturnType<ShippingTrackingProvider['fetchTracking']>> | null;
    const providerCheckedAt = new Date();
    try {
      providerResult = await provider.fetchTracking({
        orderId: order.id,
        trackingCode: shipment.trackingCode,
        shipment,
      });
    } catch (error: any) {
      this.log.warn('Shipping tracking provider failed', {
        orderId: order.id,
        provider: provider.name,
        message: error?.message || 'unknown_error',
      });
    }

    if (providerResult?.events?.length) {
      await AppDataSource.transaction(async (manager) => {
        const shipmentRepo = manager.getRepository(OrderShipment);
        const currentShipment = await shipmentRepo.findOne({ where: { orderId: order.id } });
        if (!currentShipment) return;

        for (const event of providerResult!.events) {
          await this.recordEventTx(manager, order.id, { ...event, source: 'carrier' });
        }

        const newest = providerResult!.events
          .slice()
          .sort((a, b) => normalizeDate(b.eventAt).getTime() - normalizeDate(a.eventAt).getTime())[0];
        if (newest) {
          currentShipment.shipmentStatus = String(newest.status || currentShipment.shipmentStatus || 'posted').toLowerCase();
          currentShipment.trackingLastAt = normalizeDate(newest.eventAt);
          currentShipment.trackingLastEvent = {
            status: newest.status,
            title: newest.title,
            description: newest.description || null,
            location: newest.location || null,
            eventAt: normalizeDate(newest.eventAt).toISOString(),
            provider: providerResult!.provider,
            checkedAt: providerCheckedAt.toISOString(),
          };
          if (String(newest.status || '').toLowerCase() === 'delivered') {
            currentShipment.deliveredAt = currentShipment.deliveredAt || normalizeDate(newest.eventAt);
            await this.markOrderDeliveredFromTrackingTx(manager, order.id, currentShipment.deliveredAt);
          }
          await shipmentRepo.save(currentShipment);
        }
      });
    } else {
      await AppDataSource.transaction(async (manager) => {
        const shipmentRepo = manager.getRepository(OrderShipment);
        const currentShipment = await shipmentRepo.findOne({ where: { orderId: order.id } });
        if (!currentShipment) return;
        currentShipment.trackingLastEvent = {
          ...(currentShipment.trackingLastEvent || {}),
          status: 'tracking_unavailable',
          title: 'Consulta de rastreio realizada',
          provider: provider.name,
          checkedAt: providerCheckedAt.toISOString(),
          unavailableReason: providerResult?.unavailableReason || 'provider_unavailable',
        };
        await shipmentRepo.save(currentShipment);
      });
    }

    const events = await this.listEvents(order.id);
    return {
      summary: this.buildSummary(shipment, events),
      events: events.map(serializeEvent),
      provider: provider.name,
      refreshed: Boolean(providerResult?.events?.length),
      fallback: !providerResult?.events?.length,
      unavailableReason: providerResult?.unavailableReason || null,
    };
  }
}

export const shippingTrackingService = new ShippingTrackingService();
