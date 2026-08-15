// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
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
  CheckCircle,
  XCircle,
  BellSimpleRinging,
  Trash
} from '@phosphor-icons/react';
import { customerAccountService } from '../services/customerAccountService';
import { formatCurrency, formatDate, formatOrderDisplayId, formatPhoneInput } from '../utils/format';
import { useCachedCustomerProfileImage } from '../hooks/useCachedCustomerProfileImage';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { App as CapacitorApp } from '@capacitor/app';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { nativeBiometricService } from '../services/nativeBiometricService';
import { AppGlassHeader } from '../components/common/AppGlassHeader';
import { AppRobotLoader } from '../components/common/AppRobotLoader';
import { AccountMfaPanel } from '../components/Auth/AccountMfaPanel';
import { authService } from '../services/authService';
import { forgetTrustedMfaDevice } from '../utils/mfaDevice';
import { inputAssistProps } from '../utils/inputAssist';

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

const getBrazilNationalPhoneDigits = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) return digits.slice(2, 13);
  return digits.slice(0, 11);
};

const formatBrazilPhoneDraft = (value = '') => formatPhoneInput(getBrazilNationalPhoneDigits(value));

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
  const [profileEditing, setProfileEditing] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'unknown'>('unknown');
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState('');
  const [mfaPanelOpen, setMfaPanelOpen] = useState(false);
  const [mfaPanelIntent, setMfaPanelIntent] = useState<'overview' | 'setup' | 'disable'>('overview');
  const [mfaStatus, setMfaStatus] = useState<any | null>(null);
  const [mfaStatusLoading, setMfaStatusLoading] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const settingsSectionRef = useRef<HTMLElement | null>(null);
  const settingsOnly = searchParams.get('section') === 'settings';
  const cachedProfileImage = useCachedCustomerProfileImage(me?.profileImageUrl, me?.profileImageVersion);
  const canUseNativeProfilePhotoPicker = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Camera');

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
      if (nativeBiometricService.isCustomerEnrollmentForSession(parsed)) {
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
        setPhoneDraft(formatBrazilPhoneDraft(meData?.phone || ''));
        setAddresses(Array.isArray(addressesData) ? addressesData : []);
        // /customer/orders devolve wrapper { data: [...] } — sem o unwrap a Conta
        // mostrava "0 pedidos salvos" com pedidos existentes (auditoria UX 15/08).
        setOrders(
          Array.isArray(ordersData)
            ? ordersData
            : Array.isArray(ordersData?.data)
              ? ordersData.data
              : []
        );

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
        const cameraStatus = status?.camera === 'granted' ? 'granted' : status?.camera === 'denied' ? 'denied' : 'unknown';
        setCameraPermission(cameraStatus);
      } else {
        setCameraPermission('unknown');
      }
    } catch {
      setCameraPermission('unknown');
    }
  };

  useEffect(() => {
    void refreshNativePermissions();
  }, []);

  useEffect(() => {
    setBiometricSupported(nativeBiometricService.isSupported());
    try {
      const raw = localStorage.getItem('customerSession');
      const session = raw ? JSON.parse(raw) : null;
      setBiometricEnabled(nativeBiometricService.isCustomerEnrollmentForSession(session));
    } catch {
      setBiometricEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (searchParams.get('section') !== 'settings') return;
    window.setTimeout(() => {
      settingsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }, [loading, searchParams]);

  useEffect(() => {
    if (loading || !settingsOnly) return;
    let mounted = true;
    setMfaStatusLoading(true);
    authService
      .getMfaStatus({ authMode: 'customer' })
      .then((nextStatus) => {
        if (!mounted) return;
        setMfaStatus(nextStatus || null);
      })
      .catch(() => {
        if (!mounted) return;
        setMfaStatus(null);
      })
      .finally(() => {
        if (!mounted) return;
        setMfaStatusLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [loading, settingsOnly]);

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
        forgetTrustedMfaDevice();
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
      setBiometricMessage('Biometria ativada para esta conta neste aparelho.');
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
        phone: getBrazilNationalPhoneDigits(phoneDraft),
      });
      setMe(updated || null);
      syncCustomerSession(updated || null);
      setProfileMessage('Perfil atualizado com sucesso.');
      setProfileEditing(false);
    } catch (e: any) {
      setProfileMessage(e?.message || 'Erro ao salvar perfil.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCancelProfileEdit = () => {
    setNameDraft(String(me?.fullName || ''));
    setPhoneDraft(formatBrazilPhoneDraft(me?.phone || ''));
    setProfileMessage('');
    setProfileEditing(false);
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
      reader.readAsDataURL(file);
    });

  const compressImageFileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      if (!String(file.type || '').startsWith('image/')) {
        reject(new Error('Selecione uma imagem válida.'));
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        try {
          const maxEdge = 1280;
          const width = image.naturalWidth || image.width || maxEdge;
          const height = image.naturalHeight || image.height || maxEdge;
          const scale = Math.min(1, maxEdge / Math.max(width, height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(width * scale));
          canvas.height = Math.max(1, Math.round(height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Não foi possível preparar a imagem.');
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
          if (!dataUrl || dataUrl.length > 9_500_000) {
            throw new Error('A imagem selecionada é muito grande. Escolha uma foto menor.');
          }
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Não foi possível abrir essa imagem. Tente outra foto da galeria.'));
      };
      image.src = objectUrl;
    });

  const updateProfileImageFromDataUrl = async (dataUrl: string) => {
    if (!dataUrl || profileSaving) return;
    setProfileSaving(true);
    setProfileMessage('');
    try {
      const updated = await customerAccountService.updateMe({ profileImageFile: dataUrl });
      setMe(updated || null);
      syncCustomerSession(updated || null, { bustProfileImage: true });
      setProfileMessage('Foto atualizada!');
    } catch (e: any) {
      setProfileMessage(e?.message || 'Não foi possível atualizar a foto.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfileImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (!String(file.type || '').startsWith('image/')) {
        throw new Error('Selecione uma imagem válida.');
      }
      setProfileMessage('Preparando foto...');
      let dataUrl = '';
      try {
        dataUrl = await compressImageFileToDataUrl(file);
      } catch {
        dataUrl = await readFileAsDataUrl(file);
        if (dataUrl.length > 9_500_000) {
          throw new Error('A imagem selecionada é muito grande. Escolha uma foto menor.');
        }
      }
      await updateProfileImageFromDataUrl(dataUrl);
    } catch (e: any) {
      setProfileMessage(e?.message || 'Não foi possível abrir a imagem selecionada.');
    }
  };

  const openProfileImagePicker = () => {
    setProfileMessage('');
    void pickProfileImageNative();
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
        await updateProfileImageFromDataUrl(dataUrl);
        void refreshNativePermissions();
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
      bg: 'bg-[#E2EBF2] border-slate-100',
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

  const handlePermissionAction = async (type: 'push' | 'camera', isGranted: boolean) => {
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
      setProfileMessage(`Para desativar a ${type === 'push' ? 'notificação' : 'câmera'}, você deve desmarcá-la nas configurações do sistema que vamos abrir agora.`);
      
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
      } else if (type === 'camera' && Capacitor.isPluginAvailable('Camera')) {
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
      forgetTrustedMfaDevice();
      setShowDeactivateModal(false);
      logout();
    } catch (e: any) {
      alert(e?.message || 'Falha ao desativar conta.');
    } finally {
      setDeactivating(false);
    }
  };

  const primaryAddress = addresses.find((address) => address?.isDefault) || addresses[0] || null;
  const primaryAddressLine = primaryAddress
    ? [
        primaryAddress.street,
        primaryAddress.number ? `, ${primaryAddress.number}` : '',
        primaryAddress.complement ? ` • ${primaryAddress.complement}` : '',
      ].join('')
    : '';
  const primaryAddressMeta = primaryAddress
    ? [
        primaryAddress.neighborhood,
        primaryAddress.city && primaryAddress.state ? `${primaryAddress.city}/${primaryAddress.state}` : '',
        primaryAddress.cep ? `CEP ${String(primaryAddress.cep).replace(/^(\d{5})(\d{3})$/, '$1-$2')}` : '',
      ]
        .filter(Boolean)
        .join(' • ')
    : '';
  const normalizedPhoneLabel = String(formatBrazilPhoneDraft(phoneDraft || me?.phone || '') || '').trim();
  const memberSinceLabel = me?.createdAt ? formatDate(me.createdAt) : '';
  const mfaFeatureDisabled = mfaStatus?.featureEnabled === false;
  const mfaEnabled = Boolean(mfaStatus?.enabled);
  const mfaStatusLabel = mfaStatusLoading
    ? 'Verificando'
    : mfaFeatureDisabled
      ? 'Indisponível'
      : mfaEnabled
        ? 'Ativado'
        : 'Desativado';
  const mfaStatusTone = mfaStatusLoading
    ? 'border-slate-200 bg-white/80 text-slate-500'
    : mfaFeatureDisabled
      ? 'border-slate-200 bg-slate-100 text-slate-500'
      : mfaEnabled
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-[#BFDDEB] bg-white/80 text-[#153A4C]';
  const mfaCardTone = mfaEnabled
    ? 'border-emerald-100 bg-[linear-gradient(135deg,rgba(236,253,245,0.86),rgba(255,255,255,0.97))]'
    : mfaFeatureDisabled
      ? 'border-slate-100 bg-slate-50'
      : 'border-[#D8EAF2] bg-[linear-gradient(135deg,rgba(234,246,251,0.88),rgba(255,255,255,0.98))]';
  const mfaDescription = mfaEnabled
    ? 'Proteção ativa para novos aparelhos. Toque para ver aparelhos confiáveis e opções de segurança.'
    : mfaFeatureDisabled
      ? 'A equipe Já no Caminho ainda não liberou essa proteção para sua conta.'
      : 'Ative um código no app autenticador e proteja seu login em aparelhos novos.';
  const openMfaFromSettings = () => {
    if (mfaStatusLoading || mfaFeatureDisabled) return;
    setMfaPanelIntent(mfaEnabled ? 'overview' : 'setup');
    setMfaPanelOpen(true);
  };
  const accountOverviewCards = [
    {
      id: 'orders',
      label: 'Pedidos',
      value: String(orders.length),
      helper: orders.length === 1 ? 'pedido no histórico' : 'pedidos no histórico',
      icon: Package,
      iconTone: 'bg-sky-50 text-sky-700',
      onClick: () => navigate('/cliente/pedidos'),
    },
    {
      id: 'addresses',
      label: 'Endereços',
      value: String(addresses.length),
      helper: addresses.length ? 'base de entrega pronta' : 'cadastre seu principal',
      icon: MapPinLine,
      iconTone: 'bg-emerald-50 text-emerald-700',
      onClick: () => navigate('/cliente/enderecos'),
    },
    {
      id: 'access',
      label: 'Acesso',
      value: biometricEnabled || pushEnabled ? 'Pronto' : 'Ajustar',
      helper: biometricEnabled ? 'biometria ativa no aparelho' : 'push, câmera e biometria',
      icon: ShieldCheck,
      iconTone: 'bg-indigo-50 text-indigo-700',
      onClick: () => navigate('/cliente/conta?section=settings'),
    },
  ];
  const quickAccountActions = [
    {
      id: 'orders',
      label: 'Meus pedidos',
      helper: orders.length === 1 ? '1 pedido salvo' : `${orders.length} pedidos salvos`,
      icon: Package,
      iconTone: 'bg-sky-50 text-sky-700',
      onClick: () => navigate('/cliente/pedidos'),
    },
    {
      id: 'addresses',
      label: 'Meus endereços',
      helper: addresses.length ? `${addresses.length} endereço${addresses.length === 1 ? '' : 's'}` : 'Cadastre seu principal',
      icon: MapPinLine,
      iconTone: 'bg-emerald-50 text-emerald-700',
      onClick: () => navigate('/cliente/enderecos'),
    },
  ];

  if (loading) {
    return (
      <AppRobotLoader
        fullScreen
        title="Abrindo sua conta"
        subtitle="Carregando perfil, endereços e preferências com segurança."
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#E2EBF2] pb-12 pt-[calc(env(safe-area-inset-top)+4.35rem)]">
      <div className="pointer-events-none fixed top-[-12%] right-[-8%] h-[40%] w-[48%] rounded-full bg-[#153A4C]/12 blur-[120px] -z-10" />
      <div className="pointer-events-none fixed bottom-[5%] left-[-6%] h-[24%] w-[32%] rounded-full bg-[#336886]/7 blur-[100px] -z-10" />
      <div className="mx-auto max-w-2xl">
        <AppGlassHeader
          title={settingsOnly ? 'Configurações' : 'Minha Conta'}
          eyebrow={settingsOnly ? 'Preferências' : 'Área do cliente'}
          subtitle={settingsOnly ? 'Privacidade, segurança e preferências' : 'Perfil, pedidos e endereços'}
          backTo={settingsOnly ? '/cliente/conta' : '/hub'}
          onBack={() => navigate(settingsOnly ? '/cliente/conta' : '/hub')}
          right={(
            <button
              onClick={logout}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-100 bg-rose-50/95 text-rose-500 shadow-sm transition-all active:scale-95"
              title="Sair"
            >
              <SignOut size={17} weight="duotone" />
            </button>
          )}
        />

        <div className="px-4 py-6 space-y-6">
          {!settingsOnly && (
            <>
              {/* Seção 1: Avatar e Dados Básicos */}
              <section className="relative overflow-hidden rounded-[2.45rem] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(244,248,252,0.96)_56%,rgba(255,255,255,0.94)_100%)] p-5 shadow-[0_26px_60px_-42px_rgba(15,23,42,0.28)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(51,104,134,0.16),transparent_72%)]" />
                <div className="relative flex flex-col items-center text-center space-y-4">
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
                    {canUseNativeProfilePhotoPicker ? (
                      <button 
                        onClick={openProfileImagePicker}
                        disabled={profileSaving}
                        className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg active:scale-90 transition-transform disabled:opacity-60"
                        aria-label="Trocar foto de perfil"
                      >
                        <Camera size={16} weight="fill" />
                      </button>
                    ) : (
                      <label
                        className={`absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-white shadow-lg active:scale-90 transition-transform ${
                          profileSaving ? 'opacity-60' : 'cursor-pointer'
                        }`}
                        aria-label="Trocar foto de perfil"
                      >
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
                          onChange={handleProfileImageFileChange}
                          disabled={profileSaving}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                        <Camera size={16} weight="fill" />
                      </label>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{me?.fullName || 'Usuário'}</h2>
                    <p className="text-sm font-bold text-slate-400">{me?.email}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      {normalizedPhoneLabel ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                          <Phone size={11} weight="duotone" />
                          <span className="tracking-normal">🇧🇷 +55</span>
                          {normalizedPhoneLabel}
                        </span>
                      ) : null}
                      {memberSinceLabel ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                          <Package size={11} weight="duotone" />
                          Desde {memberSinceLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="relative mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMessage('');
                      setProfileEditing(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#bfd6e4] bg-white/80 px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-[#153A4C] shadow-[0_12px_28px_-24px_rgba(15,23,42,0.35)] transition hover:bg-white active:scale-[0.98]"
                  >
                    <UserCircle size={15} weight="duotone" />
                    Editar perfil
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/cliente/conta?section=settings')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/55 px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600 transition hover:bg-white active:scale-[0.98]"
                  >
                    <ShieldCheck size={15} weight="duotone" />
                    Segurança
                  </button>
                </div>

                {profileMessage && !profileEditing ? (
                  <p className="relative mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-center text-[11px] font-bold text-emerald-700">
                    {profileMessage}
                  </p>
                ) : null}

                <div className="relative mt-6 grid grid-cols-2 gap-3">
                  {quickAccountActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={action.onClick}
                        className="group relative flex min-h-[6.25rem] flex-col items-start justify-between rounded-[1.65rem] bg-white/88 p-4 text-left shadow-[0_18px_38px_-30px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 transition hover:bg-white active:scale-[0.99]"
                      >
                        <span className={`grid h-10 w-10 place-items-center rounded-2xl ${action.iconTone}`}>
                          <Icon size={18} weight="duotone" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-black text-slate-900">{action.label}</span>
                          <span className="mt-1 block text-[10px] font-bold leading-tight text-slate-500">{action.helper}</span>
                        </span>
                        <CaretRight size={14} weight="bold" className="absolute right-4 top-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                      </button>
                    );
                  })}
                </div>

                {profileEditing ? (
                  <div className="relative mt-7 space-y-3 rounded-[1.8rem] border border-slate-200/80 bg-white/82 p-4 shadow-[0_18px_38px_-32px_rgba(15,23,42,0.24)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Editar perfil</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Altere apenas nome e telefone quando precisar.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelProfileEdit}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 active:scale-95"
                      >
                        Fechar
                      </button>
                    </div>

                    <div className="grid gap-2">
                      <label className="ml-1 text-xs font-semibold text-slate-500">Nome</label>
                      <div className="relative">
                        <UserCircle size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          {...inputAssistProps.name}
                          value={nameDraft}
                          onChange={e => setNameDraft(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition focus:border-[#bfd6e4] focus:bg-white focus:ring-2 focus:ring-[#336886]/10"
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="ml-1 text-xs font-semibold text-slate-500">E-mail</label>
                      <div className="relative">
                        <EnvelopeSimple size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          value={me?.email || ''}
                          readOnly
                          className="w-full cursor-not-allowed rounded-2xl border border-slate-100 bg-slate-100/80 py-3 pl-11 pr-4 text-sm font-bold text-slate-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <label className="ml-1 text-xs font-semibold text-slate-500">Telefone</label>
                      <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 transition focus-within:border-[#bfd6e4] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#336886]/10">
                        <span className="ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-600 shadow-sm">
                          <Phone size={14} weight="duotone" className="text-slate-400" />
                          🇧🇷 +55
                        </span>
                        <input
                          {...inputAssistProps.phoneNational}
                          value={phoneDraft}
                          onChange={e => setPhoneDraft(formatBrazilPhoneDraft(e.target.value))}
                          placeholder="(12) 99999-9999"
                          className="min-w-0 flex-1 bg-transparent py-3 pl-3 pr-4 outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                    <button
                      onClick={handleSaveProfile}
                      disabled={profileSaving}
                      className="w-full rounded-2xl bg-slate-900 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {profileSaving ? 'Salvando...' : 'Salvar alterações'}
                    </button>
                    {profileMessage ? (
                      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-center text-[11px] font-bold text-emerald-700">{profileMessage}</p>
                    ) : null}
                  </div>
                ) : null}
              </section>

              {/* Seção 2: Endereços */}
              <section className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <MapPinLine size={16} weight="duotone" className="text-sky-500" />
                      Meus Endereços
                    </h3>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                      {addresses.length}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/cliente/enderecos?mode=new')}
                    className="flex items-center gap-1.5 rounded-xl bg-sky-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-sky-700 active:scale-95"
                  >
                    <Plus size={12} weight="bold" />
                    Novo
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/cliente/enderecos')}
                  className="group w-full rounded-[2rem] border border-slate-100 bg-white p-5 text-left shadow-sm transition-all active:scale-[0.99]"
                >
                  {primaryAddress ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="grid h-12 w-12 place-items-center rounded-[1.35rem] bg-emerald-50 text-emerald-600">
                            <MapPinLine size={22} weight="duotone" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-black text-slate-900">{primaryAddress.label || 'Endereço principal'}</p>
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-700">
                                <CheckCircle size={11} weight="fill" />
                                Principal
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-bold leading-5 text-slate-700">{primaryAddressLine}</p>
                            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{primaryAddressMeta}</p>
                          </div>
                        </div>
                        <CaretRight size={16} className="mt-1 text-slate-300 transition-colors group-hover:text-slate-500" />
                      </div>

                      <div className="flex items-center justify-end mt-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                          Ver todos <CaretRight size={11} weight="bold" />
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-4 text-left">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Entrega</p>
                      <p className="mt-2 text-sm font-black text-slate-900">Você ainda não tem endereço salvo</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                        Cadastre seu primeiro endereço para agilizar a entrega e deixar um principal definido.
                      </p>
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700">
                        <Plus size={12} weight="bold" />
                        Abrir meus endereços
                      </div>
                    </div>
                  )}
                </button>
              </section>

              {/* Seção 3: Segurança */}
              <section className="space-y-4 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                <div>
                  <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <ShieldCheck size={16} weight="duotone" className="text-indigo-500" />
                    Segurança
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Senha, MFA e permissões do aplicativo.</p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/cliente/conta?section=settings')}
                  className="group flex w-full items-center justify-between gap-3 rounded-[1.45rem] bg-white px-1 py-1 text-left transition active:scale-[0.99]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#edf5fa] text-[#336886]">
                      <ShieldCheck size={18} weight="duotone" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-slate-900">Configurações de acesso</span>
                      <span className="mt-0.5 block text-xs font-semibold leading-tight text-slate-500">MFA, biometria, câmera e notificações.</span>
                    </span>
                  </span>
                  <CaretRight size={16} weight="bold" className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </button>

                <div className="relative overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(145deg,#f8fafc_0%,#ffffff_100%)] p-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.34)]">
                  <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-[#336886]/8 blur-3xl" />
                  <div className="relative mb-3 flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-900 text-white shadow-[0_14px_28px_-22px_rgba(15,23,42,0.7)]">
                      <ShieldCheck size={17} weight="duotone" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Trocar senha</p>
                      <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">
                        Digite sua senha atual para confirmar a troca.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <input
                      {...inputAssistProps.currentPassword}
                      type="password"
                      placeholder="Senha atual"
                      value={pwdForm.currentPassword}
                      onChange={e => setPwdForm(p => ({...p, currentPassword: e.target.value}))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-bold text-slate-700 outline-none transition focus:border-[#bfd6e4] focus:ring-2 focus:ring-[#336886]/10"
                    />
                    <input
                      {...inputAssistProps.newPassword}
                      type="password"
                      placeholder="Nova senha"
                      value={pwdForm.newPassword}
                      onChange={e => setPwdForm(p => ({...p, newPassword: e.target.value}))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-bold text-slate-700 outline-none transition focus:border-[#bfd6e4] focus:ring-2 focus:ring-[#336886]/10"
                    />
                    <button
                      onClick={handleChangePassword}
                      disabled={pwdLoading}
                      className="w-full rounded-2xl border border-[#bfd6e4] bg-white py-3 text-[10px] font-black uppercase tracking-widest text-[#153A4C] transition-all active:scale-95 disabled:opacity-50"
                    >
                      {pwdLoading ? 'Atualizando...' : 'Trocar senha'}
                    </button>
                    {pwdMessage ? (
                      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-center text-[11px] font-bold text-emerald-700">
                        {pwdMessage}
                      </p>
                    ) : null}
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
                  Gerencie permissões e acessos do app.
                </p>
              </div>
            </div>

            <div className="relative mt-5 grid gap-3">
              <button
                type="button"
                onClick={openMfaFromSettings}
                disabled={mfaStatusLoading || mfaFeatureDisabled}
                className={`group flex w-full flex-col gap-3 rounded-[1.45rem] border px-4 py-3.5 text-left shadow-[0_18px_42px_-34px_rgba(15,23,42,0.42)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-80 sm:flex-row sm:items-center sm:justify-between ${mfaCardTone}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#336886] shadow-[0_12px_28px_-20px_rgba(15,23,42,0.34)]">
                    <ShieldCheck size={18} weight="duotone" className="text-[#336886]" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[12px] font-black uppercase tracking-[0.14em] text-slate-800">Segurança da conta</p>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${mfaStatusTone}`}>
                        {mfaStatusLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] font-bold leading-snug text-slate-500">
                      {mfaDescription}
                    </p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-[#153A4C] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_16px_32px_-24px_rgba(21,58,76,0.75)] transition group-disabled:bg-slate-300 group-disabled:text-slate-600">
                  {mfaStatusLoading ? 'Aguarde' : mfaEnabled ? 'Gerenciar' : 'Ativar'}
                  {!mfaStatusLoading && !mfaFeatureDisabled ? <CaretRight size={12} weight="bold" /> : null}
                </span>
              </button>

              {biometricSupported ? (
                <div className={`flex flex-col gap-3 rounded-[1.45rem] border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
                  biometricEnabled ? 'bg-[#336886]/[0.07] border-[#336886]/15' : 'bg-[#E2EBF2] border-slate-100'
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
                    : { label: 'Bloqueado', tone: 'text-slate-500', bg: 'bg-[#E2EBF2] border-slate-100' },
                  icon: <BellSimpleRinging size={18} weight="duotone" className="text-[#336886]" />,
                  checked: pushEnabled,
                  action: () => handlePermissionAction('push', pushEnabled),
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
            <section className="mt-8 space-y-3 border-t border-slate-200/70 pt-6">
              <button
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-600 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.3)] transition active:scale-[0.98] hover:border-[#336886]/25 hover:text-[#336886]"
              >
                Sair da conta
              </button>
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-300">Zona de risco</p>
                <button
                  onClick={() => setShowDeactivateModal(true)}
                  className="text-xs font-black text-rose-500 transition-colors hover:text-rose-600 active:scale-95"
                >
                  Excluir minha conta
                </button>
              </div>
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
      <AccountMfaPanel
        open={mfaPanelOpen}
        authMode="customer"
        initialIntent={mfaPanelIntent}
        onStatusChange={setMfaStatus}
        onClose={() => setMfaPanelOpen(false)}
      />
    </main>
  );
}
