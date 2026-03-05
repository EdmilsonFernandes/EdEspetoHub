// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  Focus,
  LogOut,
  MapPin,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { subscriptionService } from '../../services/subscriptionService';
import { storeService } from '../../services/storeService';
import { formatCurrency } from '../../utils/format';

type Props = {
  contextLabel?: string;
  onToggleHeader?: () => void;
  storeColor?: string;
  planValueLabel?: string;
  planDueDateLabel?: string;
};

const planTone = (planName?: string | null) => {
  const name = String(planName || '').toLowerCase();
  if (name.includes('vip')) return 'VIP';
  if (name.includes('pro')) return 'PRO MENSAL';
  if (name.includes('basic')) return 'BASIC MENSAL';
  return 'PLANO';
};

const formatDateLabel = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('pt-BR');
};

export function AdminHeader({ onToggleHeader, storeColor, planValueLabel, planDueDateLabel }: Props) {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const { branding } = useTheme();
  const [planDetails, setPlanDetails] = useState<any>(null);
  const [storeNameOverride, setStoreNameOverride] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [openPlanMenu, setOpenPlanMenu] = useState(false);
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const planMenuRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const storeSlug = auth?.store?.slug;
  const storeName = storeNameOverride || auth?.store?.name || branding?.brandName || 'Minha loja';
  const storeLogo = branding?.logoUrl || auth?.store?.settings?.logoUrl || '';
  const storeCity = String(auth?.store?.settings?.city || '').trim();
  const storeState = String(auth?.store?.settings?.state || '').trim().toUpperCase();
  const storeLocation = [storeCity, storeState].filter(Boolean).join(' · ') || 'Local não informado';
  const accentColor =
    storeColor ||
    auth?.store?.settings?.primaryColor ||
    branding?.primaryColor ||
    '#0f172a';
  const userName = auth?.user?.fullName || auth?.user?.name || auth?.user?.email || 'Admin';
  const userShortName = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .join(' ');
  const userDisplay = userShortName.length > 14 ? `${userShortName.slice(0, 14)}…` : userShortName;
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AD';

  const planLabel = useMemo(
    () => planTone(planDetails?.planName || planDetails?.displayName),
    [planDetails?.planName, planDetails?.displayName]
  );
  const resolvedPlanValue = useMemo(() => {
    if (planValueLabel) return planValueLabel;
    const amount = Number(planDetails?.latestPaymentAmount || 0);
    if (Number.isFinite(amount) && amount > 0) return `${formatCurrency(amount)}/mês`;
    return 'R$ 99,90/mês';
  }, [planDetails?.latestPaymentAmount, planValueLabel]);
  const resolvedPlanDueDate = useMemo(() => {
    if (planDueDateLabel) return planDueDateLabel;
    return formatDateLabel(planDetails?.endDate) || '—';
  }, [planDetails?.endDate, planDueDateLabel]);

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
    if (!openUserMenu && !openPlanMenu) return;
    const onClickAway = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setOpenUserMenu(false);
      }
      if (planMenuRef.current && !planMenuRef.current.contains(target)) {
        setOpenPlanMenu(false);
      }
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenUserMenu(false);
        setOpenPlanMenu(false);
      }
    };
    window.addEventListener('mousedown', onClickAway);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onClickAway);
      window.removeEventListener('keydown', onEsc);
    };
  }, [openUserMenu, openPlanMenu]);

  const toggleFocusMode = () => {
    const next = !isFocusMode;
    setIsFocusMode(next);
    window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: !next } }));
    onToggleHeader?.();
  };

  return (
    <header
      className="w-full border-b border-slate-200 bg-white"
      style={{ borderTop: `4px solid ${accentColor}` }}
    >
      <div className="h-20 px-3 sm:px-4 lg:px-6 xl:px-8 flex items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex items-center gap-3">
          <div className="h-11 w-11 rounded-full border border-slate-200 bg-slate-50 overflow-hidden grid place-items-center shrink-0">
            {storeLogo ? (
              <img src={storeLogo} alt={storeName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-black text-slate-700">
                {storeName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-left text-slate-800 font-semibold hover:text-slate-950 transition-colors"
              title="Trocar loja (em breve)"
            >
              <span className="truncate max-w-[180px] sm:max-w-[260px]">{storeName}</span>
              <ChevronDown size={15} className="text-slate-500" />
            </button>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 text-xs px-2 py-0.5">
                <ShoppingBag size={12} />
                Comércio
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 text-xs px-2 py-0.5 max-w-[220px]">
                <MapPin size={12} className="shrink-0" />
                <span className="truncate">{storeLocation}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
          <button
            type="button"
            onClick={toggleFocusMode}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
              isFocusMode ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Modo foco"
            aria-label="Modo foco"
          >
            <Focus size={16} />
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
              style={{ backgroundColor: accentColor }}
              aria-label="Detalhes da assinatura"
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
                    <span className="font-semibold">{resolvedPlanValue}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Vencimento:</span>{' '}
                    <span className="font-semibold">{resolvedPlanDueDate}</span>
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
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold">
                {userInitials}
              </span>
              <span className="hidden lg:inline text-sm font-medium text-slate-700">{userDisplay}</span>
              <ChevronDown size={15} className="text-slate-500" />
            </button>

            {openUserMenu && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-48 rounded-xl border border-slate-200 bg-white shadow-[0_18px_38px_-24px_rgba(15,23,42,0.45)] p-1.5 z-[1200]">
                {/* TODO: substituir por componente de dropdown global do usuário (com "Sair", perfil e preferências). */}
                <button
                  type="button"
                  onClick={() => {
                    setOpenUserMenu(false);
                    logout();
                    navigate('/admin');
                  }}
                  className="w-full inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
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
