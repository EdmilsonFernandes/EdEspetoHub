/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: OrderService.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { CreateOrderDto, CreateOrderItemInput } from '../dto/CreateOrderDto';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { OrderRepository } from '../repositories/OrderRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { StoreRepository } from '../repositories/StoreRepository';
import { AppDataSource } from '../config/database';
import { AppError } from '../errors/AppError';
/**
 * Provides OrderService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class OrderService
{
  private orderRepository = new OrderRepository();
  private storeRepository = new StoreRepository();
  private productRepository = new ProductRepository();

  /**
   * Resolves the price used for an item.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-22
   */
  private resolveItemPrice(product: Awaited<ReturnType<ProductRepository[ 'findById' ]>>)
  {
    if (!product) return 0;
    const promoActive = Boolean((product as any).promoActive);
    const promoPriceRaw = (product as any).promoPrice ?? null;
    const promoPrice = promoPriceRaw !== null && promoPriceRaw !== undefined ? Number(promoPriceRaw) : 0;
    if (promoActive && promoPrice > 0) {
      return promoPrice;
    }
    return Number((product as any).price) || 0;
  }

  /**
   * Ensures store access.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  private ensureStoreAccess(store: Awaited<ReturnType<StoreRepository[ 'findById' ]>>, authStoreId?: string)
  {
    if (!store) throw new AppError('STORE-001', 404);
    if (authStoreId && store.id !== authStoreId)
    {
      throw new AppError('AUTH-003', 403);
    }
  }




  /**
   * Executes create logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async create(input: CreateOrderDto)
  {
    const store = await this.storeRepository.findById(input.storeId);
    if (!store) throw new AppError('STORE-001', 404);

    const order = await this.buildOrder(input, store);
    return this.orderRepository.save(order);
  }




  /**
   * Creates by slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async createBySlug(input: Omit<CreateOrderDto, 'storeId'> & { storeSlug: string })
  {
    const store = await this.storeRepository.findBySlug(input.storeSlug);
    if (!store) throw new AppError('STORE-001', 404);

    const order = await this.buildOrder(input, store);
    return this.orderRepository.save(order);
  }




  /**
   * Lists by store id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async listByStoreId(storeId: string, authStoreId?: string)
  {
    const store = await this.storeRepository.findById(storeId);
    this.ensureStoreAccess(store, authStoreId);
    return this.orderRepository.findByStoreId(store!.id);
  }




  /**
   * Lists by store slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async listByStoreSlug(slug: string, authStoreId?: string)
  {
    const store = await this.storeRepository.findBySlug(slug);
    this.ensureStoreAccess(store, authStoreId);
    return this.orderRepository.findByStoreId(store!.id);
  }




  /**
   * Lists top items for today.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-21
   */
  async listTopItemsBySlug(slug: string, limit = 3)
  {
    const store = await this.storeRepository.findBySlug(slug);
    if (!store) throw new AppError('STORE-001', 404);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const rows = await this.orderRepository.findTopItemsByStoreSince(store.id, since, limit);
    return rows.map((row) => ({
      productId: row.productId,
      name: row.name,
      imageUrl: row.imageUrl || null,
      price: row.price ? Number(row.price) : 0,
      qty: row.qty ? Number(row.qty) : 0,
      total: row.total ? Number(row.total) : 0,
    }));
  }




  /**
   * Updates status.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async updateStatus(orderId: string, status: string, authStoreId?: string)
  {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    this.ensureStoreAccess(order.store, authStoreId);

    order.status = status;
    return this.orderRepository.save(order);
  }




  /**
   * Updates items.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async updateItems(orderId: string, items: CreateOrderItemInput[], authStoreId?: string)
  {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    this.ensureStoreAccess(order.store, authStoreId);

    await AppDataSource.createQueryBuilder()
      .delete()
      .from(OrderItem)
      .where('order_id = :id', { id: order.id })
      .execute();

    const nextItems: OrderItem[] = [];
    let total = 0;

    for (const item of items)
    {
      const productId = item.productId || (item as any).id;
      if (!productId) continue;

      const product = await this.productRepository.findById(productId);
      if (!product || product.store.id !== order.store.id)
      {
        throw new AppError('PROD-002', 400);
      }

      const orderItem = new OrderItem();
      orderItem.product = product;
      orderItem.order = order;
      orderItem.quantity = item.quantity;
      const unitPrice = this.resolveItemPrice(product);
      orderItem.price = unitPrice * item.quantity;
      orderItem.cookingPoint = item.cookingPoint;
      orderItem.passSkewer = Boolean(item.passSkewer);
      nextItems.push(orderItem);
      total += orderItem.price;
    }

    order.items = nextItems;
    order.total = total;

    return this.orderRepository.save(order);
  }




  /**
   * Gets public by id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async getPublicById(orderId: string)
  {
    const order = await this.orderRepository.findById(orderId);
    if (!order) return null;
    const queueStatuses = [ 'pending', 'preparing', 'ready' ];
    let queuePosition: number | null = null;
    let queueSize: number | null = null;

    if (order.store?.id) {
      queueSize = await this.orderRepository.countByStoreAndStatuses(order.store.id, queueStatuses);
      if (queueStatuses.includes(order.status)) {
        queuePosition = await this.orderRepository.countQueueAhead(order.store.id, queueStatuses, order.createdAt);
        if (typeof queuePosition === 'number') {
          queuePosition += 1;
        }
      }
    }

    return { order, queuePosition, queueSize };
  }




  /**
   * Builds order.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  private async buildOrder(input: Omit<CreateOrderDto, 'storeId'>, store: Awaited<ReturnType<StoreRepository[ 'findById' ]>>)
  {
    const allowedTypes = Array.isArray(store?.settings?.orderTypes) && store.settings.orderTypes.length > 0
      ? store.settings.orderTypes
      : [ 'delivery', 'pickup', 'table' ];
    if (!allowedTypes.includes(input.type)) {
      throw new AppError('ORDER-002', 400);
    }
    if (input.type === 'table' && input.table) {
      const activeStatuses = [ 'pending', 'preparing' ];
      const activeCount = await this.orderRepository.countActiveByTable(
        store!.id,
        input.table,
        activeStatuses
      );
      if (activeCount > 0) {
        throw new AppError('ORDER-003', 409, { table: input.table });
      }
    }
    const items: OrderItem[] = [];
    let total = 0;

    for (const item of input.items)
    {
      const product = await this.productRepository.findById(item.productId);
      if (!product || product.store.id !== store!.id)
      {
        throw new AppError('PROD-002', 400);
      }

      const orderItem = new OrderItem();
      orderItem.product = product;
      orderItem.quantity = item.quantity;
      const unitPrice = this.resolveItemPrice(product);
      orderItem.price = unitPrice * item.quantity;
      orderItem.cookingPoint = item.cookingPoint;
      orderItem.passSkewer = Boolean(item.passSkewer);
      items.push(orderItem);
      total += orderItem.price;
    }

    const cashTendered =
      input.paymentMethod === 'dinheiro' && input.cashTendered !== undefined && input.cashTendered !== null
        ? Number(input.cashTendered)
        : null;

    return this.orderRepository.create({
      customerName: input.customerName,
      phone: input.phone,
      address: input.address,
      table: input.table,
      type: input.type,
      paymentMethod: input.paymentMethod,
      cashTendered,
      items,
      total,
      store: store!,
    } as Order);
  }
}
