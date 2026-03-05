// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LogOut,
  MapPin,
  Store as StoreIcon,
  Target,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { subscriptionService } from '../../services/subscriptionService';
import { storeService } from '../../services/storeService';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';

export interface Store {
  logoUrl?: string;
  name: string;
  bannerImageUrl?: string;
  primaryColor: string;
  segment?: string;
  city?: string;
  state?: string;
  slug?: string;
}

export interface User {
  firstName: string;
  fullName?: string;
  avatarUrl?: string;
  initials?: string;
}

export interface HeaderProps {
  contextLabel?: string;
  onToggleHeader?: () => void;
  store?: Partial<Store>;
  user?: Partial<User>;
}

const planLabelFromName = (planName?: string | null) => {
  const name = String(planName || '').toLowerCase();
  if (name.includes('vip')) return 'VIP';
  if (name.includes('pro')) return 'PRO MENSAL';
  if (name.includes('basic')) return 'BASIC MENSAL';
  return 'PLANO';
};

const segmentLabelMap: Record<string, string> = {
  restaurante: 'Restaurante',
  hamburgueria: 'Hamburgueria',
  lanchonete: 'Lanchonete',
  pizzaria: 'Pizzaria',
  adega: 'Adega',
  mercado: 'Mercado',
  hortifruti: 'Hortifruti',
  farmacia: 'Farmácia',
  confeitaria: 'Confeitaria',
  outros: 'Comércio',
};

const toDisplayDate = (raw?: string | null) => {
  if (!raw) return '—';
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('pt-BR');
};

