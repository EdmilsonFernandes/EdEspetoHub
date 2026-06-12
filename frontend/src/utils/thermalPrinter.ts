import { Capacitor, registerPlugin } from '@capacitor/core';

export type NativeThermalPrinterDevice = {
  name?: string;
  address: string;
  bonded?: boolean;
  isPrinter?: boolean;
};

export type ThermalReceiptHeaderMode = 'complete' | 'compact';

export type ThermalPrinterSettings = {
  paperWidth: 32 | 42;
  copies: 1 | 2;
  headerMode: ThermalReceiptHeaderMode;
  feedLines: number;
};

export type NativeThermalPrinterStatus = {
  available: boolean;
  enabled: boolean;
  permissionGranted: boolean;
  printerReachable?: boolean;
  settings?: ThermalPrinterSettings;
  savedPrinter?: NativeThermalPrinterDevice & Partial<ThermalPrinterSettings>;
};

type NativeThermalPrinterPrintResult = {
  mode: 'native';
  bytes?: number;
  durationMs?: number;
};

type ThermalPrinterPlugin = {
  getStatus(): Promise<NativeThermalPrinterStatus>;
  listPairedDevices(): Promise<{ devices: NativeThermalPrinterDevice[]; savedPrinter?: NativeThermalPrinterStatus['savedPrinter'] }>;
  savePrinter(
    options: { address: string; name?: string } & Partial<ThermalPrinterSettings>
  ): Promise<{ savedPrinter?: NativeThermalPrinterStatus['savedPrinter']; settings?: ThermalPrinterSettings }>;
  saveSettings(options: Partial<ThermalPrinterSettings>): Promise<{ savedPrinter?: NativeThermalPrinterStatus['savedPrinter']; settings?: ThermalPrinterSettings }>;
  clearPrinter(): Promise<{ savedPrinter?: NativeThermalPrinterStatus['savedPrinter'] }>;
  openBluetoothSettings(): Promise<void>;
  print(options: { text: string; address?: string; copies?: number; feedLines?: number }): Promise<NativeThermalPrinterPrintResult>;
};

export class NativeThermalPrinterError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'NativeThermalPrinterError';
    this.code = code;
  }
}

const ThermalPrinter = registerPlugin<ThermalPrinterPlugin>('ThermalPrinter');
const THERMAL_PRINTER_SETTINGS_KEY = 'jnc:thermal-printer-settings';

export const DEFAULT_THERMAL_PRINTER_SETTINGS: ThermalPrinterSettings = {
  paperWidth: 32,
  copies: 1,
  headerMode: 'complete',
  feedLines: 3,
};

export const normalizeThermalPrinterSettings = (
  settings?: Partial<ThermalPrinterSettings> | null
): ThermalPrinterSettings => {
  const paperWidth = Number(settings?.paperWidth);
  const copies = Number(settings?.copies);
  const feedLines = Number(settings?.feedLines);
  const headerMode = settings?.headerMode === 'compact' ? 'compact' : 'complete';

  return {
    paperWidth: paperWidth === 42 ? 42 : 32,
    copies: copies === 2 ? 2 : 1,
    headerMode,
    feedLines: Number.isFinite(feedLines) ? Math.max(1, Math.min(6, Math.round(feedLines))) : 3,
  };
};

export const getStoredThermalPrinterSettings = (): ThermalPrinterSettings => {
  if (typeof window === 'undefined') return DEFAULT_THERMAL_PRINTER_SETTINGS;
  try {
    const raw = window.localStorage.getItem(THERMAL_PRINTER_SETTINGS_KEY);
    if (!raw) return DEFAULT_THERMAL_PRINTER_SETTINGS;
    return normalizeThermalPrinterSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_THERMAL_PRINTER_SETTINGS;
  }
};

export const saveStoredThermalPrinterSettings = (
  settings: Partial<ThermalPrinterSettings>
): ThermalPrinterSettings => {
  const normalized = normalizeThermalPrinterSettings(settings);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(THERMAL_PRINTER_SETTINGS_KEY, JSON.stringify(normalized));
    } catch {
      // Mantem a configuracao em memoria quando o storage nao estiver disponivel.
    }
  }
  return normalized;
};

