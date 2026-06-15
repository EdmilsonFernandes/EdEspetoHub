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
  autoPrintOnlineOrders?: boolean;
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
  requestBluetoothPermission(): Promise<{ granted: boolean }>;
  saveAutoPrintSetting(options: { enabled: boolean }): Promise<void>;
  print(options: { text: string; address?: string; copies?: number; feedLines?: number; qrData?: string }): Promise<NativeThermalPrinterPrintResult>;
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
  autoPrintOnlineOrders: false,
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
    // Preservar o toggle de auto-print — antes este campo era descartado aqui, então
    // saveStoredThermalPrinterSettings/getStoredThermalPrinterSettings nunca o carregavam
    // e o toggle voltava para OFF ao sair e voltar da tela.
    autoPrintOnlineOrders: Boolean(settings?.autoPrintOnlineOrders),
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
  const result = await ThermalPrinter.getStatus();
  console.log('[thermal-printer] getStatus:', {
    available: result.available,
    enabled: result.enabled,
    permissionGranted: result.permissionGranted,
    printerReachable: result.printerReachable,
    hasSavedPrinter: Boolean(result.savedPrinter?.address),
  });
  return result;
};

export const requestNativeBluetoothPermission = async () => {
  ensureNativeThermalPrinterAvailable('Abra pelo app Android para configurar a impressora.');
  console.log('[thermal-printer] requestPermission: requesting BLUETOOTH_CONNECT...');
  const result = await ThermalPrinter.requestBluetoothPermission();
  console.log('[thermal-printer] requestPermission: granted=' + result.granted);
  return result;
};

export const listNativeThermalPrinters = async () => {
  ensureNativeThermalPrinterAvailable('Abra pelo app Android para configurar a impressora.');
  console.log('[thermal-printer] listPairedDevices: fetching...');
  const result = await ThermalPrinter.listPairedDevices();
  console.log('[thermal-printer] listPairedDevices:', {
    total: result?.devices?.length ?? 0,
    printers: result?.devices?.filter(d => d.isPrinter).length ?? 0,
    nonPrinters: result?.devices?.filter(d => !d.isPrinter).length ?? 0,
  });
  return result;
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

export const saveAutoPrintSetting = async (enabled: boolean) => {
  // Persiste no localStorage: o card recarrega esse valor ao remontar e o polling da
  // fila (GrillQueue) le aqui para decidir a impressao com o app aberto. Sem isso, o
  // toggle voltava para OFF ao sair e voltar (gravava so no nativo).
  saveStoredThermalPrinterSettings({ autoPrintOnlineOrders: enabled });
  if (!isNativeThermalPrinterPluginAvailable()) return;
  try {
    await ThermalPrinter.saveAutoPrintSetting({ enabled });
  } catch (error) {
    console.warn('[thermal-printer] saveAutoPrintSetting failed', error);
  }
}

// --- Device-side print ACK (idempotencia + retry) ---
// Consome o bridge nativo (window.JNCPrintAck) pra saber quais pedidos ja foram impressos
// (ACK). No web e no-op (retorna set vazio). O polling usa isso pra: (1) nao reimprimir
// os ja feitos, e (2) re-tentar os que falharam (ficam nao-ackados).
export const getAckedPrintOrderIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  const bridge = (window as any).JNCPrintAck;
  if (!bridge || typeof bridge.getAcked !== 'function') return new Set();
  try {
    const arr = JSON.parse(bridge.getAcked() || '[]');
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
};

export const ackPrintOrder = (orderId: string) => {
  if (typeof window === 'undefined' || !orderId) return;
  const bridge = (window as any).JNCPrintAck;
  if (!bridge || typeof bridge.ack !== 'function') return;
  try {
    bridge.ack(String(orderId));
  } catch {
    // no-op
  }
};

// Mantem a tela acesa (wake lock) quando o auto-print esta ligado no app nativo, para o
// polling da fila nao pausar quando a tela apagaria. So faz algo quando o bridge nativo
// (window.JNCKeepAwake) existe — no web é no-op.
export const syncKeepAwakeForAutoPrint = () => {
  if (typeof window === 'undefined') return;
  const bridge = (window as any).JNCKeepAwake;
  if (!bridge || typeof bridge.setEnabled !== 'function') return;
  try {
    bridge.setEnabled(Boolean(getStoredThermalPrinterSettings().autoPrintOnlineOrders));
  } catch {
    // no-op
  }
};

export const printNativeThermalReceipt = async (
  text: string,
  settings?: Partial<ThermalPrinterSettings>,
  qrData?: string
) => {
  ensureNativeThermalPrinterAvailable('Impressão nativa disponível apenas no app Android.');
  console.log('[thermal-printer] printNativeThermalReceipt: checking status before print...');
  const status = await ThermalPrinter.getStatus();

  console.log('[thermal-printer] printNativeThermalReceipt: status =', {
    enabled: status.enabled,
    permissionGranted: status.permissionGranted,
    hasAddress: Boolean(status?.savedPrinter?.address),
  });

  if (!status.enabled) {
    throw new NativeThermalPrinterError('BLUETOOTH_DISABLED', 'Bluetooth desligado. Ligue o Bluetooth e tente novamente.');
  }

  const address = String(status?.savedPrinter?.address || '').trim();
  if (!address) {
    throw new NativeThermalPrinterError('NO_PRINTER', 'Nenhuma impressora configurada neste aparelho.');
  }

  // Do NOT check/request permission here. The Java print() method already
  // handles permission via requestPermissionForAlias which shows the system
  // dialog. Checking in TS creates a redundant gate that can produce false
  // PERMISSION_DENIED errors when the status is stale or the Java-side
  // permission state is inconsistent between getStatus() and print().

  console.log('[thermal-printer] printNativeThermalReceipt: printing to', address);
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
    ...(qrData ? { qrData } : {}),
  });
};
