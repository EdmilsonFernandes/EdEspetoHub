import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { printNativeThermalReceipt } from './thermalPrinter';
import { printReceiptAsImage } from './printReceiptImage';

vi.mock('./thermalPrinter', () => ({
  printNativeThermalReceipt: vi.fn(),
}));

const payload = {
  storeName: 'Loja Teste',
  platformName: 'Já no Caminho',
  queueLabel: '#01',
  orderLabel: '#ABC',
  customerLabel: 'Cliente',
  dateLabel: '26/05/2026 10:00',
  items: [{ quantity: 1, name: 'Espeto', lineTotal: 'R$ 12,00' }],
  totalLabel: 'R$ 12,00',
};

const setUserAgent = (value: string) => {
  Object.defineProperty(window.navigator, 'userAgent', {
    value,
    configurable: true,
  });
};

describe('printReceiptAsImage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(printNativeThermalReceipt).mockReset();
    setUserAgent('Mozilla/5.0 Android Já no Caminho');
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('usa impressão nativa quando a impressora Android está configurada', async () => {
    vi.mocked(printNativeThermalReceipt).mockResolvedValue({ mode: 'native', bytes: 180 });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const result = await printReceiptAsImage(payload);

    expect(result.mode).toBe('native');
    expect(result.bytes).toBe(180);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('cai para RawBT quando a impressão nativa não está configurada', async () => {
    vi.mocked(printNativeThermalReceipt).mockRejectedValue(
      Object.assign(new Error('Nenhuma impressora configurada.'), { code: 'NO_PRINTER' })
    );
    let href = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click(this: HTMLAnchorElement) {
      href = this.href;
    });

    const result = await printReceiptAsImage(payload);

    expect(result.mode).toBe('rawbt');
    expect(result.fallbackReason).toBe('NO_PRINTER');
    expect(href).toContain('rawbt:base64,');
  });
});
