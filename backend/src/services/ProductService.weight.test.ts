import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Venda por peso (30/10) — ProductService: regras de CADASTRO.
 * - WEIGHT exige weightMinG/weightStepG (> 0) — PROD-004;
 * - WEIGHT nunca ganha bundle promo ("leve X" é promoção de unidades);
 * - troca de modalidade com estoque gerenciado > 0 é BLOQUEADA (PROD-003):
 *   unidades e gramas nunca são convertidas silenciosamente;
 * - UNIT (default) preserva o comportamento histórico.
 */

const { storeFindById, productFindById, repoCreate, repoSave } = vi.hoisted(() => ({
  storeFindById: vi.fn(),
  productFindById: vi.fn(),
  repoCreate: vi.fn((product: any) => ({ ...product })),
  repoSave: vi.fn(async (product: any) => product),
}));

vi.mock('../repositories/ProductRepository', () => ({
  ProductRepository: class {
    create = repoCreate;
    save = repoSave;
    findById = productFindById;
    clearFeaturedByStoreId = vi.fn(async () => undefined);
  },
}));
vi.mock('../repositories/StoreRepository', () => ({
  StoreRepository: class { findById = storeFindById; },
}));
vi.mock('../utils/imageStorage', () => ({ saveBase64Image: vi.fn(async () => null) }));

import { ProductService } from './ProductService';

const store: any = { id: 'store-1', name: 'Hortifruti' };

describe('ProductService.create — modalidade de venda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeFindById.mockResolvedValue(store);
  });

  it('sem saleUnit (legado) → UNIT, sem campos de peso (comportamento atual)', async () => {
    const service = new ProductService();
    const product = await service.create({ name: 'Espetinho', price: 7, storeId: 'store-1' } as any);
    expect(product.saleUnit).toBe('UNIT');
    expect(product.weightMinG).toBeNull();
    expect(product.weightStepG).toBeNull();
  });

  it('WEIGHT sem mínimo/incremento → PROD-004 (nunca aceitar cadastro incompleto)', async () => {
    const service = new ProductService();
    await expect(
      service.create({ name: 'Tomate', price: 10, saleUnit: 'WEIGHT', storeId: 'store-1' } as any)
    ).rejects.toMatchObject({ code: 'PROD-004' });
    await expect(
      service.create({ name: 'Tomate', price: 10, saleUnit: 'WEIGHT', weightMinG: 250, storeId: 'store-1' } as any)
    ).rejects.toMatchObject({ code: 'PROD-004' });
  });

  it('WEIGHT válido → mín/incremento persistidos e bundle promo FORA', async () => {
    const service = new ProductService();
    const product = await service.create({
      name: 'Tomate',
      price: 10,
      saleUnit: 'WEIGHT',
      weightMinG: 250,
      weightStepG: 250,
      bundlePromoActive: true,
      bundlePromoQty: 2,
      bundlePromoPrice: 16,
      storeId: 'store-1',
    } as any);
    expect(product.saleUnit).toBe('WEIGHT');
    expect(product.weightMinG).toBe(250);
    expect(product.weightStepG).toBe(250);
    expect(product.bundlePromoActive).toBe(false);
    expect(product.bundlePromoQty).toBeNull();
  });
});

describe('ProductService.update — troca de modalidade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeFindById.mockResolvedValue(store);
  });

  const baseWeight: any = {
    id: 'prod-1',
    name: 'Tomate',
    price: 10,
    saleUnit: 'WEIGHT',
    weightMinG: 250,
    weightStepG: 250,
    manageStock: true,
    stockQuantity: 5000, // 5 kg em gramas
    store,
  };

  it('WEIGHT→UNIT com estoque (g) em massa → PROD-003: nunca converter silenciosamente', async () => {
    productFindById.mockResolvedValue({ ...baseWeight });
    const service = new ProductService();
    await expect(
      service.update('store-1', 'prod-1', { saleUnit: 'UNIT' } as any)
    ).rejects.toMatchObject({ code: 'PROD-003' });
  });

  it('UNIT→WEIGHT com estoque (unidades) → PROD-003 também', async () => {
    productFindById.mockResolvedValue({
      ...baseWeight,
      saleUnit: 'UNIT',
      weightMinG: null,
      weightStepG: null,
      stockQuantity: 12,
    });
    const service = new ProductService();
    await expect(
      service.update('store-1', 'prod-1', { saleUnit: 'WEIGHT', weightMinG: 250, weightStepG: 250 } as any)
    ).rejects.toMatchObject({ code: 'PROD-003' });
  });

  it('estoque zerado → troca permitida e zera bundle promo', async () => {
    productFindById.mockResolvedValue({ ...baseWeight, stockQuantity: 0 });
    const service = new ProductService();
    const updated = await service.update('store-1', 'prod-1', {
      saleUnit: 'UNIT',
    } as any);
    expect(updated.saleUnit).toBe('UNIT');
    expect(updated.bundlePromoActive).toBe(false);
  });

  it('ajustar mínimo/incremento sem trocar modalidade → ok (estoque intacto)', async () => {
    productFindById.mockResolvedValue({ ...baseWeight });
    const service = new ProductService();
    const updated = await service.update('store-1', 'prod-1', {
      saleUnit: 'WEIGHT',
      weightMinG: 500,
      weightStepG: 500,
    } as any);
    expect(updated.weightMinG).toBe(500);
    expect(updated.weightStepG).toBe(500);
    expect(updated.stockQuantity).toBe(5000);
  });
});
