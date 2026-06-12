/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: StoreController.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
import { cacheService } from '../services/CacheService';
import { invalidateStoreBySlugCache } from '../utils/cacheInvalidation';
import { In } from 'typeorm';
import { StorePaymentAccountService } from '../services/StorePaymentAccountService';
import { StoreDashboardAnalyticsService } from '../services/StoreDashboardAnalyticsService';
import { env } from '../config/env';
import { calculateDistanceKm, roundDistanceKm } from '../utils/geo';

const storeService = new StoreService();
const subscriptionService = new SubscriptionService();
const orderReviewService = new OrderReviewService();
const storePaymentAccountService = new StorePaymentAccountService();
const storeDashboardAnalyticsService = new StoreDashboardAnalyticsService();
const DEMO_SLUGS = new Set([ 'demo', 'test-store' ]);
const log = logger.child({ scope: 'StoreController' });
const SAO_PAULO_TZ = 'America/Sao_Paulo';
const MAX_NEARBY_DISCOVERY_DISTANCE_KM = 80;
let storeCoordinateBackfillPromise: Promise<void> | null = null;
let storeCoordinateBackfillLastRunAt = 0;
/**
 * Builds demo store.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-17
 */
export class StoreController {
  private static triggerStoreCoordinateBackfill() {
    const now = Date.now();
    if (storeCoordinateBackfillPromise) return;
    if (now - storeCoordinateBackfillLastRunAt < 15 * 60 * 1000) return;
    storeCoordinateBackfillLastRunAt = now;
    storeCoordinateBackfillPromise = storeService
      .backfillMissingStoreCoordinates(50)
      .then((result) => {
        if ((result?.updated || 0) > 0 || (result?.failed || 0) > 0) {
          log.info('Store coordinate backfill completed', result);
        }
      })
      .catch((error) => {
        log.warn('Store coordinate backfill failed', { error });
      })
      .finally(() => {
        storeCoordinateBackfillPromise = null;
      });
  }

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

  private static normalizeGeoText(value?: string | null) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private static toQueryNumber(value: unknown) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const normalized = String(value).replace(',', '.').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private static haversineKm(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
    return calculateDistanceKm(origin, destination);
  }

  private static hasUsableStoreCoordinatePair(lat: unknown, lng: unknown) {
    const numericLat = StoreController.toQueryNumber(lat);
    const numericLng = StoreController.toQueryNumber(lng);
    if (numericLat === null || numericLng === null) return false;
    if (Math.abs(numericLat) < 0.000001 && Math.abs(numericLng) < 0.000001) return false;
    return numericLat >= -34 && numericLat <= 6 && numericLng >= -74 && numericLng <= -34;
  }

  private static enrichStoreGeoPayload(
    entry: any,
    location: { lat: number | null; lng: number | null; city?: string | null; state?: string | null }
  ) {
    const orderTypes = Array.isArray(entry?.settings?.orderTypes) ? entry.settings.orderTypes : [];
    const acceptsDelivery = orderTypes.some((type: string) => String(type || '').toLowerCase() === 'delivery');
    const acceptsPickup = orderTypes.some((type: string) => String(type || '').toLowerCase() === 'pickup');
    const acceptsTable = orderTypes.some((type: string) => String(type || '').toLowerCase() === 'table');
    const supportsPostal = Boolean(entry?.settings?.postalEnabled) && acceptsDelivery;
    const latitude = StoreController.toQueryNumber(entry?.settings?.lat);
    const longitude = StoreController.toQueryNumber(entry?.settings?.lng);
    const hasUserCoords = location.lat !== null && location.lng !== null;
    const hasStoreCoords = StoreController.hasUsableStoreCoordinatePair(latitude, longitude);
    const rawDistanceKm =
      hasUserCoords && hasStoreCoords
        ? StoreController.haversineKm(
            { lat: Number(location.lat), lng: Number(location.lng) },
            { lat: Number(latitude), lng: Number(longitude) }
          )
        : null;
    const distanceKm = roundDistanceKm(rawDistanceKm, 1);
    const configuredRadiusKm = StoreController.toQueryNumber(entry?.settings?.deliveryRadiusKm);
    const effectiveDeliveryRadiusKm = acceptsDelivery
      ? (configuredRadiusKm !== null && configuredRadiusKm > 0 ? configuredRadiusKm : Number(env.delivery.defaultRadiusKm || 5))
      : null;
    const normalizedCity = StoreController.normalizeGeoText(location.city);
    const normalizedState = StoreController.normalizeGeoText(location.state);
    const normalizedStoreCity = StoreController.normalizeGeoText(entry?.settings?.city);
    const normalizedStoreState = StoreController.normalizeGeoText(entry?.settings?.state);
    const hasRegionContext = hasUserCoords || Boolean(normalizedCity || normalizedState);
    const sameCity =
      Boolean(normalizedCity) &&
      normalizedStoreCity === normalizedCity &&
      (!normalizedState || normalizedStoreState === normalizedState);
    const deliversToUserLocation = Boolean(
      acceptsDelivery &&
        hasUserCoords &&
        hasStoreCoords &&
        rawDistanceKm !== null &&
        effectiveDeliveryRadiusKm !== null &&
        rawDistanceKm <= effectiveDeliveryRadiusKm
    );
    const pickupEnabled = acceptsPickup || acceptsTable;
    const deliveryOnlyOutsideRegion = Boolean(
      acceptsDelivery &&
        !pickupEnabled &&
        !supportsPostal &&
        !deliversToUserLocation &&
        hasRegionContext &&
        (distanceKm !== null || normalizedCity || normalizedState)
    );
    const geoAvailability = supportsPostal
      ? 'postal_everywhere'
      : deliversToUserLocation
        ? 'deliver_now'
        : pickupEnabled
          ? (sameCity ? 'same_city_pickup' : 'pickup_available')
          : acceptsDelivery
            ? (distanceKm !== null ? 'outside_radius' : 'unknown')
            : 'unknown';
    const deliveryStatusLabel = supportsPostal
      ? 'Entrega postal disponível'
      : deliversToUserLocation
        ? 'Entrega disponível'
        : deliveryOnlyOutsideRegion
          ? 'Entrega fora da área'
          : acceptsDelivery
            ? 'Fora da área de entrega'
            : pickupEnabled
              ? 'Retirada disponível'
              : 'Distância indisponível';

    return {
      ...entry,
      latitude: hasStoreCoords ? latitude : null,
      longitude: hasStoreCoords ? longitude : null,
      acceptsDelivery,
      acceptsPickup,
      acceptsTable,
      supportsPostal,
      sameCity,
      geoAvailability,
      isOutOfRegion: deliveryOnlyOutsideRegion,
      deliveryRadiusKm: effectiveDeliveryRadiusKm,
      distanceKm,
      deliversToUserLocation,
      deliveryStatusLabel,
    };
  }

