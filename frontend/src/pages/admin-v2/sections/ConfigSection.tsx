// Configurações da loja V2 — arquétipo "vertical rail settings". Reusa os
// cards funcionais da V1 (BrandingSettings, OrderType, OpeningHours,
// ThermalPrinter, DevicePermissions) com o MESMO fluxo de save do dashboard
// (payload completo de handleSaveBranding). O rascunho é replicado aqui para
// não tocar no AdminDashboard — unificar depois num hook compartilhado.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChatCircle,
  Clock,
  DeviceMobile,
  ForkKnife,
  Gear,
  IdentificationCard,
  Printer,
  Truck,
} from '@phosphor-icons/react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { storeService } from '../../../services/storeService';
import { nativeBiometricService } from '../../../services/nativeBiometricService';
import { resolveAssetUrl } from '../../../utils/resolveAssetUrl';
import { BrandingSettings } from '../../../components/Admin/BrandingSettings';
import { OrderTypeSettingsCard } from '../../../components/Admin/OrderTypeSettingsCard';
import { OpeningHoursCard } from '../../../components/Admin/OpeningHoursCard';
import { ThermalPrinterSettingsCard } from '../../../components/Admin/ThermalPrinterSettingsCard';
import { DevicePermissionsCard } from '../../../components/Admin/DevicePermissionsCard';
import { AccountMfaPanel } from '../../../components/Auth/AccountMfaPanel';
import { Badge } from '../../../components/reui/badge';
import { Button } from '../../../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { cn } from '@/lib/utils';
import { ADMIN_V2_BASE } from '../../../navigation/adminV2Routes';

type ConfigSectionId =
  | 'hub'
  | 'perfil'
  | 'canais'
  | 'entrega'
  | 'tipos-de-pedido'
  | 'horarios'
  | 'impressora'
  | 'dispositivo';

const SECTIONS: Array<{ id: ConfigSectionId; label: string; icon: any; description: string }> = [
  { id: 'hub', label: 'Visão geral', icon: Gear, description: 'Todas as configurações da loja em um lugar.' },
  { id: 'perfil', label: 'Perfil e marca', icon: IdentificationCard, description: 'Nome, logo, banner, cores e endereço.' },
  { id: 'canais', label: 'Promo e contato', icon: ChatCircle, description: 'Mensagem promocional, Pix, contatos e Instagram.' },
  { id: 'entrega', label: 'Entrega e frete', icon: Truck, description: 'Raio, taxa de entrega e preparo.' },
  { id: 'tipos-de-pedido', label: 'Tipos de pedido', icon: ForkKnife, description: 'Delivery, retirada, mesa e agendamento.' },
  { id: 'horarios', label: 'Horários', icon: Clock, description: 'Dias e horários de funcionamento.' },
  { id: 'impressora', label: 'Impressora', icon: Printer, description: 'Impressora térmica Bluetooth do balcão.' },
  { id: 'dispositivo', label: 'Dispositivo', icon: DeviceMobile, description: 'Permissões e preferências do celular da loja.' },
];

