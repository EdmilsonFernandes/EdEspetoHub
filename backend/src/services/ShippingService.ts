/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: ShippingService.ts
 * @Date: 2026-04-01
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { AppError } from '../errors/AppError';
import { ProductRepository } from '../repositories/ProductRepository';
import { StoreRepository } from '../repositories/StoreRepository';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { InternalShippingQuoteProvider } from './shipping/providers/InternalShippingQuoteProvider';
import { MelhorEnvioShippingQuoteProvider } from './shipping/providers/MelhorEnvioShippingQuoteProvider';
import { ShippingQuoteProvider } from './shipping/providers/ShippingQuoteProvider';
import { QuoteItemResolved } from './shipping/types';

type QuoteItemInput = {
  productId?: string;
  quantity?: number;
  weightG?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  name?: string;
};

type QuoteInput = {
  destinationZip: string;
  items: QuoteItemInput[];
};

export class ShippingService {
  private readonly storeRepository = new StoreRepository();
  private readonly productRepository = new ProductRepository();
  private readonly log = logger.child({ scope: 'ShippingService' });
  private readonly internalProvider = new InternalShippingQuoteProvider();
  private readonly melhorEnvioProvider = new MelhorEnvioShippingQuoteProvider();

    /**
   * Executes normalize zip business logic.
   *
   * @author Edmilson Lopes
   */
private normalizeZip(value: unknown) {
    return String(value || '').replace(/\D/g, '').slice(0, 8);
  }

    /**
   * Executes normalize positive int business logic.
   *
   * @author Edmilson Lopes
   */
private normalizePositiveInt(value: unknown, fallback: number) {
    const parsed = Math.floor(Number(value));
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
  }

    /**
   * Executes normalize quantity business logic.
   *
   * @author Edmilson Lopes
   */
private normalizeQuantity(value: unknown) {
    const parsed = Math.floor(Number(value));
    if (!Number.isFinite(parsed) || parsed <= 0) return 1;
    return parsed;
  }

    /**
   * Executes build package from items business logic.
   *
   * @author Edmilson Lopes
   */
private buildPackageFromItems(items: Array<Required<Pick<QuoteItemInput, 'quantity' | 'weightG' | 'lengthCm' | 'widthCm' | 'heightCm'>>>) {
    let totalWeightG = 0;
    let totalVolumeCm3 = 0;
    let maxLength = 16;
    let maxWidth = 11;
    let maxHeight = 2;

    items.forEach((item) => {
      const qty = this.normalizeQuantity(item.quantity);
      const weight = this.normalizePositiveInt(item.weightG, 300);
      const length = this.normalizePositiveInt(item.lengthCm, 16);
      const width = this.normalizePositiveInt(item.widthCm, 11);
      const height = this.normalizePositiveInt(item.heightCm, 2);

      totalWeightG += weight * qty;
      totalVolumeCm3 += length * width * height * qty;
      maxLength = Math.max(maxLength, length);
      maxWidth = Math.max(maxWidth, width);
      maxHeight = Math.max(maxHeight, height);
    });

    const cubicEdge = Math.max(1, Math.round(Math.cbrt(Math.max(1, totalVolumeCm3))));
    const lengthCm = Math.max(maxLength, cubicEdge);
    const widthCm = Math.max(maxWidth, Math.round(cubicEdge * 0.8));
    const heightCm = Math.max(maxHeight, Math.round(cubicEdge * 0.6));

    return {
      weightG: Math.max(300, totalWeightG),
      lengthCm: Math.min(100, Math.max(16, lengthCm)),
      widthCm: Math.min(100, Math.max(11, widthCm)),
      heightCm: Math.min(100, Math.max(2, heightCm)),
      totalVolumeCm3,
    };
  }

    /**
   * Executes resolve provider order business logic.
   *
   * @author Edmilson Lopes
   */
private resolveProviderOrder(): ShippingQuoteProvider[] {
    const provider = String(env.shipping.provider || 'internal').toLowerCase();
    if (provider === 'melhor_envio') return [this.melhorEnvioProvider, this.internalProvider];
    if (provider === 'auto') return [this.melhorEnvioProvider, this.internalProvider];
    return [this.internalProvider];
  }

