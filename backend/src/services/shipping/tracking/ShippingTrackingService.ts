import { EntityManager } from 'typeorm';
import { env } from '../../../config/env';
import { AppDataSource } from '../../../config/database';
import { Order } from '../../../entities/Order';
import { OrderShipment } from '../../../entities/OrderShipment';
import { OrderShipmentEvent } from '../../../entities/OrderShipmentEvent';
import { logger } from '../../../utils/logger';
import { ManualShippingTrackingProvider } from './ManualShippingTrackingProvider';
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

export class ShippingTrackingService {
  private readonly log = logger.child({ scope: 'ShippingTrackingService' });
  private readonly manualProvider = new ManualShippingTrackingProvider();

  private resolveProvider(): ShippingTrackingProvider {
    const provider = String(env.shipping.trackingProvider || 'manual').toLowerCase();
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

    const entity = eventRepo.create({
      orderId,
      source: String(event.source || 'system').trim().toLowerCase(),
      status,
      title: String(event.title || label.label).trim() || label.label,
      description: event.description !== undefined ? event.description : label.description,
      location: String(event.location || '').trim() || null,
      eventAt: normalizeDate(event.eventAt),
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
    let providerResult = null as Awaited<ReturnType<ShippingTrackingProvider['fetchTracking']>> | null;
    if (provider.isConfigured()) {
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
          };
          if (String(newest.status || '').toLowerCase() === 'delivered') {
            currentShipment.deliveredAt = currentShipment.deliveredAt || normalizeDate(newest.eventAt);
          }
          await shipmentRepo.save(currentShipment);
        }
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
