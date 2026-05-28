import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThermalPrinterSettingsCard } from './ThermalPrinterSettingsCard';
import {
  getNativeThermalPrinterStatus,
  listNativeThermalPrinters,
  printNativeThermalReceipt,
  saveNativeThermalPrinter,
} from '../../utils/thermalPrinter';

const toastMock = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

const thermalMock = vi.hoisted(() => {
  const settings = {
    paperWidth: 32,
    copies: 1,
    headerMode: 'complete',
    feedLines: 3,
  };
  return {
    settings,
    device: {
      name: 'Printer Teste',
      address: 'AA:BB:CC:DD:EE:FF',
      bonded: true,
    },
  };
});

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: toastMock.showToast }),
}));

vi.mock('../../utils/thermalPrinter', () => ({
  clearNativeThermalPrinter: vi.fn(() => Promise.resolve({ savedPrinter: null })),
  getNativeThermalPrinterStatus: vi.fn(() => Promise.resolve({
    available: true,
    enabled: true,
    permissionGranted: true,
    settings: thermalMock.settings,
    savedPrinter: null,
  })),
  getStoredThermalPrinterSettings: vi.fn(() => thermalMock.settings),
  isAndroidNativeThermalPrinterRuntime: vi.fn(() => true),
  isNativeThermalPrinterPluginAvailable: vi.fn(() => true),
  listNativeThermalPrinters: vi.fn(() => Promise.resolve({ devices: [thermalMock.device] })),
  normalizeThermalPrinterSettings: vi.fn((settings) => ({
    ...thermalMock.settings,
    ...(settings || {}),
  })),
  openNativeBluetoothSettings: vi.fn(() => Promise.resolve()),
  printNativeThermalReceipt: vi.fn(() => Promise.resolve({ mode: 'native', bytes: 120 })),
  saveNativeThermalPrinter: vi.fn((device, settings) => Promise.resolve({
    settings,
    savedPrinter: { ...device, ...settings },
  })),
  saveNativeThermalPrinterSettings: vi.fn((settings) => Promise.resolve({ settings })),
}));

describe('ThermalPrinterSettingsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('salva automaticamente a única impressora pareada antes de testar', async () => {
    render(<ThermalPrinterSettingsCard />);

    await waitFor(() => expect(getNativeThermalPrinterStatus).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('thermal-printer-test'));

    await waitFor(() => {
      expect(listNativeThermalPrinters).toHaveBeenCalled();
      expect(saveNativeThermalPrinter).toHaveBeenCalledWith(thermalMock.device, expect.objectContaining({ paperWidth: 32 }));
      expect(printNativeThermalReceipt).toHaveBeenCalled();
    });
    expect(toastMock.showToast).toHaveBeenCalledWith(expect.stringContaining('selecionada para o teste'), 'info');
  });
});
