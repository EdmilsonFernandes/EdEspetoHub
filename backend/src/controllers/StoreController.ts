import { Request, Response } from 'express';
import { StoreService } from '../services/StoreService';
import { SubscriptionService } from '../services/SubscriptionService';

const storeService = new StoreService();
const subscriptionService = new SubscriptionService();
const DEMO_SLUGS = new Set([ 'demo', 'test-store' ]);

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
    },
    owner: {
      id: 'demo-owner',
      fullName: 'Loja Demo',
      email: 'demo@chamanoespeto.com.br',
      phone: '(11) 99999-0000',
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
    if (!store?.open) return false;
    const openingHours = store?.settings?.openingHours;
    if (!Array.isArray(openingHours) || openingHours.length === 0) return true;

    const now = new Date();
    const day = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();

    const dayEntry = openingHours.find((entry: any) => entry?.day === day);
    if (!dayEntry || dayEntry?.enabled === false) return false;

    const intervals = Array.isArray(dayEntry.intervals) ? dayEntry.intervals : [];
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
  static async getBySlug(req: Request, res: Response) {
    try {
      if (DEMO_SLUGS.has(req.params.slug)) {
        return res.json(buildDemoStore(req.params.slug));
      }
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
          }
          : null,
        openNow: StoreController.isStoreOpenNow(store),
      };
      return res.json({ ...sanitizedStore, subscription });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const store = await storeService.update(req.params.storeId, req.body);
      return res.json(store);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const store = await storeService.setStatus(req.params.storeId, req.body.open);
      return res.json(store);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
