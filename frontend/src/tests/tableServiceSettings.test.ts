import { describe, expect, it } from 'vitest';
import {
  calculateTableServiceCharge,
  normalizeTableServiceSettings,
  TABLE_SERVICE_CATEGORY,
} from '../utils/tableServiceSettings';

describe('tableServiceSettings', () => {
  it('normaliza configuracao vazia com cobrancas desligadas', () => {
    expect(normalizeTableServiceSettings(null)).toEqual({
      couvertEnabled: false,
      couvertLabel: 'Couvert artístico',
      couvertPrice: 0,
      serviceChargeEnabled: false,
      serviceChargeLabel: 'Taxa de serviço',
      serviceChargePercent: 10,
    });
  });

  it('calcula taxa de servico excluindo itens de atendimento de mesa', () => {
    const result = calculateTableServiceCharge(
      [
        { name: 'Prato', qty: 2, unitPrice: 25 },
        { name: 'Bala avulsa', qty: 1, unitPrice: 3 },
        { name: 'Couvert artístico', qty: 3, unitPrice: 10, product: { category: TABLE_SERVICE_CATEGORY } },
      ],
      10,
      (item) => item?.product?.category === TABLE_SERVICE_CATEGORY
    );

    expect(result).toEqual({ subtotal: 53, amount: 5.3 });
  });
});
