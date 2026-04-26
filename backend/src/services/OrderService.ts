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
import { randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import { Product } from '../entities/Product';
import { OrderShipment } from '../entities/OrderShipment';
import { PushNotificationService } from './PushNotificationService';
import { OrderPaymentService } from './OrderPaymentService';
import { calculateDistanceKm, roundDistanceKm } from '../utils/geo';
import { env } from '../config/env';
/**
 * Provides OrderService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class OrderService
{
  private readonly queueActiveStatuses = [ 'pending', 'preparing', 'ready', 'ready_for_delivery', 'waiting_for_motoboy' ];
  private readonly queueRecentStatuses = [ 'done', 'delivered', 'finished', 'cancelled' ];
  private readonly farPickupLocalOpenStatuses = [ 'pending', 'awaiting_payment', 'preparing', 'ready', 'ready_for_delivery', 'waiting_for_motoboy', 'in_delivery', 'dispatched' ];
  private readonly onSitePickupPaymentMethods = [ 'dinheiro', 'pix_loja', 'pix_presencial', 'debito_presencial', 'credito_presencial' ];
  private orderRepository = new OrderRepository();
  private storeRepository = new StoreRepository();
  private productRepository = new ProductRepository();
  private deliveryBillingService = new DeliveryBillingService();
  private subscriptionService = new SubscriptionService();
  private userRepository = new UserRepository();
  private storeUserRepository = new StoreUserRepository();
  private pushService = new PushNotificationService();
  private orderPaymentService = new OrderPaymentService();
  private tz = process.env.APP_TZ || 'America/Sao_Paulo';
  private queueReconcileCooldownByStore = new Map<string, number>();
  private readonly queueReconcileCooldownMs = 20000;
  private readonly anonymousOrderPhoneWindowMinutes = 30;
  private readonly anonymousOrderPhoneLimit = 3;
  private readonly anonymousOrderGuestWindowMinutes = 20;
  private readonly anonymousOrderGuestLimit = 4;
  private readonly anonymousOrderIpWindowMinutes = 20;
  private readonly anonymousOrderIpLimit = 6;
  private normalizePhone(value?: string | null) {
    return String(value || '').replace(/\D/g, '').slice(0, 11);
  }

  private normalizeIp(value?: string | null) {
    return String(value || '').trim().slice(0, 120);
  }

  private isStaffActor(role?: string | null) {
    const normalized = String(role || '').trim().toUpperCase();
    return [ 'ADMIN', 'OPERATOR', 'LOJISTA', 'STORE_OWNER', 'SUPER_ADMIN' ].includes(normalized);
  }

  private normalizeTrimmedText(value?: string | null) {
    return String(value || '').trim();
  }

  private normalizePaymentMethod(value?: string | null) {
    return String(value || '').trim().toLowerCase();
  }

  private toFiniteNumber(value: unknown) {
    if (value === null || value === undefined) return null;
    const parsed = Number(String(value).replace(',', '.').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  private isOnSitePickupPayment(method?: string | null) {
    return this.onSitePickupPaymentMethods.includes(this.normalizePaymentMethod(method));
  }

  private async getPreferredCustomerAddressCoords(userId: string) {
    const [row] = await AppDataSource.query(
      `
        SELECT lat, lng
          FROM customer_addresses
         WHERE user_id = $1
         ORDER BY is_default DESC, created_at DESC
         LIMIT 1
      `,
      [userId]
    );
    const lat = this.toFiniteNumber(row?.lat);
    const lng = this.toFiniteNumber(row?.lng);
    if (lat === null || lng === null) return null;
    return { lat, lng };
  }

  private resolveStoreCoords(store: any) {
    const lat = this.toFiniteNumber(store?.settings?.lat);
    const lng = this.toFiniteNumber(store?.settings?.lng);
    if (lat === null || lng === null) return null;
    return { lat, lng };
  }

  private async resolvePickupDistanceKmForCustomer(userId: string, store: any) {
    const customerCoords = await this.getPreferredCustomerAddressCoords(userId);
    const storeCoords = this.resolveStoreCoords(store);
    if (!customerCoords || !storeCoords) return null;
    return roundDistanceKm(calculateDistanceKm(customerCoords, storeCoords), 1);
  }

  private async ensureFarPickupPolicy(input: CreateOrderDto, store: any) {
    const userId = this.normalizeTrimmedText(input?.customerUserId);
    if (!userId) return;
    if (this.isStaffActor(input?.actorRole)) return;
    if (this.normalizeTrimmedText(input?.type).toLowerCase() !== 'pickup') return;
    if ((input as any)?.condominiumOrder) return;

    const confirmationDistanceKm = Number(env.pickup.confirmationDistanceKm || 40);
    if (!Number.isFinite(confirmationDistanceKm) || confirmationDistanceKm <= 0) return;

    const pickupDistanceKm = await this.resolvePickupDistanceKmForCustomer(userId, store);
    if (pickupDistanceKm === null || pickupDistanceKm < confirmationDistanceKm) return;
    if (!this.isOnSitePickupPayment(input?.paymentMethod)) return;

    const maxOpenOrders = Math.max(1, Number(env.pickup.maxOpenLocalOrdersForFarPickup || 1));
    const [row] = await AppDataSource.query(
      `
        SELECT COUNT(*)::int AS total
          FROM orders
         WHERE customer_user_id = $1
           AND type = 'pickup'
           AND payment_method = ANY($2::text[])
           AND status = ANY($3::text[])
      `,
      [userId, this.onSitePickupPaymentMethods, this.farPickupLocalOpenStatuses]
    );
    const total = Number(row?.total || 0);
    if (total >= maxOpenOrders) {
      throw new AppError('ORDER-PICKUP-001', 409, {
        message: 'Você já possui um pedido de retirada em aberto. Finalize ou cancele esse pedido antes de confirmar outra retirada distante.',
      });
    }
  }

  private async ensureAnonymousOrderPolicy(input: CreateOrderDto, storeId: string) {
    const isCustomer = Boolean(String(input?.customerUserId || '').trim());
    const isStaff = this.isStaffActor(input?.actorRole);
    if (isCustomer || isStaff) return;

    const phoneDigits = this.normalizePhone(input?.phone);
    if (phoneDigits.length < 10) {
      throw new AppError('ORDER-ANON-001', 400, {
        message: 'Para pedido sem cadastro, informe um telefone com DDD.',
      });
    }

    const guestPushId = String(input?.guestPushId || '').trim();
    const ipAddress = this.normalizeIp(input?.clientIp);
    const [blockedRows, phoneRows, guestRows, ipRows] = await Promise.all([
      AppDataSource.query(
        `
          SELECT id
            FROM guest_order_phone_blocks
           WHERE store_id = $1
             AND phone_digits = $2
             AND active = TRUE
           LIMIT 1
        `,
        [storeId, phoneDigits]
      ),
      AppDataSource.query(
        `
          SELECT COUNT(*)::int AS total
            FROM guest_order_attempts
           WHERE store_id = $1
             AND phone_digits = $2
             AND created_at >= NOW() - ($3::text || ' minutes')::interval
        `,
        [storeId, phoneDigits, String(this.anonymousOrderPhoneWindowMinutes)]
      ),
      guestPushId
        ? AppDataSource.query(
            `
              SELECT COUNT(*)::int AS total
                FROM guest_order_attempts
               WHERE store_id = $1
                 AND guest_push_id = $2
                 AND created_at >= NOW() - ($3::text || ' minutes')::interval
            `,
            [storeId, guestPushId, String(this.anonymousOrderGuestWindowMinutes)]
          )
        : Promise.resolve([{ total: 0 }]),
      ipAddress
        ? AppDataSource.query(
            `
              SELECT COUNT(*)::int AS total
                FROM guest_order_attempts
               WHERE store_id = $1
                 AND ip_address = $2
                 AND created_at >= NOW() - ($3::text || ' minutes')::interval
            `,
            [storeId, ipAddress, String(this.anonymousOrderIpWindowMinutes)]
          )
        : Promise.resolve([{ total: 0 }]),
    ]);

    if (Array.isArray(blockedRows) && blockedRows.length > 0) {
      throw new AppError('ORDER-ANON-003', 403, {
        message: 'Este telefone nao pode realizar pedidos visitantes no momento.',
      });
    }

    const phoneCount = Number(phoneRows?.[0]?.total || 0);
    const guestCount = Number(guestRows?.[0]?.total || 0);
    const ipCount = Number(ipRows?.[0]?.total || 0);

    if (phoneCount >= this.anonymousOrderPhoneLimit || guestCount >= this.anonymousOrderGuestLimit || ipCount >= this.anonymousOrderIpLimit) {
      throw new AppError('ORDER-ANON-002', 429, {
        message: 'Muitos pedidos visitantes em sequência. Aguarde alguns minutos ou entre com sua conta.',
      });
    }
  }

  private async registerAnonymousOrderAttempt(input: CreateOrderDto, storeId: string) {
    const isCustomer = Boolean(String(input?.customerUserId || '').trim());
    const isStaff = this.isStaffActor(input?.actorRole);
    if (isCustomer || isStaff) return;

    const phoneDigits = this.normalizePhone(input?.phone) || null;
    const guestPushId = String(input?.guestPushId || '').trim() || null;
    const ipAddress = this.normalizeIp(input?.clientIp) || null;

    await AppDataSource.query(
      `
        INSERT INTO guest_order_attempts (store_id, phone_digits, guest_push_id, ip_address)
        VALUES ($1, $2, $3, $4)
      `,
      [storeId, phoneDigits, guestPushId, ipAddress]
    );
  }

  /**
   * Ensures store queue payload keeps cancellation metadata explicit for admin screens.
   *
   * @author Edmilson Lopes
   */
  private attachCancellationSnapshot<T extends Record<string, any>>(orders: T[]) {
    if (!Array.isArray(orders)) return [] as T[];
    return orders.map((order) => ({
      ...order,
      canceledAt: order?.canceledAt || null,
      canceledReason: order?.canceledReason || null,
    })) as T[];
  }

  /**
   * Maps internal order status into customer-friendly push copy.
   *
   * @author Edmilson Lopes
   */
  private resolveOrderStatusPushMessage(
    status: string,
    orderDisplayId: string,
    order?: Pick<Order, 'type' | 'fulfillmentMode' | 'condominiumFulfillmentMode'>
  ) {
    const normalized = String(status || '').toLowerCase();
    const type = String(order?.type || '').toLowerCase();
    const fulfillmentMode = String(order?.fulfillmentMode || '').toLowerCase();
    const condominiumMode = String(order?.condominiumFulfillmentMode || '').toLowerCase();
    const isPostal = type === 'delivery' && fulfillmentMode === 'postal';
    const isDelivery = type === 'delivery' && !isPostal && condominiumMode !== 'pickup_at_stall';
    const isPickup = type === 'pickup' || condominiumMode === 'pickup_at_stall' || fulfillmentMode === 'condominium_pickup';
    const dictionary: Record<string, string> = {
      pending: `Pedido ${orderDisplayId} recebido com sucesso.`,
      preparing: `Pedido ${orderDisplayId} está sendo preparado.`,
      ready: isPostal
        ? `Pedido ${orderDisplayId} pronto para postagem.`
        : isPickup
          ? `Pedido ${orderDisplayId} pronto para retirada.`
          : `Pedido ${orderDisplayId} pronto.`,
      ready_for_delivery: isPostal
        ? `Pedido ${orderDisplayId} pronto para postagem.`
        : isDelivery
          ? `Pedido ${orderDisplayId} pronto. Vamos chamar o entregador.`
          : `Pedido ${orderDisplayId} pronto para retirada.`,
      waiting_for_motoboy: isPostal
        ? `Pedido ${orderDisplayId} foi despachado.`
        : `Pedido ${orderDisplayId} pronto e aguardando entregador.`,
      dispatched: isPostal
        ? `Pedido ${orderDisplayId} foi postado e está em trânsito.`
        : `Pedido ${orderDisplayId} saiu para entrega.`,
      in_delivery: `Pedido ${orderDisplayId} saiu para entrega.`,
      delivered: `Pedido ${orderDisplayId} foi entregue.`,
      finished: `Pedido ${orderDisplayId} foi finalizado.`,
      cancelled: `Pedido ${orderDisplayId} foi cancelado.`,
    };
    return dictionary[normalized] || `Pedido ${orderDisplayId} teve atualização de status.`;
  }

  /**
   * Dispatches customer/guest push notification for order status update.
   *
   * @author Edmilson Lopes
   */
  private dispatchOrderUpdatePush(
    order: Pick<Order, 'id' | 'status' | 'customerUserId' | 'guestPushId'> & { store?: { name?: string } | null }
  ) {
    const userId = String(order?.customerUserId || '').trim();
    const guestId = String(order?.guestPushId || '').trim();
    if (!userId && !guestId) return;

    const statusBody = this.resolveOrderStatusPushMessage(
      String(order?.status || 'pending'),
      `#${String(order?.id || '').slice(0, 8)}`,
      order as any
    );
    const storeName = String(order?.store?.name || '').trim();
    const body = storeName ? `${storeName}: ${statusBody}` : statusBody;
    const payload = {
      title: 'Pedido atualizado',
      body,
      data: {
        url: `https://janocaminho.com.br/pedido/${order.id}`,
        orderId: String(order.id),
        status: String(order.status || ''),
      },
    };
    if (userId) {
      void this.pushService.notifyCustomerOrderUpdate(userId, payload);
    }
    if (guestId) {
      void this.pushService.notifyGuestOrderUpdate(guestId, payload);
    }
  }

  /**
   * Dispatches "order available for delivery" push to motoboys linked to this store.
   *
   * @author Edmilson Lopes
   */
  private dispatchMotoboyAvailableOrderPush(
    order: Pick<Order, 'id' | 'status' | 'total'> & {
      storeId?: string | null;
      store?: { id?: string; name?: string | null } | null;
    }
  ) {
    const normalizedStatus = String(order?.status || '').toLowerCase();
    if (normalizedStatus !== 'waiting_for_motoboy') return;

    const storeId =
      String(order?.storeId || '').trim() ||
      String(order?.store?.id || '').trim();
    if (!storeId) return;

    const storeName = String(order?.store?.name || '').trim() || 'Loja parceira';
    const shortOrderId = `#${String(order?.id || '').slice(0, 8)}`;
    const total = Number(order?.total || 0);
    const totalLabel = Number.isFinite(total) && total > 0 ? ` • R$ ${total.toFixed(2).replace('.', ',')}` : '';

    void this.pushService.notifyStoreMotoboysAvailableOrder(storeId, {
      title: 'Novo pedido disponível para entrega',
      body: `${storeName} • ${shortOrderId}${totalLabel}`,
      data: {
        url: 'https://janocaminho.com.br/motoboy',
        screen: 'motoboy_available_orders',
        orderId: String(order.id),
        storeId,
        status: normalizedStatus,
      },
    });
  }

    /**
   * Reconciles order statuses with delivery snapshots and auto-closes stale queue entries for one store.
   *
   * @author Edmilson Lopes
   */
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

    // Auto-close stale operational orders (no updates for 6h) to avoid stuck queue.
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
           AND COALESCE(o.updated_at, o.created_at) <= (NOW() - INTERVAL '6 hours')
      `,
      [storeId]
    );
  }

  private async reconcileDeliveredOrdersByStoreForQueue(storeId: string) {
    if (!storeId) return;
    const now = Date.now();
    const lastRun = Number(this.queueReconcileCooldownByStore.get(storeId) || 0);
    if (lastRun && now - lastRun < this.queueReconcileCooldownMs) {
      return;
    }
    this.queueReconcileCooldownByStore.set(storeId, now);
    try {
      await this.reconcileDeliveredOrdersByStore(storeId);
    } catch (error) {
      this.queueReconcileCooldownByStore.delete(storeId);
      throw error;
    }
  }

  private getStartOfTodayInTimeZone(timeZone = this.tz) {
    const now = new Date();
    const zonedNow = new Date(now.toLocaleString('en-US', { timeZone }));
    const zonedStart = new Date(zonedNow);
    zonedStart.setHours(0, 0, 0, 0);
    const offsetMs = now.getTime() - zonedNow.getTime();
    return new Date(zonedStart.getTime() + offsetMs);
  }

    /**
   * Synchronizes a single order status with its delivery state when marked as delivered.
   *
   * @author Edmilson Lopes
   */
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

    /**
   * Enriches order payloads with delivery timeline and courier snapshot data.
   *
   * @author Edmilson Lopes
   */
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
   * Enriches order payloads with postal shipment and tracking metadata.
   *
   * @author Edmilson Lopes
   */
private async attachShipmentSnapshot(orders: any[]) {
    if (!Array.isArray(orders) || orders.length === 0) return orders;
    const orderIds = orders
      .map((order: any) => String(order?.id || '').trim())
      .filter(Boolean);
    if (!orderIds.length) return orders;

    const rows: Array<any> = await AppDataSource.query(
      `
        SELECT
          os.order_id,
          os.provider,
          os.service_code,
          os.service_name,
          os.tracking_code,
          os.tracking_url,
          os.shipment_status,
          os.quote_payload,
          os.tracking_last_event,
          os.tracking_last_at,
          os.posted_at,
          os.delivered_at,
          os.created_at,
          os.updated_at
        FROM order_shipments os
        WHERE os.order_id = ANY($1::uuid[])
      `,
      [ orderIds ]
    );

    const shipmentByOrderId = new Map<string, any>();
    for (const row of rows) {
      const orderId = String(row?.order_id || '').trim();
      if (!orderId) continue;
      shipmentByOrderId.set(orderId, {
        provider: row?.provider || null,
        serviceCode: row?.service_code || null,
        serviceName: row?.service_name || null,
        trackingCode: row?.tracking_code || null,
        trackingUrl: row?.tracking_url || null,
        shipmentStatus: row?.shipment_status || null,
        quotePayload: row?.quote_payload || null,
        trackingLastEvent: row?.tracking_last_event || null,
        trackingLastAt: row?.tracking_last_at || null,
        postedAt: row?.posted_at || null,
        deliveredAt: row?.delivered_at || null,
        createdAt: row?.created_at || null,
        updatedAt: row?.updated_at || null,
      });
    }

    return orders.map((order: any) => {
      const orderId = String(order?.id || '').trim();
      return {
        ...order,
        shipment: shipmentByOrderId.get(orderId) || null,
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

    /**
   * Executes resolve bundle discount workflow for OrderService.
   *
   * @author Edmilson Lopes
   */
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

    /**
   * Executes normalize text workflow for OrderService.
   *
   * @author Edmilson Lopes
   */
private normalizeText(value: unknown)
  {
    return String(value || '').trim().toLowerCase();
  }

    /**
   * Executes resolve selected modifiers workflow for OrderService.
   *
   * @author Edmilson Lopes
   */
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
   * Registers an inventory movement entry inside the current transaction scope.
   *
   * @author Edmilson Lopes
   */
private async appendInventoryMovementTx(
    manager: EntityManager,
    payload: {
      storeId: string;
      productId: string;
      orderId?: string | null;
      movementType: string;
      quantity: number;
      beforeQuantity: number;
      afterQuantity: number;
      reason?: string | null;
      actorUserId?: string | null;
    }
  ) {
    const savepoint = 'sp_inventory_movement';
    try {
      await manager.query(`SAVEPOINT ${savepoint}`);
      await manager.query(
        `
          INSERT INTO inventory_movements
            (store_id, product_id, order_id, movement_type, quantity, before_quantity, after_quantity, reason, actor_user_id)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          payload.storeId,
          payload.productId,
          payload.orderId || null,
          payload.movementType,
          payload.quantity,
          payload.beforeQuantity,
          payload.afterQuantity,
          payload.reason || null,
          payload.actorUserId || null,
        ]
      );
      await manager.query(`RELEASE SAVEPOINT ${savepoint}`);
    } catch (error) {
      try {
        await manager.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        // Backward-compat: environments sem coluna order_id
        await manager.query(
          `
            INSERT INTO inventory_movements
              (store_id, product_id, movement_type, quantity, before_quantity, after_quantity, reason, actor_user_id)
            VALUES
              ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            payload.storeId,
            payload.productId,
            payload.movementType,
            payload.quantity,
            payload.beforeQuantity,
            payload.afterQuantity,
            payload.reason || null,
            payload.actorUserId || null,
          ]
        );
      } catch (fallbackError) {
        console.error('[inventory] movement append failed', fallbackError);
      } finally {
        try {
          await manager.query(`RELEASE SAVEPOINT ${savepoint}`);
        } catch {}
      }
    }
  }

    /**
   * Applies stock decrement/increment for managed products in a transactional context.
   *
   * @author Edmilson Lopes
   */
private async adjustManagedStockTx(
    manager: EntityManager,
    payload: {
      storeId: string;
      productId: string;
      orderId?: string | null;
      delta: number; // positive consumes stock, negative restores stock
      movementType: string;
      reason?: string | null;
      actorUserId?: string | null;
    }
  ) {
    const delta = Math.trunc(Number(payload.delta || 0));
    if (!Number.isFinite(delta) || delta === 0) return;
    const rows = await manager.query(
      `
        SELECT id, store_id, name, manage_stock, stock_quantity
        FROM products
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [payload.productId]
    );
    const product = rows?.[0];
    if (!product || String(product.store_id) !== String(payload.storeId)) {
      throw new AppError('PROD-002', 400);
    }
    if (!Boolean(product.manage_stock)) return;

    const beforeQuantity = Math.max(0, Number(product.stock_quantity || 0));
    let afterQuantity = beforeQuantity;
    if (delta > 0) {
      if (beforeQuantity < delta) {
        throw new AppError('ORDER-005', 400, {
          message: `Estoque insuficiente para "${product.name}".`,
        });
      }
      afterQuantity = beforeQuantity - delta;
    } else {
      afterQuantity = beforeQuantity + Math.abs(delta);
    }

    await manager.query(
      `
        UPDATE products
        SET stock_quantity = $2
        WHERE id = $1
      `,
      [product.id, Math.max(0, Math.floor(afterQuantity))]
    );

    await this.appendInventoryMovementTx(manager, {
      storeId: payload.storeId,
      productId: payload.productId,
      orderId: payload.orderId || null,
      movementType: payload.movementType,
      quantity: Math.abs(delta),
      beforeQuantity,
      afterQuantity,
      reason: payload.reason || null,
      actorUserId: payload.actorUserId || null,
    });
  }

    /**
   * Seeds initial postal shipment record from checkout quote selection.
   *
   * @author Edmilson Lopes
   */
private async seedPostalShipmentFromCheckoutTx(
    manager: EntityManager,
    order: Order,
    input: any
  ) {
    if (!order?.id) return;
    const orderType = String(order?.type || '').toLowerCase();
    const mode = String((order as any)?.fulfillmentMode || input?.fulfillmentMode || 'distance').toLowerCase();
    if (orderType !== 'delivery' || mode !== 'postal') return;

    const checkoutShipment = input?.postalShipment || {};
    const provider = String(checkoutShipment?.provider || '').trim() || 'checkout';
    const serviceCode = String(checkoutShipment?.serviceCode || '').trim();
    const serviceName = String(checkoutShipment?.serviceName || '').trim();
    const estimatedDaysRaw = Number(checkoutShipment?.estimatedDays || 0);
    const estimatedDays =
      Number.isFinite(estimatedDaysRaw) && estimatedDaysRaw > 0
        ? Math.ceil(estimatedDaysRaw)
        : null;
    const priceRaw = Number(checkoutShipment?.price || 0);
    const price = Number.isFinite(priceRaw) && priceRaw > 0 ? Number(priceRaw.toFixed(2)) : null;
    const currency = String(checkoutShipment?.currency || '').trim() || 'BRL';
    const originZip = String(checkoutShipment?.originZip || '').trim() || null;
    const destinationZip = String(checkoutShipment?.destinationZip || '').trim() || null;

    if (!serviceCode && !serviceName && !estimatedDays && !price) return;

    const shipmentRepo = manager.getRepository(OrderShipment);
    let shipment = await shipmentRepo.findOne({ where: { orderId: order.id } });
    if (!shipment) {
      shipment = shipmentRepo.create({
        orderId: order.id,
        shipmentStatus: 'pending_posting',
      });
    }

    shipment.provider = provider;
    shipment.serviceCode = serviceCode || null;
    shipment.serviceName = serviceName || null;
    shipment.quotePayload = {
      ...(shipment.quotePayload || {}),
      estimatedDays: estimatedDays ?? null,
      price: price ?? null,
      currency: currency || null,
      originZip,
      destinationZip,
      selectedAt: new Date().toISOString(),
    };

    await shipmentRepo.save(shipment);
  }




  /**
   * Creates a new order using store ID context and applies stock, ETA, and delivery side effects.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async create(input: CreateOrderDto)
  {
    const store = await this.storeRepository.findById(input.storeId);
    if (!store) throw new AppError('STORE-001', 404);
    await this.ensureAnonymousOrderPolicy(input, store.id);
    await this.ensureFarPickupPolicy(input, store);
    const saved = await AppDataSource.transaction(async (manager) => {
      const order = await this.buildOrder(input, store, manager, randomUUID());
      const saved = await manager.getRepository(Order).save(order);
      await this.seedPostalShipmentFromCheckoutTx(manager, saved, input as any);
      const payment = await this.orderPaymentService.createForOrderIfEnabled(saved, manager);
      if (payment) {
        (saved as any).payment = {
          id: payment.id,
          status: payment.paymentStatus,
          provider: payment.provider,
          providerId: payment.providerId,
          paymentLink: payment.paymentLink,
          qrCodeBase64: payment.qrCodeBase64,
          qrCodeText: payment.qrCodeText,
          expiresAt: payment.expiresAt,
        };
        // Only hold off queue if MP actually created a payment (has providerId).
        // If MP failed or had no payer email, fall through to normal pending flow.
        if (payment.providerId) {
          await manager.getRepository(Order).update({ id: saved.id }, { status: 'awaiting_payment' });
          saved.status = 'awaiting_payment';
        }
      }
      return saved;
    });
    await this.registerAnonymousOrderAttempt(input, store.id);
    // Only notify admin queue when order is already active (cash / no MP)
    if (saved.status !== 'awaiting_payment') {
      this.dispatchOrderUpdatePush(saved as any);
    }
    return saved;
  }




  /**
   * Creates a new order using store slug context and resolves store internally.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async createBySlug(input: Omit<CreateOrderDto, 'storeId'> & { storeSlug: string })
  {
    const store = await this.storeRepository.findBySlugWithOwner(input.storeSlug);
    if (!store) throw new AppError('STORE-001', 404);
    await this.ensureAnonymousOrderPolicy({ ...input, storeId: store.id }, store.id);
    await this.ensureFarPickupPolicy({ ...input, storeId: store.id } as CreateOrderDto, store);
    const saved = await AppDataSource.transaction(async (manager) => {
      const order = await this.buildOrder(input, store, manager, randomUUID());
      const saved = await manager.getRepository(Order).save(order);
      await this.seedPostalShipmentFromCheckoutTx(manager, saved, input as any);
      // Attach customer email so MP payer resolution works even when the relation isn't loaded post-save.
      if (input.customerUserId && !(saved as any).customerUser?.email) {
        const [customerRow] = await manager.query(
          'SELECT email FROM users WHERE id = $1 LIMIT 1',
          [input.customerUserId]
        );
        if (customerRow?.email) {
          (saved as any).customerUser = { email: customerRow.email };
        }
      }
      const payment = await this.orderPaymentService.createForOrderIfEnabled(saved, manager);
      if (payment) {
        (saved as any).payment = {
          id: payment.id,
          status: payment.paymentStatus,
          provider: payment.provider,
          providerId: payment.providerId,
          paymentLink: payment.paymentLink,
          qrCodeBase64: payment.qrCodeBase64,
          qrCodeText: payment.qrCodeText,
          expiresAt: payment.expiresAt,
        };
        // Only hold off queue if MP actually created a payment (has providerId).
        // If MP failed or had no payer email, fall through to normal pending flow.
        if (payment.providerId) {
          await manager.getRepository(Order).update({ id: saved.id }, { status: 'awaiting_payment' });
          saved.status = 'awaiting_payment';
        }
      }
      return saved;
    });
    await this.registerAnonymousOrderAttempt({ ...input, storeId: store.id }, store.id);
    // Only notify admin queue when order is already active (cash / no MP)
    if (saved.status !== 'awaiting_payment') {
      this.dispatchOrderUpdatePush(saved as any);
    }
    return saved;
  }




  /**
   * Lists store orders and appends delivery/shipment snapshots for operations.
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
    const withDelivery = await this.attachDeliverySnapshot(orders as any[]);
    const withShipment = await this.attachShipmentSnapshot(withDelivery as any[]);
    return this.attachCancellationSnapshot(withShipment as any[]);
  }




  /**
   * Lists store orders by slug for staff dashboards and queue screens.
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
    const withDelivery = await this.attachDeliverySnapshot(orders as any[]);
    const withShipment = await this.attachShipmentSnapshot(withDelivery as any[]);
    return this.attachCancellationSnapshot(withShipment as any[]);
  }

  async listQueueByStoreId(storeId: string, authStoreId?: string)
  {
    const store = await this.storeRepository.findById(storeId);
    this.ensureStoreAccess(store, authStoreId);
    await this.reconcileDeliveredOrdersByStoreForQueue(store!.id);
    const orders = await this.orderRepository.findDashboardQueueByStoreId(
      store!.id,
      this.queueActiveStatuses,
      this.queueRecentStatuses,
      this.getStartOfTodayInTimeZone()
    );
    const withDelivery = await this.attachDeliverySnapshot(orders as any[]);
    const withShipment = await this.attachShipmentSnapshot(withDelivery as any[]);
    return this.attachCancellationSnapshot(withShipment as any[]);
  }

  async listQueueByStoreSlug(slug: string, authStoreId?: string)
  {
    const store = await this.storeRepository.findBySlug(slug);
    this.ensureStoreAccess(store, authStoreId);
    await this.reconcileDeliveredOrdersByStoreForQueue(store!.id);
    const orders = await this.orderRepository.findDashboardQueueByStoreId(
      store!.id,
      this.queueActiveStatuses,
      this.queueRecentStatuses,
      this.getStartOfTodayInTimeZone()
    );
    const withDelivery = await this.attachDeliverySnapshot(orders as any[]);
    const withShipment = await this.attachShipmentSnapshot(withDelivery as any[]);
    return this.attachCancellationSnapshot(withShipment as any[]);
  }




  /**
   * Returns most ordered items for storefront highlights.
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
   * Returns current table occupancy/status for public table mode.
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
   * Updates operational order status and applies workflow side effects.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async updateStatus(orderId: string, status: string, authStoreId?: string, reason?: string | null)
  {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    this.ensureStoreAccess(order.store, authStoreId);
    const currentStatus = String(order.status || '').toLowerCase();
    let nextStatus = String(status || '').toLowerCase();
    const fulfillmentMode = String((order as any)?.fulfillmentMode || 'distance').toLowerCase();
    const isPostalFlow = order.type === 'delivery' && fulfillmentMode === 'postal';

    // Backward-compat: queue actions still send delivery-local statuses in some UI paths.
    // For postal flow, normalize those aliases to postal statuses to avoid invalid transitions.
    let normalizedCurrentStatus = currentStatus;
    if (isPostalFlow) {
      if (normalizedCurrentStatus === 'ready_for_delivery') normalizedCurrentStatus = 'ready';
      else if (normalizedCurrentStatus === 'waiting_for_motoboy' || normalizedCurrentStatus === 'in_delivery') normalizedCurrentStatus = 'dispatched';

      if (nextStatus === 'ready_for_delivery') nextStatus = 'ready';
      else if (nextStatus === 'waiting_for_motoboy' || nextStatus === 'in_delivery') nextStatus = 'dispatched';
    }

    const deliveryStatuses = new Set([
      'ready_for_delivery',
      'waiting_for_motoboy',
      'in_delivery',
      'delivered',
      'finished',
    ]);
    if (order.type !== 'delivery' && deliveryStatuses.has(nextStatus)) {
      throw new AppError('ORDER-004', 400);
    }
    if (order.type === 'delivery' && !isPostalFlow && deliveryStatuses.has(nextStatus)) {
      const transitions: Record<string, string[]> = {
        pending: [ 'preparing', 'cancelled' ],
        preparing: [ 'ready_for_delivery', 'waiting_for_motoboy', 'cancelled' ],
        ready_for_delivery: [ 'waiting_for_motoboy', 'in_delivery', 'cancelled' ],
        waiting_for_motoboy: [ 'in_delivery', 'cancelled' ],
        in_delivery: [ 'delivered', 'finished' ],
        delivered: [ 'finished' ],
      };
      const allowedNext = transitions[order.status] || [];
      if (!allowedNext.includes(nextStatus)) {
        throw new AppError('ORDER-004', 400);
      }
    }
    if (isPostalFlow) {
      const postalTransitions: Record<string, string[]> = {
        pending: [ 'preparing', 'cancelled' ],
        preparing: [ 'ready', 'dispatched', 'cancelled' ],
        ready: [ 'dispatched', 'cancelled' ],
        dispatched: [ 'delivered', 'finished' ],
        delivered: [ 'finished' ],
      };
      const allowedNext = postalTransitions[normalizedCurrentStatus] || [];
      if (nextStatus !== normalizedCurrentStatus && !allowedNext.includes(nextStatus)) {
        throw new AppError('ORDER-004', 400);
      }
    }

    const shouldRestockOnCancel =
      nextStatus === 'cancelled' &&
      currentStatus !== 'cancelled' &&
      [ 'pending', 'preparing', 'ready', 'ready_for_delivery', 'waiting_for_motoboy' ].includes(currentStatus);

    const saved = await AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Order);
      const lockedOrder = await repo.findOne({
        where: { id: orderId },
        relations: [ 'store', 'items', 'items.product' ],
      });
      if (!lockedOrder) throw new AppError('ORDER-001', 404);
      this.ensureStoreAccess(lockedOrder.store as any, authStoreId);

      if (shouldRestockOnCancel) {
        const byProduct = new Map<string, number>();
        (lockedOrder.items || []).forEach((item: any) => {
          const productId = String(item?.product?.id || '').trim();
          if (!productId) return;
          byProduct.set(productId, (byProduct.get(productId) || 0) + Math.max(0, Number(item?.quantity || 0)));
        });
        for (const [ productId, qty ] of byProduct.entries()) {
          if (qty <= 0) continue;
          await this.adjustManagedStockTx(manager, {
            storeId: lockedOrder.store.id,
            productId,
            orderId: lockedOrder.id,
            delta: -qty,
            movementType: 'order_cancel_restock',
            reason: `Reposição automática por cancelamento do pedido ${lockedOrder.id}`,
          });
        }
      }

      lockedOrder.status = nextStatus;
      if (nextStatus === 'cancelled') {
        lockedOrder.canceledAt = new Date();
        lockedOrder.canceledReason = String(reason || '').trim() || null;
      } else if (lockedOrder.status !== 'cancelled') {
        lockedOrder.canceledAt = null;
        lockedOrder.canceledReason = null;
      }
      if (nextStatus === 'cancelled' && lockedOrder.type === 'delivery') {
        await manager.query(
          `
            UPDATE order_deliveries
               SET status = 'CANCELED',
                   canceled_at = NOW(),
                   canceled_reason = COALESCE($2, canceled_reason)
             WHERE order_id = $1
          `,
          [lockedOrder.id, String(reason || '').trim() || null]
        );
      }
      return repo.save(lockedOrder);
    });

    if (saved.type === 'delivery' && !isPostalFlow && [ 'ready_for_delivery', 'waiting_for_motoboy' ].includes(nextStatus)) {
      await deliveryService.ensureQueueDelivery(saved as any);
    }
    this.dispatchMotoboyAvailableOrderPush(saved as any);
    if (saved.type === 'delivery' && !isPostalFlow && [ 'delivered', 'finished' ].includes(nextStatus)) {
      await this.deliveryBillingService.recordDelivery(saved);
    }
    this.dispatchOrderUpdatePush(saved as any);
    return saved;
  }

    /**
   * Switches order fulfillment mode and aligns related shipping metadata.
   *
   * @author Edmilson Lopes
   */
async updateFulfillmentMode(
    orderId: string,
    mode: 'distance' | 'postal' | string,
    authStoreId?: string
  ) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    this.ensureStoreAccess(order.store, authStoreId);
    if (String(order.type || '').toLowerCase() !== 'delivery') {
      throw new AppError('ORDER-004', 400, { message: 'Modo de entrega só é válido para pedidos de entrega.' });
    }
    const normalizedMode = String(mode || '').toLowerCase() === 'postal' ? 'postal' : 'distance';
    const currentStatus = String(order.status || '').toLowerCase();
    if (normalizedMode === 'postal' && [ 'waiting_for_motoboy', 'in_delivery' ].includes(currentStatus)) {
      throw new AppError('ORDER-004', 400, { message: 'Não é possível mudar para postal em pedido já no fluxo de motoboy.' });
    }
    (order as any).fulfillmentMode = normalizedMode;
    return this.orderRepository.save(order);
  }

    /**
   * Updates postal shipping service, tracking data, and shipment status.
   *
   * @author Edmilson Lopes
   */
