/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: OrderItem.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './Order';
import { Product } from './Product';

@Entity({ name: 'order_items' })
/**
 * Provides OrderItem functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-17
 */
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Quantidade CANÔNICA do item (30/10): UNIDADES quando `saleUnit` é UNIT,
   * GRAMAS INTEIRAS quando WEIGHT (500 = meia dúzia? não — 500 g). Nunca
   * armazenar kg fracionário (0,5) — a unidade de medida mora no `saleUnit`.
   */
  @Column()
  quantity!: number;

  /**
   * Snapshot da modalidade no momento do pedido ('UNIT' default = pedidos
   * legados). Mudança posterior no cadastro do produto NUNCA muda o item.
   */
  @Column({ name: 'sale_unit', type: 'varchar', length: 16, default: 'UNIT' })
  saleUnit!: 'UNIT' | 'WEIGHT';

  /**
   * Snapshot do preço de REFERÊNCIA vigente: preço por unidade (UNIT) ou por
   * kg (WEIGHT). `price` continua sendo o subtotal da linha (snapshot).
   */
  @Column({ name: 'unit_price_snapshot', type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPriceSnapshot?: number | null;

  @Column('decimal', { precision: 10, scale: 2 })
  price!: number;

  @Column({ name: 'cooking_point', type: 'varchar', nullable: true })
  cookingPoint?: string;

  @Column({ name: 'pass_skewer', type: 'boolean', default: false })
  passSkewer?: boolean;

  @Column({ name: 'selected_modifiers', type: 'jsonb', nullable: true })
  selectedModifiers?: Array<{ id: string; name: string; price: number; quantity?: number }> | null;

  @Column({ type: 'varchar', length: 280, nullable: true })
  /** Observação do item ("sem cebola", "bem passado"...) — benchmark §10. */
  note?: string | null;

  @Column({ name: 'is_printed', type: 'boolean', default: false })
  isPrinted?: boolean;

  @ManyToOne(() => Product, (product) => product.orderItems, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;
}
