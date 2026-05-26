// @ts-nocheck
import { useEffect, useState } from 'react';
import { ArrowClockwise, CheckCircle, Gear, Printer, Trash, WarningCircle } from '@phosphor-icons/react';
import { useToast } from '../../contexts/ToastContext';
import {
  clearNativeThermalPrinter,
  getNativeThermalPrinterStatus,
  isAndroidNativeThermalPrinterRuntime,
  listNativeThermalPrinters,
  openNativeBluetoothSettings,
  saveNativeThermalPrinter,
} from '../../utils/thermalPrinter';

export function ThermalPrinterSettingsCard() {
  const { showToast } = useToast();
  const [status, setStatus] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingAddress, setSavingAddress] = useState('');
  const isNativeAndroid = isAndroidNativeThermalPrinterRuntime();

  const loadStatus = async () => {
    if (!isNativeAndroid) return;
    try {
      const nextStatus = await getNativeThermalPrinterStatus();
      setStatus(nextStatus);
    } catch (error) {
      console.warn('[thermal-printer] status indisponível', error);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, [isNativeAndroid]);

  const loadDevices = async () => {
    if (!isNativeAndroid) {
      showToast('Configuração disponível apenas no app Android da loja.', 'info');
      return;
    }
    setLoading(true);
    try {
      const result = await listNativeThermalPrinters();
      setDevices(result?.devices || []);
      if (!result?.devices?.length) {
        showToast('Nenhuma impressora pareada. Pareie no Bluetooth do aparelho e toque em buscar novamente.', 'warning');
      }
      await loadStatus();
    } catch (error) {
      const code = String(error?.code || '');
      if (code === 'BLUETOOTH_DISABLED') {
        showToast('Bluetooth desligado. Ligue o Bluetooth e tente novamente.', 'warning');
      } else if (code === 'PERMISSION_DENIED') {
        showToast('Permita dispositivos próximos para listar impressoras.', 'warning');
      } else {
        showToast(error?.message || 'Não foi possível listar impressoras.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (device) => {
    setSavingAddress(device.address);
    try {
      const result = await saveNativeThermalPrinter(device, 32);
      setStatus((prev) => ({ ...(prev || {}), savedPrinter: result?.savedPrinter || device }));
      showToast(`Impressora ${device.name || device.address} salva neste aparelho.`, 'success');
    } catch (error) {
      showToast(error?.message || 'Não foi possível salvar a impressora.', 'error');
    } finally {
      setSavingAddress('');
    }
  };

  const handleClear = async () => {
    try {
      await clearNativeThermalPrinter();
      setStatus((prev) => ({ ...(prev || {}), savedPrinter: null }));
      showToast('Impressora removida deste aparelho.', 'success');
    } catch (error) {
      showToast(error?.message || 'Não foi possível remover a impressora.', 'error');
    }
  };

  const handleOpenBluetooth = async () => {
    try {
      await openNativeBluetoothSettings();
    } catch (error) {
      showToast(error?.message || 'Não foi possível abrir o Bluetooth.', 'error');
    }
  };

  const savedAddress = String(status?.savedPrinter?.address || '');

  return (
    <div data-testid="thermal-printer-settings" className="rounded-2xl border border-slate-200 border-l-4 border-l-emerald-500 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <Printer size={21} weight="duotone" />
          </span>
          <div>
            <h3 className="text-lg font-black text-slate-900">Impressora térmica</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Configure a impressora Bluetooth deste aparelho. Admin e operador podem salvar a impressora usada na fila de pedidos.
            </p>
          </div>
        </div>
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
          savedAddress ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
        }`}>
          {savedAddress ? <CheckCircle size={13} weight="fill" /> : <WarningCircle size={13} weight="fill" />}
          {savedAddress ? 'Configurada' : 'Pendente'}
        </span>
      </div>

      {!isNativeAndroid ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
          Abra esta tela pelo app Android da loja para parear e salvar a impressora. No navegador web, a impressão continua pelo modo do navegador.
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Impressora salva neste aparelho</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-900">
                  {status?.savedPrinter?.name || (savedAddress ? 'Impressora Bluetooth' : 'Nenhuma impressora configurada')}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {savedAddress || 'Escolha uma impressora pareada para imprimir sem abrir app externo.'}
                </p>
              </div>
              {savedAddress ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100"
                >
                  <Trash size={14} weight="duotone" /> Remover
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={loadDevices}
              data-testid="thermal-printer-search"
              disabled={loading}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white shadow-[0_18px_34px_-24px_rgba(21,58,76,0.75)] disabled:opacity-60"
            >
              <ArrowClockwise size={16} weight="bold" className={loading ? 'animate-spin' : ''} />
              {loading ? 'Buscando...' : 'Buscar impressoras pareadas'}
            </button>
            <button
              type="button"
              onClick={handleOpenBluetooth}
              data-testid="thermal-printer-open-bluetooth"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <Gear size={16} weight="duotone" /> Abrir Bluetooth
            </button>
          </div>

          {devices.length > 0 ? (
            <div className="mt-4 grid gap-2">
              {devices.map((device) => {
                const selected = savedAddress && savedAddress === device.address;
                return (
                  <button
                    type="button"
                    key={device.address}
                    onClick={() => handleSave(device)}
                    disabled={savingAddress === device.address}
                    className={`flex items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.99] ${
                      selected
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-900">{device.name || 'Impressora Bluetooth'}</span>
                      <span className="mt-0.5 block text-xs font-semibold text-slate-500">{device.address}</span>
                    </span>
                    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                      selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {savingAddress === device.address ? 'Salvando' : selected ? 'Atual' : 'Usar'}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