export function AdminHeader({ onToggleHeader, store: storeProp, user: userProp }: HeaderProps) {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const { branding } = useTheme();

  const [storeNameOverride, setStoreNameOverride] = useState('');
  const [planDetails, setPlanDetails] = useState<any>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [openPlanMenu, setOpenPlanMenu] = useState(false);
  const [openUserMenu, setOpenUserMenu] = useState(false);

  const planMenuRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const storeSlug = String(storeProp?.slug || auth?.store?.slug || '');
  const storeName =
    storeNameOverride ||
    String(storeProp?.name || auth?.store?.name || branding?.brandName || 'Minha loja');
  const storeLogo = resolveAssetUrl(
    storeProp?.logoUrl || auth?.store?.settings?.logoUrl || branding?.logoUrl || ''
  );
  const storeBanner = resolveAssetUrl(
    storeProp?.bannerImageUrl || auth?.store?.settings?.bannerUrl || branding?.bannerUrl || ''
  );
  const primaryColor =
    storeProp?.primaryColor ||
    auth?.store?.settings?.primaryColor ||
    branding?.primaryColor ||
    '#0f172a';

  const segmentRaw = String(storeProp?.segment || auth?.store?.settings?.segment || 'outros').toLowerCase();
  const storeSegment = segmentLabelMap[segmentRaw] || 'Comércio';
  const city = String(storeProp?.city || auth?.store?.settings?.city || '').trim();
  const state = String(storeProp?.state || auth?.store?.settings?.state || '').trim().toUpperCase();
  const storeLocation = [city, state].filter(Boolean).join(' · ') || 'Local não informado';

  const fullUserName =
    String(
      userProp?.fullName ||
      auth?.user?.fullName ||
      auth?.user?.name ||
      auth?.user?.email ||
      'Usuário'
    );
  const userFirstName = String(userProp?.firstName || fullUserName.split(' ')[0] || 'Usuário');
  const userDisplay = `${userFirstName}${fullUserName.includes(' ') ? ` ${fullUserName.split(' ')[1]?.[0] || ''}.` : ''}`;
  const userAvatar = resolveAssetUrl(userProp?.avatarUrl || '');
  const userInitials =
    userProp?.initials ||
    fullUserName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') ||
    'AD';

  const planLabel = useMemo(
    () => planLabelFromName(planDetails?.planName || planDetails?.displayName),
    [planDetails?.planName, planDetails?.displayName]
  );
  const planValue = useMemo(() => {
    const amount = Number(planDetails?.latestPaymentAmount || 0);
    if (Number.isFinite(amount) && amount > 0) {
      return `R$ ${amount.toFixed(2).replace('.', ',')}/mês`;
    }
    return 'R$ 99,90/mês';
  }, [planDetails?.latestPaymentAmount]);
  const planDue = useMemo(() => toDisplayDate(planDetails?.endDate), [planDetails?.endDate]);

  useEffect(() => {
    const storeId = auth?.store?.id;
    if (!storeId) return;
    subscriptionService
      .getByStore(storeId)
      .then((subscription: any) => {
        setPlanDetails({
          planName: subscription?.planExempt ? 'vip' : subscription?.plan?.name || '',
          displayName: subscription?.planExempt ? 'Isento de plano' : subscription?.plan?.displayName || '',
          latestPaymentAmount: subscription?.latestPaymentAmount || null,
          endDate: subscription?.endDate || null,
        });
      })
      .catch(() => setPlanDetails(null));
  }, [auth?.store?.id]);

  useEffect(() => {
    if (!storeSlug) return;
    storeService
      .fetchBySlug(storeSlug)
      .then((store: any) => {
        if (store?.name) setStoreNameOverride(store.name);
      })
      .catch(() => {});
  }, [storeSlug]);

  useEffect(() => {
    if (!openPlanMenu && !openUserMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (planMenuRef.current && !planMenuRef.current.contains(target)) setOpenPlanMenu(false);
      if (userMenuRef.current && !userMenuRef.current.contains(target)) setOpenUserMenu(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenPlanMenu(false);
        setOpenUserMenu(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openPlanMenu, openUserMenu]);

  const toggleFocusMode = () => {
    const next = !isFocusMode;
    setIsFocusMode(next);
    window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: !next } }));
    onToggleHeader?.();
  };

  return (
    <header className="w-full bg-white border-b border-slate-200">
      <div className="h-20 px-3 sm:px-4 lg:px-6 xl:px-8 flex items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 w-full max-w-md lg:max-w-lg shrink-0">
          <div
            className="relative overflow-hidden h-14 px-3 sm:px-4 flex items-center rounded-full border-t border-white/20 shadow-[0_12px_28px_-18px_rgba(15,23,42,0.55)]"
            style={
              storeBanner
                ? {
                    backgroundImage: `url(${storeBanner})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    WebkitMaskImage: 'linear-gradient(to right, black 58%, transparent 100%)',
                    maskImage: 'linear-gradient(to right, black 58%, transparent 100%)',
                  }
                : { backgroundColor: primaryColor }
            }
          >
            {storeBanner ? <div className="absolute inset-0 bg-black/40" /> : null}
            <div className="relative z-10 min-w-0 w-full flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/95 border border-white/60 overflow-hidden grid place-items-center shrink-0">
                {storeLogo ? (
                  <img src={storeLogo} alt={storeName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-black text-slate-800">{storeName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>

              <div className="min-w-0">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-left font-semibold text-white hover:text-white/90 transition-colors"
                  title="Trocar loja (em breve)"
                >
                  <span className="truncate max-w-[170px] sm:max-w-[280px]">{storeName}</span>
                  <ChevronDown size={14} />
                </button>
                <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/18 border border-white/25 text-white text-[11px] px-2 py-0.5">
                    <StoreIcon size={11} />
                    {storeSegment}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/18 border border-white/25 text-white text-[11px] px-2 py-0.5 max-w-[180px] sm:max-w-[260px]">
                    <MapPin size={11} className="shrink-0" />
                    <span className="truncate">{storeLocation}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1" />
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0 bg-white rounded-l-2xl border-l border-slate-100 pl-3 sm:pl-4 py-1">
          <button
            type="button"
            onClick={toggleFocusMode}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
              isFocusMode ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Modo foco"
            aria-label="Modo foco"
          >
            <Target size={16} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/dashboard', { state: { openNotifications: true } })}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
            title="Notificações"
            aria-label="Notificações"
          >
            <Bell size={16} />
          </button>

          <div className="relative hidden sm:block" ref={planMenuRef}>
            <button
              type="button"
              onClick={() => setOpenPlanMenu((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-full text-white text-[11px] font-semibold uppercase tracking-[0.14em] px-3 py-1 shadow-sm"
              style={{ backgroundColor: primaryColor }}
              aria-label="Abrir detalhes da assinatura"
            >
              {planLabel}
              <ChevronDown size={12} />
            </button>
            {openPlanMenu && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-64 rounded-lg border border-slate-100 bg-white shadow-lg p-3 z-[1200]">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">Assinatura</p>
                <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                  <p>
                    <span className="text-slate-500">Valor:</span>{' '}
                    <span className="font-semibold">{planValue}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Vencimento:</span>{' '}
                    <span className="font-semibold">{planDue}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpenPlanMenu(false);
                    navigate('/admin/renewal');
                  }}
                  className="mt-3 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Gerenciar assinatura
                </button>
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setOpenUserMenu((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-100 transition-colors"
              aria-label="Abrir menu do usuário"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold overflow-hidden">
                {userAvatar ? (
                  <img src={userAvatar} alt={fullUserName} className="h-full w-full object-cover" />
                ) : (
                  userInitials
                )}
              </span>
              <span className="hidden lg:inline text-sm font-medium text-slate-700">{userDisplay}</span>
              <ChevronDown size={15} className="text-slate-500" />
            </button>

            {openUserMenu && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-44 rounded-lg border border-slate-100 bg-white shadow-lg p-1.5 z-[1200]">
                <button
                  type="button"
                  onClick={() => {
                    setOpenUserMenu(false);
                    logout();
                    navigate('/admin');
                  }}
                  className="w-full inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <LogOut size={14} />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
