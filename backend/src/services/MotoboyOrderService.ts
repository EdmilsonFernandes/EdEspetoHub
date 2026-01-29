/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: MotoboyOrderService.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { OrderDelivery } from '../entities/OrderDelivery';
import { AppError } from '../errors/AppError';
import { Motoboy } from '../entities/Motoboy';
import { OrderRepository } from '../repositories/OrderRepository';
import { OrderDeliveryRepository } from '../repositories/OrderDeliveryRepository';
import { MotoboyStoreRepository } from '../repositories/MotoboyStoreRepository';
import { DeliveryBillingService } from './DeliveryBillingService';
/**
 * Provides MotoboyOrderService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-29
 */
export class MotoboyOrderService {
  private orderRepository = new OrderRepository();
  private orderDeliveryRepository = new OrderDeliveryRepository();
  private motoboyStoreRepository = new MotoboyStoreRepository();
  private deliveryBillingService = new DeliveryBillingService();

  private isDeliveryOrder(order: Order) {
    return order.type === 'delivery';
  }

  /**
   * Lists available orders for a motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async listAvailable(motoboy: Motoboy) {
    const storeIds = await this.motoboyStoreRepository.listStoreIds(motoboy.id);
    if (!storeIds.length) return [];
    return AppDataSource.getRepository(Order)
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.store', 'store')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('o.type = :type', { type: 'delivery' })
      .andWhere('o.status = :status', { status: 'waiting_for_motoboy' })
      .andWhere('o.store_id IN (:...storeIds)', { storeIds })
      .orderBy('o.created_at', 'ASC')
      .getMany();
  }

  /**
   * Lists delivery history for a motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async listHistory(motoboy: Motoboy, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - Math.max(days, 1));

    const repo = AppDataSource.getRepository(Order);
    const orders = await repo
      .createQueryBuilder('o')
      .innerJoin(OrderDelivery, 'od', 'od.order_id = o.id')
      .leftJoinAndSelect('o.store', 'store')
      .where('od.motoboy_id = :motoboyId', { motoboyId: motoboy.id })
      .andWhere('o.status IN (:...statuses)', { statuses: [ 'delivered', 'finished' ] })
      .andWhere('o.created_at >= :since', { since })
      .orderBy('o.created_at', 'DESC')
      .getMany();

    return orders.map((order) => ({
      id: order.id,
      store: order.store ? { id: order.store.id, name: order.store.name } : null,
      customerName: order.customerName,
      phone: order.phone,
      address: order.address,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      total: order.total,
      deliveryFee: order.deliveryFee,
      createdAt: order.createdAt,
    }));
  }

  /**
   * Accepts an order for delivery.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async acceptOrder(orderId: string, motoboy: Motoboy) {
    return AppDataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(Order);
      const deliveryRepo = manager.getRepository(OrderDelivery);

      const order = await orderRepo
        .createQueryBuilder('o')
        .leftJoinAndSelect('o.store', 'store')
        .setLock('pessimistic_write')
        .where('o.id = :orderId', { orderId })
        .getOne();

      if (!order) throw new AppError('ORDER-001', 404);
      if (!this.isDeliveryOrder(order)) throw new AppError('MOTO-010', 400);
      if (order.status !== 'waiting_for_motoboy') throw new AppError('MOTO-011', 400);

      const link = await this.motoboyStoreRepository.findActiveLink(motoboy.id, order.store.id);
      if (!link) throw new AppError('MOTO-012', 403);

      const delivery = deliveryRepo.create({
        orderId: order.id,
        motoboyId: motoboy.id,
      });

      try {
        await deliveryRepo.insert(delivery);
      } catch (error: any) {
        if (error?.code === '23505') {
          throw new AppError('MOTO-013', 409);
        }
        throw error;
      }

      order.status = 'in_delivery';
      await orderRepo.save(order);

      return { order, delivery };
    });
  }

  /**
   * Confirms payment.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async confirmPayment(orderId: string, motoboy: Motoboy, cashTendered?: number | null) {
    const delivery = await this.orderDeliveryRepository.findByOrderId(orderId);
    if (!delivery || delivery.motoboyId !== motoboy.id) throw new AppError('MOTO-014', 403);

    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    if (!this.isDeliveryOrder(order)) throw new AppError('MOTO-010', 400);

    if (order.paymentMethod?.toLowerCase() === 'cash' || order.paymentMethod?.toLowerCase() === 'dinheiro') {
      if (cashTendered !== undefined && cashTendered !== null) {
        order.cashTendered = Number(cashTendered);
      }
    }

    order.paymentStatus = 'PAID';
    await this.orderRepository.save(order);

    delivery.paymentConfirmedAt = new Date();
    delivery.paymentConfirmedByMotoboyId = motoboy.id;
    await this.orderDeliveryRepository.save(delivery);

    return order;
  }

  /**
   * Marks order delivered.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async markDelivered(orderId: string, motoboy: Motoboy) {
    const delivery = await this.orderDeliveryRepository.findByOrderId(orderId);
    if (!delivery || delivery.motoboyId !== motoboy.id) throw new AppError('MOTO-014', 403);

    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    if (!this.isDeliveryOrder(order)) throw new AppError('MOTO-010', 400);
    if (![ 'in_delivery', 'ready_for_delivery', 'waiting_for_motoboy' ].includes(order.status)) {
      throw new AppError('MOTO-015', 400);
    }

    order.status = 'delivered';
    const saved = await this.orderRepository.save(order);

    delivery.deliveredAt = new Date();
    await this.orderDeliveryRepository.save(delivery);

    await this.deliveryBillingService.recordDelivery(saved);
    return saved;
  }

  /**
   * Finishes order.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async finishOrder(orderId: string, motoboy: Motoboy) {
    const delivery = await this.orderDeliveryRepository.findByOrderId(orderId);
    if (!delivery || delivery.motoboyId !== motoboy.id) throw new AppError('MOTO-014', 403);

    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    if (!this.isDeliveryOrder(order)) throw new AppError('MOTO-010', 400);
    if (!['delivered', 'in_delivery'].includes(order.status)) {
      throw new AppError('MOTO-016', 400);
    }

    order.status = 'finished';
    const saved = await this.orderRepository.save(order);
    await this.deliveryBillingService.recordDelivery(saved);
    return saved;
  }
}