const sectionFromPath = (pathname: string): ConfigSectionId => {
  const segment = pathname.replace(`${ADMIN_V2_BASE}/config`, '').replace(/^\/+/, '').split(/[/?#]/)[0];
  return (SECTIONS.find((section) => section.id === segment)?.id || 'hub') as ConfigSectionId;
};

const buildDraft = (session: any) => {
  const socialLinks = session?.store?.settings?.socialLinks || [];
  const instagramLink = socialLinks.find((link: any) => link?.type === 'instagram')?.value;
  const instagramHandle = instagramLink ? `@${instagramLink.replace('@', '')}` : '';
  return {
    brandName: session?.store?.name || '',
    logoUrl: resolveAssetUrl(session?.store?.settings?.logoUrl) || '',
    logoFile: '',
    bannerUrl: resolveAssetUrl(session?.store?.settings?.bannerUrl) || '',
    bannerFile: '',
    bannerPosition: session?.store?.settings?.bannerPosition === 'top' ? 'top' : 'center',
    description: session?.store?.settings?.description || '',
    primaryColor: session?.store?.settings?.primaryColor || '#b91c1c',
    secondaryColor: session?.store?.settings?.secondaryColor || '#111827',
    pixKey: session?.store?.settings?.pixKey || '',
    contactEmail: session?.store?.settings?.contactEmail || '',
    storePhone: session?.store?.owner?.phone || '',
    promoMessage: session?.store?.settings?.promoMessage || '',
    isOrderingEnabled: session?.store?.settings?.isOrderingEnabled !== false,
    address: session?.store?.settings?.address || session?.store?.owner?.address || '',
    city: session?.store?.settings?.city || '',
    state: session?.store?.settings?.state || '',
    lat: session?.store?.settings?.lat ?? null,
    lng: session?.store?.settings?.lng ?? null,
    instagram: instagramHandle.replace('@', '') || '',
    deliveryRadiusKm: session?.store?.settings?.deliveryRadiusKm || '',
    deliveryFee: session?.store?.settings?.deliveryFee || '',
    orderNotificationSound: session?.store?.settings?.orderNotificationSound || '',
    orderNotificationSoundDuration: Number(session?.store?.settings?.orderNotificationSoundDuration ?? 4),
    postalEnabled: session?.store?.settings?.postalEnabled === true,
    postalOriginZip: session?.store?.settings?.postalOriginZip || '',
    prepBaseMinutes: session?.store?.settings?.prepBaseMinutes || '20',
    prepAttentionMinutes: session?.store?.settings?.prepAttentionMinutes || '15',
    segment: session?.store?.settings?.segment || 'outros',
  };
};

export const ConfigSection = () => {
  const { auth, setAuth } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const role = String(auth?.user?.role || '').toUpperCase();
  const isOperator = role === 'OPERATOR';
  const storeId = String(auth?.store?.id || '');
  const active = sectionFromPath(location.pathname);

  const [draft, setDraft] = useState<any>(() => buildDraft(auth));
  const [baseline, setBaseline] = useState<any>(() => buildDraft(auth));
  const [saving, setSaving] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);

  useEffect(() => {
    const next = buildDraft(auth);
    setDraft(next);
    setBaseline(next);
    // re-sincroniza quando a loja muda no servidor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    auth?.store?.name,
    auth?.store?.settings?.logoUrl,
    auth?.store?.settings?.bannerUrl,
    auth?.store?.id,
  ]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(baseline),
    [draft, baseline]
  );

  const updateAuthStore = useCallback(
    (updates: any) => {
      if (!auth?.store) return;
      const nextAuth = {
        ...auth,
        store: { ...auth.store, ...updates, settings: { ...auth.store.settings, ...(updates.settings || {}) } },
      };
      setAuth(nextAuth);
      try {
        if (nativeBiometricService.hasValidStoredAdminEnrollment()) {
          nativeBiometricService.enableAdmin(nextAuth);
        }
      } catch {
        // no-op
      }
    },
    [auth, setAuth]
  );

  const handleSave = async () => {
    if (!storeId) return;
    const normalizedCity = String(draft.city || '').trim();
    const normalizedState = String(draft.state || '').trim().toUpperCase();
    const normalizedAddress = String(draft.address || '').trim();
    const normalizeCoordinatePayload = (value: any) => {
      const raw = String(value ?? '').replace(',', '.').trim();
      if (!raw) return undefined;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return undefined;
      if (Math.abs(parsed) < 0.000001) return undefined;
      return parsed;
    };
    const latPayload = normalizeCoordinatePayload(draft.lat);
    const lngPayload = normalizeCoordinatePayload(draft.lng);
    if (!normalizedAddress || !normalizedCity || normalizedState.length !== 2) {
      showToast('Preencha endereço, cidade e UF da loja para salvar a localização.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: draft.brandName,
        logoFile: draft.logoFile || undefined,
        logoUrl: draft.logoFile ? undefined : draft.logoUrl === '' ? null : draft.logoUrl || undefined,
        bannerFile: draft.bannerFile || undefined,
        bannerUrl: draft.bannerFile ? undefined : draft.bannerUrl === '' ? null : draft.bannerUrl || undefined,
        bannerPosition: draft.bannerPosition === 'top' ? 'top' : 'center',
        description: draft.description || undefined,
        primaryColor: draft.primaryColor,
        secondaryColor: draft.secondaryColor,
        pixKey: draft.pixKey?.trim() ?? '',
        contactEmail: draft.contactEmail?.trim() ?? '',
        storePhone: draft.storePhone?.trim() ?? '',
        promoMessage: draft.promoMessage?.trim() ?? '',
        isOrderingEnabled: draft.isOrderingEnabled !== false,
        address: normalizedAddress,
        city: normalizedCity,
        state: normalizedState,
        ...(latPayload !== undefined ? { lat: latPayload } : {}),
        ...(lngPayload !== undefined ? { lng: lngPayload } : {}),
        deliveryRadiusKm: draft.deliveryRadiusKm,
        deliveryFee: draft.deliveryFee,
        orderNotificationSound: draft.orderNotificationSound?.trim() ?? '',
        orderNotificationSoundDuration: Number(draft.orderNotificationSoundDuration ?? 4),
        postalEnabled: draft.postalEnabled === true,
        postalOriginZip: draft.postalOriginZip,
        prepBaseMinutes: draft.prepBaseMinutes,
        prepAttentionMinutes: draft.prepAttentionMinutes,
        socialLinks: draft.instagram ? [{ type: 'instagram', value: draft.instagram }] : [],
        segment: draft.segment || undefined,
      };
      const updated = await storeService.update(storeId, payload);
      updateAuthStore(updated);
      setBaseline(buildDraft(auth ? { ...auth, store: { ...auth.store, ...updated } } : null));
      showToast('Configurações salvas.', 'success');
    } catch (err) {
      console.error('Erro ao salvar configurações', err);
      showToast('Não foi possível salvar agora. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const visibleSections = isOperator ? SECTIONS.filter((s) => s.id === 'impressora') : SECTIONS;
  const brandingSectionsMap: Record<string, string[] | undefined> = {
    perfil: ['identity', 'colors'],
    canais: ['promo', 'contact'],
    entrega: ['delivery'],
  };

  const renderContent = () => {
    if (active === 'hub') {
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SECTIONS.filter((section) => section.id !== 'hub' && section.id !== 'impressora' || !isOperator).map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => navigate(`${ADMIN_V2_BASE}/config/${section.id}`)}
              className="hover:border-primary/40 focus-visible:border-primary flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <section.icon className="text-primary size-4" aria-hidden="true" />
                {section.label}
              </span>
              <span className="text-muted-foreground text-xs">{section.description}</span>
            </button>
          ))}
        </div>
      );
    }
    if (brandingSectionsMap[active]) {
      return (
        <BrandingSettings
          branding={draft}
          onChange={setDraft}
          storeSlug={String(auth?.store?.slug || '')}
          onSave={handleSave}
          saving={saving}
          visibleSections={brandingSectionsMap[active]}
          expandVisibleSections
        />
      );
    }
    if (active === 'tipos-de-pedido') return <OrderTypeSettingsCard />;
    if (active === 'horarios') return <OpeningHoursCard />;
    if (active === 'impressora') return <ThermalPrinterSettingsCard />;
    if (active === 'dispositivo') {
      return (
        <DevicePermissionsCard
          role="admin"
          session={auth}
          onOpenMfa={() => setMfaOpen(true)}
        />
      );
    }
    return null;
  };

  const activeMeta = SECTIONS.find((section) => section.id === active) || SECTIONS[0];

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 md:flex-row">
      {/* rail de seções */}
      <nav
        className="flex shrink-0 gap-1 overflow-x-auto pb-1 md:w-56 md:flex-col md:overflow-visible md:pb-0"
        aria-label="Seções de configuração"
      >
        {visibleSections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => navigate(`${ADMIN_V2_BASE}/config/${section.id}`)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
              active === section.id
                ? 'bg-background text-foreground border-border/60 border shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
            )}
            aria-current={active === section.id ? 'page' : undefined}
          >
            <section.icon
              className={cn('size-4 shrink-0', active === section.id ? 'text-primary' : undefined)}
              aria-hidden="true"
            />
            <span className="truncate">{section.label}</span>
          </button>
        ))}
      </nav>

      {/* conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{activeMeta.label}</h2>
            <p className="text-muted-foreground text-sm">{activeMeta.description}</p>
          </div>
          {dirty && (
            <Badge className="border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              alterações não salvas
            </Badge>
          )}
        </div>
        {renderContent()}
      </div>

      {/* barra de salvamento */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-2 px-4 py-3">
            <p className="text-muted-foreground text-sm">Você tem alterações não salvas.</p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDraft(baseline)} disabled={saving}>
                Descartar
              </Button>
              <Button type="button" size="sm" onClick={handleSave} loading={saving}>
                Salvar alterações
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={mfaOpen} onOpenChange={setMfaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Segurança da conta</DialogTitle>
          </DialogHeader>
          <AccountMfaPanel open={mfaOpen} onClose={() => setMfaOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
