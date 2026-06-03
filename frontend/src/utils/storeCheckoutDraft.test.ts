import {
  STORE_CHECKOUT_DRAFT_TTL_MS,
  buildStoreCheckoutDraftKey,
  createStoreCheckoutDraft,
  getStoreCheckoutDraftItemCount,
  normalizeStoreCheckoutDraft,
} from './storeCheckoutDraft';
import { describe, expect, it } from 'vitest';

describe('storeCheckoutDraft', () => {
  it('separa rascunho publico e operacional por loja', () => {
    expect(buildStoreCheckoutDraftKey('datony', 'public')).toBe('storeCheckoutDraft:datony:public');
    expect(buildStoreCheckoutDraftKey('datony', 'staff')).toBe('storeCheckoutDraft:datony:staff');
  });

  it('cria rascunho apenas quando existe item no carrinho', () => {
    expect(createStoreCheckoutDraft({ cart: {}, customer: {} })).toBeNull();

    const draft = createStoreCheckoutDraft({
      cart: { 'item-1': { id: 'item-1', qty: 2, name: 'Espeto' } },
      customer: { name: 'Mesa 4', type: 'table' },
      paymentMethod: 'dinheiro',
      context: 'staff',
      now: 1000,
    });

    expect(draft).toMatchObject({
      savedAt: 1000,
      context: 'staff',
      paymentMethod: 'dinheiro',
      customer: { name: 'Mesa 4', type: 'table' },
    });
  });

  it('normaliza rascunho valido e descarta rascunho expirado', () => {
    const raw = {
      savedAt: 1000,
      context: 'staff',
      cart: { a: { qty: 1 }, b: { qty: 3 } },
      customer: { table: '10' },
    };

    expect(getStoreCheckoutDraftItemCount(raw.cart)).toBe(4);
    expect(normalizeStoreCheckoutDraft(raw, 1000 + STORE_CHECKOUT_DRAFT_TTL_MS - 1)?.itemCount).toBe(4);
    expect(normalizeStoreCheckoutDraft(raw, 1000 + STORE_CHECKOUT_DRAFT_TTL_MS + 1)).toBeNull();
  });
});