const resolvePrinterSettings = (
  settingsOrPaperWidth?: Partial<ThermalPrinterSettings> | number
): ThermalPrinterSettings => {
  if (typeof settingsOrPaperWidth === 'number') {
    return normalizeThermalPrinterSettings({
      ...getStoredThermalPrinterSettings(),
      paperWidth: settingsOrPaperWidth === 42 ? 42 : 32,
    });
  }
  return normalizeThermalPrinterSettings({
    ...getStoredThermalPrinterSettings(),
    ...(settingsOrPaperWidth || {}),
  });
};

export const isAndroidNativeThermalPrinterRuntime = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const isNativeThermalPrinterPluginAvailable = () =>
  isAndroidNativeThermalPrinterRuntime() && Capacitor.isPluginAvailable('ThermalPrinter');

const ensureNativeThermalPrinterAvailable = (message: string) => {
  if (!isAndroidNativeThermalPrinterRuntime()) {
    throw new NativeThermalPrinterError('UNAVAILABLE', message);
  }
  if (!Capacitor.isPluginAvailable('ThermalPrinter')) {
    throw new NativeThermalPrinterError(
      'PLUGIN_UNAVAILABLE',
      'Atualize o app da loja para usar a impressão Bluetooth direta. Enquanto isso, a impressão continua pelo RawBT.'
    );
  }
};

export const getNativeThermalPrinterStatus = async () => {
  ensureNativeThermalPrinterAvailable('Impressão nativa disponível apenas no app Android.');
  return ThermalPrinter.getStatus();
};

export const listNativeThermalPrinters = async () => {
  ensureNativeThermalPrinterAvailable('Abra pelo app Android para configurar a impressora.');
  return ThermalPrinter.listPairedDevices();
};

export const saveNativeThermalPrinter = async (
  device: NativeThermalPrinterDevice,
  settingsOrPaperWidth?: Partial<ThermalPrinterSettings> | number
) => {
  ensureNativeThermalPrinterAvailable('Abra pelo app Android para configurar a impressora.');
  const settings = saveStoredThermalPrinterSettings(resolvePrinterSettings(settingsOrPaperWidth));
  return ThermalPrinter.savePrinter({
    address: device.address,
    name: device.name || 'Impressora Bluetooth',
    ...settings,
  });
};

export const saveNativeThermalPrinterSettings = async (
  settings: Partial<ThermalPrinterSettings>
) => {
  const normalized = saveStoredThermalPrinterSettings(resolvePrinterSettings(settings));
  if (!isNativeThermalPrinterPluginAvailable()) {
    return { settings: normalized };
  }
  try {
    return await ThermalPrinter.saveSettings(normalized);
  } catch (error: any) {
    const message = String(error?.message || error?.code || '').toLowerCase();
    if (message.includes('not implemented') || message.includes('unimplemented')) {
      return { settings: normalized };
    }
    throw error;
  }
};

export const clearNativeThermalPrinter = async () => {
  ensureNativeThermalPrinterAvailable('Abra pelo app Android para configurar a impressora.');
  return ThermalPrinter.clearPrinter();
};

export const openNativeBluetoothSettings = async () => {
  ensureNativeThermalPrinterAvailable('Abra pelo app Android para configurar a impressora.');
  return ThermalPrinter.openBluetoothSettings();
};

export const printNativeThermalReceipt = async (
  text: string,
  settings?: Partial<ThermalPrinterSettings>
) => {
  ensureNativeThermalPrinterAvailable('Impressão nativa disponível apenas no app Android.');
  const status = await ThermalPrinter.getStatus();
  const address = String(status?.savedPrinter?.address || '').trim();
  if (!address) {
    throw new NativeThermalPrinterError('NO_PRINTER', 'Nenhuma impressora configurada neste aparelho.');
  }
  const effectiveSettings = normalizeThermalPrinterSettings({
    ...getStoredThermalPrinterSettings(),
    ...(status?.settings || {}),
    ...(status?.savedPrinter || {}),
    ...(settings || {}),
  });
  return ThermalPrinter.print({
    text,
    address,
    copies: effectiveSettings.copies,
    feedLines: effectiveSettings.feedLines,
  });
};
