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
import { DeliveryBillingService } from './DeliveryBillingService';
import { deliveryService } from './DeliveryService';
import { SubscriptionService } from './SubscriptionService';
import { resolvePlanFeatures } from '../config/planFeatures';
import { UserRepository } from '../repositories/UserRepository';
import { StoreUserRepository } from '../repositories/StoreUserRepository';
import bcrypt from 'bcryptjs';
import { EntityManager } from 'typeorm';
import { Product } from '../entities/Product';
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
  private deliveryBillingService = new DeliveryBillingService();
  private subscriptionService = new SubscriptionService();
  private userRepository = new UserRepository();
  private storeUserRepository = new StoreUserRepository();
  private tz = process.env.APP_TZ || 'America/Sao_Paulo';

  private async reconcileDeliveredOrdersByStore(storeId: string) {
    if (!storeId) return;
    await AppDataSource.query(
      `
        UPDATE orders o
           SET status = 'delivered'
          FROM order_deliveries od
         WHERE o.id = od.order_id
           AND o.store_id = $1
           AND o.type = 'delivery'
           AND o.status = 'in_delivery'
           AND od.status = 'DELIVERED'
      `,
      [storeId]
    );

    // Auto-close stale operational orders (older than 6h) to avoid stuck queue.
    await AppDataSource.query(
      `
        UPDATE orders o
           SET status = 'done',
               payment_status = CASE
                 WHEN UPPER(COALESCE(o.payment_status, '')) = 'PAID' THEN 'PAID'
                 ELSE 'PAID'
               END
         WHERE o.store_id = $1
           AND o.status IN ('pending', 'preparing', 'ready', 'ready_for_delivery', 'waiting_for_motoboy')
           AND o.created_at <= (NOW() - INTERVAL '6 hours')
      `,
      [storeId]
    );
  }

  private async reconcileDeliveredOrderById(orderId: string) {
    if (!orderId) return;
    await AppDataSource.query(
      `
        UPDATE orders o
           SET status = 'delivered'
          FROM order_deliveries od
         WHERE o.id = od.order_id
           AND o.id = $1
           AND o.type = 'delivery'
           AND o.status = 'in_delivery'
           AND od.status = 'DELIVERED'
      `,
      [orderId]
    );
  }

  private async attachDeliverySnapshot(orders: any[]) {
    if (!Array.isArray(orders) || orders.length === 0) return orders;
    const orderIds = orders
      .map((order: any) => String(order?.id || '').trim())
      .filter(Boolean);
    if (!orderIds.length) return orders;

    const deliveryRows: Array<any> = await AppDataSource.query(
      `
        SELECT
          od.order_id,
          od.status,
          od.motoboy_id,
          od.accepted_at,
          od.picked_up_at,
          od.in_transit_at,
          od.delivered_at
        FROM order_deliveries od
        WHERE od.order_id = ANY($1::uuid[])
      `,
      [orderIds]
    );

    if (!Array.isArray(deliveryRows) || deliveryRows.length === 0) return orders;
    const motoboyIds = Array.from(
      new Set(
        deliveryRows
          .map((row) => String(row?.motoboy_id || '').trim())
          .filter(Boolean)
      )
    );

    const motoboyRows: Array<any> =
      motoboyIds.length > 0
        ? await AppDataSource.query(
            `
              SELECT
                m.id AS motoboy_id,
                u.full_name,
                u.profile_image_url
              FROM motoboys m
              LEFT JOIN users u ON u.id = m.user_id
              WHERE m.id = ANY($1::uuid[])
            `,
            [motoboyIds]
          )
        : [];

    const motoboyById = new Map<string, any>();
    for (const row of motoboyRows) {
      const id = String(row?.motoboy_id || '').trim();
      if (!id) continue;
      motoboyById.set(id, {
        id,
        name: row?.full_name || null,
        profileImageUrl: row?.profile_image_url || null,
      });
    }

    const deliveryByOrderId = new Map<string, any>();
    for (const row of deliveryRows) {
      const orderId = String(row?.order_id || '').trim();
      if (!orderId) continue;
      const motoboyId = row?.motoboy_id ? String(row.motoboy_id) : null;
      deliveryByOrderId.set(orderId, {
        status: row?.status || null,
        motoboyId,
        motoboy: motoboyId ? motoboyById.get(motoboyId) || { id: motoboyId, name: null, profileImageUrl: null } : null,
        acceptedAt: row?.accepted_at || null,
        pickedUpAt: row?.picked_up_at || null,
        inTransitAt: row?.in_transit_at || null,
        deliveredAt: row?.delivered_at || null,
      });
    }

    return orders.map((order: any) => {
      const orderId = String(order?.id || '').trim();
      const snapshot = deliveryByOrderId.get(orderId) || null;
      return {
        ...order,
        delivery: snapshot,
      };
    });
  }

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

  private resolveBundleDiscount(
    product: Awaited<ReturnType<ProductRepository[ 'findById' ]>>,
    quantity: number
  )
  {
    if (!product) return 0;
    const bundleActive = Boolean((product as any).bundlePromoActive);
    const bundleQty = Math.max(0, Math.floor(Number((product as any).bundlePromoQty || 0)));
    const bundlePrice = Number((product as any).bundlePromoPrice || 0);
    const qty = Math.max(0, Math.floor(Number(quantity || 0)));
    if (!bundleActive || bundleQty < 2 || bundlePrice <= 0 || qty < bundleQty) return 0;

    const baseUnitPrice = this.resolveItemPrice(product);
    if (!(baseUnitPrice > 0)) return 0;

    const groups = Math.floor(qty / bundleQty);
    if (groups <= 0) return 0;

    const regularGroup = baseUnitPrice * bundleQty;
    const discountPerGroup = Math.max(0, regularGroup - bundlePrice);
    if (discountPerGroup <= 0) return 0;

    return Number((discountPerGroup * groups).toFixed(2));
  }

  private normalizeText(value: unknown)
  {
    return String(value || '').trim().toLowerCase();
  }

  private resolveSelectedModifiers(
    product: Awaited<ReturnType<ProductRepository[ 'findById' ]>>,
    selected: any
  )
  {
    const available = Array.isArray((product as any)?.modifiers) ? (product as any).modifiers : [];
    if (!available.length || !Array.isArray(selected) || !selected.length) {
      return { items: [] as Array<{ id: string; name: string; price: number }>, unitExtra: 0 };
    }
    const byId = new Map<string, any>();
    const byName = new Map<string, any>();
    for (const modifier of available) {
      if (!modifier || modifier.active === false) continue;
      const id = String(modifier.id || '').trim();
      const name = String(modifier.name || '').trim();
      const price = Number(modifier.price);
      if (!id || !name || !Number.isFinite(price) || price <= 0) continue;
      byId.set(id, { id, name, price: Number(price.toFixed(2)) });
      byName.set(this.normalizeText(name), { id, name, price: Number(price.toFixed(2)) });
    }
    const resolvedById = new Map<string, { id: string; name: string; price: number; quantity: number }>();
    for (const item of selected) {
      const byIdMatch = byId.get(String(item?.id || '').trim());
      const byNameMatch = byName.get(this.normalizeText(item?.name));
      const match = byIdMatch || byNameMatch;
      if (!match) continue;
      const quantityRaw = Number(item?.quantity ?? 1);
      const quantity = Number.isFinite(quantityRaw) ? Math.max(1, Math.floor(quantityRaw)) : 1;
      const current = resolvedById.get(match.id);
      resolvedById.set(match.id, {
        id: match.id,
        name: match.name,
        price: match.price,
        quantity: (current?.quantity || 0) + quantity,
      });
    }
    const resolved = Array.from(resolvedById.values()).map((entry) => ({
      ...entry,
      quantity: Math.max(1, Math.min(20, entry.quantity)),
    }));
    const unitExtra = resolved.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
      0
    );
    return { items: resolved, unitExtra: Number(unitExtra.toFixed(2)) };
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
    return AppDataSource.transaction(async (manager) => {
      const order = await this.buildOrder(input, store, manager);
      return manager.getRepository(Order).save(order);
    });
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
    return AppDataSource.transaction(async (manager) => {
      const order = await this.buildOrder(input, store, manager);
      return manager.getRepository(Order).save(order);
    });
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
    await this.reconcileDeliveredOrdersByStore(store!.id);
    const orders = await this.orderRepository.findByStoreId(store!.id);
    return this.attachDeliverySnapshot(orders as any[]);
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
    await this.reconcileDeliveredOrdersByStore(store!.id);
    const orders = await this.orderRepository.findByStoreId(store!.id);
    return this.attachDeliverySnapshot(orders as any[]);
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
    const rows = await this.orderRepository.findTopItemsByStoreToday(store.id, limit, this.tz);
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
   * Lists public table occupancy status by store slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-03-12
   */
  async listTableStatusBySlug(slug: string)
  {
    const store = await this.storeRepository.findBySlug(slug);
    if (!store) throw new AppError('STORE-001', 404);
    const activeStatuses = [ 'pending', 'preparing' ];
    const occupiedTables = await this.orderRepository.findActiveTablesByStore(store.id, activeStatuses);
    return {
      occupiedTables,
      updatedAt: new Date().toISOString(),
    };
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

    const deliveryStatuses = new Set([
      'ready_for_delivery',
      'waiting_for_motoboy',
      'in_delivery',
      'delivered',
      'finished',
    ]);
    if (order.type !== 'delivery' && deliveryStatuses.has(status)) {
      throw new AppError('ORDER-004', 400);
    }
    if (order.type === 'delivery' && deliveryStatuses.has(status)) {
      const transitions: Record<string, string[]> = {
        pending: [ 'preparing' ],
        preparing: [ 'ready_for_delivery', 'waiting_for_motoboy' ],
        ready_for_delivery: [ 'waiting_for_motoboy', 'in_delivery' ],
        waiting_for_motoboy: [ 'in_delivery' ],
        in_delivery: [ 'delivered', 'finished' ],
        delivered: [ 'finished' ],
      };
      const allowedNext = transitions[order.status] || [];
      if (!allowedNext.includes(status)) {
        throw new AppError('ORDER-004', 400);
      }
    }

    order.status = status;
    const saved = await this.orderRepository.save(order);
    if (saved.type === 'delivery' && [ 'ready_for_delivery', 'waiting_for_motoboy' ].includes(status)) {
      await deliveryService.ensureQueueDelivery(saved as any);
    }
    if (order.type === 'delivery' && [ 'delivered', 'finished' ].includes(status)) {
      await this.deliveryBillingService.recordDelivery(saved);
    }
    return saved;
  }

  async reopenOrder(
    orderId: string,
    input: { reason?: string; adminIdentifier?: string; adminPassword?: string },
    auth?: { storeId?: string; role?: string; sub?: string }
  ) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    this.ensureStoreAccess(order.store, auth?.storeId);

    const currentStatus = String(order.status || '').toLowerCase();
    const allowedFinalStatuses = new Set([ 'done', 'finished', 'delivered' ]);
    if (!allowedFinalStatuses.has(currentStatus)) {
      throw new AppError('ORDER-004', 400, { message: 'Apenas pedidos finalizados podem ser reabertos.' });
    }

    const requesterRole = String(auth?.role || '').toUpperCase();
    const isRequesterAdmin = requesterRole === 'ADMIN';

    if (!isRequesterAdmin) {
      const identifier = String(input?.adminIdentifier || '').trim().toLowerCase();
      const password = String(input?.adminPassword || '').trim();
      if (!identifier || !password) {
        throw new AppError('AUTH-004', 401, { message: 'Credenciais de admin obrigatórias para reabrir.' });
      }

      const adminUser = await this.userRepository.findByLoginIdentifier(identifier);
      if (!adminUser) throw new AppError('AUTH-004', 401);

      const validPassword = await bcrypt.compare(password, adminUser.password);
      if (!validPassword) throw new AppError('AUTH-004', 401);

      const isStoreOwnerAdmin = String(order.store?.owner?.id || '') === String(adminUser.id || '');
      const membership = await this.storeUserRepository.findByStoreAndUser(order.store.id, adminUser.id);
      const isStoreAdminMember =
        Boolean(membership?.isActive) && String(membership?.role || '').toUpperCase() === 'ADMIN';

      if (!isStoreOwnerAdmin && !isStoreAdminMember) {
        throw new AppError('AUTH-004', 401, { message: 'Admin inválido para esta loja.' });
      }
    }

    // Authorized for edit: keep final status and return current order.
    return order;
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
      const selectedModifiers = this.resolveSelectedModifiers(product, (item as any).selectedModifiers);
      orderItem.selectedModifiers = selectedModifiers.items.length ? selectedModifiers.items : null;
      const grossLine = (unitPrice + selectedModifiers.unitExtra) * item.quantity;
      const bundleDiscount = this.resolveBundleDiscount(product, item.quantity);
      orderItem.price = Math.max(0, grossLine - bundleDiscount);
      orderItem.cookingPoint = item.cookingPoint;
      orderItem.passSkewer = Boolean(item.passSkewer);
      orderItem.isPrinted = Boolean((item as any).isPrinted);
      nextItems.push(orderItem);
      total += orderItem.price;
    }

    const deliveryFee = order.deliveryFee ? Number(order.deliveryFee) : 0;
    const deliveryFeeValue = Number.isNaN(deliveryFee) ? 0 : deliveryFee;

    order.items = nextItems;
    order.total = total + deliveryFeeValue;
    // Prevent status regression (race with status updates like done/delivered).
    const statusRow = await AppDataSource.query(
      `SELECT status FROM orders WHERE id = $1 LIMIT 1`,
      [ order.id ]
    );
    const latestStatus = String(statusRow?.[0]?.status || '').trim().toLowerCase();
    if (latestStatus) {
      order.status = latestStatus;
    }

    return this.orderRepository.save(order);
  }

  async markItemsAsPrinted(orderId: string, itemIds: string[] | undefined, authStoreId?: string) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    this.ensureStoreAccess(order.store, authStoreId);

    const affected = await this.orderRepository.markItemsAsPrinted(order.id, itemIds);
    return { orderId: order.id, updated: affected };
  }




  /**
   * Gets public by id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async getPublicById(orderId: string)
  {
    await this.reconcileDeliveredOrderById(orderId);
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
  private async buildOrder(
    input: Omit<CreateOrderDto, 'storeId'>,
    store: Awaited<ReturnType<StoreRepository['findById']>>,
    manager?: EntityManager
  )
  {
    const subscription = store?.id ? await this.subscriptionService.getCurrentByStore(store.id) : null;
    const features = resolvePlanFeatures({
      planName: subscription?.plan?.name,
      planExempt: Boolean(store?.settings?.planExempt),
      subscriptionStatus: subscription?.status,
    });
    const baseAllowedTypes = Array.isArray(store?.settings?.orderTypes) && store.settings.orderTypes.length > 0
      ? store.settings.orderTypes
      : [ 'delivery', 'pickup', 'table' ];
    const allowedTypes = features.deliveryMode
      ? baseAllowedTypes
      : baseAllowedTypes.filter((type) => String(type || '').toLowerCase() !== 'delivery');
    const safeAllowedTypes = allowedTypes.length ? allowedTypes : [ 'pickup', 'table' ];
    if (!safeAllowedTypes.includes(input.type)) {
      throw new AppError('ORDER-002', 400);
    }
    // Mesa sem bloqueio: permite múltiplos pedidos ativos no mesmo número.
    const normalizedItems = Array.isArray(input.items)
      ? input.items.filter((item) => Number(item?.quantity || 0) > 0 && Boolean(item?.productId))
      : [];
    if (!normalizedItems.length) {
      throw new AppError('ORDER-005', 400, { message: 'Pedido precisa ter ao menos um item válido.' });
    }

    const items: OrderItem[] = [];
    let total = 0;

    for (const item of normalizedItems)
    {
      const product = manager
        ? await manager.getRepository(Product).findOne({ where: { id: item.productId }, relations: [ 'store' ] })
        : await this.productRepository.findById(item.productId);
      if (!product || product.store.id !== store!.id)
      {
        throw new AppError('PROD-002', 400);
      }

      if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
        throw new AppError('ORDER-005', 400, { message: 'Item com quantidade inválida.' });
      }

      if (Boolean((product as any).manageStock)) {
        const qty = Math.max(1, Math.floor(Number(item.quantity || 0)));
        const rows = await (manager || AppDataSource).query(
          `
            UPDATE products
               SET stock_quantity = stock_quantity - $1
             WHERE id = $2
               AND manage_stock = TRUE
               AND stock_quantity >= $1
           RETURNING id
          `,
          [qty, product.id]
        );
        if (!Array.isArray(rows) || rows.length === 0) {
          throw new AppError('ORDER-005', 400, {
            message: `Estoque insuficiente para "${product.name}".`,
          });
        }
      }

      const orderItem = new OrderItem();
      orderItem.product = product;
      orderItem.quantity = item.quantity;
      const unitPrice = this.resolveItemPrice(product);
      const selectedModifiers = this.resolveSelectedModifiers(product, (item as any).selectedModifiers);
      orderItem.selectedModifiers = selectedModifiers.items.length ? selectedModifiers.items : null;
      const grossLine = (unitPrice + selectedModifiers.unitExtra) * item.quantity;
      const bundleDiscount = this.resolveBundleDiscount(product, item.quantity);
      orderItem.price = Math.max(0, grossLine - bundleDiscount);
      orderItem.cookingPoint = item.cookingPoint;
      orderItem.passSkewer = Boolean(item.passSkewer);
      orderItem.isPrinted = Boolean(item.isPrinted);
      items.push(orderItem);
      total += orderItem.price;
    }

    const cashTendered =
      input.paymentMethod === 'dinheiro' && input.cashTendered !== undefined && input.cashTendered !== null
        ? Number(input.cashTendered)
        : null;
    const normalizedPaymentStatus = (input.paymentStatus || '').toString().trim().toUpperCase();
    const paymentStatus = normalizedPaymentStatus === 'PAID' ? 'PAID' : 'PENDING';
    const deliveryFee =
      input.type === 'delivery' && input.deliveryFee !== undefined && input.deliveryFee !== null
        ? Number(input.deliveryFee)
        : null;
    const deliveryFeeValue = !Number.isNaN(Number(deliveryFee)) && Number(deliveryFee) > 0
      ? Number(deliveryFee)
      : 0;

    return this.orderRepository.create({
      customerName: input.customerName,
      phone: input.phone,
      address: input.address,
      table: input.table,
      type: input.type,
      paymentMethod: input.paymentMethod,
      paymentStatus,
      cashTendered,
      deliveryFee: deliveryFeeValue || null,
      items,
      total: total + deliveryFeeValue,
      store: store!,
    } as Order);
  }
}
