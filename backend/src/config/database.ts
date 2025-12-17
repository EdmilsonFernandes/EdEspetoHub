import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './env';
import { User } from '../entities/User';
import { Store } from '../entities/Store';
import { StoreSettings } from '../entities/StoreSettings';
import { Product } from '../entities/Product';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Plan } from '../entities/Plan';
import { Subscription } from '../entities/Subscription';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.database.host,
  port: env.database.port,
  username: env.database.username,
  password: env.database.password,
  database: env.database.database,
  synchronize: false,
  logging: false,
  entities: [User, Store, StoreSettings, Product, Order, OrderItem, Plan, Subscription],
  migrations: [],
});