    /**
   * Calculates values for quote with provider fallback.
   *
   * @author Edmilson Lopes
   */
private async quoteWithProviderFallback(args: {
    originZip: string;
    destinationZip: string;
    pkg: {
      weightG: number;
      lengthCm: number;
      widthCm: number;
      heightCm: number;
      totalVolumeCm3: number;
    };
    items: QuoteItemResolved[];
    baseFee: number;
  }) {
    const providers = this.resolveProviderOrder();
    const strictProvider = Boolean(env.shipping.strictProvider);
    const configuredProvider = String(env.shipping.provider || 'internal').toLowerCase();
    const errors: Array<Record<string, unknown>> = [];

    for (const provider of providers) {
      if (
        provider === this.melhorEnvioProvider &&
        !this.melhorEnvioProvider.isConfigured()
      ) {
        if (strictProvider && configuredProvider === 'melhor_envio') {
          throw new AppError('ORDER-004', 400, {
            message: 'Credenciais do provedor melhor_envio não configuradas.',
            provider: 'melhor_envio',
          });
        }
        errors.push({ provider: provider.name, reason: 'not_configured' });
        continue;
      }

      try {
        return await provider.quote({
          originZip: args.originZip,
          destinationZip: args.destinationZip,
          pkg: args.pkg,
          items: args.items,
          baseFee: args.baseFee,
        });
      } catch (error: any) {
        this.log.warn('Shipping provider quote failed', {
          provider: provider.name,
          status: error?.status,
          message: error?.details?.message || error?.message || 'unknown_error',
        });
        errors.push({
          provider: provider.name,
          status: error?.status || null,
          message: error?.details?.message || error?.message || 'unknown_error',
        });

        if (strictProvider && configuredProvider === provider.name) {
          throw error instanceof AppError
            ? error
            : new AppError('ORDER-004', 502, {
                message: 'Falha ao consultar frete no provedor configurado.',
                provider: provider.name,
              });
        }
      }
    }

    throw new AppError('ORDER-004', 502, {
      message: 'Não foi possível cotar frete com os provedores disponíveis.',
      providersTried: errors,
    });
  }

    /**
   * Executes resolve input items business logic.
   *
   * @author Edmilson Lopes
   */
private async resolveInputItems(storeId: string, inputItems: QuoteItemInput[]): Promise<QuoteItemResolved[]> {
    if (!Array.isArray(inputItems) || inputItems.length === 0) {
      throw new AppError('ORDER-004', 400, { message: 'Informe ao menos 1 item para cotação postal.' });
    }

    const resolved: QuoteItemResolved[] = [];

    for (const row of inputItems) {
      const quantity = this.normalizeQuantity(row?.quantity);
      const productId = String(row?.productId || '').trim();
      let product: any = null;
      if (productId) {
        product = await this.productRepository.findById(productId);
        if (!product || String(product?.store?.id || '') !== String(storeId)) {
          throw new AppError('PROD-001', 404, { message: `Produto não encontrado para cotação: ${productId}` });
        }
      }

      const name = String(row?.name || product?.name || 'Produto').trim() || 'Produto';
      resolved.push({
        productId: product?.id || null,
        quantity,
        name,
        weightG: this.normalizePositiveInt(row?.weightG ?? product?.weightG, 300),
        lengthCm: this.normalizePositiveInt(row?.lengthCm ?? product?.lengthCm, 16),
        widthCm: this.normalizePositiveInt(row?.widthCm ?? product?.widthCm, 11),
        heightCm: this.normalizePositiveInt(row?.heightCm ?? product?.heightCm, 2),
      });
    }
    return resolved;
  }

    /**
   * Calculates values for quote by store internal.
   *
   * @author Edmilson Lopes
   */
private async quoteByStoreInternal(store: any, input: QuoteInput, enforcePostalEnabled: boolean) {
    if (!store) throw new AppError('STORE-001', 404);

    const destinationZip = this.normalizeZip(input?.destinationZip);
    if (destinationZip.length !== 8) {
      throw new AppError('ORDER-004', 400, { message: 'CEP de destino inválido para cotação postal.' });
    }

    const originZip = this.normalizeZip(store?.settings?.postalOriginZip || '');
    if (originZip.length !== 8) {
      throw new AppError('ORDER-004', 400, { message: 'Configure o CEP de origem da loja para usar envio postal.' });
    }
    if (enforcePostalEnabled && !Boolean(store?.settings?.postalEnabled)) {
      throw new AppError('ORDER-004', 400, { message: 'Envio postal desativado para esta loja.' });
    }

    const items = await this.resolveInputItems(store.id, input.items || []);
    const pkg = this.buildPackageFromItems(items);
    const quote = await this.quoteWithProviderFallback({
      originZip,
      destinationZip,
      pkg,
      items,
      baseFee: Number(store?.settings?.deliveryFee || 0),
    });

    return {
      mode: 'postal',
      originZip,
      destinationZip,
      package: {
        weightG: pkg.weightG,
        lengthCm: pkg.lengthCm,
        widthCm: pkg.widthCm,
        heightCm: pkg.heightCm,
      },
      items: items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        weightG: item.weightG,
        lengthCm: item.lengthCm,
        widthCm: item.widthCm,
        heightCm: item.heightCm,
      })),
      quote,
      generatedAt: new Date().toISOString(),
    };
  }

    /**
   * Calculates values for quote by store id.
   *
   * @author Edmilson Lopes
   */
async quoteByStoreId(
    storeId: string,
    input: QuoteInput,
    authStoreId?: string
  ) {
    const store = await this.storeRepository.findById(storeId);
    if (authStoreId && store?.id !== authStoreId) {
      throw new AppError('AUTH-003', 403);
    }
    return this.quoteByStoreInternal(store, input, false);
  }

    /**
   * Calculates values for quote by store slug.
   *
   * @author Edmilson Lopes
   */
async quoteByStoreSlug(slug: string, input: QuoteInput) {
    const store = await this.storeRepository.findBySlug(slug);
    return this.quoteByStoreInternal(store, input, true);
  }
}
