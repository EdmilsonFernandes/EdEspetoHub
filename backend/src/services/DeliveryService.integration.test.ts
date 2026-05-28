/**
 * Integration tests for delivery rules (requires a real Postgres).
 * Loads .env.test automatically so AppDataSource points to espetinho_test.
 */
// @ts-nocheck

import dotenv from 'dotenv';
dotenv.config({ path: '.env.test', override: true });

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import 'reflect-metadata';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('DeliveryService integration (real DB)', () => {
  let AppDataSource: any;
  let User: any;
  let Store: any;
  let StoreSettings: any;
  let Motoboy: any;
  let MotoboyStore: any;
  let Order: any;
  let DeliveryService: any;
  let svc: DeliveryService;
  let store: any;
  let motoboy: any;
  let order1: any;

  beforeAll(async () => {
    ({ AppDataSource } = await import('../config/database'));
    ({ User } = await import('../entities/User'));
    ({ Store } = await import('../entities/Store'));
    ({ StoreSettings } = await import('../entities/StoreSettings'));
    ({ Motoboy } = await import('../entities/Motoboy'));
    ({ MotoboyStore } = await import('../entities/MotoboyStore'));
    ({ Order } = await import('../entities/Order'));
    ({ DeliveryService } = await import('./DeliveryService'));

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    await AppDataSource.synchronize(true);
    svc = new DeliveryService();

    const owner = await AppDataSource.getRepository(User).save(
      AppDataSource.getRepository(User).create({ fullName: 'Owner', email: 'o@test.com', password: 'x', userRole: 'ADMIN' } as any),
    );
    store = await AppDataSource.getRepository(Store).save(
      AppDataSource.getRepository(Store).create({ name: 'Store', slug: 'store', owner } as any),
    );
    await AppDataSource.getRepository(StoreSettings).save(
      AppDataSource.getRepository(StoreSettings).create({ store, deliveryFee: 10 } as any),
    );

    const motUser = await AppDataSource.getRepository(User).save(
      AppDataSource.getRepository(User).create({ fullName: 'Motoboy', email: 'm@test.com', password: 'x', userRole: 'STORE_OWNER' } as any),
    );
    motoboy = await AppDataSource.getRepository(Motoboy).save(
      AppDataSource.getRepository(Motoboy).create({ userId: motUser.id, status: 'ACTIVE' } as any),
    );

    await AppDataSource.getRepository(MotoboyStore).save(
      AppDataSource.getRepository(MotoboyStore).create({ motoboyId: motoboy.id, storeId: store.id, active: true } as any),
    );

    order1 = await AppDataSource.getRepository(Order).save(
      AppDataSource.getRepository(Order).create({ customerName: 'C', type: 'delivery', status: 'waiting_for_motoboy', total: 10, store, deliveryFee: 10 } as any),
    );
    await svc.ensureQueueDelivery(order1 as any, AppDataSource.manager);
  }, 60_000);

  afterAll(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });

  it('first accept succeeds', async () => {
    await svc.acceptDelivery(order1.id, motoboy as any);
  });

  it('second accept on same order fails (concurrency)', async () => {
    await expect(svc.acceptDelivery(order1.id, motoboy as any)).rejects.toThrow();
  });
});
