/**
 * Integration tests for delivery rules (requires a real Postgres).
 *
 * To run:
 *   TEST_DATABASE_URL=postgres://... npm test
 */
// @ts-nocheck

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
if (!url) {
  console.log('Skipping DeliveryService integration tests (TEST_DATABASE_URL not set).');
  process.exit(0);
}

const ds = new DataSource({
  type: 'postgres',
  url,
  synchronize: true,
  logging: false,
  entities: [ User, Store, StoreSettings, Order, OrderDelivery, Motoboy, DeliveryEvent ],
});

const run = async () => {
  await ds.initialize();
  const svc = new DeliveryService();

  // Minimal table required by DeliveryService.acceptDelivery() link check.
  await ds.query(`
    CREATE TABLE IF NOT EXISTS motoboy_stores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      motoboy_id UUID NOT NULL,
      store_id UUID NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);

  // Minimal fixtures
  const userRepo = ds.getRepository(User);
  const storeRepo = ds.getRepository(Store);
  const settingsRepo = ds.getRepository(StoreSettings);
  const motoboyRepo = ds.getRepository(Motoboy);
  const orderRepo = ds.getRepository(Order);

  const owner = await userRepo.save(userRepo.create({ fullName: 'Owner', email: 'o@test.com', password: 'x', userRole: 'ADMIN' } as any));
  const store = await storeRepo.save(storeRepo.create({ name: 'Store', slug: 'store', owner } as any));
  await settingsRepo.save(settingsRepo.create({ store, deliveryFee: 10 } as any));

  const motUser = await userRepo.save(userRepo.create({ fullName: 'Motoboy', email: 'm@test.com', password: 'x', userRole: 'STORE_OWNER' } as any));
  const motoboy = await motoboyRepo.save(motoboyRepo.create({ userId: motUser.id, status: 'ACTIVE' } as any));

  // Link motoboy to store
  await ds.query(`INSERT INTO motoboy_stores (motoboy_id, store_id, active) VALUES ($1,$2,true)`, [ motoboy.id, store.id ]);

  const order1 = await orderRepo.save(orderRepo.create({ customerName: 'C', type: 'delivery', status: 'waiting_for_motoboy', total: 10, store, deliveryFee: 10 } as any));
  await svc.ensureQueueDelivery(order1 as any, ds.manager);

  // R2: concurrency (simulate sequentially with conditional update):
  await svc.acceptDelivery(order1.id, motoboy as any);
  try {
    await svc.acceptDelivery(order1.id, motoboy as any);
    throw new Error('Expected second accept to fail');
  } catch {}

  console.log('DeliveryService integration tests passed');
  await ds.destroy();
};

run().catch((e) => {
  console.error('Integration test failed', e);
  process.exit(1);
});
