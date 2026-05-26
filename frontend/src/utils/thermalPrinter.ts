import { Capacitor, registerPlugin } from '@capacitor/core';

export type NativeThermalPrinterDevice = {
  name?: string;
  address: string;
  bonded?: boolean;
};

export type NativeThermalPrinterStatus = {
  available: boolean;
  enabled: boolean;
  permissionGranted: boolean;
  savedPrinter?: NativeThermalPrinterDevice & { paperWidth?: number };
};

type NativeThermalPrinterPrintResult = {
  mode: 'native';
  bytes?: number;
  durationMs?: number;
};

type ThermalPrinterPlugin = {
  getStatus(): Promise<NativeThermalPrinterStatus>;
  listPairedDevices(): Promise<{ devices: NativeThermalPrinterDevice[]; savedPrinter?: NativeThermalPrinterStatus['savedPrinter'] }>;
  savePrinter(options: { address: string; name?: string; paperWidth?: number }): Promise<{ savedPrinter?: NativeThermalPrinterStatus['savedPrinter'] }>;
  clearPrinter(): Promise<{ savedPrinter?: NativeThermalPrinterStatus['savedPrinter'] }>;
  openBluetoothSettings(): Promise<void>;
  print(options: { text: string; address?: string; copies?: number }): Promise<NativeThermalPrinterPrintResult>;
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

export const saveNativeThermalPrinter = async (device: NativeThermalPrinterDevice, paperWidth = 32) => {
  ensureNativeThermalPrinterAvailable('Abra pelo app Android para configurar a impressora.');
  return ThermalPrinter.savePrinter({
    address: device.address,
    name: device.name || 'Impressora Bluetooth',
    paperWidth,
  });
};

export const clearNativeThermalPrinter = async () => {
  ensureNativeThermalPrinterAvailable('Abra pelo app Android para configurar a impressora.');
  return ThermalPrinter.clearPrinter();
};

export const openNativeBluetoothSettings = async () => {
  ensureNativeThermalPrinterAvailable('Abra pelo app Android para configurar a impressora.');
  return ThermalPrinter.openBluetoothSettings();
};

export const printNativeThermalReceipt = async (text: string) => {
  ensureNativeThermalPrinterAvailable('Impressão nativa disponível apenas no app Android.');
  const status = await ThermalPrinter.getStatus();
  const address = String(status?.savedPrinter?.address || '').trim();
  if (!address) {
    throw new NativeThermalPrinterError('NO_PRINTER', 'Nenhuma impressora configurada neste aparelho.');
  }
  return ThermalPrinter.print({ text, address, copies: 1 });
};
