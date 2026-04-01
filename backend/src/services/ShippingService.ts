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

  private normalizeZip(value: unknown) {
    return String(value || '').replace(/\D/g, '').slice(0, 8);
  }

  private normalizePositiveInt(value: unknown, fallback: number) {
    const parsed = Math.floor(Number(value));
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
  }

  private normalizeQuantity(value: unknown) {
    const parsed = Math.floor(Number(value));
    if (!Number.isFinite(parsed) || parsed <= 0) return 1;
    return parsed;
  }

  private parseDistanceFactor(originZip: string, destinationZip: string) {
    if (!originZip || !destinationZip) return 1.2;
    if (originZip.slice(0, 3) === destinationZip.slice(0, 3)) return 1.0;
    if (originZip.slice(0, 2) === destinationZip.slice(0, 2)) return 1.25;
    return 1.5;
  }

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

  private buildFallbackQuote(args: {
    originZip: string;
    destinationZip: string;
    packageWeightG: number;
    packageLengthCm: number;
    packageWidthCm: number;
    packageHeightCm: number;
    baseFee: number;
  }) {
    const weightKg = Math.max(0.3, args.packageWeightG / 1000);
    const volumetricKg = Math.max(0.3, (args.packageLengthCm * args.packageWidthCm * args.packageHeightCm) / 6000);
    const billableWeightKg = Math.max(weightKg, volumetricKg);
    const distanceFactor = this.parseDistanceFactor(args.originZip, args.destinationZip);
    const baseFee = Number.isFinite(args.baseFee) && args.baseFee > 0 ? args.baseFee : 9.9;

    const pacPrice = Number((baseFee + billableWeightKg * 4.6 * distanceFactor).toFixed(2));
    const sedexPrice = Number((baseFee + 8 + billableWeightKg * 6.9 * distanceFactor).toFixed(2));
    const pacDays = distanceFactor <= 1 ? 4 : distanceFactor <= 1.25 ? 6 : 8;
    const sedexDays = distanceFactor <= 1 ? 2 : distanceFactor <= 1.25 ? 3 : 4;

    return {
      provider: 'internal_postal_v1',
      services: [
        {
          serviceCode: 'PAC',
          serviceName: 'PAC',
          price: pacPrice,
          estimatedDays: pacDays,
          currency: 'BRL',
        },
        {
          serviceCode: 'SEDEX',
          serviceName: 'SEDEX',
          price: sedexPrice,
          estimatedDays: sedexDays,
          currency: 'BRL',
        },
      ],
      debug: {
        billableWeightKg: Number(billableWeightKg.toFixed(3)),
        weightKg: Number(weightKg.toFixed(3)),
        volumetricKg: Number(volumetricKg.toFixed(3)),
        distanceFactor,
      },
    };
  }

  private async resolveInputItems(storeId: string, inputItems: QuoteItemInput[]) {
    if (!Array.isArray(inputItems) || inputItems.length === 0) {
      throw new AppError('ORDER-004', 400, { message: 'Informe ao menos 1 item para cotação postal.' });
    }

    const resolved: Array<{
      productId: string | null;
      quantity: number;
      name: string;
      weightG: number;
      lengthCm: number;
      widthCm: number;
      heightCm: number;
    }> = [];

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
    const quote = this.buildFallbackQuote({
      originZip,
      destinationZip,
      packageWeightG: pkg.weightG,
      packageLengthCm: pkg.lengthCm,
      packageWidthCm: pkg.widthCm,
      packageHeightCm: pkg.heightCm,
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

  async quoteByStoreSlug(slug: string, input: QuoteInput) {
    const store = await this.storeRepository.findBySlug(slug);
    return this.quoteByStoreInternal(store, input, true);
  }
}

