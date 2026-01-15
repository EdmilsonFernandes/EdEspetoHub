/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: database.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

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
import { Payment } from '../entities/Payment';
import { PaymentEvent } from '../entities/PaymentEvent';
import { PasswordReset } from '../entities/PasswordReset';
import { EmailVerification } from '../entities/EmailVerification';
import { SiteSetting } from '../entities/SiteSetting';
import { PlatformAdmin } from '../entities/PlatformAdmin';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.database.host,
  port: env.database.port,
  username: env.database.username,
  password: env.database.password,
  database: env.database.database,
  synchronize: false,
  entities: [ User, Store, StoreSettings, Product, Order, OrderItem, Plan, Subscription, Payment, PaymentEvent, PasswordReset, EmailVerification, SiteSetting, PlatformAdmin ],
  migrations: [],
  logging: [ 'error' ]
  //logging: [ 'error', 'query' ]
});
