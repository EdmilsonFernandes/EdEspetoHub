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
import { OrderReview } from '../entities/OrderReview';
import { OrderItem } from '../entities/OrderItem';
import { OrderEtaEstimate } from '../entities/OrderEtaEstimate';
import { Motoboy } from '../entities/Motoboy';
import { MotoboyStore } from '../entities/MotoboyStore';
import { OrderDelivery } from '../entities/OrderDelivery';
import { DeliveryEvent } from '../entities/DeliveryEvent';
import { MotoboyDocument } from '../entities/MotoboyDocument';
import { MotoboyStoreRequest } from '../entities/MotoboyStoreRequest';
import { MotoboyAuditLog } from '../entities/MotoboyAuditLog';
import { DeliveryBillingCycle } from '../entities/DeliveryBillingCycle';
import { DeliveryBillingCharge } from '../entities/DeliveryBillingCharge';
import { Plan } from '../entities/Plan';
import { Subscription } from '../entities/Subscription';
import { Payment } from '../entities/Payment';
import { PaymentEvent } from '../entities/PaymentEvent';
import { PasswordReset } from '../entities/PasswordReset';
import { EmailVerification } from '../entities/EmailVerification';
import { SiteSetting } from '../entities/SiteSetting';
import { PlatformAdmin } from '../entities/PlatformAdmin';
import { AccessLog } from '../entities/AccessLog';
import { StoreLinkHit } from '../entities/StoreLinkHit';
import { StoreUser } from '../entities/StoreUser';
import { InventoryMovement } from '../entities/InventoryMovement';
import { OrderShipment } from '../entities/OrderShipment';
import { CustomerAddress } from '../entities/CustomerAddress';
import { FeaturedProductRequest } from '../entities/FeaturedProductRequest';
import { Condominium } from '../entities/Condominium';
import { StoreCondominium } from '../entities/StoreCondominium';
import { CondominiumEvent } from '../entities/CondominiumEvent';
import { CondominiumEventStore } from '../entities/CondominiumEventStore';
import { StoreCondominiumRequest } from '../entities/StoreCondominiumRequest';
import { CondominiumUser } from '../entities/CondominiumUser';
import { CondominiumAccessRequest } from '../entities/CondominiumAccessRequest';
import { CustomerEmailOtp } from '../entities/CustomerEmailOtp';
import { StorePaymentAccount } from '../entities/StorePaymentAccount';
import { OrderPayment } from '../entities/OrderPayment';
import { ZipCodeCache } from '../entities/ZipCodeCache';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.database.host,
  port: env.database.port,
  username: env.database.username,
  password: env.database.password,
  database: env.database.database,
  synchronize: false,
  entities: [ User, Store, StoreSettings, Product, Order, OrderShipment, OrderReview, OrderItem, OrderEtaEstimate, Motoboy, MotoboyStore, OrderDelivery, DeliveryEvent, MotoboyDocument, MotoboyStoreRequest, MotoboyAuditLog, DeliveryBillingCycle, DeliveryBillingCharge, Plan, Subscription, Payment, PaymentEvent, PasswordReset, EmailVerification, SiteSetting, PlatformAdmin, AccessLog, StoreLinkHit, StoreUser, InventoryMovement, CustomerAddress, FeaturedProductRequest, Condominium, StoreCondominium, CondominiumEvent, CondominiumEventStore, StoreCondominiumRequest, CondominiumUser, CondominiumAccessRequest, CustomerEmailOtp, StorePaymentAccount, OrderPayment, ZipCodeCache ],
  migrations: [],
  logging: [ 'error' ],
  extra: {
    max: env.database.poolMax,
    idleTimeoutMillis: env.database.poolIdleTimeoutMs,
    connectionTimeoutMillis: env.database.poolConnectionTimeoutMs,
    statement_timeout: env.database.statementTimeoutMs,
    idle_in_transaction_session_timeout: env.database.idleInTransactionSessionTimeoutMs,
  }
  //logging: [ 'error', 'query' ]
});
