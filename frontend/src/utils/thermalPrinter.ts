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

export const getNativeThermalPrinterStatus = async () => {
  if (!isAndroidNativeThermalPrinterRuntime()) {
    throw new NativeThermalPrinterError('UNAVAILABLE', 'Impressão nativa disponível apenas no app Android.');
  }
  return ThermalPrinter.getStatus();
};

export const listNativeThermalPrinters = async () => {
  if (!isAndroidNativeThermalPrinterRuntime()) {
    throw new NativeThermalPrinterError('UNAVAILABLE', 'Abra pelo app Android para configurar a impressora.');
  }
  return ThermalPrinter.listPairedDevices();
};

export const saveNativeThermalPrinter = async (device: NativeThermalPrinterDevice, paperWidth = 32) => {
  if (!isAndroidNativeThermalPrinterRuntime()) {
    throw new NativeThermalPrinterError('UNAVAILABLE', 'Abra pelo app Android para configurar a impressora.');
  }
  return ThermalPrinter.savePrinter({
    address: device.address,
    name: device.name || 'Impressora Bluetooth',
    paperWidth,
  });
};

export const clearNativeThermalPrinter = async () => {
  if (!isAndroidNativeThermalPrinterRuntime()) {
    throw new NativeThermalPrinterError('UNAVAILABLE', 'Abra pelo app Android para configurar a impressora.');
  }
  return ThermalPrinter.clearPrinter();
};

export const openNativeBluetoothSettings = async () => {
  if (!isAndroidNativeThermalPrinterRuntime()) {
    throw new NativeThermalPrinterError('UNAVAILABLE', 'Abra pelo app Android para configurar a impressora.');
  }
  return ThermalPrinter.openBluetoothSettings();
};

export const printNativeThermalReceipt = async (text: string) => {
  if (!isAndroidNativeThermalPrinterRuntime()) {
    throw new NativeThermalPrinterError('UNAVAILABLE', 'Impressão nativa disponível apenas no app Android.');
  }
  const status = await ThermalPrinter.getStatus();
  const address = String(status?.savedPrinter?.address || '').trim();
  if (!address) {
    throw new NativeThermalPrinterError('NO_PRINTER', 'Nenhuma impressora configurada neste aparelho.');
  }
  return ThermalPrinter.print({ text, address, copies: 1 });
};