async updatePostalShipment(
    orderId: string,
    input: {
      provider?: string;
      serviceCode?: string;
      serviceName?: string;
      trackingCode?: string;
      trackingUrl?: string;
      markPosted?: boolean;
    },
    authStoreId?: string
  ) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    this.ensureStoreAccess(order.store, authStoreId);
    if (String(order.type || '').toLowerCase() !== 'delivery') {
      throw new AppError('ORDER-004', 400, { message: 'Rastreio postal só é válido para pedidos de entrega.' });
    }

    const normalizedMode = String((order as any).fulfillmentMode || 'distance').toLowerCase();
    if (normalizedMode !== 'postal') {
      throw new AppError('ORDER-004', 400, { message: 'Ative o modo postal antes de informar rastreio.' });
    }

    const trackingCode = String(input?.trackingCode || '').trim();
    const trackingUrl = String(input?.trackingUrl || '').trim();
    const markPosted = Boolean(input?.markPosted);
    if (markPosted && !trackingCode) {
      throw new AppError('ORDER-005', 400, { message: 'Código de rastreio é obrigatório para marcar como postado.' });
    }

    const result = await AppDataSource.transaction(async (manager) => {
      const shipmentRepo = manager.getRepository(OrderShipment);
      const orderRepo = manager.getRepository(Order);

      let shipment = await shipmentRepo.findOne({ where: { orderId: order.id } });
      if (!shipment) {
        shipment = shipmentRepo.create({
          orderId: order.id,
          provider: input?.provider || 'manual',
          shipmentStatus: 'pending_posting',
        });
      }

      if (input?.provider !== undefined) shipment.provider = String(input.provider || '').trim() || null;
      if (input?.serviceCode !== undefined) shipment.serviceCode = String(input.serviceCode || '').trim() || null;
      if (input?.serviceName !== undefined) shipment.serviceName = String(input.serviceName || '').trim() || null;
      if (input?.trackingCode !== undefined) shipment.trackingCode = trackingCode || null;
      if (input?.trackingUrl !== undefined) shipment.trackingUrl = trackingUrl || null;

      if (markPosted) {
        shipment.shipmentStatus = 'posted';
        shipment.postedAt = new Date();
      }

      await shipmentRepo.save(shipment);

      const orderLock = await orderRepo.findOne({ where: { id: order.id } });
      if (!orderLock) throw new AppError('ORDER-001', 404);

      const currentStatus = String(orderLock.status || '').toLowerCase();
      if (markPosted && ![ 'delivered', 'finished', 'cancelled' ].includes(currentStatus)) {
        orderLock.status = 'dispatched';
        await orderRepo.save(orderLock);
      }

      return { order: orderLock, shipment };
    });

    this.dispatchOrderUpdatePush((result?.order || {}) as any);

    return result;
  }

    /**
   * Reopens a finalized order and restores editable/operational state.
   *
   * @author Edmilson Lopes
   */
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

    // Reopen finalized order back to the operational queue.
    order.status = 'pending';
    return this.orderRepository.save(order);
  }




  /**
   * Replaces editable order items and recalculates totals with stock reconciliation.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async updateItems(orderId: string, items: CreateOrderItemInput[], authStoreId?: string)
  {
    return AppDataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(Order);
      const order = await orderRepo.findOne({
        where: { id: orderId },
        relations: [ 'store', 'items', 'items.product' ],
      });
      if (!order) throw new AppError('ORDER-001', 404);
      this.ensureStoreAccess(order.store as any, authStoreId);

      const previousQtyByProduct = new Map<string, number>();
      (order.items || []).forEach((item: any) => {
        const productId = String(item?.product?.id || '').trim();
        if (!productId) return;
        previousQtyByProduct.set(productId, (previousQtyByProduct.get(productId) || 0) + Math.max(0, Number(item?.quantity || 0)));
      });

      const nextItems: OrderItem[] = [];
      let total = 0;
      const nextQtyByProduct = new Map<string, number>();

      for (const item of items)
      {
        const productId = String(item.productId || (item as any).id || '').trim();
        if (!productId) continue;
        const quantity = Math.max(0, Math.floor(Number(item.quantity || 0)));
        if (!quantity) continue;

        const product = await manager.getRepository(Product).findOne({ where: { id: productId }, relations: [ 'store' ] });
        if (!product || product.store.id !== order.store.id)
        {
          throw new AppError('PROD-002', 400);
        }

        nextQtyByProduct.set(productId, (nextQtyByProduct.get(productId) || 0) + quantity);

        const orderItem = new OrderItem();
        orderItem.product = product;
        orderItem.order = order;
        orderItem.quantity = quantity;
        const unitPrice = this.resolveItemPrice(product);
        const selectedModifiers = this.resolveSelectedModifiers(product, (item as any).selectedModifiers);
        orderItem.selectedModifiers = selectedModifiers.items.length ? selectedModifiers.items : null;
        const grossLine = (unitPrice + selectedModifiers.unitExtra) * quantity;
        const bundleDiscount = this.resolveBundleDiscount(product, quantity);
        orderItem.price = Math.max(0, grossLine - bundleDiscount);
        orderItem.cookingPoint = item.cookingPoint;
        orderItem.passSkewer = Boolean(item.passSkewer);
        orderItem.isPrinted = Boolean((item as any).isPrinted);
        nextItems.push(orderItem);
        total += orderItem.price;
      }

      const allProductIds = new Set<string>([...previousQtyByProduct.keys(), ...nextQtyByProduct.keys()]);
      for (const productId of allProductIds.values()) {
        const previousQty = previousQtyByProduct.get(productId) || 0;
        const nextQty = nextQtyByProduct.get(productId) || 0;
        const delta = nextQty - previousQty;
        if (delta === 0) continue;
        if (delta > 0) {
          await this.adjustManagedStockTx(manager, {
            storeId: order.store.id,
            productId,
            orderId: order.id,
            delta,
            movementType: 'order_items_adjust_consume',
            reason: `Ajuste de itens do pedido ${order.id} (+${delta})`,
          });
        } else {
          await this.adjustManagedStockTx(manager, {
            storeId: order.store.id,
            productId,
            orderId: order.id,
            delta,
            movementType: 'order_items_adjust_restock',
            reason: `Ajuste de itens do pedido ${order.id} (${delta})`,
          });
        }
      }

      await manager.createQueryBuilder()
        .delete()
        .from(OrderItem)
        .where('order_id = :id', { id: order.id })
        .execute();

      const deliveryFee = order.deliveryFee ? Number(order.deliveryFee) : 0;
      const deliveryFeeValue = Number.isNaN(deliveryFee) ? 0 : deliveryFee;

      order.items = nextItems;
      order.total = total + deliveryFeeValue;

      const statusRow = await manager.query(
        `SELECT status FROM orders WHERE id = $1 LIMIT 1`,
        [ order.id ]
      );
      const latestStatus = String(statusRow?.[0]?.status || '').trim().toLowerCase();
      if (latestStatus) {
        order.status = latestStatus;
      }

      return orderRepo.save(order);
    });
  }

    /**
   * Marks workflow state for mark items as printed.
   *
   * @author Edmilson Lopes
   */
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
    // Auto-fail awaiting_payment orders whose MP payment expired
    try {
      const rows = await AppDataSource.query(
        `SELECT id, expires_at FROM order_payments
          WHERE order_id = $1 AND payment_status = 'PENDING' AND expires_at IS NOT NULL
          AND expires_at < NOW() - INTERVAL '2 minutes'
          AND created_at < NOW() - INTERVAL '7 minutes'
          LIMIT 1`,
        [orderId]
      );
      if (rows?.length) {
        await this.orderPaymentService.markFailedFromWebhook(rows[0].id);
      }
    } catch { /* non-blocking */ }

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
    manager?: EntityManager,
    orderRefId?: string
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
        const txManager = manager || AppDataSource.manager;
        await this.adjustManagedStockTx(txManager as EntityManager, {
          storeId: store!.id,
          productId: product.id,
          orderId: null,
          delta: qty,
          movementType: 'sale',
          reason: `Pedido ${String(orderRefId || '')} (${String(input.type || 'order')})`,
        });
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
    const condominiumContext = await this.resolveCondominiumOrderContext(input, store!.id);
    const deliveryFee =
      (input.type === 'delivery' || Boolean(condominiumContext)) && input.deliveryFee !== undefined && input.deliveryFee !== null
        ? Number(input.deliveryFee)
        : null;
    const deliveryFeeValue = !Number.isNaN(Number(deliveryFee)) && Number(deliveryFee) > 0
      ? Number(deliveryFee)
      : 0;

    const condominiumFulfillmentMode = String(condominiumContext?.fulfillmentMode || '').toLowerCase();
    const normalizedFulfillmentMode = condominiumContext
      ? (condominiumFulfillmentMode === 'apartment_delivery' ? 'condominium_apartment' : 'condominium_pickup')
      : input.type === 'delivery' && String((input as any).fulfillmentMode || '').toLowerCase() === 'postal'
        ? 'postal'
        : 'distance';

    return this.orderRepository.create({
      id: orderRefId as any,
      customerName: input.customerName,
      customerUserId: input.customerUserId || null,
      guestPushId: input.guestPushId || null,
      phone: input.phone,
      address: input.address,
      table: input.table,
      type: input.type,
      fulfillmentMode: normalizedFulfillmentMode,
      condominiumId: condominiumContext?.condominiumId || null,
      condominiumEventId: condominiumContext?.eventId || null,
      condominiumName: condominiumContext?.condominiumName || null,
      condominiumEventTitle: condominiumContext?.eventTitle || null,
      condominiumFulfillmentMode: condominiumContext?.fulfillmentMode || null,
      condominiumUnit: condominiumContext?.unit || null,
      paymentMethod: input.paymentMethod,
      paymentStatus,
      cashTendered,
      deliveryFee: deliveryFeeValue || null,
      items,
      total: total + deliveryFeeValue,
      store: store!,
    } as Order);
  }

  private async resolveCondominiumOrderContext(input: Omit<CreateOrderDto, 'storeId'>, storeId: string) {
    const payload = (input as any)?.condominiumOrder;
    if (!payload) return null;

    const condominiumSlug = String(payload?.condominiumSlug || '').trim();
    const condominiumId = String(payload?.condominiumId || '').trim();
    const eventId = String(payload?.eventId || '').trim();
    if (!condominiumSlug && !condominiumId) {
      throw new AppError('CONDO-006', 400, { message: 'Condominio obrigatorio para pedido de feira.' });
    }

    const requestedMode = String(payload?.fulfillmentMode || 'pickup_at_stall').trim().toLowerCase();
    const fulfillmentMode = requestedMode === 'apartment_delivery' ? 'apartment_delivery' : 'pickup_at_stall';
    const rows: Array<any> = await AppDataSource.query(
      `
        SELECT
          c.id AS condominium_id,
          c.name AS condominium_name,
          c.slug AS condominium_slug,
          ce.id AS event_id,
          ce.title AS event_title,
          ce.starts_at,
          ce.ends_at,
          ce.pickup_location,
          ss.order_types,
          COALESCE(sc.allow_pickup_at_stall, ces.allow_pickup_at_stall, TRUE) AS allow_pickup_at_stall,
          CASE
            WHEN ces.allow_apartment_delivery = TRUE OR sc.allow_apartment_delivery = TRUE THEN TRUE
            ELSE FALSE
          END AS allow_apartment_delivery,
          COALESCE(ces.apartment_delivery_fee, sc.apartment_delivery_fee, 0) AS apartment_delivery_fee
        FROM condominiums c
        JOIN condominium_events ce
          ON ce.condominium_id = c.id
         AND ce.active = TRUE
         AND ce.starts_at <= NOW()
         AND ce.ends_at >= NOW()
         AND COALESCE(ce.status, 'scheduled') <> 'cancelled'
        JOIN condominium_event_stores ces
          ON ces.event_id = ce.id
         AND ces.store_id = $1
         AND ces.active = TRUE
        JOIN stores s
          ON s.id = ces.store_id
        LEFT JOIN store_settings ss
          ON ss.store_id = s.id
        LEFT JOIN store_condominiums sc
          ON sc.condominium_id = c.id
         AND sc.store_id = $1
        WHERE c.active = TRUE
          AND ($2::text = '' OR c.slug = $2)
          AND ($3::uuid IS NULL OR c.id = $3::uuid)
          AND ($4::uuid IS NULL OR ce.id = $4::uuid)
        ORDER BY ce.starts_at ASC
        LIMIT 1
      `,
      [storeId, condominiumSlug, condominiumId || null, eventId || null]
    );
    const row = rows[0];
    if (!row) {
      throw new AppError('CONDO-007', 400, { message: 'Esta loja nao esta confirmada em uma feira ativa deste condominio.' });
    }

    const orderTypes = Array.isArray(row.order_types) ? row.order_types : [];
    const supportsStoreDelivery = orderTypes.some((type: any) => String(type || '').toLowerCase() === 'delivery');
    const allowApartmentDelivery = row.allow_apartment_delivery === true || supportsStoreDelivery;

    if (fulfillmentMode === 'pickup_at_stall' && row.allow_pickup_at_stall === false) {
      throw new AppError('CONDO-008', 400, { message: 'Retirada na barraca nao esta disponivel para esta feira.' });
    }
    if (fulfillmentMode === 'apartment_delivery' && !allowApartmentDelivery) {
      throw new AppError('CONDO-009', 400, { message: 'Entrega no apartamento nao esta disponivel para esta feira.' });
    }

    const unit = {
      block: String(payload?.block || '').trim() || null,
      tower: String(payload?.tower || '').trim() || null,
      apartment: String(payload?.apartment || '').trim() || null,
      reference: String(payload?.reference || '').trim() || null,
      pickupLocation: String(row.pickup_location || '').trim() || null,
      startsAt: row.starts_at || null,
      endsAt: row.ends_at || null,
      apartmentDeliveryFee:
        row.apartment_delivery_fee !== null && row.apartment_delivery_fee !== undefined
          ? Number(row.apartment_delivery_fee)
          : null,
    };
    if (fulfillmentMode === 'apartment_delivery' && !unit.apartment) {
      throw new AppError('CONDO-010', 400, { message: 'Informe o apartamento para entrega no condominio.' });
    }

    return {
      condominiumId: row.condominium_id,
      condominiumName: row.condominium_name,
      condominiumSlug: row.condominium_slug,
      eventId: row.event_id,
      eventTitle: row.event_title,
      fulfillmentMode,
      unit,
    };
  }
}
