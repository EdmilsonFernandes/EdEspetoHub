/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: OrderService.ts
 */

import { CreateOrderDto } from '../dto/CreateOrderDto';
import { Order } from '../entities/Order';
import { OrderDao } from '../database/dao/OrderDao';
import { ProductDao } from '../database/dao/ProductDao';
import { StoreDao } from '../database/dao/StoreDao';
import { AppError } from '../errors/AppError';
import { DeliveryBillingService } from './DeliveryBillingService';
import { DeliveryService } from './DeliveryService';
import { SubscriptionService } from './SubscriptionService';
import { UserDao } from '../database/dao/UserDao';
import { StoreUserDao } from '../database/dao/StoreUserDao';
import { Provide, Inject } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { DatabaseService } from '../database/data-base.service';
import { OrderResponse } from '../models/response/OrderResponse';

@Provide(Tokens.Common.Service.OrderService)
export class OrderService {
  constructor(
    @Inject(Tokens.Common.DataLayer.OrderRepository) private orderDao: OrderDao,
    @Inject(Tokens.Common.DataLayer.StoreRepository) private storeDao: StoreDao,
    @Inject(Tokens.Common.DataLayer.ProductRepository) private productDao: ProductDao,
    @Inject(Tokens.Common.DataLayer.UserRepository) private userDao: UserDao,
    @Inject(Tokens.Common.DataLayer.StoreUserRepository) private storeUserDao: StoreUserDao,
    @Inject(Tokens.Common.DataLayer.DatabaseService) private databaseService: DatabaseService,
    @Inject(Tokens.Common.Service.DeliveryBillingService) private deliveryBillingService: DeliveryBillingService,
    @Inject(Tokens.Common.Service.DeliveryService) private deliveryService: DeliveryService,
    @Inject(Tokens.Common.Service.SubscriptionService) private subscriptionService: SubscriptionService
  ) {}

  private mapToResponse(order: Order): OrderResponse {
    return {
      id: order.id,
      customerName: order.customerName,
      status: order.status,
      type: order.type,
      total: Number(order.total),
      items: (order.items || []).map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: Number(item.price),
        product: {
          id: item.product?.id,
          name: item.product?.name,
          price: Number(item.product?.price),
          promoActive: item.product?.promoActive,
          isFeatured: item.product?.isFeatured,
          manageStock: item.product?.manageStock,
          stockQuantity: item.product?.stockQuantity,
          lowStockAlert: item.product?.lowStockAlert,
          active: item.product?.active,
          createdAt: item.product?.createdAt,
        }
      })),
      createdAt: order.createdAt,
    };
  }

  async create(input: CreateOrderDto): Promise<OrderResponse> {
    const store = await this.storeDao.getById(input.storeId);
    if (!store) throw new AppError('STORE-001', 404);
    return this.databaseService.dataSource.transaction(async (manager) => {
      const order = await manager.getRepository(Order).save(new Order());
      return this.mapToResponse(order);
    });
  }

  async listByStoreId(storeId: string, authStoreId?: string): Promise<OrderResponse[]> {
    const orders = await this.orderDao.findByStoreId(storeId);
    return orders.map(o => this.mapToResponse(o));
  }

  async updateStatus(orderId: string, status: string, authStoreId?: string): Promise<OrderResponse> {
    const order = await this.orderDao.getById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    order.status = status;
    const saved = await this.orderDao.save(order);
    return this.mapToResponse(saved);
  }

  async updateItems(orderId: string, items: any[], authStoreId?: string): Promise<OrderResponse> {
    const order = await this.orderDao.getById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    return this.mapToResponse(order);
  }

  async getPublicById(orderId: string): Promise<{ order: OrderResponse; queuePosition: number; queueSize: number } | null> {
    const order = await this.orderDao.getById(orderId);
    if (!order) return null;
    return { 
      order: this.mapToResponse(order), 
      queuePosition: 1, 
      queueSize: 10 
    };
  }

  async listTopItemsBySlug(slug: string, limit: number): Promise<any[]> {
    return [];
  }

  async listTableStatusBySlug(slug: string): Promise<any[]> {
    return [];
  }

  async markItemsAsPrinted(orderId: string, itemIds: string[] | undefined, authStoreId?: string): Promise<{ orderId: string; updated: number }> {
    return { orderId, updated: 0 };
  }

  async reopenOrder(orderId: string, input: any, auth: any): Promise<OrderResponse | null> {
    const order = await this.orderDao.getById(orderId);
    return order ? this.mapToResponse(order) : null;
  }

  async createBySlug(input: any): Promise<OrderResponse> {
    return this.mapToResponse(new Order());
  }

  async listByStoreSlug(slug: string, authStoreId?: string): Promise<OrderResponse[]> {
    return [];
  }

  async calculateEta(order: Order): Promise<{ totalMinutes: number }> {
    return { totalMinutes: 20 };
  }
}
