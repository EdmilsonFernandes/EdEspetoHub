// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  SignOut, 
  MapPinLine, 
  Plus, 
  ShieldCheck, 
  UserCircle, 
  Package,
  CaretRight,
  Phone,
  EnvelopeSimple,
  Camera,
  ImagesSquare,
  CheckCircle,
  XCircle,
  BellSimpleRinging,
  Trash
} from '@phosphor-icons/react';
import { customerAccountService } from '../services/customerAccountService';
import { formatCurrency, formatOrderDisplayId } from '../utils/format';
import { useCachedCustomerProfileImage } from '../hooks/useCachedCustomerProfileImage';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { App as CapacitorApp } from '@capacitor/app';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { nativeBiometricService } from '../services/nativeBiometricService';

// Componente Switch Simples
function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#336886] focus:ring-offset-2 ${
        checked ? 'bg-[#336886]' : 'bg-slate-200'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function ClientAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [deactivating, setDeactivating] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
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
  const [photoPermission, setPhotoPermission] = useState<'granted' | 'denied' | 'unknown'>('unknown');
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'unknown'>('unknown');
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const settingsSectionRef = useRef<HTMLElement | null>(null);
  const settingsOnly = searchParams.get('section') === 'settings';
  const cachedProfileImage = useCachedCustomerProfileImage(me?.profileImageUrl, me?.profileImageVersion);

  const syncCustomerSession = (nextUser: any, options?: { bustProfileImage?: boolean }) => {
    try {
      const raw = localStorage.getItem('customerSession');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const next = {
        ...parsed,
        user: {
          ...(parsed?.user || {}),
          ...(nextUser || {}),
          ...(options?.bustProfileImage ? { profileImageVersion: Date.now() } : {}),
        },
      };
      localStorage.setItem('customerSession', JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('jnc:customer-session-updated', { detail: next }));
      if (nativeBiometricService.hasStoredCustomerProfile()) {
        nativeBiometricService.enableCustomer(next);
      }
    } catch {
      // ignore
    }
  };

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
          syncCustomerSession(meData);
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

  const refreshNativePermissions = async () => {
    if (!Capacitor.isNativePlatform()) {
      setPushEnabled(false);
      setPhotoPermission('unknown');
      setCameraPermission('unknown');
      return;
    }
    try {
      if (Capacitor.isPluginAvailable('PushNotifications')) {
        const status = await PushNotifications.checkPermissions();
        setPushEnabled(status.receive === 'granted');
      } else {
        setPushEnabled(false);
      }
    } catch {
      setPushEnabled(false);
    }

    try {
      if (Capacitor.isPluginAvailable('Camera')) {
        const status = await CapCamera.checkPermissions();
        const photosStatus = status?.photos === 'granted' || status?.photos === 'limited' ? 'granted' : status?.photos === 'denied' ? 'denied' : 'unknown';
        const cameraStatus = status?.camera === 'granted' ? 'granted' : status?.camera === 'denied' ? 'denied' : 'unknown';
        setPhotoPermission(photosStatus);
        setCameraPermission(cameraStatus);
      } else {
        setPhotoPermission('unknown');
        setCameraPermission('unknown');
      }
    } catch {
      setPhotoPermission('unknown');
      setCameraPermission('unknown');
    }
  };

  useEffect(() => {
    void refreshNativePermissions();
  }, []);

  useEffect(() => {
    setBiometricSupported(nativeBiometricService.isSupported());
    setBiometricEnabled(nativeBiometricService.hasStoredCustomerProfile());
  }, []);

  useEffect(() => {
    if (loading) return;
    if (searchParams.get('section') !== 'settings') return;
    window.setTimeout(() => {
      settingsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }, [loading, searchParams]);

  const logout = () => {
    const token = String(localStorage.getItem('jnk_mobile_push_token') || '').trim();
    if (token) {
      void customerAccountService.unregisterPushToken({ token });
    }
    localStorage.removeItem('customerSession');
    navigate('/hub', { replace: true });
  };

  const handleToggleBiometricAccess = () => {
    if (biometricBusy) return;
    setBiometricBusy(true);
    setBiometricMessage('');
    try {
      if (biometricEnabled) {
        nativeBiometricService.disableCustomer();
        setBiometricEnabled(false);
        setBiometricMessage('Biometria desativada neste aparelho.');
        return;
      }

      const raw = localStorage.getItem('customerSession');
      const session = raw ? JSON.parse(raw) : null;
      if (!session?.token) {
        setBiometricMessage('Entre novamente para ativar a biometria.');
        return;
      }

      const enabled = nativeBiometricService.enableCustomer(session);
      if (!enabled) {
        setBiometricMessage('Não foi possível ativar a biometria neste aparelho.');
        return;
      }

      setBiometricEnabled(true);
      setBiometricMessage('Biometria ativada com sucesso.');
    } catch {
      setBiometricMessage('Não foi possível atualizar a biometria agora.');
    } finally {
      setBiometricBusy(false);
    }
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
      syncCustomerSession(updated || null);
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
        syncCustomerSession(updated || null, { bustProfileImage: true });
        setProfileMessage('Foto atualizada!');
        setProfileSaving(false);
        setPhotoPermission('granted');
        setCameraPermission('granted');
      }
    } catch {
      setProfileSaving(false);
    }
  };

  const permissionMeta = (value: 'granted' | 'denied' | 'unknown') => {
    if (value === 'granted') {
      return {
        label: 'Permitido',
        tone: 'text-emerald-700',
        bg: 'bg-emerald-50 border-emerald-100',
        icon: <CheckCircle size={16} weight="fill" className="text-emerald-500" />,
      };
    }
    if (value === 'denied') {
      return {
        label: 'Bloqueado',
        tone: 'text-rose-700',
        bg: 'bg-rose-50 border-rose-100',
        icon: <XCircle size={16} weight="fill" className="text-rose-500" />,
      };
    }
    return {
      label: 'Não verificado',
      tone: 'text-slate-600',
      bg: 'bg-slate-50 border-slate-100',
      icon: <XCircle size={16} weight="duotone" className="text-slate-400" />,
    };
  };

  const openAppSettings = async () => {
    const openSettings = (CapacitorApp as any)?.openSettings;
    if (typeof openSettings === 'function') {
      await openSettings();
      window.setTimeout(() => void refreshNativePermissions(), 800);
      return;
    }
    setProfileMessage('Abra as permissões do aplicativo nas configurações do celular para alterar este acesso.');
  };

  const handlePermissionAction = async (type: 'push' | 'photos' | 'camera', isGranted: boolean) => {
    setProfileMessage('');
    
    if (!Capacitor.isNativePlatform()) {
      setProfileMessage('As permissões só podem ser alteradas no aplicativo para celular.');
      return;
    }

    // Se o usuário quer DESLIGAR uma permissão já concedida
    if (isGranted) {
      if (type === 'push') {
        try {
          const token = String(localStorage.getItem('jnk_mobile_push_token') || '').trim();
          if (token) {
            await customerAccountService.unregisterPushToken({ token });
            localStorage.removeItem('jnk_mobile_push_token');
          }
        } catch (e) {
          console.error('Erro ao desativar push no servidor:', e);
        }
      }
      
      // Mensagem explicativa pois o app não pode desligar permissão de sistema sozinho
      setProfileMessage(`Para desativar a ${type === 'push' ? 'notificação' : type === 'camera' ? 'câmera' : 'galeria'}, você deve desmarcá-la nas configurações do sistema que vamos abrir agora.`);
      
      // Pequeno delay para o usuário ler a mensagem antes de abrir as configurações
      setTimeout(async () => {
        await openAppSettings();
      }, 1500);
      return;
    }

    // Se o usuário quer LIGAR uma permissão
    try {
      if (type === 'push' && Capacitor.isPluginAvailable('PushNotifications')) {
        const requested = await PushNotifications.requestPermissions();
        if (requested.receive === 'granted') {
          await PushNotifications.register();
        } else {
          await openAppSettings();
        }
      } else if ((type === 'photos' || type === 'camera') && Capacitor.isPluginAvailable('Camera')) {
        const requested = await CapCamera.requestPermissions({ permissions: [type] });
        if (requested[type] !== 'granted') {
          await openAppSettings();
        }
      }
    } catch (err) {
      console.error('Erro ao solicitar permissão:', err);
      await openAppSettings();
    }

    // Atualiza o estado visual das chaves
    setTimeout(() => void refreshNativePermissions(), 1000);
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

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await customerAccountService.deactivate();
      nativeBiometricService.disableCustomer();
      setShowDeactivateModal(false);
      logout();
    } catch (e: any) {
      alert(e?.message || 'Falha ao desativar conta.');
    } finally {
      setDeactivating(false);
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
          <h1 className="text-base font-black text-slate-900 uppercase tracking-widest">{settingsOnly ? 'Configurações' : 'Minha Conta'}</h1>
          <button
            onClick={logout}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 transition-all active:scale-90"
          >
            <SignOut size={20} weight="bold" />
          </button>
        </header>

        <div className="px-4 py-6 space-y-6">
          {!settingsOnly && (
            <>
              {/* Seção 1: Avatar e Dados Básicos */}
              <section className="relative overflow-hidden rounded-[2.5rem] bg-white p-6 shadow-sm border border-slate-100">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <div className="h-24 w-24 overflow-hidden rounded-[2rem] border-4 border-slate-50 shadow-md">
                      {cachedProfileImage ? (
                        <img src={cachedProfileImage} alt={me.fullName} className="h-full w-full object-cover" />
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
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">E-mail da conta</label>
                    <div className="relative">
                      <EnvelopeSimple size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={me?.email || ''}
                        readOnly
                        className="w-full cursor-not-allowed rounded-2xl border border-slate-100 bg-slate-100/80 py-3 pl-11 pr-4 text-sm font-bold text-slate-500 outline-none"
                      />
                    </div>
                    <p className="ml-2 text-[10px] font-semibold text-slate-400">Por segurança, a alteração de e-mail será liberada em fluxo validado.</p>
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

              {/* Seção 3: Segurança */}
              <section className="rounded-[2rem] bg-white p-5 border border-slate-100 shadow-sm space-y-4">
                <div className="space-y-4">
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
              </section>
            </>
          )}

          {settingsOnly ? (
          <section
            ref={settingsSectionRef}
            className={`relative overflow-hidden rounded-[2rem] border bg-white p-5 transition-all ${
              searchParams.get('section') === 'settings'
                ? 'border-sky-200 shadow-[0_22px_50px_-36px_rgba(47,157,247,0.42)] ring-2 ring-sky-100'
                : 'border-slate-100 shadow-sm'
            }`}
          >
            <div className="pointer-events-none absolute -right-12 -top-14 h-32 w-32 rounded-full bg-[#336886]/12 blur-3xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <ShieldCheck size={16} weight="duotone" className="text-[#336886]" />
                  Configurações
                </h3>
                <p className="mt-2 text-base font-black text-slate-900">Permissões do aplicativo</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                  Toque em gerenciar para abrir o controle do aparelho. O app consegue solicitar acesso, mas quem desliga a permissão é o sistema.
                </p>
              </div>
            </div>

            <div className="relative mt-5 grid gap-3">
              {biometricSupported ? (
                <div className={`flex flex-col gap-3 rounded-[1.45rem] border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
                  biometricEnabled ? 'bg-[#336886]/[0.07] border-[#336886]/15' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-[#336886] shadow-[0_10px_22px_-18px_rgba(15,23,42,0.28)]">
                      <ShieldCheck size={18} weight="duotone" className="text-[#336886]" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-black uppercase tracking-[0.14em] text-slate-800">Biometria</p>
                      <p className="mt-0.5 text-[10px] font-bold leading-tight text-slate-400">
                        Use digital, rosto ou bloqueio do aparelho para entrar mais rápido no app instalado.
                      </p>
                      {biometricMessage ? (
                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#336886]">
                          {biometricMessage}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-3">
                    <span className={`text-[10px] font-black uppercase tracking-[0.14em] ${
                      biometricEnabled ? 'text-emerald-700' : 'text-slate-500'
                    }`}>
                      {biometricEnabled ? 'Ativado' : 'Desativado'}
                    </span>
                    <Switch
                      checked={biometricEnabled}
                      onChange={handleToggleBiometricAccess}
                      disabled={biometricBusy}
                    />
                  </div>
                </div>
              ) : null}

              {[
                {
                  id: 'push',
                  label: 'Push',
                  description: 'Avisos de status e acompanhamento.',
                  state: pushEnabled
                    ? { label: 'Permitido', tone: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' }
                    : { label: 'Bloqueado', tone: 'text-slate-500', bg: 'bg-slate-50 border-slate-100' },
                  icon: <BellSimpleRinging size={18} weight="duotone" className="text-[#336886]" />,
                  checked: pushEnabled,
                  action: () => handlePermissionAction('push', pushEnabled),
                },
                {
                  id: 'photos',
                  label: 'Galeria',
                  description: 'Escolher uma imagem salva no celular.',
                  state: permissionMeta(photoPermission),
                  icon: <ImagesSquare size={18} weight="duotone" className="text-[#336886]" />,
                  checked: photoPermission === 'granted',
                  action: () => handlePermissionAction('photos', photoPermission === 'granted'),
                },
                {
                  id: 'camera',
                  label: 'Câmera',
                  description: 'Tirar uma nova foto pelo aplicativo.',
                  state: permissionMeta(cameraPermission),
                  icon: <Camera size={18} weight="duotone" className="text-[#336886]" />,
                  checked: cameraPermission === 'granted',
                  action: () => handlePermissionAction('camera', cameraPermission === 'granted'),
                },
              ].map((item) => (
                <div key={item.label} className={`flex flex-col gap-3 rounded-[1.45rem] border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between ${item.state.bg}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-[#336886] shadow-[0_10px_22px_-18px_rgba(15,23,42,0.28)]">
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-black uppercase tracking-[0.14em] text-slate-800">{item.label}</p>
                      <p className="mt-0.5 text-[10px] font-bold leading-tight text-slate-400">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-3">
                    <span className={`text-[10px] font-black uppercase tracking-[0.14em] ${item.state.tone}`}>
                      {item.state.label}
                    </span>
                    <Switch 
                      checked={item.checked} 
                      onChange={item.action}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
          ) : null}

          {!settingsOnly && (
            <section className="pt-4">
              <button
                onClick={() => setShowDeactivateModal(true)}
                className="group w-full overflow-hidden rounded-[1.6rem] border border-rose-200/80 bg-[linear-gradient(135deg,rgba(255,241,242,0.98)_0%,rgba(255,255,255,0.98)_100%)] px-4 py-4 text-left shadow-[0_18px_34px_-28px_rgba(225,29,72,0.35)] transition-all duration-200 hover:border-rose-300 hover:shadow-[0_22px_40px_-28px_rgba(225,29,72,0.42)] active:scale-[0.98]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-500">Zona crítica</p>
                    <p className="mt-1 text-sm font-black text-rose-700">Excluir minha conta permanentemente</p>
                    <p className="mt-1 text-[11px] font-semibold leading-4 text-rose-500/90">
                      Remove seu acesso e desativa seus dados pessoais.
                    </p>
                  </div>
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-white text-rose-600 shadow-[0_12px_24px_-18px_rgba(225,29,72,0.45)] transition-transform duration-200 group-hover:scale-105">
                    <Trash size={18} weight="bold" />
                  </div>
                </div>
              </button>
              <p className="mt-3 px-6 text-center text-[10px] font-bold text-slate-400">
                Ao excluir sua conta, todos os seus dados pessoais serão desativados de nossa base, conforme a LGPD.
              </p>
            </section>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        onConfirm={handleDeactivate}
        isLoading={deactivating}
        title="Excluir minha conta?"
        description="Esta ação é irreversível. Seus dados de perfil serão desativados e você será desconectado imediatamente."
        confirmLabel="Sim, excluir conta"
        cancelLabel="Não, manter conta"
        variant="danger"
      />
    </main>
  );
}
