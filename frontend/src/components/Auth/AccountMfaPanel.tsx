import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, DeviceMobile, LockKey, QrCode, ShieldCheck, Trash, WarningCircle, X } from '@phosphor-icons/react';
import { authService } from '../../services/authService';
import { readMfaClipboardText } from '../../utils/mfaClipboard';
import { forgetTrustedMfaDevice } from '../../utils/mfaDevice';

type PanelMode = 'overview' | 'setup' | 'disable';

type Props = {
  open: boolean;
  authMode?: 'admin' | 'customer' | 'motoboy' | 'superadmin';
  initialIntent?: PanelMode;
  onStatusChange?: (status: any) => void;
  onClose: () => void;
};

const sanitizeMfaCode = (value: string) => value.replace(/\D/g, '').slice(0, 6);

export function AccountMfaPanel({ open, authMode = 'admin', initialIntent = 'overview', onStatusChange, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [setup, setSetup] = useState<any | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [mode, setMode] = useState<PanelMode>('overview');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [setupPasteHint, setSetupPasteHint] = useState('');
  const [disablePasteHint, setDisablePasteHint] = useState('');
  const setupInputRef = useRef<HTMLInputElement | null>(null);
  const disableInputRef = useRef<HTMLInputElement | null>(null);
  const setupSubmittedCodeRef = useRef('');
  const disableSubmittedCodeRef = useRef('');
  const setupSubmittingRef = useRef(false);
  const disableSubmittingRef = useRef(false);
  const manualPasteHint = 'Não deu para ler automaticamente. Toque no campo e use Colar do teclado.';

  const startSetup = useCallback(async () => {
    setLoading(true);
    setError('');
    setMessage('');
    setSetupCode('');
    setDisableCode('');
    setSetupPasteHint('');
    setDisablePasteHint('');
    setupSubmittedCodeRef.current = '';
    disableSubmittedCodeRef.current = '';
    setupSubmittingRef.current = false;
    disableSubmittingRef.current = false;
    setCopiedSecret(false);
    try {
      setSetup(await authService.startMfaSetup({ authMode }));
      setMode('setup');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível iniciar a verificação em duas etapas.');
    } finally {
      setLoading(false);
    }
  }, [authMode]);

  const load = useCallback(async () => {
    if (!open) return null;
    setLoading(true);
    setError('');
    try {
      const [nextStatus, nextDevices] = await Promise.all([
        authService.getMfaStatus({ authMode }),
        authService.listTrustedDevices({ authMode }),
      ]);
      setStatus(nextStatus);
      onStatusChange?.(nextStatus);
      setDevices(Array.isArray(nextDevices) ? nextDevices : []);
      return nextStatus;
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar a segurança da conta.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [authMode, onStatusChange, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setMode('overview');
    setSetup(null);
    setSetupCode('');
    setDisableCode('');
    setSetupPasteHint('');
    setDisablePasteHint('');
    setupSubmittedCodeRef.current = '';
    disableSubmittedCodeRef.current = '';
    setupSubmittingRef.current = false;
    disableSubmittingRef.current = false;
    setCopiedSecret(false);
    setMessage('');
    setError('');
    void (async () => {
      const nextStatus = await load();
      if (cancelled || !nextStatus) return;
      if (initialIntent === 'setup' && nextStatus.featureEnabled !== false && !nextStatus.enabled) {
        await startSetup();
        return;
      }
      if (initialIntent === 'disable' && nextStatus.enabled) {
        setMode('disable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialIntent, load, open, startSetup]);

  const confirmSetup = async (rawCode = setupCode, options?: { force?: boolean }) => {
    const cleanCode = sanitizeMfaCode(rawCode);
    if (cleanCode.length !== 6 || loading) return;
    if (setupSubmittingRef.current) return;
    if (!options?.force && setupSubmittedCodeRef.current === cleanCode) return;
    setupSubmittedCodeRef.current = cleanCode;
    setupSubmittingRef.current = true;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const nextStatus = await authService.confirmMfaSetup(cleanCode, { authMode });
      setStatus(nextStatus);
      onStatusChange?.(nextStatus);
      setSetup(null);
      setSetupCode('');
      setupSubmittedCodeRef.current = '';
      setMode('overview');
      setMessage('Verificação em duas etapas ativada com sucesso.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Código inválido.');
    } finally {
      setupSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const disable = async (rawCode = disableCode, options?: { force?: boolean }) => {
    const cleanCode = sanitizeMfaCode(rawCode);
    if (cleanCode.length !== 6 || loading) return;
    if (disableSubmittingRef.current) return;
    if (!options?.force && disableSubmittedCodeRef.current === cleanCode) return;
    disableSubmittedCodeRef.current = cleanCode;
    disableSubmittingRef.current = true;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const nextStatus = await authService.disableMfa(cleanCode, { authMode });
      setStatus(nextStatus);
      onStatusChange?.(nextStatus);
      setDisableCode('');
      disableSubmittedCodeRef.current = '';
      setMode('overview');
      setMessage('Verificação em duas etapas desativada para esta conta.');
      forgetTrustedMfaDevice();
      await load();
    } catch (err: any) {
      setError(err?.message || 'Código inválido.');
    } finally {
      disableSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const updateSetupCode = (value: string) => {
    const cleanCode = sanitizeMfaCode(value);
    setSetupCode(cleanCode);
    setSetupPasteHint('');
    setError('');
    if (cleanCode.length < 6) {
      setupSubmittedCodeRef.current = '';
      return;
    }
    void confirmSetup(cleanCode);
  };

  const updateDisableCode = (value: string) => {
    const cleanCode = sanitizeMfaCode(value);
    setDisableCode(cleanCode);
    setDisablePasteHint('');
    setError('');
    if (cleanCode.length < 6) {
      disableSubmittedCodeRef.current = '';
      return;
    }
    void disable(cleanCode);
  };

  const focusMfaInput = (target: 'setup' | 'disable') => {
    const input = target === 'setup' ? setupInputRef.current : disableInputRef.current;
    input?.focus();
    input?.setSelectionRange(0, input.value.length);
  };

  const setPasteHintForTarget = (target: 'setup' | 'disable', hint: string) => {
    if (target === 'setup') {
      setSetupPasteHint(hint);
      return;
    }
    setDisablePasteHint(hint);
  };

  const pasteMfaCode = async (target: 'setup' | 'disable') => {
    if (loading) return;
    setError('');
    setMessage('');
    setPasteHintForTarget(target, '');
    focusMfaInput(target);
    setPasteHintForTarget(target, 'Tentando colar o código...');
    try {
      const clipboardText = await readMfaClipboardText();
      const cleanCode = sanitizeMfaCode(String(clipboardText || ''));
      if (!cleanCode) {
        setPasteHintForTarget(target, 'Copie o código do app autenticador e toque em Colar Código.');
        return;
      }
      if (target === 'setup') {
        updateSetupCode(cleanCode);
      } else {
        updateDisableCode(cleanCode);
      }
    } catch {
      setPasteHintForTarget(target, manualPasteHint);
    }
  };

  if (!open) return null;

  const copySecret = async () => {
    if (!setup?.secret) return;
    setError('');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(setup.secret);
      } else {
        const input = document.createElement('textarea');
        input.value = setup.secret;
        input.setAttribute('readonly', 'true');
        input.style.position = 'fixed';
        input.style.left = '-9999px';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedSecret(true);
      setMessage('Chave copiada. Cole no seu app autenticador se não conseguir escanear o QR Code.');
    } catch {
      setError('Não foi possível copiar a chave. Toque e segure para copiar manualmente.');
    }
  };

  const revokeDevice = async (deviceId: string) => {
    setLoading(true);
    setError('');
    try {
      await authService.revokeTrustedDevice(deviceId, { authMode });
      forgetTrustedMfaDevice();
      await load();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível remover o dispositivo.');
    } finally {
      setLoading(false);
    }
  };

  const featureDisabled = status?.featureEnabled === false;
  const isEnabled = Boolean(status?.enabled);
  const isRequired = Boolean(status?.required);
  const statusLabel = featureDisabled ? 'Indisponível' : isEnabled ? 'Ativado' : 'Desativado';
  const statusTone = isEnabled
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : featureDisabled
      ? 'border-slate-200 bg-slate-100 text-slate-500'
      : 'border-amber-200 bg-amber-50 text-amber-700';
  const renderCodeBoxes = (value: string, tone: 'default' | 'danger' = 'default') => {
    const digits = Array.from({ length: 6 }, (_, index) => value[index] || '0');
    const activeClass = tone === 'danger' ? 'border-rose-400 ring-rose-100' : 'border-[#336886] ring-[#336886]/10';
    const filledClass = tone === 'danger' ? 'border-rose-200 text-slate-900' : 'border-[#336886]/25 text-slate-900';
    const emptyClass = tone === 'danger' ? 'border-rose-100 text-rose-300' : 'border-slate-200 text-slate-400';

    return (
      <div className="grid min-w-0 grid-cols-6 gap-1.5 sm:gap-2" aria-hidden="true">
        {digits.map((digit, index) => (
          <div
            key={`${tone}-mfa-digit-${index}`}
            className={`grid aspect-square min-w-0 place-items-center rounded-2xl border bg-white text-[clamp(1.05rem,5.2vw,1.25rem)] font-black shadow-[0_16px_34px_-30px_rgba(15,23,42,0.65)] transition ${
              value.length === index ? `${activeClass} ring-4` : value.length > index ? filledClass : emptyClass
            }`}
          >
            {digit}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center overflow-x-hidden overflow-y-auto bg-slate-950/45 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-[520px] overflow-hidden rounded-[1.75rem] border border-white/50 bg-white shadow-[0_32px_90px_-30px_rgba(15,23,42,0.75)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/94 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="relative h-11 w-11 shrink-0">
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-11 w-11 rounded-2xl object-cover shadow-[0_18px_38px_-26px_rgba(15,23,42,0.9)] ring-1 ring-white" />
              <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-[#153A4C] text-white ring-2 ring-white">
                <ShieldCheck size={14} weight="duotone" />
              </span>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#336886]">Já no Caminho</p>
              <h2 className="text-lg font-black tracking-[-0.03em] text-slate-900">Segurança da conta</h2>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">Código autenticador e aparelhos confiáveis.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="max-h-[calc(100dvh-6rem)] space-y-3 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          {error ? <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div> : null}
          {message ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</div> : null}

          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(51,104,134,0.12),transparent_36%),linear-gradient(135deg,#ffffff,#f8fafc)] p-4 shadow-[0_24px_56px_-42px_rgba(15,23,42,0.5)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#336886]">Verificação em duas etapas</p>
                <p className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-950">
                  {isEnabled ? 'Proteção ativa' : featureDisabled ? 'Proteção indisponível' : 'Proteção desativada'}
                </p>
                <p className="mt-1 max-w-[390px] text-xs font-semibold leading-relaxed text-slate-500">
                  {isEnabled
                    ? 'Em aparelho novo, o login pede o código de 6 dígitos.'
                    : featureDisabled
                      ? 'Esta proteção ainda não está liberada para sua conta.'
                      : isRequired
                        ? 'Obrigatória para esta conta. Ative para continuar seguro.'
                        : 'Camada extra para proteger o login.'}
                </p>
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusTone}`}>
                {statusLabel}
              </span>
            </div>

            {!isEnabled ? (
              <button
                type="button"
                onClick={startSetup}
                disabled={loading || featureDisabled}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                <QrCode size={18} weight="duotone" />
                Ativar agora
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode('disable');
                  setDisableCode('');
                  disableSubmittedCodeRef.current = '';
                  disableSubmittingRef.current = false;
                  setError('');
                  setMessage('');
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm font-black text-rose-700 shadow-sm transition active:scale-[0.99]"
              >
                <LockKey size={18} weight="duotone" />
                Desativar proteção
              </button>
            )}
          </div>

          {mode === 'setup' && setup ? (
            <div className="rounded-3xl border border-[#336886]/12 bg-white p-4 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.55)]">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#336886]">Ativacao</p>
                  <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Conecte o autenticador</h3>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">Escaneie o QR Code e informe o codigo gerado.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode('overview');
                    setSetup(null);
                    setSetupCode('');
                    setupSubmittedCodeRef.current = '';
                    setupSubmittingRef.current = false;
                  }}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500"
                >
                  Cancelar
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
                <div className="rounded-3xl bg-white p-3 shadow-inner ring-1 ring-slate-100">
                  <img src={setup.qrCodeDataUrl} alt="QR Code para ativar a segurança da conta" className="h-full w-full rounded-2xl object-contain" />
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Chave manual</p>
                      <button
                        type="button"
                        onClick={copySecret}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#336886] shadow-sm"
                      >
                        <Copy size={13} weight="duotone" />
                        {copiedSecret ? 'Copiada' : 'Copiar'}
                      </button>
                    </div>
                    <p className="break-all text-xs font-black leading-relaxed text-slate-700">{setup.secret}</p>
                  </div>
                  <label className="block space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Código de 6 dígitos</span>
                    <div className="relative" onClick={() => focusMfaInput('setup')}>
                      {renderCodeBoxes(setupCode)}
                      <input
                        ref={setupInputRef}
                        value={setupCode}
                        onChange={(event) => updateSetupCode(event.target.value)}
                        onPaste={(event) => {
                          const pasted = event.clipboardData?.getData('text') || '';
                          if (!pasted) return;
                          event.preventDefault();
                          updateSetupCode(pasted);
                        }}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                    aria-label="Código de ativação do app autenticador"
                        className="absolute inset-0 h-full w-full cursor-text opacity-0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => pasteMfaCode('setup')}
                      disabled={loading}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#153A4C]/10 bg-white px-4 text-xs font-black text-[#153A4C] shadow-sm transition active:scale-[0.98] disabled:opacity-50"
                      aria-label="Colar Código de ativação"
                    >
                      <Copy size={14} weight="duotone" />
                      Colar Código
                    </button>
                    <span className={`block text-left text-[11px] font-bold leading-relaxed ${setupPasteHint ? 'text-[#153A4C]' : 'text-slate-400'}`}>
                      {setupPasteHint || (loading ? 'Validando automaticamente...' : setupCode.length === 6 ? 'Código completo. Use o botão se precisar tentar de novo.' : 'Cole ou digite os 6 dígitos para validar automaticamente.')}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => confirmSetup(setupCode, { force: true })}
                    disabled={loading || setupCode.length !== 6}
                    className="w-full rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    Ativar proteção
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {mode === 'disable' && isEnabled ? (
            <div className="rounded-3xl border border-rose-100 bg-rose-50/70 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-rose-600 shadow-sm">
                  <WarningCircle size={22} weight="duotone" />
                </span>
                <div>
                  <p className="text-sm font-black text-rose-900">Confirmar desativação</p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-rose-700/80">
                    Para sua segurança, digite o código de 6 dígitos do seu app autenticador antes de desligar esta proteção.
                  </p>
                </div>
              </div>
              <label className="mt-4 block space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-rose-800">Código do app autenticador</span>
                <div className="relative" onClick={() => focusMfaInput('disable')}>
                  {renderCodeBoxes(disableCode, 'danger')}
                  <input
                    ref={disableInputRef}
                    value={disableCode}
                    onChange={(event) => updateDisableCode(event.target.value)}
                    onPaste={(event) => {
                      const pasted = event.clipboardData?.getData('text') || '';
                      if (!pasted) return;
                      event.preventDefault();
                      updateDisableCode(pasted);
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-label="Código do app autenticador para desativar"
                    className="absolute inset-0 h-full w-full cursor-text opacity-0"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => pasteMfaCode('disable')}
                  disabled={loading}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-white px-4 text-xs font-black text-rose-700 shadow-sm transition active:scale-[0.98] disabled:opacity-50"
                  aria-label="Colar Código para desativar"
                >
                  <Copy size={14} weight="duotone" />
                  Colar Código
                </button>
                <span className={`block text-left text-[11px] font-bold leading-relaxed ${disablePasteHint ? 'text-rose-800' : 'text-rose-700/70'}`}>
                  {disablePasteHint || (loading ? 'Validando automaticamente...' : disableCode.length === 6 ? 'Código completo. Use o botão se precisar tentar de novo.' : 'Cole ou digite os 6 dígitos para validar automaticamente.')}
                </span>
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('overview');
                    setDisableCode('');
                    disableSubmittedCodeRef.current = '';
                    disableSubmittingRef.current = false;
                  }}
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => disable(disableCode, { force: true })}
                  disabled={loading || disableCode.length !== 6}
                  className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white shadow-[0_18px_36px_-26px_rgba(225,29,72,0.85)] disabled:opacity-50"
                >
                  Desativar
                </button>
              </div>
            </div>
          ) : null}

          {isEnabled ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <DeviceMobile size={18} weight="duotone" className="text-[#336886]" />
              <div>
                <p className="text-sm font-black text-slate-900">Aparelhos confiáveis</p>
                <p className="text-[11px] font-semibold text-slate-500">
                  Depois de validar o código uma vez, este aparelho pode entrar com biometria local.
                </p>
              </div>
            </div>
            {devices.length ? (
              <div className="space-y-2">
                {devices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <div>
                      <p className="text-sm font-black text-slate-800">{device.label || 'Dispositivo'}</p>
                      <p className="text-[11px] font-semibold text-slate-500">
                        Expira em {device.expiresAt ? new Date(device.expiresAt).toLocaleDateString('pt-BR') : '-'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => revokeDevice(device.id)}
                      className="grid h-9 w-9 place-items-center rounded-full bg-white text-rose-600 shadow-sm"
                      aria-label="Remover dispositivo"
                    >
                      <Trash size={16} weight="duotone" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-500">
                Nenhum aparelho confiável cadastrado.
              </p>
            )}
          </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
