/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: Store.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import
  {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
  } from 'typeorm';
import { User } from './User';
import { StoreSettings } from './StoreSettings';
import { Product } from './Product';
import { Order } from './Order';
import { Subscription } from './Subscription';

@Entity({ name: 'stores' })
/**
 * Provides Store functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-17
 */
export class Store
{
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ default: true })
  open!: boolean;

  @ManyToOne(() => User, (user) => user.stores, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @OneToOne(() => StoreSettings, (settings) => settings.store, {
    cascade: true,
    eager: true,
    onDelete: 'CASCADE',
  })
  settings!: StoreSettings;

  @OneToMany(() => Product, (product) => product.store)
  products!: Product[];

  @OneToMany(() => Order, (order) => order.store)
  orders!: Order[];

  @OneToMany(() => Subscription, (subscription) => subscription.store)
  subscriptions!: Subscription[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}