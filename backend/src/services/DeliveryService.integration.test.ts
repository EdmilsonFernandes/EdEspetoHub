/**
 * Integration tests for delivery rules (requires a real Postgres).
 *
 * To run:
 *   TEST_DATABASE_URL=postgres://... vitest run --config vitest.config.unit.ts DeliveryService.integration
 */
// @ts-nocheck

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { DeliveryEvent } from '../entities/DeliveryEvent';
import { Motoboy } from '../entities/Motoboy';
import { Order } from '../entities/Order';
import { OrderDelivery } from '../entities/OrderDelivery';
import { Store } from '../entities/Store';
import { StoreSettings } from '../entities/StoreSettings';
import { User } from '../entities/User';
import { DeliveryService } from './DeliveryService';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('DeliveryService integration (real DB)', () => {
  let ds: DataSource;
  let svc: DeliveryService;
  let store: any;
  let motoboy: any;
  let order1: any;

  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      url,
      synchronize: true,
      logging: false,
      entities: [User, Store, StoreSettings, Order, OrderDelivery, Motoboy, DeliveryEvent],
    });
    await ds.initialize();
    svc = new DeliveryService();

    await ds.query(`
      CREATE TABLE IF NOT EXISTS motoboy_stores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        motoboy_id UUID NOT NULL,
        store_id UUID NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);

    const userRepo = ds.getRepository(User);
    const storeRepo = ds.getRepository(Store);
    const settingsRepo = ds.getRepository(StoreSettings);
    const motoboyRepo = ds.getRepository(Motoboy);
    const orderRepo = ds.getRepository(Order);

    const owner = await userRepo.save(userRepo.create({ fullName: 'Owner', email: 'o@test.com', password: 'x', userRole: 'ADMIN' } as any));
    store = await storeRepo.save(storeRepo.create({ name: 'Store', slug: 'store', owner } as any));
    await settingsRepo.save(settingsRepo.create({ store, deliveryFee: 10 } as any));

    const motUser = await userRepo.save(userRepo.create({ fullName: 'Motoboy', email: 'm@test.com', password: 'x', userRole: 'STORE_OWNER' } as any));
    motoboy = await motoboyRepo.save(motoboyRepo.create({ userId: motUser.id, status: 'ACTIVE' } as any));

    await ds.query(`INSERT INTO motoboy_stores (motoboy_id, store_id, active) VALUES ($1,$2,true)`, [motoboy.id, store.id]);

    order1 = await orderRepo.save(orderRepo.create({ customerName: 'C', type: 'delivery', status: 'waiting_for_motoboy', total: 10, store, deliveryFee: 10 } as any));
    await svc.ensureQueueDelivery(order1 as any, ds.manager);
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('first accept succeeds', async () => {
    await svc.acceptDelivery(order1.id, motoboy as any);
  });

  it('second accept on same order fails (concurrency)', async () => {
    await expect(svc.acceptDelivery(order1.id, motoboy as any)).rejects.toThrow();
  });
});
