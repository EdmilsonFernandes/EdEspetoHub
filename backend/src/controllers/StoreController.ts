import { Request, Response } from 'express';
import { StoreService } from '../services/StoreService';
import { SubscriptionService } from '../services/SubscriptionService';
import { logger } from '../utils/logger';

const storeService = new StoreService();
const subscriptionService = new SubscriptionService();
const DEMO_SLUGS = new Set([ 'demo', 'test-store' ]);
const log = logger.child({ scope: 'StoreController' });

const buildDemoStore = (slug: string) => {
  const now = new Date();
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    id: 'demo-store',
    name: 'Chama no Espeto Demo',
    slug,
    open: true,
    createdAt: now,
    settings: {
      logoUrl: '/chama-no-espeto.jpeg',
      description: 'Loja demo de espetos com combos especiais e atendimento rapido.',
      primaryColor: '#dc2626',
      secondaryColor: '#111827',
      socialLinks: [ { type: 'instagram', value: 'chamanoespeto' } ],
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
    },
    owner: {
      id: 'demo-owner',
      fullName: 'Loja Demo',
      email: 'demo@chamanoespeto.com.br',
      phone: '(11) 99999-0000',
      address: 'Rua Demo 123, Centro - Sao Paulo/SP',
    },
    subscription: {
      status: 'ACTIVE',
      endDate,
    },
    openNow: true,
  };
};

export class StoreController {
  private static isStoreOpenNow(store: any) {
    const openingHours = store?.settings?.openingHours;
    if (!Array.isArray(openingHours) || openingHours.length === 0) return true;

    const now = new Date();
    const day = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();

    const dayEntry = openingHours.find((entry: any) => Number(entry?.day) === day);
    if (!dayEntry || dayEntry?.enabled === false) return false;

    const intervals = Array.isArray(dayEntry.intervals) ? dayEntry.intervals : [];
    if (!intervals.length) return true;
    return intervals.some((interval: any) => {
      if (!interval?.start || !interval?.end) return false;
      const [startH, startM] = interval.start.split(':').map(Number);
      const [endH, endM] = interval.end.split(':').map(Number);
      if (Number.isNaN(startH) || Number.isNaN(startM) || Number.isNaN(endH) || Number.isNaN(endM)) return false;

      const start = startH * 60 + startM;
      const end = endH * 60 + endM;

      if (end < start) {
        return minutes >= start || minutes < end;
      }

      return minutes >= start && minutes < end;
    });
  }

  static async listPortfolio(_req: Request, res: Response) {
    try {
      log.debug('Store portfolio list request');
      const stores = await storeService.listAll();
      const entries = await Promise.all(
        stores.map(async (store) => {
          const subscription = await subscriptionService.getCurrentByStore(store.id);
          const isActive = subscriptionService.isActiveSubscription(subscription);
          if (!isActive) return null;
          return {
            id: store.id,
            name: store.name,
            slug: store.slug,
            settings: store.settings
              ? {
                  logoUrl: store.settings.logoUrl || null,
                  description: store.settings.description || null,
                  primaryColor: store.settings.primaryColor || null,
                  secondaryColor: store.settings.secondaryColor || null,
                }
              : null,
          };
        })
      );
      return res.json(entries.filter(Boolean));
    } catch (error: any) {
      log.warn('Store portfolio list failed', { error });
      return res.status(400).json({ message: error.message });
    }
  }
  static async getBySlug(req: Request, res: Response) {
    try {
      if (DEMO_SLUGS.has(req.params.slug)) {
        return res.json(buildDemoStore(req.params.slug));
      }
      log.debug('Store get by slug request', { slug: req.params.slug });
      const store = await storeService.getBySlug(req.params.slug);
      if (!store) return res.status(404).json({ message: 'Loja não encontrada' });
      const subscription = await subscriptionService.getCurrentByStore(store.id);
      const sanitizedStore = {
        id: store.id,
        name: store.name,
        slug: store.slug,
        open: store.open,
        createdAt: store.createdAt,
        settings: store.settings,
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
      return res.json({ ...sanitizedStore, subscription });
    } catch (error: any) {
      log.warn('Store get by slug failed', { slug: req.params.slug, error });
      return res.status(400).json({ message: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      log.info('Store update request', { storeId: req.params.storeId });
      const store = await storeService.update(req.params.storeId, req.body);
      log.info('Store updated', { storeId: req.params.storeId });
      return res.json(store);
    } catch (error: any) {
      log.warn('Store update failed', { storeId: req.params.storeId, error });
      return res.status(400).json({ message: error.message });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      log.info('Store status update request', { storeId: req.params.storeId, open: req.body?.open });
      const store = await storeService.setStatus(req.params.storeId, req.body.open);
      log.info('Store status updated', { storeId: req.params.storeId, open: store?.open });
      return res.json(store);
    } catch (error: any) {
      log.warn('Store status update failed', { storeId: req.params.storeId, error });
      return res.status(400).json({ message: error.message });
    }
  }
}
