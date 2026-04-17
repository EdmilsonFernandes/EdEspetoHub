/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: StoreController.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Request, Response } from 'express';
import { StoreService } from '../services/StoreService';
import { SubscriptionService } from '../services/SubscriptionService';
import { OrderReviewService } from '../services/OrderReviewService';
import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product';
import { isProductAvailableToday } from '../utils/productAvailability';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';
import { respondWithError } from '../errors/respondWithError';
import { resolvePlanFeatures } from '../config/planFeatures';
import { publicStoreCache } from '../utils/publicStoreCache';
import { In } from 'typeorm';

const storeService = new StoreService();
const subscriptionService = new SubscriptionService();
const orderReviewService = new OrderReviewService();
const DEMO_SLUGS = new Set([ 'demo', 'test-store' ]);
const log = logger.child({ scope: 'StoreController' });
const SAO_PAULO_TZ = 'America/Sao_Paulo';
/**
 * Builds demo store.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
const buildDemoStore = (slug: string) => {
  const now = new Date();
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    id: 'demo-store',
    name: 'Jano Caminho Demo',
    slug,
    open: true,
    createdAt: now,
    settings: {
      logoUrl: '/chama-no-espeto.jpeg',
      bannerUrl: null,
      description: 'Loja demo de espetos com combos especiais e atendimento rápido.',
      primaryColor: '#dc2626',
      secondaryColor: '#111827',
      segment: 'restaurante',
      socialLinks: [ { type: 'instagram', value: 'janocaminho' } ],
      city: 'São Paulo',
      state: 'SP',
      openingHours: [
        { day: 1, enabled: true, intervals: [ { start: '10:00', end: '22:00' } ] },
        { day: 2, enabled: true, intervals: [ { start: '10:00', end: '22:00' } ] },
        { day: 3, enabled: true, intervals: [ { start: '10:00', end: '22:00' } ] },
        { day: 4, enabled: true, intervals: [ { start: '10:00', end: '22:00' } ] },
        { day: 5, enabled: true, intervals: [ { start: '10:00', end: '23:00' } ] },
        { day: 6, enabled: true, intervals: [ { start: '10:00', end: '23:00' } ] },
        { day: 0, enabled: true, intervals: [ { start: '10:00', end: '21:00' } ] },
      ],
      orderTypes: [ 'delivery', 'pickup', 'table' ],
      isOrderingEnabled: true,
    },
    owner: {
      id: 'demo-owner',
      fullName: 'Loja Demo',
      email: 'demo@janocaminho.com.br',
      phone: '(11) 99999-0000',
      address: 'Rua Demo 123, Centro - Sao Paulo/SP',
    },
    subscription: {
      status: 'ACTIVE',
      endDate,
    },
    reviewSummary: {
      totalReviews: 0,
      avgStoreRating: 0,
      totalDeliveryReviews: 0,
      avgDeliveryRating: 0,
    },
    openNow: true,
  };
};
/**
 * Provides StoreController functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class StoreController {
  /**
   * Gets current Sao Paulo local day and minutes.
   *
   * @author Edmilson Lopes
   */
  private static getSaoPauloNowParts() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: SAO_PAULO_TZ,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const weekdayRaw = String(parts.find((part) => part.type === 'weekday')?.value || '').toLowerCase();
    const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
    const weekdayMap: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };
    const day = Number.isFinite(weekdayMap[weekdayRaw]) ? weekdayMap[weekdayRaw] : now.getDay();
    const safeHour = Math.max(0, Math.min(23, Number.isFinite(hour) ? hour : 0));
    const safeMinute = Math.max(0, Math.min(59, Number.isFinite(minute) ? minute : 0));
    const minutes = safeHour * 60 + safeMinute;
    return { day, minutes };
  }

  /**
   * Parses HH:mm to minutes in day.
   *
   * @author Edmilson Lopes
   */
  private static toMinutes(value: string): number | null {
    if (!value || typeof value !== 'string') return null;
    const [h, m] = value.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  /**
   * Resolves opening-hours entry for a given JS weekday (0..6),
   * accepting legacy persisted formats (0..6, ISO 1..7, and Sun-first 1..7).
   *
   * @author Edmilson Lopes
   */
  private static candidateDayValues(jsDay: number) {
    const normalizedDay = ((jsDay % 7) + 7) % 7;
    const isoDay = normalizedDay === 0 ? 7 : normalizedDay; // ISO: Mon=1..Sun=7
    const sunFirstDay = normalizedDay + 1; // Sun-first: Sun=1..Sat=7
    return Array.from(new Set([ normalizedDay, isoDay, sunFirstDay ]));
  }

  private static resolveDayEntry(openingHours: any[], jsDay: number) {
    const candidates = StoreController.candidateDayValues(jsDay);
    return openingHours.find((entry: any) => candidates.includes(Number(entry?.day)));
  }

  /**
   * Resolves all possible opening-hours entries for a given JS weekday (0..6),
   * supporting mixed legacy formats without relying on entry order.
   *
   * @author Edmilson Lopes
   */
  private static resolveDayEntries(openingHours: any[], jsDay: number) {
    const normalizedDay = ((jsDay % 7) + 7) % 7;
    // Tenta primeiro o match exato (0-6)
    const exactMatches = openingHours.filter((entry: any) => Number(entry?.day) === normalizedDay);
    if (exactMatches.length > 0) return exactMatches;

    // Se não houver match exato, tenta os candidatos legados (ISO ou Sun-first)
    const candidates = StoreController.candidateDayValues(jsDay);
    return openingHours.filter((entry: any) => {
      const value = Number(entry?.day);
      return Number.isFinite(value) && candidates.includes(value);
    });
  }

  /**
   * Checks whether current minutes are inside one interval.
   *
   * @author Edmilson Lopes
   */
  private static isInsideInterval(nowMinutes: number, start: number, end: number) {
    if (start === end) return true;
    if (end < start) return nowMinutes >= start || nowMinutes < end;
    return nowMinutes >= start && nowMinutes < end;
  }

  /**
   * Checks whether the previous day's overnight interval still keeps the store open.
   *
   * @author Edmilson Lopes
   */
  private static isOpenFromPreviousDayOvernight(openingHours: any[], currentDay: number, currentMinutes: number) {
    const previousDay = (currentDay + 6) % 7;
    const previousEntries = StoreController.resolveDayEntries(openingHours, previousDay).filter(
      (entry: any) => entry?.enabled !== false
    );
    if (!previousEntries.length) return false;

    return previousEntries.some((previousEntry: any) => {
      const prevIntervals = Array.isArray(previousEntry.intervals) ? previousEntry.intervals : [];
      if (!prevIntervals.length) return false;

      return prevIntervals.some((interval: any) => {
        if (!interval?.start || !interval?.end) return false;
        const start = StoreController.toMinutes(String(interval.start));
        const end = StoreController.toMinutes(String(interval.end));
        if (start == null || end == null) return false;
        if (start === end) return true;
        if (end < start) {
          // Overnight interval from previous day keeps store open until `end`.
          return currentMinutes < end;
        }
        return false;
      });
    });
  }

  private static hasConfiguredOpeningHours(store: any) {
    const openingHours = store?.settings?.openingHours;
    return Array.isArray(openingHours) && openingHours.length > 0;
  }

  private static async getPublicProductCountsByStoreIds(storeIds: string[]) {
    const ids = Array.from(new Set((storeIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
    const counts = new Map<string, number>();
    if (!ids.length) return counts;

    const products = await AppDataSource.getRepository(Product).find({
      where: {
        active: true,
        store: { id: In(ids) },
      },
      relations: [ 'store' ],
    });

    (products || [])
      .filter((product) => isProductAvailableToday(product))
      .forEach((product: any) => {
        const storeId = String(product?.store?.id || '');
        if (!storeId) return;
        counts.set(storeId, (counts.get(storeId) || 0) + 1);
      });

    return counts;
  }
    /**
   * Executes sanitize order types by plan business logic.
   *
   * @author Edmilson Lopes
   */
private static sanitizeOrderTypesByPlan(orderTypes: unknown, params: { planName?: string | null; planExempt?: boolean; subscriptionStatus?: string | null }) {
    const incoming = Array.isArray(orderTypes) ? orderTypes : [ 'delivery', 'pickup', 'table' ];
    const features = resolvePlanFeatures({
      planName: params.planName,
      planExempt: params.planExempt,
      subscriptionStatus: params.subscriptionStatus,
    });
    const sanitized = features.deliveryMode
      ? incoming
      : incoming.filter((type) => String(type || '').toLowerCase() !== 'delivery');
    return sanitized.length ? sanitized : [ 'pickup', 'table' ];
  }
  /**
   * Executes is store open now logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  /**
   * Checks store open now.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  private static isStoreOpenNow(store: any) {
    // Se a loja está fechada manualmente, nem checa horário
    if (store.open === false) return false;

    const openingHours = store?.settings?.openingHours;
    if (!Array.isArray(openingHours) || openingHours.length === 0) return false;

    const { day, minutes } = StoreController.getSaoPauloNowParts();
    
    const dayEntries = StoreController.resolveDayEntries(openingHours, day).filter(
      (entry: any) => entry?.enabled !== false
    );
    
    const openByTodayInterval = dayEntries.some((dayEntry: any) => {
      const intervals = Array.isArray(dayEntry.intervals) ? dayEntry.intervals : [];
      // Se não tem intervalos mas está habilitado, considera aberto o dia todo
      if (!intervals.length) return true;
      return intervals.some((interval: any) => {
        if (!interval?.start || !interval?.end) return false;
        const start = StoreController.toMinutes(String(interval.start));
        const end = StoreController.toMinutes(String(interval.end));
        if (start == null || end == null) return false;
        return StoreController.isInsideInterval(minutes, start, end);
      });
    });

    if (openByTodayInterval) return true;

    // Se não abriu pelo horário de hoje, SEMPRE checa se o dia anterior ainda está no período overnight
    return StoreController.isOpenFromPreviousDayOvernight(openingHours, day, minutes);
  }

  /**
   * Resolves next opening label for closed stores.
   *
   * @author Edmilson Lopes
   */
  private static getNextOpeningLabel(store: any): string | null {
    const openingHours = store?.settings?.openingHours;
    if (!Array.isArray(openingHours) || openingHours.length === 0) return null;

    const { day: currentDay, minutes: currentMinutes } = StoreController.getSaoPauloNowParts();
    const weekdayNames = [ 'domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado' ];

    for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
      const day = (currentDay + dayOffset) % 7;
      const dayEntries = StoreController.resolveDayEntries(openingHours, day).filter(
        (entry: any) => entry?.enabled !== false
      );
      if (!dayEntries.length) continue;

      const intervals = dayEntries
        .flatMap((dayEntry: any) => (Array.isArray(dayEntry.intervals) ? dayEntry.intervals : []))
        .map((interval: any) => {
          if (!interval?.start || typeof interval.start !== 'string') return null;
          const startMinutes = StoreController.toMinutes(interval.start);
          if (startMinutes == null) return null;
          const h = Math.floor(startMinutes / 60);
          const m = startMinutes % 60;
          return { start: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, startMinutes };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.startMinutes - b.startMinutes);

      if (!intervals.length) continue;

      const nextInterval = intervals.find((interval: any) => dayOffset > 0 || interval.startMinutes > currentMinutes);
      if (!nextInterval) continue;

      if (dayOffset === 0) return `Abre hoje as ${nextInterval.start}`;
      if (dayOffset === 1) return `Abre amanha as ${nextInterval.start}`;
      return `Abre ${weekdayNames[day]} as ${nextInterval.start}`;
    }

    return null;
  }




  /**
   * Lists portfolio.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async listPortfolio(_req: Request, res: Response) {
    try {
      log.debug('Store portfolio list request');
      const cached = publicStoreCache.getPortfolio();
      if (cached) {
        return res.json(cached);
      }
      const stores = await storeService.listAll();
      const publicProductCounts = await StoreController.getPublicProductCountsByStoreIds(stores.map((store) => store.id));
      const entries = await Promise.all(
        stores.map(async (store) => {
          const subscription = await subscriptionService.getCurrentByStore(store.id);
          const isVip = Boolean(store?.settings?.planExempt);
          const isActive = isVip || subscriptionService.isActiveSubscription(subscription);
          if (!isActive) return null;
          const publicProductCount = publicProductCounts.get(store.id) || 0;
          if (publicProductCount <= 0) return null;
          const orderTypes = StoreController.sanitizeOrderTypesByPlan(store.settings?.orderTypes, {
            planName: subscription?.plan?.name,
            planExempt: Boolean(store.settings?.planExempt),
            subscriptionStatus: subscription?.status || null,
          });
          const isOrderingEnabled = store.settings?.isOrderingEnabled !== false;
          const hasOpeningHours = StoreController.hasConfiguredOpeningHours(store);
          const openNow = hasOpeningHours && StoreController.isStoreOpenNow(store);
          const nextOpeningLabel = openNow ? null : StoreController.getNextOpeningLabel(store);
          return {
            id: store.id,
            name: store.name,
            slug: store.slug,
            open: store.open,
            openNow,
            nextOpeningLabel,
            productCount: publicProductCount,
            reviewSummary: await orderReviewService.publicSummaryByStoreId(store.id),
            settings: store.settings
              ? {
                  logoUrl: store.settings.logoUrl || null,
                  bannerUrl: store.settings.bannerUrl || null,
                  description: store.settings.description || null,
                  address: store.settings.address || null,
                  openingHours: Array.isArray(store.settings.openingHours) ? store.settings.openingHours : [],
                  primaryColor: store.settings.primaryColor || null,
                  secondaryColor: store.settings.secondaryColor || null,
                  segment: store.settings.segment || 'outros',
                  city: store.settings.city || null,
                  state: store.settings.state || null,
                  isOrderingEnabled,
                  orderTypes,
                  postalEnabled: Boolean(store.settings.postalEnabled),
                }
              : null,
          };
        })
      );
      const payload = entries.filter(Boolean);
      publicStoreCache.setPortfolio(payload);
      return res.json(payload);
    } catch (error: any) {
      log.warn('Store portfolio list failed', { error });
      return respondWithError(_req, res, error, 400);
    }
  }



  /**
   * Gets by slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async getBySlug(req: Request, res: Response) {
    try {
      if (DEMO_SLUGS.has(req.params.slug)) {
        return res.json(buildDemoStore(req.params.slug));
      }
      log.debug('Store get by slug request', { slug: req.params.slug });
      const cached = publicStoreCache.getStoreBySlug(req.params.slug);
      if (cached) {
        return res.json(cached);
      }
      const store = await storeService.getBySlug(req.params.slug);
      if (!store) return respondWithError(req, res, new AppError('STORE-001', 404), 404);
      const subscription = await subscriptionService.getCurrentByStore(store.id);
      const orderTypes = StoreController.sanitizeOrderTypesByPlan(store.settings?.orderTypes, {
        planName: subscription?.plan?.name,
        planExempt: Boolean(store.settings?.planExempt),
        subscriptionStatus: subscription?.status || null,
      });
      const sanitizedStore = {
        id: store.id,
        name: store.name,
        slug: store.slug,
        open: store.open,
        createdAt: store.createdAt,
        reviewSummary: await orderReviewService.publicSummaryByStoreId(store.id),
        settings: {
          ...(store.settings || {}),
          orderTypes,
        },
        owner: store.owner
          ? {
            id: store.owner.id,
            fullName: store.owner.fullName,
            email: store.owner.email,
            phone: store.owner.phone,
            address: store.owner.address,
          }
          : null,
        openNow: StoreController.isStoreOpenNow(store),
      };
      const payload = { ...sanitizedStore, subscription };
      publicStoreCache.setStoreBySlug(req.params.slug, payload);
      return res.json(payload);
    } catch (error: any) {
      log.warn('Store get by slug failed', { slug: req.params.slug, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Tracks store link hit.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-22
   */
  static async trackLink(req: Request, res: Response)
  {
    try
    {
      if (DEMO_SLUGS.has(req.params.slug))
      {
        return res.json({ success: true });
      }
      const store = await storeService.getBySlug(req.params.slug);
      if (!store)
      {
        return res.json({ success: false });
      }
      const source = (req.body?.utm_source || req.query?.utm_source || '').toString().trim();
      const medium = (req.body?.utm_medium || req.query?.utm_medium || '').toString().trim();
      const campaign = (req.body?.utm_campaign || req.query?.utm_campaign || '').toString().trim();
      const referrer = (req.headers.referer || req.headers.referrer || '').toString();
      await storeService.trackLinkHit(store.id, {
        source,
        medium,
        campaign,
        referrer,
      });
      return res.json({ success: true });
    }
    catch (error: any)
    {
      log.warn('Store link track failed', { slug: req.params.slug, error });
      return respondWithError(req, res, error, 400);
    }
  }



  /**
   * Gets store link stats.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-22
   */
  static async getLinkStats(req: Request, res: Response)
  {
    try
    {
      const storeId = req.params.storeId;
      if (!storeId) throw new AppError('STORE-001', 404);
      const days = Number(req.query?.days || 7);
      const stats = await storeService.getLinkStats(storeId, days);
      return res.json(stats);
    }
    catch (error: any)
    {
      log.warn('Store link stats failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }



  /**
   * Executes update logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async update(req: Request, res: Response) {
    try {
      log.info('Store update request', { storeId: req.params.storeId });
      const store = await storeService.update(req.params.storeId, req.body);
      publicStoreCache.invalidateStore(store);
      log.info('Store updated', { storeId: req.params.storeId });
      return res.json(store);
    } catch (error: any) {
      log.warn('Store update failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Updates status.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async updateStatus(req: Request, res: Response) {
    try {
      log.info('Store status update request', { storeId: req.params.storeId, open: req.body?.open });
      const store = await storeService.setStatus(req.params.storeId, req.body.open);
      publicStoreCache.invalidateStore(store);
      log.info('Store status updated', { storeId: req.params.storeId, open: store?.open });
      return res.json(store);
    } catch (error: any) {
      log.warn('Store status update failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }
}
