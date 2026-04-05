// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, SignOut, MapPinLine } from '@phosphor-icons/react';
import { customerAccountService } from '../services/customerAccountService';
import { formatCurrency, formatOrderDisplayId } from '../utils/format';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { App as CapacitorApp } from '@capacitor/app';

export function ClientAccount() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [me, setMe] = useState<any | null>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');

  useEffect(() => {
    document.title = 'Minha Conta | Já no Caminho';
  }, []);

  useEffect(() => {
    const sessionRaw = localStorage.getItem('customerSession');
    if (!sessionRaw) {
      navigate('/cliente?next=/cliente/conta&hub=1', { replace: true });
      return;
    }

    let mounted = true;
    Promise.all([
      customerAccountService.me(),
      customerAccountService.listAddresses(),
      customerAccountService.listOrders(),
    ])
      .then(([meData, addressesData, ordersData]) => {
        if (!mounted) return;
        setMe(meData || null);
        setNameDraft(String(meData?.fullName || ''));
        setPhoneDraft(String(meData?.phone || ''));
        setAddresses(Array.isArray(addressesData) ? addressesData : []);
        setOrders(Array.isArray(ordersData) ? ordersData : []);

        // Sync local storage session user data
        if (meData) {
          try {
            const raw = localStorage.getItem('customerSession');
            if (raw) {
              const parsed = JSON.parse(raw);
              const next = {
                ...parsed,
                user: {
                  ...(parsed?.user || {}),
                  ...meData,
                },
              };
              localStorage.setItem('customerSession', JSON.stringify(next));
            }
          } catch {
            // ignore
          }
        }
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message || 'Falha ao carregar conta.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    const loadPush = async () => {
      if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('PushNotifications')) {
        setPushEnabled(false);
        return;
      }
      try {
        const status = await PushNotifications.checkPermissions();
        setPushEnabled(status.receive === 'granted');
      } catch {
        setPushEnabled(false);
      }
    };
    void loadPush();
  }, []);

  const logout = () => {
    const token = String(localStorage.getItem('jnk_mobile_push_token') || '').trim();
    if (token) {
      void customerAccountService.unregisterPushToken({ token });
    } else {
      void customerAccountService.unregisterPushToken({});
    }
    localStorage.removeItem('customerSession');
    navigate('/hub', { replace: true });
  };

  const toBase64DataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
      reader.readAsDataURL(file);
    });

  const handleSaveProfile = async () => {
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileMessage('');
    try {
      const updated = await customerAccountService.updateMe({
        fullName: String(nameDraft || '').trim(),
        phone: String(phoneDraft || '').trim(),
      });
      setMe(updated || null);
      const raw = localStorage.getItem('customerSession');
      if (raw) {
        const parsed = JSON.parse(raw);
        const next = {
          ...parsed,
          user: {
            ...(parsed?.user || {}),
            ...(updated || {}),
          },
        };
        localStorage.setItem('customerSession', JSON.stringify(next));
      }
      setProfileMessage('Perfil atualizado.');
    } catch (e: any) {
      setProfileMessage(e?.message || 'Não foi possível salvar perfil.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfileImageUpload = async (file?: File | null) => {
    if (!file || profileSaving) return;

    // Check file size (max 5MB to avoid 413 Payload Too Large with Base64 overhead)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setProfileMessage('A imagem é muito grande. Escolha uma foto de até 5MB.');
      return;
    }

    setProfileSaving(true);
    setProfileMessage('');
    try {
      const base64 = await toBase64DataUrl(file);
      const updated = await customerAccountService.updateMe({ profileImageFile: base64 });
      setMe(updated || null);
      const raw = localStorage.getItem('customerSession');
      if (raw) {
        const parsed = JSON.parse(raw);
        const next = {
          ...parsed,
          user: {
            ...(parsed?.user || {}),
            ...(updated || {}),
          },
        };
        localStorage.setItem('customerSession', JSON.stringify(next));
      }
      setProfileMessage('Foto de perfil atualizada.');
      // Force a slight delay to allow the user to see the success message
      // and maybe trigger a re-render in Hub when they go back
      window.dispatchEvent(new Event('storage'));
    } catch (e: any) {
      if (e.status === 413) {
        setProfileMessage('A imagem excedeu o limite do servidor. Tente uma foto menor.');
      } else if (e.status === 403 || e.status === 401) {
        setProfileMessage('Sua sessão expirou ou você não tem permissão. Tente fazer login novamente.');
      } else {
        setProfileMessage(e?.message || 'Não foi possível enviar foto.');
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handleTogglePush = async () => {
    if (pushLoading) return;
    setPushLoading(true);
    try {
      if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('PushNotifications')) {
        setPushEnabled(false);
        return;
      }
      const current = await PushNotifications.checkPermissions();
      if (current.receive === 'granted' && pushEnabled) {
        const token = String(localStorage.getItem('jnk_mobile_push_token') || '').trim();
        if (token) await customerAccountService.unregisterPushToken({ token });
        await PushNotifications.unregister();
        setPushEnabled(false);
        return;
      }
      const requested = await PushNotifications.requestPermissions();
      if (requested.receive !== 'granted') {
        const openSettings = (CapacitorApp as any)?.openSettings;
        if (typeof openSettings === 'function') await openSettings();
        return;
      }
      await PushNotifications.register();
      setPushEnabled(true);
    } finally {
      setPushLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (pwdLoading) return;
    setPwdLoading(true);
    setPwdMessage('');
    try {
      await customerAccountService.changePassword({
        currentPassword: String(pwdForm.currentPassword || ''),
        newPassword: String(pwdForm.newPassword || ''),
      });
      setPwdForm({ currentPassword: '', newPassword: '' });
      setPwdMessage('Senha alterada com sucesso.');
    } catch (e: any) {
      setPwdMessage(e?.message || 'Não foi possível alterar a senha.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/hub')}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={14} />
            Voltar
          </button>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
          >
            <SignOut size={14} />
            Sair
          </button>
        </div>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-sm p-4 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.4)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-black">Minha conta</p>
          {loading ? (
            <p className="text-sm text-slate-500 mt-2">Carregando...</p>
          ) : error ? (
            <p className="text-sm text-rose-600 mt-2">{error}</p>
          ) : (
            <>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  {me?.profileImageUrl ? (
                    <img src={resolveAssetUrl(String(me.profileImageUrl)) || ''} alt={me?.fullName || 'Cliente'} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-sm font-black text-slate-500">
                      {String(me?.fullName || 'AN').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <label className="inline-flex cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700">
                    Trocar foto
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleProfileImageUpload(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input
                  name="fullName"
                  autoComplete="name"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="Nome completo"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
                <input
                  name="phone"
                  autoComplete="tel"
                  value={phoneDraft}
                  onChange={(e) => setPhoneDraft(e.target.value)}
                  placeholder="Telefone"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>
              <p className="text-sm text-slate-600 mt-2">{me?.email || '-'}</p>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  {profileSaving ? 'Salvando...' : 'Salvar perfil'}
                </button>
                {profileMessage ? (
                  <p className={`mt-1 text-xs font-bold ${profileMessage.includes('Erro') || profileMessage.includes('excedeu') || profileMessage.includes('expirou') || profileMessage.includes('muito grande') ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {profileMessage}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-sm p-4 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.4)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-black">Endereços</p>
          {addresses.length === 0 ? (
            <p className="text-sm text-slate-500 mt-2">Nenhum endereço cadastrado ainda.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {addresses.map((address: any) => (
                <div key={address.id} className="rounded-2xl border border-slate-200/90 p-3 bg-slate-50/60">
                  <p className="text-sm font-semibold text-slate-700">{address.label || 'Endereço'} {address.isDefault ? '• Principal' : ''}</p>
                  <p className="text-xs text-slate-500">
                    {address.street}, {address.number || 's/n'} - {address.neighborhood} - {address.city}/{address.state}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-sm p-4 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.4)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-black">Segurança</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              type="password"
              name="current-password"
              autoComplete="current-password"
              value={pwdForm.currentPassword}
              onChange={(e) => setPwdForm((p) => ({ ...p, currentPassword: e.target.value }))}
              placeholder="Senha atual"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
            <input
              type="password"
              name="new-password"
              autoComplete="new-password"
              value={pwdForm.newPassword}
              onChange={(e) => setPwdForm((p) => ({ ...p, newPassword: e.target.value }))}
              placeholder="Nova senha"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={pwdLoading}
              className="rounded-xl bg-[linear-gradient(120deg,#0f172a,#1e293b)] px-3 py-2 text-xs font-bold text-white shadow-[0_10px_20px_-14px_rgba(15,23,42,0.8)] active:scale-[0.99] disabled:opacity-60"
            >
              {pwdLoading ? 'Alterando...' : 'Trocar senha'}
            </button>
            {pwdMessage ? <p className="text-xs text-slate-600">{pwdMessage}</p> : null}
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800">Notificações push</p>
                <p className="text-[11px] text-slate-500">Receber atualização de pedido no app.</p>
              </div>
              <button
                type="button"
                onClick={handleTogglePush}
                disabled={pushLoading}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${pushEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'} disabled:opacity-60`}
              >
                {pushLoading ? 'Aguarde...' : pushEnabled ? 'Ativado' : 'Desativado'}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-sm p-4 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.4)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-black">Meus pedidos</p>
          {orders.length === 0 ? (
            <p className="text-sm text-slate-500 mt-2">Sem pedidos vinculados.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {orders.slice(0, 20).map((order: any) => (
                <div key={order.id} className="rounded-2xl border border-slate-200/90 p-3 bg-slate-50/60">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-700">
                      #{formatOrderDisplayId(order.id, order?.store?.slug)}
                    </p>
                    <span className="text-xs font-bold text-slate-500 uppercase">{order.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(order.createdAt).toLocaleString('pt-BR')} • {order?.store?.name || 'Loja'}
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{formatCurrency(Number(order.total || 0))}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/pedido/${order.id}`)}
                      className="rounded-lg bg-[linear-gradient(120deg,#0f172a,#1e293b)] px-3 py-1.5 text-[11px] font-bold text-white shadow-[0_10px_20px_-14px_rgba(15,23,42,0.8)]"
                    >
                      Acompanhar
                    </button>
                    {order?.store?.slug ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/${order.store.slug}`)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 inline-flex items-center gap-1"
                      >
                        <MapPinLine size={12} />
                        Ir para loja
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
