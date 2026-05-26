import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { printNativeThermalReceipt } from './thermalPrinter';
import { buildRawBtText, printReceiptAsImage } from './printReceiptImage';

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

  it('cai para RawBT quando o APK ainda não tem o plugin nativo', async () => {
    vi.mocked(printNativeThermalReceipt).mockRejectedValue(
      Object.assign(new Error('ThermalPrinter plugin is not implemented on android'), { code: 'PLUGIN_UNAVAILABLE' })
    );
    let href = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click(this: HTMLAnchorElement) {
      href = this.href;
    });

    const result = await printReceiptAsImage(payload);

    expect(result.mode).toBe('rawbt');
    expect(result.fallbackReason).toBe('PLUGIN_UNAVAILABLE');
    expect(href).toContain('rawbt:base64,');
  });

  it('preserva os dados principais do cupom enviado para impressão', () => {
    const text = buildRawBtText({
      ...payload,
      storeName: 'Gustavão Espetos',
      queueLabel: '#07',
      orderLabel: '#PED123',
      customerLabel: 'Mesa 12',
      customerNote: 'Sem ketchup e avisar para descer.',
      locationLabel: 'MESA 12',
      items: [
        { quantity: 2, name: 'Medalhão de Palmito', lineTotal: 'R$ 24,00', notes: 'Ao ponto' },
        { quantity: 3, name: 'Couvert Luan Santana', lineTotal: 'R$ 46,50', notes: '3 pessoas x R$ 15,50 por pessoa' },
        { quantity: 1, name: 'Taxa de serviço', lineTotal: 'R$ 7,05' },
      ],
      totalLabel: 'R$ 77,55',
    });

    expect(text).toContain('GUSTAVÃO ESPETOS');
    expect(text).toContain('Fila: #07');
    expect(text).toContain('Pedido: #PED123');
    expect(text).toContain('MESA 12');
    expect(text).toContain('CLIENTE: MESA 12');
    expect(text).toContain('OBS CLIENTE');
    expect(text).toContain('Sem ketchup');
    expect(text).toContain('descer.');
    expect(text).toContain('2x Medalhão de Palmito');
    expect(text).toContain('R$ 24,00');
    expect(text).toContain('Ao ponto');
    expect(text).toContain('3x Couvert Luan Santana');
    expect(text).toContain('3 pessoas x R$ 15,50');
    expect(text).toContain('pessoa');
    expect(text).toContain('1x Taxa de serviço');
    expect(text).toContain('TOTAL:');
    expect(text).toContain('R$ 77,55');
  });
});
