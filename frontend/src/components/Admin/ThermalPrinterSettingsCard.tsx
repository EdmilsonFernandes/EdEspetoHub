import { useEffect, useMemo, useState } from 'react';
import {
  ArrowClockwise,
  Bluetooth,
  CaretDown,
  CheckCircle,
  Gear,
  Printer,
  Receipt,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react';
import { useToast } from '../../contexts/ToastContext';
import { buildRawBtText } from '../../utils/printReceiptImage';
import {
  clearNativeThermalPrinter,
  getNativeThermalPrinterStatus,
  getStoredThermalPrinterSettings,
  isAndroidNativeThermalPrinterRuntime,
  isNativeThermalPrinterPluginAvailable,
  listNativeThermalPrinters,
  normalizeThermalPrinterSettings,
  openNativeBluetoothSettings,
  printNativeThermalReceipt,
  saveNativeThermalPrinter,
  saveNativeThermalPrinterSettings,
  type NativeThermalPrinterDevice,
  type NativeThermalPrinterStatus,
  type ThermalPrinterSettings,
} from '../../utils/thermalPrinter';

type TestPhase = 'idle' | 'connecting' | 'sending' | 'success' | 'failed';

const sampleReceiptPayload = {
  storeName: 'Ja no Caminho',
  platformName: 'Ja no Caminho',
  queueLabel: '#TESTE',
  orderLabel: '#IMPRESSAO',
  customerLabel: 'Operador',
  locationLabel: 'MESA TESTE',
  dateLabel: '27/05/2026 15:30',
  items: [
    {
      quantity: 1,
      name: 'Teste de impressao',
      lineTotal: 'R$ 0,00',
      notes: 'Se este cupom saiu legivel, a impressora esta pronta.',
    },
  ],
  totalLabel: 'R$ 0,00',
};

const stripPrinterCommands = (value: string) =>
  String(value || '')
    .replace(/\x1B[\x00-\x7F]{1,2}/g, '')
    .replace(/\x1D[\x00-\x7F]{1,2}/g, '');

const settingButtonClass = (active: boolean) =>
  `rounded-2xl border px-3 py-2.5 text-left text-xs font-black transition active:scale-[0.99] ${
    active
      ? 'border-[#153A4C] bg-[#153A4C] text-white shadow-[0_18px_34px_-26px_rgba(21,58,76,0.9)]'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  }`;

function StepBadge({ number, label, active, completed }: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
          completed
            ? 'bg-emerald-500 text-white'
            : active
              ? 'bg-[#153A4C] text-white'
              : 'bg-slate-100 text-slate-400'
        }`}
      >
        {completed ? <CheckCircle size={12} weight="bold" /> : number}
      </span>
      <span
        className={`text-xs font-black uppercase tracking-[0.15em] ${
          active || completed ? 'text-slate-900' : 'text-slate-400'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export function ThermalPrinterSettingsCard() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<NativeThermalPrinterStatus | null>(null);
  const [devices, setDevices] = useState<NativeThermalPrinterDevice[]>([]);
  const [settings, setSettings] = useState<ThermalPrinterSettings>(() => getStoredThermalPrinterSettings());
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingAddress, setSavingAddress] = useState('');
  const [testPhase, setTestPhase] = useState<TestPhase>('idle');
  const [hasSearchedOnce, setHasSearchedOnce] = useState(false);
  const isNativeAndroid = isAndroidNativeThermalPrinterRuntime();
  const hasNativePrinterPlugin = isNativeThermalPrinterPluginAvailable();

  const mergeStatusSettings = (nextStatus: NativeThermalPrinterStatus | null) => {
    const nextSettings = normalizeThermalPrinterSettings({
      ...getStoredThermalPrinterSettings(),
      ...(nextStatus?.settings || {}),
      ...(nextStatus?.savedPrinter || {}),
    });
    setSettings(nextSettings);
  };

  const refreshNativeStatus = async (): Promise<NativeThermalPrinterStatus | null> => {
    const nextStatus = await getNativeThermalPrinterStatus();
    setStatus(nextStatus);
    mergeStatusSettings(nextStatus);
    return nextStatus;
  };

  const loadStatus = async () => {
    if (!hasNativePrinterPlugin) return;
    try {
      await refreshNativeStatus();
    } catch (error) {
      console.warn('[thermal-printer] status indisponivel', error);
    }
  };

  useEffect(() => {
    if (!hasNativePrinterPlugin) return;
    void (async () => {
      let currentStatus: NativeThermalPrinterStatus | null = null;
      try {
        currentStatus = await refreshNativeStatus();
      } catch {
        // status indisponivel
      }
      if (!currentStatus?.savedPrinter?.address) {
        try {
          const result = await listNativeThermalPrinters();
          const found = result?.devices || [];
          setDevices(found);
          setHasSearchedOnce(true);
          if (found.length === 1) {
            const mergedSettings = normalizeThermalPrinterSettings({
              ...getStoredThermalPrinterSettings(),
            });
            await saveNativeThermalPrinter(found[0], mergedSettings);
            await refreshNativeStatus();
            showToast(`Impressora ${found[0].name || found[0].address} selecionada automaticamente.`, 'info');
          }
        } catch {
          // auto-busca silenciosa
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNativePrinterPlugin]);

  const loadDevices = async (options: { silent?: boolean } = {}) => {
    const silent = Boolean(options?.silent);
    if (!isNativeAndroid) {
      if (!silent) showToast('Configuracao disponivel apenas no app Android da loja.', 'info');
      return [];
    }
    if (!hasNativePrinterPlugin) {
      if (!silent) showToast('Atualize o app da loja para configurar a impressao Bluetooth direta. Enquanto isso, use o RawBT.', 'info');
      return [];
    }
    setLoading(true);
    try {
      const result = await listNativeThermalPrinters();
      const nextDevices = result?.devices || [];
      setDevices(nextDevices);
      setHasSearchedOnce(true);
      if (!silent && !nextDevices.length) {
        showToast('Nenhuma impressora pareada. Pareie no Bluetooth do aparelho e toque em buscar novamente.', 'warning');
      }
      await loadStatus();
      return nextDevices;
    } catch (error: any) {
      if (!silent) {
        const code = String(error?.code || '');
        if (code === 'BLUETOOTH_DISABLED') {
          showToast('Bluetooth desligado. Ligue o Bluetooth e tente novamente.', 'warning');
        } else if (code === 'PERMISSION_DENIED') {
          showToast('Permita dispositivos proximos para listar impressoras.', 'warning');
        } else {
          showToast(error?.message || 'Nao foi possivel listar impressoras.', 'error');
        }
      }
      return [];
    } finally {
      setLoading(false);
    }
  };

  const savePrinterDevice = async (device: NativeThermalPrinterDevice, options: { notify?: boolean } = {}) => {
    const notify = options?.notify !== false;
    setSavingAddress(device.address);
    try {
      const result = await saveNativeThermalPrinter(device, settings);
      const nextStatus: NativeThermalPrinterStatus = {
        available: status?.available ?? true,
        enabled: status?.enabled ?? true,
        permissionGranted: status?.permissionGranted ?? true,
        settings: result?.settings || settings,
        savedPrinter: result?.savedPrinter ? {
          address: result.savedPrinter.address,
          name: result.savedPrinter.name,
          paperWidth: result.savedPrinter.paperWidth,
          copies: result.savedPrinter.copies,
          headerMode: result.savedPrinter.headerMode,
          feedLines: result.savedPrinter.feedLines,
        } : { ...device, ...settings },
      };
      setStatus(nextStatus);
      if (notify) showToast(`Impressora ${device.name || device.address} salva neste aparelho.`, 'success');
      return nextStatus;
    } catch (error: any) {
      if (notify) showToast(error?.message || 'Nao foi possivel salvar a impressora.', 'error');
      throw error;
    } finally {
      setSavingAddress('');
    }
  };

  const handleSave = async (device: NativeThermalPrinterDevice) => {
    await savePrinterDevice(device);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const result = await saveNativeThermalPrinterSettings(settings);
      setStatus((prev) => ({
        ...(prev || { available: true, enabled: true, permissionGranted: true }),
        settings: result?.settings || settings,
        savedPrinter: result?.savedPrinter || prev?.savedPrinter,
      }));
      showToast('Formato do cupom salvo neste aparelho.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Nao foi possivel salvar o formato do cupom.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestPrint = async () => {
    if (!hasNativePrinterPlugin) {
      showToast('Atualize o app da loja para testar a impressao Bluetooth direta. O RawBT continua como fallback.', 'info');
      return;
    }
    setTesting(true);
    setTestPhase('connecting');
    try {
      let currentStatus: NativeThermalPrinterStatus | null = status;
      if (!currentStatus?.savedPrinter?.address) {
        try {
          currentStatus = await refreshNativeStatus();
        } catch {
          currentStatus = status;
        }
      }

      if (!currentStatus?.savedPrinter?.address) {
        const availableDevices = devices.length ? devices : await loadDevices({ silent: true });
        if (availableDevices.length === 1) {
          currentStatus = await savePrinterDevice(availableDevices[0], { notify: false });
          showToast(`Impressora ${availableDevices[0].name || availableDevices[0].address} selecionada para o teste.`, 'info');
        } else if (availableDevices.length > 1) {
          setTestPhase('idle');
          showToast('Escolha uma impressora na lista antes de testar.', 'warning');
          return;
        } else {
          setTestPhase('idle');
          showToast('Nenhuma impressora pareada foi encontrada. Pareie no Bluetooth do Android ou use o RawBT como fallback.', 'warning');
          return;
        }
      }

      if (!currentStatus?.savedPrinter?.address) {
        setTestPhase('idle');
        showToast('Escolha uma impressora antes de testar.', 'warning');
        return;
      }

      setTestPhase('sending');
      await saveNativeThermalPrinterSettings(settings);
      const text = buildRawBtText(sampleReceiptPayload, settings);
      await printNativeThermalReceipt(text, settings);
      setTestPhase('success');
      setTimeout(() => setTestPhase('idle'), 4000);
    } catch (error: any) {
      setTestPhase('failed');
      const code = String(error?.code || '');
      if (code === 'PRINT_TIMEOUT') {
        showToast('A impressora demorou para responder. Confira se ela esta ligada e perto do celular.', 'warning');
      } else if (code === 'NO_PRINTER') {
        showToast('Escolha uma impressora antes de testar.', 'warning');
      } else {
        showToast(error?.message || 'Nao foi possivel imprimir o teste.', 'error');
      }
    } finally {
      setTesting(false);
    }
  };

  const handleClear = async () => {
    try {
      await clearNativeThermalPrinter();
      setStatus((prev) => ({ ...(prev || { available: true, enabled: true, permissionGranted: true }), savedPrinter: undefined as any }));
      setTestPhase('idle');
      showToast('Impressora removida deste aparelho. O RawBT continua como fallback.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Nao foi possivel remover a impressora.', 'error');
    }
  };

  const handleOpenBluetooth = async () => {
    try {
      await openNativeBluetoothSettings();
    } catch (error: any) {
      showToast(error?.message || 'Nao foi possivel abrir o Bluetooth.', 'error');
    }
  };

  const savedAddress = String(status?.savedPrinter?.address || '');
  const isConnected = Boolean(savedAddress) && status?.printerReachable !== false;
  const printerReachable = status?.printerReachable === true;

  const previewText = useMemo(
    () => stripPrinterCommands(buildRawBtText(sampleReceiptPayload, settings)).split('\n').slice(0, 18).join('\n'),
    [settings],
  );

  if (!isNativeAndroid) {
    return (
      <section
        role="region"
        aria-label="Impressora termica"
        data-testid="thermal-printer-settings"
        className="rounded-2xl border border-slate-200 border-l-4 border-l-emerald-500 bg-white p-5 shadow-[0_22px_55px_-38px_rgba(15,23,42,0.45)]"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <Printer size={22} weight="duotone" />
          </span>
          <div>
            <h3 className="text-lg font-black text-slate-900">Impressora termica</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Abra esta tela pelo app Android da loja para parear e salvar a impressora. No navegador web, a impressao continua pelo modo do navegador.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!hasNativePrinterPlugin) {
    return (
      <section
        role="region"
        aria-label="Impressora termica"
        data-testid="thermal-printer-settings"
        className="rounded-2xl border border-slate-200 border-l-4 border-l-amber-500 bg-white p-5 shadow-[0_22px_55px_-38px_rgba(15,23,42,0.45)]"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
            <Printer size={22} weight="duotone" />
          </span>
          <div>
            <h3 className="text-lg font-black text-slate-900">Impressora termica</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-amber-800">
              Esta versao instalada do app ainda nao tem o plugin de impressao Bluetooth direta. Atualize o app da loja para configurar a impressora aqui. Ate la, a impressao continua funcionando pelo RawBT instalado no aparelho.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      role="region"
      aria-label="Impressora termica"
      data-testid="thermal-printer-settings"
      className="rounded-2xl border border-slate-200 border-l-4 border-l-emerald-500 bg-white p-5 shadow-[0_22px_55px_-38px_rgba(15,23,42,0.45)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <Printer size={22} weight="duotone" />
          </span>
          <div>
            <h3 className="text-lg font-black text-slate-900">Impressora termica</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Conecte a impressora Bluetooth usada na fila de pedidos.
            </p>
          </div>
        </div>
        {isConnected && printerReachable ? (
          <span className="flex items-center gap-2 shrink-0">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700">Conectada</span>
          </span>
        ) : savedAddress && !printerReachable ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-amber-700">
            <WarningCircle size={13} weight="fill" />
            Offline
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-amber-700">
            <WarningCircle size={13} weight="fill" />
            Pendente
          </span>
        )}
      </div>

      {/* Step 1: Conectar */}
      <div className="mt-6">
        <StepBadge number={1} label="Conectar" active={!isConnected} completed={isConnected} />

        <div className="mt-3">
          {status?.savedPrinter && (
            <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    {status.savedPrinter.name || 'Impressora Bluetooth'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-rose-700 hover:bg-rose-100"
                >
                  <Trash size={12} weight="duotone" /> Desconectar
                </button>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-500">{savedAddress}</p>
            </div>
          )}

          {/* Device list */}
          {devices.length > 0 && (
            <div className="grid gap-2">
              {devices.map((device) => {
                const selected = savedAddress === device.address;
                const saving = savingAddress === device.address;
                const likelyPrinter = device.isPrinter !== false;
                return (
                  <button
                    type="button"
                    key={device.address}
                    onClick={() => handleSave(device)}
                    disabled={saving}
                    className={`relative flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all active:scale-[0.99] ${
                      selected
                        ? 'border-emerald-300 bg-emerald-50/80 shadow-[0_8px_20px_-12px_rgba(16,185,129,0.3)]'
                        : likelyPrinter
                          ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                          : 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
                    }`}
                  >
                    <span
                      className={`shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selected ? 'border-emerald-500 bg-emerald-500' : likelyPrinter ? 'border-slate-300 bg-white' : 'border-amber-300 bg-white'
                      }`}
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-900">
                        {device.name || 'Dispositivo Bluetooth'}
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold text-slate-500">{device.address}</span>
                      {!likelyPrinter && (
                        <span className="mt-1 block text-[10px] font-bold text-amber-600">
                          Nao parece uma impressora — so selecione se tiver certeza
                        </span>
                      )}
                    </span>
                    {saving && (
                      <ArrowClockwise size={16} weight="bold" className="shrink-0 animate-spin text-[#153A4C]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {devices.length === 0 && !loading && hasSearchedOnce && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
              <Bluetooth size={28} weight="duotone" className="mx-auto text-slate-400" />
              <p className="mt-2 text-sm font-bold text-slate-700">Nenhuma impressora pareada</p>
              <p className="mt-1 text-xs text-slate-500">
                Pareie a impressora no Bluetooth do Android e toque em Buscar novamente.
              </p>
              <button
                type="button"
                onClick={handleOpenBluetooth}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 border border-slate-200 hover:bg-slate-50"
              >
                <Gear size={14} weight="duotone" /> Abrir Bluetooth
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadDevices()}
              data-testid="thermal-printer-search"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white shadow-[0_18px_34px_-24px_rgba(21,58,76,0.75)] disabled:opacity-60"
            >
              <ArrowClockwise size={16} weight="bold" className={loading ? 'animate-spin' : ''} />
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
            <button
              type="button"
              onClick={handleOpenBluetooth}
              data-testid="thermal-printer-open-bluetooth"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <Gear size={16} weight="duotone" /> Bluetooth
            </button>
          </div>
        </div>
      </div>

      {/* Step 2: Testar */}
      <div className="mt-6">
        <StepBadge
          number={2}
          label="Testar"
          active={isConnected && testPhase === 'idle'}
          completed={testPhase === 'success'}
        />

        <div className="mt-3">
          <button
            type="button"
            onClick={handleTestPrint}
            disabled={testing}
            data-testid="thermal-printer-test"
            className={`w-full inline-flex items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-sm font-black transition-all active:scale-[0.99] ${
              testPhase === 'success'
                ? 'bg-emerald-500 text-white shadow-[0_18px_34px_-24px_rgba(16,185,129,0.75)]'
                : testPhase === 'failed'
                  ? 'bg-rose-500 text-white shadow-[0_18px_34px_-24px_rgba(244,63,94,0.75)]'
                  : 'bg-[#153A4C] text-white shadow-[0_18px_34px_-24px_rgba(21,58,76,0.75)] disabled:opacity-60'
            }`}
          >
            {testPhase === 'idle' && (
              <>
                <Receipt size={18} weight="duotone" /> Testar impressao
              </>
            )}
            {testPhase === 'connecting' && (
              <>
                <ArrowClockwise size={18} weight="bold" className="animate-spin" /> Conectando...
              </>
            )}
            {testPhase === 'sending' && (
              <>
                <ArrowClockwise size={18} weight="bold" className="animate-spin" /> Enviando cupom...
              </>
            )}
            {testPhase === 'success' && (
              <>
                <CheckCircle size={18} weight="fill" /> Impresso com sucesso
              </>
            )}
            {testPhase === 'failed' && (
              <>
                <WarningCircle size={18} weight="fill" /> Falha — tocar para tentar de novo
              </>
            )}
          </button>
          <p className="mt-2 text-center text-xs text-slate-400">
            {testing
              ? 'Aguarde, conectando na impressora...'
              : 'Envia um cupom de teste para confirmar que a impressora esta funcionando.'}
          </p>
        </div>
      </div>

      {/* Step 3: Ajustar (collapsible) */}
      <details className="mt-6 group">
        <summary className="cursor-pointer list-none flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 hover:text-slate-600">
          <CaretDown size={14} weight="bold" className="transition-transform group-open:rotate-180" />
          Ajustar formato do cupom
        </summary>
        <div className="mt-3 rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Como o cupom sai</p>
              <p className="mt-1 text-sm font-bold text-slate-700">Configuracao local deste celular.</p>
            </div>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
            >
              {savingSettings ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, paperWidth: 32 }))}
              className={settingButtonClass(settings.paperWidth === 32)}
            >
              58mm compacto
              <span className="mt-1 block text-[10px] font-semibold opacity-75">32 colunas</span>
            </button>
            <button
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, paperWidth: 42 }))}
              className={settingButtonClass(settings.paperWidth === 42)}
            >
              80mm / maior
              <span className="mt-1 block text-[10px] font-semibold opacity-75">42 colunas</span>
            </button>
            <button
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, headerMode: 'complete' }))}
              className={settingButtonClass(settings.headerMode === 'complete')}
            >
              Cupom completo
              <span className="mt-1 block text-[10px] font-semibold opacity-75">Mais detalhes</span>
            </button>
            <button
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, headerMode: 'compact' }))}
              className={settingButtonClass(settings.headerMode === 'compact')}
            >
              Cupom compacto
              <span className="mt-1 block text-[10px] font-semibold opacity-75">Menos espaco</span>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {[1, 2].map((copies) => (
              <button
                key={copies}
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, copies: copies as 1 | 2 }))}
                className={settingButtonClass(settings.copies === copies)}
              >
                {copies} via{copies > 1 ? 's' : ''}
                <span className="mt-1 block text-[10px] font-semibold opacity-75">
                  {copies === 1 ? 'Padrao' : 'Cozinha + caixa'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </details>

      {/* Preview (collapsible) */}
      <details className="mt-4 group">
        <summary className="cursor-pointer list-none flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 hover:text-slate-600">
          <CaretDown size={14} weight="bold" className="transition-transform group-open:rotate-180" />
          Preview do cupom
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
            {settings.paperWidth} colunas
          </span>
        </summary>
        <div className="mt-3 rounded-[1.5rem] border border-slate-200 bg-slate-950 p-4 text-slate-50">
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-100">
            {previewText}
          </pre>
        </div>
      </details>
    </section>
  );
}
