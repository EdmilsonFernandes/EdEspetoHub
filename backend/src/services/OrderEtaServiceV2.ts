/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: OrderEtaServiceV2.ts
 * @Date: 2026-01-28
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Order } from '../entities/Order';
import { StoreSettings } from '../entities/StoreSettings';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { OrderEtaEstimate } from '../entities/OrderEtaEstimate';
import { OrderEtaEstimateRepository } from '../repositories/OrderEtaEstimateRepository';

type MapsCoords = { lat: number; lng: number; formattedAddress?: string };
type MapsRoute = { distanceKm: number; durationMin: number };

type EtaBreakdown = {
  algoVersion: string;
  prepMinutes: number;
  queueMinutes: number;
  travelMinutes: number | null;
  bufferMinutes: number;
  totalMinutes: number;
  windowMin: number;
  windowMax: number;
  distanceKm: number | null;
  confidence: 'low' | 'medium' | 'high';
};

/**
 * Provides OrderEtaServiceV2 functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-28
 */
export class OrderEtaServiceV2 {
  private log = logger.child({ scope: 'OrderEtaServiceV2' });
  private repo = new OrderEtaEstimateRepository();
  private algoVersion = 'eta_v2.0';

  /**
   * Calculates ETA for an order (V2).
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-28
   */
  async calculateForOrder(
    order: Order,
    queuePosition?: number | null,
    correlationId?: string
  ): Promise<EtaBreakdown> {
    const storeSettings = order.store?.settings as StoreSettings | undefined;
    const itemCount = (order.items || []).reduce((acc, item) => acc + (item.quantity || 0), 0);

    const prepBase = this.toNumber(storeSettings?.prepBaseMinutes, env.etaV2.defaultPrepMinutes);
    const prepPerItem = this.toNumber(storeSettings?.prepPerItemMinutes, env.etaV2.defaultPrepPerItemMinutes);
    const prepMinutes = Math.max(1, Math.round(prepBase + prepPerItem * itemCount));

    const queueMinutes = this.calculateQueueMinutes(queuePosition, storeSettings);
    const bufferMinutes = this.toNumber(storeSettings?.etaBufferMinutes, env.etaV2.defaultEtaBufferMinutes);

    let travelMinutes: number | null = null;
    let distanceKm: number | null = null;
    let confidence: 'low' | 'medium' | 'high' = 'medium';

    if (order.type === 'delivery' && order.address && storeSettings?.address) {
      const travel = await this.getTravelData(storeSettings.address, order.address, correlationId);
      if (travel) {
        travelMinutes = travel.durationMin;
        distanceKm = travel.distanceKm;
        confidence = 'high';
      } else {
        confidence = 'low';
      }
    } else {
      confidence = 'medium';
    }

    const totalMinutes = Math.max(
      1,
      Math.round(prepMinutes + queueMinutes + bufferMinutes + (travelMinutes || 0))
    );
    const windowMin = Math.max(1, Math.round(totalMinutes * 0.8));
    const windowMax = Math.max(windowMin, Math.round(totalMinutes * 1.2));

    const eta: EtaBreakdown = {
      algoVersion: this.algoVersion,
      prepMinutes,
      queueMinutes,
      travelMinutes,
      bufferMinutes,
      totalMinutes,
      windowMin,
      windowMax,
      distanceKm,
      confidence,
    };

    await this.persistEstimate(order, eta);

    this.log.info('ETA calculated', {
      correlationId,
      orderId: order.id,
      storeId: order.store?.id,
      ...eta,
    });

    return eta;
  }

  private toNumber(value: number | null | undefined, fallback: number) {
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  private calculateQueueMinutes(queuePosition?: number | null, storeSettings?: StoreSettings) {
    const buffer = this.toNumber(
      storeSettings?.queueBufferMinutes,
      env.etaV2.defaultQueueBufferMinutes
    );
    if (!queuePosition || queuePosition <= 1) {
      return Math.max(0, Math.round(buffer));
    }

    const capacity = this.toNumber(storeSettings?.queueCapacityPerHour, 0);
    const perOrderMinutes =
      capacity > 0 ? Math.max(1, Math.round(60 / capacity)) : env.etaV2.defaultQueueMinutesPerOrder;
    const baseQueue = (queuePosition - 1) * perOrderMinutes;

    return Math.max(0, Math.round(baseQueue + buffer));
  }

  private async getTravelData(
    originAddress: string,
    destinationAddress: string,
    correlationId?: string
  ): Promise<MapsRoute | null> {
    try {
      const origin = await this.geocode(originAddress, correlationId);
      const destination = await this.geocode(destinationAddress, correlationId);
      if (!origin || !destination) return null;
      const route = await this.route(origin, destination, correlationId);
      return route;
    } catch (error) {
      this.log.warn('Maps travel data failed', { correlationId, error });
      return null;
    }
  }

  private async geocode(address: string, correlationId?: string): Promise<MapsCoords | null> {
    const response = await fetch(`${env.etaV2.mapsBaseUrl}/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });
    if (!response.ok) {
      this.log.warn('Maps geocode failed', { correlationId, status: response.status });
      return null;
    }
    const payload = (await response.json()) as MapsCoords;
    if (!payload?.lat || !payload?.lng) return null;
    return payload;
  }

  private async route(origin: MapsCoords, destination: MapsCoords, correlationId?: string): Promise<MapsRoute | null> {
    const response = await fetch(`${env.etaV2.mapsBaseUrl}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: { lat: origin.lat, lng: origin.lng }, destination: { lat: destination.lat, lng: destination.lng } }),
    });
    if (!response.ok) {
      this.log.warn('Maps route failed', { correlationId, status: response.status });
      return null;
    }
    const payload = (await response.json()) as MapsRoute;
    if (!payload?.durationMin || !payload?.distanceKm) return null;
    return payload;
  }

  private async persistEstimate(order: Order, eta: EtaBreakdown) {
    if (!order.store?.id) return;
    const existing = await this.repo.findLatestByOrderId(order.id);
    const entity = existing || new OrderEtaEstimate();
    entity.order = order;
    entity.store = order.store;
    entity.algoVersion = eta.algoVersion;
    entity.prepMinutes = eta.prepMinutes;
    entity.queueMinutes = eta.queueMinutes;
    entity.travelMinutes = eta.travelMinutes ?? null;
    entity.bufferMinutes = eta.bufferMinutes;
    entity.totalMinutes = eta.totalMinutes;
    entity.windowMin = eta.windowMin;
    entity.windowMax = eta.windowMax;
    entity.distanceKm = eta.distanceKm ?? null;
    entity.confidence = eta.confidence;
    await this.repo.save(entity);
  }
}
