// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  SignOut, 
  MapPinLine, 
  Plus, 
  ShieldCheck, 
  BellRinging, 
  UserCircle, 
  Package, 
  CaretRight,
  Phone,
  EnvelopeSimple,
  Camera
} from '@phosphor-icons/react';
import { customerAccountService } from '../services/customerAccountService';
import { formatCurrency, formatOrderDisplayId } from '../utils/format';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { App as CapacitorApp } from '@capacitor/app';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';

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
    }
    localStorage.removeItem('customerSession');
    navigate('/hub', { replace: true });
  };

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
      setProfileMessage('Perfil atualizado com sucesso.');
    } catch (e: any) {
      setProfileMessage(e?.message || 'Erro ao salvar perfil.');
    } finally {
      setProfileSaving(false);
    }
  };

  const pickProfileImageNative = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        promptLabelHeader: 'Trocar foto de perfil',
        promptLabelPhoto: 'Escolher da Galeria',
        promptLabelPicture: 'Tirar Foto'
      });

      if (image.base64String) {
        const dataUrl = `data:image/${image.format};base64,${image.base64String}`;
        setProfileSaving(true);
        const updated = await customerAccountService.updateMe({ profileImageFile: dataUrl });
        setMe(updated || null);
        window.dispatchEvent(new Event('storage'));
        setProfileMessage('Foto atualizada!');
        setProfileSaving(false);
      }
    } catch {
      setProfileSaving(false);
    }
  };

  const handleTogglePush = async () => {
    if (pushLoading) return;
    setPushLoading(true);
    try {
      if (!Capacitor.isNativePlatform()) return;
      const requested = await PushNotifications.requestPermissions();
      if (requested.receive === 'granted') {
        await PushNotifications.register();
        setPushEnabled(true);
      }
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
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      setPwdForm({ currentPassword: '', newPassword: '' });
      setPwdMessage('Senha alterada com sucesso.');
    } catch (e: any) {
      setPwdMessage(e?.message || 'Falha ao alterar senha.');
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-2xl">
        {/* Header Fixo Premium */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur-md">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-all active:scale-90"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
          <h1 className="text-base font-black text-slate-900 uppercase tracking-widest">Minha Conta</h1>
          <button
            onClick={logout}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 transition-all active:scale-90"
          >
            <SignOut size={20} weight="bold" />
          </button>
        </header>

        <div className="px-4 py-6 space-y-6">
          {/* Seção 1: Avatar e Dados Básicos */}
          <section className="relative overflow-hidden rounded-[2.5rem] bg-white p-6 shadow-sm border border-slate-100">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="h-24 w-24 overflow-hidden rounded-[2rem] border-4 border-slate-50 shadow-md">
                  {me?.profileImageUrl ? (
                    <img src={resolveAssetUrl(me.profileImageUrl)} alt={me.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-slate-100 text-2xl font-black text-slate-400">
                      {String(me?.fullName || 'U').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <button 
                  onClick={pickProfileImageNative}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg active:scale-90 transition-transform"
                >
                  <Camera size={16} weight="fill" />
                </button>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">{me?.fullName || 'Usuário'}</h2>
                <p className="text-sm font-bold text-slate-400">{me?.email}</p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nome Completo</label>
                <div className="relative">
                  <UserCircle size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={nameDraft}
                    onChange={e => setNameDraft(e.target.value)}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold text-slate-700 focus:border-slate-900/20 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Telefone para Contato</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={phoneDraft}
                    onChange={e => setPhoneDraft(e.target.value)}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold text-slate-700 focus:border-slate-900/20 focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="w-full rounded-2xl bg-slate-900 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {profileSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              {profileMessage && (
                <p className="text-center text-[11px] font-bold text-emerald-600">{profileMessage}</p>
              )}
            </div>
          </section>

          {/* Seção 2: Endereços */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <MapPinLine size={16} weight="duotone" className="text-sky-500" />
                Meus Endereços
              </h3>
              <button 
                onClick={() => navigate('/cliente/enderecos')}
                className="flex items-center gap-1.5 rounded-xl bg-sky-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-sky-700 active:scale-95"
              >
                <Plus size={12} weight="bold" />
                Cadastrar
              </button>
            </div>
            
            <div className="space-y-2">
              {addresses.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
                  <p className="text-sm font-bold text-slate-400">Nenhum endereço cadastrado</p>
                </div>
              ) : (
                addresses.map(addr => (
                  <div key={addr.id} className="group flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-600 transition-colors">
                        <MapPinLine size={20} weight="duotone" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{addr.label || 'Casa'}</p>
                        <p className="truncate text-[11px] font-bold text-slate-400">{addr.street}, {addr.number}</p>
                      </div>
                    </div>
                    <CaretRight size={16} className="text-slate-300" />
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Seção 3: Segurança e Notificações */}
          <section className="grid gap-4 sm:grid-cols-2">
            {/* Segurança */}
            <div className="rounded-[2rem] bg-white p-5 border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <ShieldCheck size={16} weight="duotone" className="text-indigo-500" />
                Segurança
              </h3>
              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="Nova senha"
                  value={pwdForm.newPassword}
                  onChange={e => setPwdForm(p => ({...p, newPassword: e.target.value}))}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[13px] font-bold focus:outline-none"
                />
                <button
                  onClick={handleChangePassword}
                  disabled={pwdLoading}
                  className="w-full rounded-xl bg-slate-100 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 active:scale-95 transition-all"
                >
                  Trocar Senha
                </button>
              </div>
            </div>

            {/* Notificações */}
            <div className="rounded-[2rem] bg-white p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <BellRinging size={16} weight="duotone" className="text-amber-500" />
                Notificações
              </h3>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold text-slate-500 leading-tight">Receber avisos sobre meus pedidos</p>
                <button
                  onClick={handleTogglePush}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${pushEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${pushEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </section>

          {/* Seção 4: Pedidos Recentes */}
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-2">
              <Package size={16} weight="duotone" className="text-emerald-500" />
              Pedidos Recentes
            </h3>
            <div className="space-y-2">
              {orders.length === 0 ? (
                <div className="rounded-3xl bg-white p-8 text-center border border-slate-100 shadow-sm">
                  <p className="text-sm font-bold text-slate-400">Nenhum pedido realizado</p>
                </div>
              ) : (
                orders.slice(0, 5).map(order => (
                  <button
                    key={order.id}
                    onClick={() => navigate(`/pedido/${order.id}`)}
                    className="flex w-full items-center justify-between rounded-3xl bg-white p-4 border border-slate-100 shadow-sm active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                        <Package size={20} weight="duotone" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-900">#{formatOrderDisplayId(order.id, order.store?.slug)}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{order.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{formatCurrency(order.total || 0)}</p>
                      <p className="text-[10px] font-bold text-slate-400">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
