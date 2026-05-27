// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowClockwise,
  CheckCircle,
  Gear,
  PlugsConnected,
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
} from '../../utils/thermalPrinter';

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

export function ThermalPrinterSettingsCard() {
  const { showToast } = useToast();
  const [status, setStatus] = useState(null);
  const [devices, setDevices] = useState([]);
  const [settings, setSettings] = useState(() => getStoredThermalPrinterSettings());
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingAddress, setSavingAddress] = useState('');
  const isNativeAndroid = isAndroidNativeThermalPrinterRuntime();
  const hasNativePrinterPlugin = isNativeThermalPrinterPluginAvailable();

  const mergeStatusSettings = (nextStatus) => {
    const nextSettings = normalizeThermalPrinterSettings({
      ...getStoredThermalPrinterSettings(),
      ...(nextStatus?.settings || {}),
      ...(nextStatus?.savedPrinter || {}),
    });
    setSettings(nextSettings);
  };

  const loadStatus = async () => {
    if (!hasNativePrinterPlugin) return;
    try {
      const nextStatus = await getNativeThermalPrinterStatus();
      setStatus(nextStatus);
      mergeStatusSettings(nextStatus);
    } catch (error) {
      console.warn('[thermal-printer] status indisponível', error);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, [hasNativePrinterPlugin]);

  const loadDevices = async () => {
    if (!isNativeAndroid) {
      showToast('Configuração disponível apenas no app Android da loja.', 'info');
      return;
    }
    if (!hasNativePrinterPlugin) {
      showToast('Atualize o app da loja para configurar a impressão Bluetooth direta. Enquanto isso, use o RawBT.', 'info');
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
      const result = await saveNativeThermalPrinter(device, settings);
      setStatus((prev) => ({
        ...(prev || {}),
        settings: result?.settings || settings,
        savedPrinter: result?.savedPrinter || { ...device, ...settings },
      }));
      showToast(`Impressora ${device.name || device.address} salva neste aparelho.`, 'success');
    } catch (error) {
      showToast(error?.message || 'Não foi possível salvar a impressora.', 'error');
    } finally {
      setSavingAddress('');
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const result = await saveNativeThermalPrinterSettings(settings);
      setStatus((prev) => ({
        ...(prev || {}),
        settings: result?.settings || settings,
        savedPrinter: result?.savedPrinter || prev?.savedPrinter,
      }));
      showToast('Formato do cupom salvo neste aparelho.', 'success');
    } catch (error) {
      showToast(error?.message || 'Não foi possível salvar o formato do cupom.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestPrint = async () => {
    if (!status?.savedPrinter?.address) {
      showToast('Escolha uma impressora antes de testar.', 'warning');
      return;
    }
    setTesting(true);
    try {
      await saveNativeThermalPrinterSettings(settings);
      const text = buildRawBtText(sampleReceiptPayload, settings);
      await printNativeThermalReceipt(text, settings);
      showToast('Teste enviado para a impressora configurada.', 'success');
    } catch (error) {
      const code = String(error?.code || '');
      if (code === 'PRINT_TIMEOUT') {
        showToast('A impressora demorou para responder. Confira se ela está ligada e perto do celular.', 'warning');
      } else if (code === 'NO_PRINTER') {
        showToast('Escolha uma impressora antes de testar.', 'warning');
      } else {
        showToast(error?.message || 'Não foi possível imprimir o teste.', 'error');
      }
    } finally {
      setTesting(false);
    }
  };

  const handleClear = async () => {
    try {
      await clearNativeThermalPrinter();
      setStatus((prev) => ({ ...(prev || {}), savedPrinter: null }));
      showToast('Impressora removida deste aparelho. O RawBT continua como fallback.', 'success');
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
  const previewText = useMemo(
    () => stripPrinterCommands(buildRawBtText(sampleReceiptPayload, settings)).split('\n').slice(0, 18).join('\n'),
    [settings]
  );

  return (
    <section
      role="region"
      aria-label="Impressora térmica"
      data-testid="thermal-printer-settings"
      className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_22px_55px_-38px_rgba(15,23,42,0.45)] sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <Printer size={22} weight="duotone" />
          </span>
          <div>
            <h3 className="text-lg font-black text-slate-900">Impressora térmica</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Admin e operador podem salvar a impressora usada na fila de pedidos, testar a impressão e ajustar como o cupom sai.
            </p>
          </div>
        </div>
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
          savedAddress ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
        }`}>
          {savedAddress ? <CheckCircle size={13} weight="fill" /> : <WarningCircle size={13} weight="fill" />}
          {savedAddress ? 'Pronta' : 'Pendente'}
        </span>
      </div>

      {!isNativeAndroid ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
          Abra esta tela pelo app Android da loja para parear e salvar a impressora. No navegador web, a impressão continua pelo modo do navegador.
        </div>
      ) : !hasNativePrinterPlugin ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          Esta versão instalada do app ainda não tem o plugin de impressão Bluetooth direta. Atualize o app da loja para configurar a impressora aqui. Até lá, a impressão continua funcionando pelo RawBT instalado no aparelho.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Impressora deste aparelho</p>
                  <p className="mt-2 text-sm font-black text-slate-900">
                    {status?.savedPrinter?.name || (savedAddress ? 'Impressora Bluetooth' : 'Nenhuma impressora configurada')}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {savedAddress || 'A lista mostra aparelhos já pareados no Bluetooth do Android.'}
                  </p>
                </div>
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 ring-1 ring-slate-200">
                  <PlugsConnected size={18} weight="duotone" />
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={loadDevices}
                  data-testid="thermal-printer-search"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white shadow-[0_18px_34px_-24px_rgba(21,58,76,0.75)] disabled:opacity-60"
                >
                  <ArrowClockwise size={16} weight="bold" className={loading ? 'animate-spin' : ''} />
                  {loading ? 'Buscando...' : 'Buscar'}
                </button>
                <button
                  type="button"
                  onClick={handleTestPrint}
                  data-testid="thermal-printer-test"
                  disabled={testing || !savedAddress}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 disabled:opacity-50"
                >
                  <Receipt size={16} weight="duotone" />
                  {testing ? 'Testando...' : 'Testar'}
                </button>
                <button
                  type="button"
                  onClick={handleOpenBluetooth}
                  data-testid="thermal-printer-open-bluetooth"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  <Gear size={16} weight="duotone" /> Bluetooth
                </button>
                {savedAddress ? (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 hover:bg-rose-100"
                  >
                    <Trash size={16} weight="duotone" /> Desconectar
                  </button>
                ) : null}
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                A impressão direta abre a conexão só na hora de imprimir e fecha em seguida. Isso reduz travamento por conexão Bluetooth presa.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Como o cupom sai</p>
                  <p className="mt-1 text-sm font-bold text-slate-700">Configuração local deste celular.</p>
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

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
                  <span className="mt-1 block text-[10px] font-semibold opacity-75">Menos espaço</span>
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {[1, 2].map((copies) => (
                  <button
                    key={copies}
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, copies }))}
                    className={settingButtonClass(settings.copies === copies)}
                  >
                    {copies} via{copies > 1 ? 's' : ''}
                    <span className="mt-1 block text-[10px] font-semibold opacity-75">
                      {copies === 1 ? 'Padrão' : 'Cozinha + caixa'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {devices.length > 0 ? (
            <div className="mt-4 grid gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Impressoras pareadas</p>
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
                      {savingAddress === device.address ? 'Salvando' : selected ? 'Selecionada' : 'Usar esta'}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-950 p-4 text-slate-50">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Preview do cupom</p>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">
                {settings.paperWidth} colunas
              </span>
            </div>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-100">
              {previewText}
            </pre>
          </div>
        </>
      )}
    </section>
  );
}