  private static sortStoresForLocation(entries: any[]) {
    return entries.sort((a, b) => {
      const rank = (entry: any) => {
        const availability = String(entry?.geoAvailability || '').trim().toLowerCase();
        if (entry?.openNow && (entry?.deliversToUserLocation || availability === 'deliver_now' || availability === 'postal_everywhere')) return 0;
        if (entry?.openNow && availability === 'same_city_pickup') return 1;
        if (entry?.openNow && availability === 'pickup_available') return 2;
        if (entry?.openNow && !entry?.isOutOfRegion) return 3;
        if (entry?.openNow) return 4;
        return 5;
      };
      const rankDelta = rank(a) - rank(b);
      if (rankDelta !== 0) return rankDelta;
      const distanceA = StoreController.toQueryNumber(a?.distanceKm) ?? Number.MAX_SAFE_INTEGER;
      const distanceB = StoreController.toQueryNumber(b?.distanceKm) ?? Number.MAX_SAFE_INTEGER;
      if (distanceA !== distanceB) return distanceA - distanceB;
      return Number(b?.reviewSummary?.avgStoreRating || 0) - Number(a?.reviewSummary?.avgStoreRating || 0);
    });
  }

  private static async buildPublicStorePayload(
    store: any,
    publicProductCount: number,
    subscription: any
  ) {
    const isVip = Boolean(store?.settings?.planExempt);
    const isActive = isVip || subscriptionService.isActiveSubscription(subscription);
    if (!isActive) return null;
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
    const reviewSummary = await orderReviewService.publicSummaryByStoreId(store.id);
    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      open: store.open,
      openNow,
      nextOpeningLabel,
      productCount: publicProductCount,
      reviewSummary,
      latitude: store.settings?.lat ?? null,
      longitude: store.settings?.lng ?? null,
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
            deliveryRadiusKm: store.settings.deliveryRadiusKm ?? null,
            lat: store.settings.lat ?? null,
            lng: store.settings.lng ?? null,
          }
        : null,
    };
  }

  private static async buildPublicPaymentSummary(store: any) {
    const manualPixEnabled = Boolean(String(store?.settings?.pixKey || '').trim());
    let mpStatus: any = null;

    try {
      mpStatus = await storePaymentAccountService.getStatus(store.id);
    } catch {
      mpStatus = null;
    }

    const validation = mpStatus?.validation || null;
    const pixOnline = Boolean(validation?.pix?.available);
    const creditOnline = Boolean(validation?.credit?.available);
    const debitOnline = Boolean(validation?.debit?.available);

    return {
      provider: 'MERCADO_PAGO',
      onlineEnabled: Boolean(pixOnline || creditOnline || debitOnline),
      manualPixEnabled,
      cashEnabled: true,
      providerConnected: Boolean(mpStatus?.connected),
      providerStatus: validation?.overallStatus || null,
      methods: {
        pixOnline,
        creditOnline,
        debitOnline,
        manualPix: manualPixEnabled,
        cash: true,
      },
    };
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
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  /**
   * Checks store open now.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
    const weekdayNames = [ 'domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado' ];

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

      if (dayOffset === 0) return `Abre hoje às ${nextInterval.start}`;
      if (dayOffset === 1) return `Abre amanhã às ${nextInterval.start}`;
      return `Abre ${weekdayNames[day]} às ${nextInterval.start}`;
    }

    return null;
  }




  /**
   * Lists portfolio.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  static async listPortfolio(_req: Request, res: Response) {
    try {
      log.debug('Store portfolio list request');
      StoreController.triggerStoreCoordinateBackfill();
      const userLat = StoreController.toQueryNumber(_req.query?.lat);
      const userLng = StoreController.toQueryNumber(_req.query?.lng);
      const userCity = String(_req.query?.city || '').trim();
      const userState = String(_req.query?.state || '').trim().toUpperCase();
      const hasLocationContext = (userLat !== null && userLng !== null) || Boolean(userCity || userState);

      const cacheKey = 'stores:portfolio';
      const cached = !hasLocationContext ? await cacheService.get(cacheKey) : null;
      if (cached) {
        return res.json(cached);
      }
      const stores = await storeService.listAll();
      const publicProductCounts = await StoreController.getPublicProductCountsByStoreIds(stores.map((store) => store.id));
      const entries = await Promise.all(
        stores.map(async (store) => {
          const subscription = await subscriptionService.getCurrentByStore(store.id);
          const publicProductCount = publicProductCounts.get(store.id) || 0;
          return StoreController.buildPublicStorePayload(store, publicProductCount, subscription);
        })
      );
      const payload = entries.filter(Boolean);
      if (!hasLocationContext) {
        await cacheService.set(cacheKey, payload, 60);
        return res.json(payload);
      }
      const enriched = payload.map((entry: any) =>
        StoreController.enrichStoreGeoPayload(entry, {
          lat: userLat,
          lng: userLng,
          city: userCity || null,
          state: userState || null,
        })
      );
      return res.json(StoreController.sortStoresForLocation(enriched));
    } catch (error: any) {
      log.warn('Store portfolio list failed', { error });
      return respondWithError(_req, res, error, 400);
    }
  }

  static async listDiscovery(req: Request, res: Response) {
    try {
      StoreController.triggerStoreCoordinateBackfill();
      const userLat = StoreController.toQueryNumber(req.query?.lat);
      const userLng = StoreController.toQueryNumber(req.query?.lng);
      const userCity = String(req.query?.city || '').trim();
      const userState = String(req.query?.state || '').trim().toUpperCase();
      const hasUserCoords = userLat !== null && userLng !== null;

      const stores = await storeService.listAll();
      const publicProductCounts = await StoreController.getPublicProductCountsByStoreIds(stores.map((store) => store.id));
      const payloads = await Promise.all(
        stores.map(async (store) => {
          const subscription = await subscriptionService.getCurrentByStore(store.id);
          const publicProductCount = publicProductCounts.get(store.id) || 0;
          const supportsPostal = Boolean(store?.settings?.postalEnabled);
          if (hasUserCoords && !supportsPostal) {
            await storeService.ensureStoreCoordinates(store);
          }
          return StoreController.buildPublicStorePayload(store, publicProductCount, subscription);
        })
      );

      const hydrated = payloads
        .filter(Boolean)
        .map((entry: any) =>
          StoreController.enrichStoreGeoPayload(entry, {
            lat: userLat,
            lng: userLng,
            city: userCity || null,
            state: userState || null,
          })
        );

      const sortByProximity = (items: any[]) =>
        items.sort((a, b) => {
          const openDelta = Number(Boolean(b?.openNow)) - Number(Boolean(a?.openNow));
          if (openDelta !== 0) return openDelta;
          const distanceA = StoreController.toQueryNumber(a?.distanceKm);
          const distanceB = StoreController.toQueryNumber(b?.distanceKm);
          const normalizedDistanceA = distanceA !== null ? distanceA : Number.MAX_SAFE_INTEGER;
          const normalizedDistanceB = distanceB !== null ? distanceB : Number.MAX_SAFE_INTEGER;
          if (normalizedDistanceA !== normalizedDistanceB) return normalizedDistanceA - normalizedDistanceB;
          return Number(b?.reviewSummary?.avgStoreRating || 0) - Number(a?.reviewSummary?.avgStoreRating || 0);
        });

      const deliverableStores = sortByProximity(
        hydrated.filter((entry: any) => [ 'deliver_now', 'postal_everywhere' ].includes(String(entry.geoAvailability || '')))
      );
      const sameCityStores = sortByProximity(
        hydrated.filter((entry: any) => !deliverableStores.some((item: any) => item.id === entry.id) && entry.sameCity)
      );
      const nearbyStores = sortByProximity(
        hydrated.filter(
          (entry: any) => {
            if (String(entry?.geoAvailability || '').trim().toLowerCase() === 'out_of_region') return false;
            if (deliverableStores.some((item: any) => item.id === entry.id)) return false;
            if (sameCityStores.some((item: any) => item.id === entry.id)) return false;
            const distanceKm = StoreController.toQueryNumber(entry?.distanceKm);
            return distanceKm !== null && distanceKm <= MAX_NEARBY_DISCOVERY_DISTANCE_KM;
          }
        )
      );

      const mode =
        deliverableStores.length > 0
          ? 'deliverable'
          : sameCityStores.length > 0
            ? 'same_city_fallback'
            : nearbyStores.length > 0
              ? 'nearby_fallback'
              : 'no_coverage';
      const visibleStores =
        mode === 'deliverable'
          ? deliverableStores
          : mode === 'same_city_fallback'
            ? sameCityStores
            : mode === 'nearby_fallback'
              ? nearbyStores.slice(0, 12)
              : [];
      const nearestStoreId = deliverableStores[0]?.id || sameCityStores[0]?.id || nearbyStores[0]?.id || null;

      return res.json({
        mode,
        location: {
          lat: userLat,
          lng: userLng,
          city: userCity || null,
          state: userState || null,
        },
        summary: {
          deliverableCount: deliverableStores.length,
          sameCityCount: sameCityStores.length,
          nearbyCount: nearbyStores.length,
        },
        stores: visibleStores.map((entry: any) => ({
          ...entry,
          isNearest: nearestStoreId ? entry.id === nearestStoreId : false,
        })),
      });
    } catch (error: any) {
      log.warn('Store discovery list failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }



  /**
   * Gets by slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  static async getBySlug(req: Request, res: Response) {
    try {
      if (DEMO_SLUGS.has(req.params.slug)) {
        return res.json(buildDemoStore(req.params.slug));
      }
      log.debug('Store get by slug request', { slug: req.params.slug });
      const cacheKey = `stores:slug:${req.params.slug}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      const store = await storeService.getBySlug(req.params.slug);
      if (!store) return respondWithError(req, res, new AppError('STORE-001', 404), 404);
      await storeService.ensureStoreCoordinatesWithOpenStreetMap(store);
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
        paymentSummary: await StoreController.buildPublicPaymentSummary(store),
      };
      const payload = { ...sanitizedStore, subscription };
      await cacheService.set(cacheKey, payload, 60);
      return res.json(payload);
    } catch (error: any) {
      log.warn('Store get by slug failed', { slug: req.params.slug, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Tracks store link hit.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
   * Gets consolidated dashboard analytics for the store.
   */
  static async getDashboardAnalytics(req: Request, res: Response) {
    try {
      const storeId = req.params.storeId;
      if (!storeId) throw new AppError('STORE-001', 404);
      const periodRaw = String(req.query?.periodDays || '').trim().toLowerCase();
      const periodDays = !periodRaw || periodRaw === 'all' ? null : Number(periodRaw);
      const monthKey = String(req.query?.monthKey || '').trim() || undefined;
      const startDate = String(req.query?.startDate || '').trim() || undefined;
      const endDate = String(req.query?.endDate || '').trim() || undefined;
      const payload = await storeDashboardAnalyticsService.getReport(storeId, req.auth?.storeId, {
        periodDays,
        monthKey,
        startDate,
        endDate,
      });
      return res.json(payload);
    } catch (error: any) {
      log.warn('Store dashboard analytics failed', {
        storeId: req.params.storeId,
        periodDays: req.query?.periodDays,
        monthKey: req.query?.monthKey,
        startDate: req.query?.startDate,
        endDate: req.query?.endDate,
        error,
      });
      return respondWithError(req, res, error, 400);
    }
  }



  /**
   * Executes update logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  static async update(req: Request, res: Response) {
    try {
      log.info('Store update request', { storeId: req.params.storeId });
      const store = await storeService.update(req.params.storeId, req.body);
      await invalidateStoreBySlugCache(store.slug);
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
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  static async updateStatus(req: Request, res: Response) {
    try {
      log.info('Store status update request', { storeId: req.params.storeId, open: req.body?.open });
      const store = await storeService.setStatus(req.params.storeId, req.body.open);
      await invalidateStoreBySlugCache(store.slug);
      log.info('Store status updated', { storeId: req.params.storeId, open: store?.open });
      return res.json(store);
    } catch (error: any) {
      log.warn('Store status update failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }
}
