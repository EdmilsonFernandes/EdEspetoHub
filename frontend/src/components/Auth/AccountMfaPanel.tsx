import { useEffect, useState } from 'react';
import { DeviceMobile, LockKey, QrCode, ShieldCheck, Trash, X } from '@phosphor-icons/react';
import { authService } from '../../services/authService';
import { forgetTrustedMfaDevice } from '../../utils/mfaDevice';

type Props = {
  open: boolean;
  authMode?: 'admin' | 'customer' | 'motoboy' | 'superadmin';
  onClose: () => void;
};

export function AccountMfaPanel({ open, authMode = 'admin', onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [setup, setSetup] = useState<any | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    if (!open) return;
    setLoading(true);
    setError('');
    try {
      const [nextStatus, nextDevices] = await Promise.all([
        authService.getMfaStatus({ authMode }),
        authService.listTrustedDevices({ authMode }),
      ]);
      setStatus(nextStatus);
      setDevices(Array.isArray(nextDevices) ? nextDevices : []);
    } catch (err: any) {
      setError(err?.message || 'Nao foi possivel carregar a seguranca da conta.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, authMode]);

  if (!open) return null;

  const startSetup = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      setSetup(await authService.startMfaSetup({ authMode }));
    } catch (err: any) {
      setError(err?.message || 'Nao foi possivel iniciar o MFA.');
    } finally {
      setLoading(false);
    }
  };

  const confirmSetup = async () => {
    if (code.replace(/\D/g, '').length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const nextStatus = await authService.confirmMfaSetup(code, { authMode });
      setStatus(nextStatus);
      setSetup(null);
      setCode('');
      setMessage('MFA ativado com sucesso.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Codigo invalido.');
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    if (code.replace(/\D/g, '').length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const nextStatus = await authService.disableMfa(code, { authMode });
      setStatus(nextStatus);
      setCode('');
      setMessage('MFA desativado para esta conta.');
      forgetTrustedMfaDevice();
      await load();
    } catch (err: any) {
      setError(err?.message || 'Codigo invalido.');
    } finally {
      setLoading(false);
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
      setError(err?.message || 'Nao foi possivel remover o dispositivo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-end justify-center bg-slate-950/45 px-3 py-3 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92vh] w-full max-w-[560px] overflow-hidden rounded-[2rem] border border-white/50 bg-white shadow-[0_32px_90px_-30px_rgba(15,23,42,0.75)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/92 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#153A4C] text-white">
              <ShieldCheck size={26} weight="duotone" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#336886]">Seguranca</p>
              <h2 className="text-xl font-black tracking-[-0.03em] text-slate-900">MFA e dispositivos</h2>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                Use Authy, Google Authenticator ou Microsoft Authenticator.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-88px)] space-y-4 overflow-y-auto px-5 pb-6 pt-5">
          {error ? <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div> : null}
          {message ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</div> : null}

          <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">Autenticador TOTP</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Status: {status?.enabled ? 'ativo' : status?.featureEnabled ? 'desativado' : 'indisponivel por configuracao'}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${status?.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                {status?.enabled ? 'Ativo' : 'Off'}
              </span>
            </div>

            {!status?.enabled ? (
              <button
                type="button"
                onClick={startSetup}
                disabled={loading || status?.featureEnabled === false}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                <QrCode size={18} weight="duotone" />
                Ativar MFA
              </button>
            ) : (
              <div className="mt-4 space-y-3">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-xl font-black tracking-[0.28em] outline-none focus:border-[#336886] focus:ring-4 focus:ring-[#336886]/10"
                  placeholder="000000"
                />
                <button
                  type="button"
                  onClick={disable}
                  disabled={loading || code.length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 disabled:opacity-50"
                >
                  <LockKey size={18} weight="duotone" />
                  Desativar com codigo
                </button>
              </div>
            )}
          </div>

          {setup ? (
            <div className="rounded-3xl border border-[#336886]/12 bg-white p-4 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.55)]">
              <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                <div className="rounded-3xl bg-white p-3 shadow-inner ring-1 ring-slate-100">
                  <img src={setup.qrCodeDataUrl} alt="QR Code MFA" className="h-full w-full rounded-2xl object-contain" />
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">Escaneie o QR Code</p>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                      Depois digite o codigo de 6 digitos para confirmar a ativacao.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 break-all">
                    {setup.secret}
                  </div>
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-xl font-black tracking-[0.28em] outline-none focus:border-[#336886] focus:ring-4 focus:ring-[#336886]/10"
                    placeholder="000000"
                  />
                  <button
                    type="button"
                    onClick={confirmSetup}
                    disabled={loading || code.length !== 6}
                    className="w-full rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    Confirmar MFA
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-100 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <DeviceMobile size={18} weight="duotone" className="text-[#336886]" />
              <p className="text-sm font-black text-slate-900">Dispositivos confiaveis</p>
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
                Nenhum dispositivo confiavel cadastrado.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
