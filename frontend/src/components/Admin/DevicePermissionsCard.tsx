import { useEffect, useState } from 'react';
import {
  BellSimpleRinging,
  Bluetooth,
  Camera,
  Fingerprint,
  Gear,
  ShieldCheck,
} from '@phosphor-icons/react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { App as CapacitorApp } from '@capacitor/app';
import { Camera as CapCamera } from '@capacitor/camera';
import { useToast } from '../../contexts/ToastContext';
import { nativeBiometricService } from '../../services/nativeBiometricService';
import { storePushService } from '../../services/storePushService';
import { requestNativeBluetoothPermission } from '../../utils/thermalPrinter';

export type PermissionRole = 'admin' | 'customer';

interface DevicePermissionsCardProps {
  role: PermissionRole;
  session: any;
  onOpenMfa?: () => void;
}

type PermissionStatus = 'granted' | 'denied' | 'unknown';

function permissionMeta(status: PermissionStatus) {
  switch (status) {
    case 'granted':
      return { label: 'Permitido', tone: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' };
    case 'denied':
      return { label: 'Bloqueado', tone: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' };
    default:
      return { label: 'Não verificado', tone: 'text-slate-500', bg: 'bg-[#E2EBF2] border-slate-100' };
  }
}

function SwitchToggle({ checked, onToggle, disabled }: { checked: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-emerald-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
        style={{ width: 22, height: 22 }}
      />
    </button>
  );
}

export function DevicePermissionsCard({ role, session, onOpenMfa }: DevicePermissionsCardProps) {
  const { showToast } = useToast();
  const isNative = Capacitor.isNativePlatform();

  const [pushEnabled, setPushEnabled] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<PermissionStatus>('unknown');
  const [bluetoothPermission, setBluetoothPermission] = useState<PermissionStatus>('unknown');
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  const refreshPermissions = async () => {
    if (!isNative) return;

    try {
      if (Capacitor.isPluginAvailable('PushNotifications')) {
        const status = await PushNotifications.checkPermissions();
        setPushEnabled(status.receive === 'granted');
      }
    } catch {
      setPushEnabled(false);
    }

    try {
      if (Capacitor.isPluginAvailable('Camera')) {
        const status = await CapCamera.checkPermissions();
        const camera = status?.camera;
        setCameraPermission(
          camera === 'granted' ? 'granted' : camera === 'denied' ? 'denied' : 'unknown',
        );
      }
    } catch {
      setCameraPermission('unknown');
    }
  };

  useEffect(() => {
    if (!isNative) return;
    void refreshPermissions();

    setBiometricSupported(nativeBiometricService.isSupported());
    if (role === 'admin') {
      setBiometricEnabled(nativeBiometricService.hasValidStoredAdminEnrollment());
    } else {
      try {
        setBiometricEnabled(nativeBiometricService.isCustomerEnrollmentForSession(session));
      } catch {
        setBiometricEnabled(false);
      }
    }
  }, [isNative, role, session]);

  const openAppSettings = async () => {
    try {
      const openSettings = (CapacitorApp as any)?.openSettings;
      if (typeof openSettings === 'function') {
        await openSettings();
      }
    } catch {
      showToast('Não foi possível abrir as configurações do app.', 'error');
    }
    setTimeout(() => void refreshPermissions(), 800);
  };

  const handlePermissionAction = async (type: 'push' | 'camera', isGranted: boolean) => {
    if (!isNative) {
      showToast('Permissões só podem ser alteradas no aplicativo para celular.', 'info');
      return;
    }

    // Desligar — só abre settings do sistema
    if (isGranted) {
      if (type === 'push') {
        try {
          const token = String(localStorage.getItem('jnk_mobile_push_token') || '').trim();
          if (token && role === 'admin' && session?.store?.id) {
            await storePushService.unregisterPushToken(session.store.id, { token });
          }
          localStorage.removeItem('jnk_mobile_push_token');
        } catch (e) {
          console.error('[permissions] erro ao desativar push:', e);
        }
      }

      showToast(
        `Para desativar a ${type === 'push' ? 'notificação' : 'câmera'}, desmarque nas configurações do sistema.`,
        'info',
      );
      setTimeout(() => void openAppSettings(), 1500);
      return;
    }

    // Ligar — pede permissão
    try {
      if (type === 'push' && Capacitor.isPluginAvailable('PushNotifications')) {
        const requested = await PushNotifications.requestPermissions();
        if (requested.receive === 'granted') {
          await PushNotifications.register();
        } else {
          await openAppSettings();
        }
      } else if (type === 'camera' && Capacitor.isPluginAvailable('Camera')) {
        const requested = await CapCamera.requestPermissions({ permissions: ['camera'] });
        if (requested.camera !== 'granted') {
          await openAppSettings();
        }
      }
    } catch (err) {
      console.error('[permissions] erro ao solicitar permissão:', err);
      await openAppSettings();
    }

    setTimeout(() => void refreshPermissions(), 1000);
  };

  const handleBluetoothPermission = async () => {
    if (!isNative) return;

    try {
      const result = await requestNativeBluetoothPermission();
      if (result.granted) {
        setBluetoothPermission('granted');
        showToast('Permissão Bluetooth concedida!', 'success');
      } else {
        setBluetoothPermission('denied');
        showToast('Permita dispositivos próximos nas configurações do app.', 'warning');
      }
    } catch {
      setBluetoothPermission('denied');
      showToast('Não foi possível solicitar permissão Bluetooth.', 'error');
    }
  };

  const handleToggleBiometric = async () => {
    if (!isNative || biometricBusy) return;
    setBiometricBusy(true);

    try {
      if (biometricEnabled) {
        if (role === 'admin') {
          nativeBiometricService.disableAdmin();
        } else {
          nativeBiometricService.disableCustomer();
        }
        setBiometricEnabled(false);
        showToast('Biometria desativada para este perfil.', 'info');
      } else {
        if (role === 'admin') {
          await nativeBiometricService.enableAdmin(session);
        } else {
          await nativeBiometricService.enableCustomer(session);
        }
        setBiometricEnabled(true);
        showToast('Biometria ativada! Agora você pode entrar com digital/face.', 'success');
      }
    } catch (err: any) {
      console.warn('[permissions] biometric error:', err);
      showToast(err?.message || 'Não foi possível configurar a biometria.', 'error');
    } finally {
      setBiometricBusy(false);
    }
  };

  // --- Web fallback ---
  if (!isNative) {
    return (
      <section
        role="region"
        aria-label="Permissões do dispositivo"
        data-testid="device-permissions-card"
        className="rounded-2xl border border-slate-200 border-l-4 border-l-[#336886] bg-white p-5 shadow-[0_22px_55px_-38px_rgba(15,23,42,0.45)]"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#336886]/10 text-[#336886] ring-1 ring-[#336886]/15">
            <ShieldCheck size={22} weight="duotone" />
          </span>
          <div>
            <h3 className="text-lg font-black text-slate-900">Permissões do dispositivo</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Abra esta tela pelo app Android para gerenciar câmera, notificações, biometria e Bluetooth. No navegador web, essas permissões não se aplicam.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const permissionRows = [
    ...(biometricSupported
      ? [
          {
            id: 'biometric',
            label: 'Biometria',
            description: 'Entrar com digital ou reconhecimento facial.',
            status: biometricEnabled ? 'granted' : ('denied' as PermissionStatus),
            icon: <Fingerprint size={18} weight="duotone" className="text-[#336886]" />,
            checked: biometricEnabled,
            action: handleToggleBiometric,
            busy: biometricBusy,
          },
        ]
      : []),
    {
      id: 'push',
      label: 'Notificações push',
      description: 'Avisos de pedidos, status e novidades.',
      status: (pushEnabled ? 'granted' : 'denied') as PermissionStatus,
      icon: <BellSimpleRinging size={18} weight="duotone" className="text-[#336886]" />,
      checked: pushEnabled,
      action: () => handlePermissionAction('push', pushEnabled),
    },
    {
      id: 'camera',
      label: 'Câmera',
      description: 'Tirar foto de perfil e enviar imagens.',
      status: cameraPermission,
      icon: <Camera size={18} weight="duotone" className="text-[#336886]" />,
      checked: cameraPermission === 'granted',
      action: () => handlePermissionAction('camera', cameraPermission === 'granted'),
    },
    {
      id: 'bluetooth',
      label: 'Bluetooth',
      description: 'Conectar impressora térmica e acessórios.',
      status: bluetoothPermission,
      icon: <Bluetooth size={18} weight="duotone" className="text-[#336886]" />,
      checked: bluetoothPermission === 'granted',
      action: () => {
        if (bluetoothPermission === 'granted') {
          void openAppSettings();
        } else {
          void handleBluetoothPermission();
        }
      },
    },
  ];

  return (
    <section
      role="region"
      aria-label="Permissões do dispositivo"
      data-testid="device-permissions-card"
      className="rounded-2xl border border-slate-200 border-l-4 border-l-[#336886] bg-white p-5 shadow-[0_22px_55px_-38px_rgba(15,23,42,0.45)]"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#336886]/10 text-[#336886] ring-1 ring-[#336886]/15">
          <ShieldCheck size={22} weight="duotone" />
        </span>
        <div>
          <h3 className="text-lg font-black text-slate-900">Permissões do dispositivo</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Gerencie o acesso do app a câmera, notificações, biometria e Bluetooth.
          </p>
        </div>
      </div>

      {/* Permission rows */}
      <div className="mt-5 grid gap-2.5">
        {permissionRows.map((item) => {
          const meta = permissionMeta(item.status);
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-2xl border p-3.5 transition ${meta.bg}`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-slate-900">{item.label}</span>
                <span className="block text-xs font-medium text-slate-500">{item.description}</span>
                <span className={`mt-0.5 block text-[10px] font-bold ${meta.tone}`}>{meta.label}</span>
              </span>
              <SwitchToggle
                checked={item.checked}
                onToggle={item.action}
                disabled={'busy' in item && item.busy}
              />
            </div>
          );
        })}
      </div>

      {/* MFA link */}
      {onOpenMfa && (
        <button
          type="button"
          onClick={onOpenMfa}
          className="mt-4 w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} weight="duotone" className="text-[#336886]" />
            <div className="flex-1">
              <span className="block text-sm font-black text-slate-900">Autenticação em dois fatores (MFA)</span>
              <span className="block text-xs font-medium text-slate-500">
                Proteja sua conta com verificação extra.
              </span>
            </div>
            <span className="text-xs font-bold text-[#336886]">Configurar</span>
          </div>
        </button>
      )}

      {/* Open system settings */}
      <button
        type="button"
        onClick={() => void openAppSettings()}
        className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
      >
        <Gear size={14} weight="duotone" /> Configurações do app
      </button>
    </section>
  );
}
