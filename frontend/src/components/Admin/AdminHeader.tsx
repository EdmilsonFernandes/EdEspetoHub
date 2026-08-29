// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CaretDown,
  Crosshair,
  Key,
  MapPinLine,
  ShieldCheck,
  SignOut,
  Storefront,
} from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { subscriptionService } from '../../services/subscriptionService';
import { storeService } from '../../services/storeService';
import { authService } from '../../services/authService';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';
import { markManualLogoutRedirect } from '../../utils/sessionRedirect';
import { AccountMfaPanel } from '../Auth/AccountMfaPanel';

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
  servicos: 'Serviços',
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
  const { showToast } = useToast();
  const { branding } = useTheme();

  const [storeNameOverride, setStoreNameOverride] = useState('');
  const [planDetails, setPlanDetails] = useState<any>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [openPlanMenu, setOpenPlanMenu] = useState(false);
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [mfaPanelOpen, setMfaPanelOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [mobileCollapsed, setMobileCollapsed] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const planMenuRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileCollapsedRef = useRef(false);
  const collapseLockUntilRef = useRef(0);
  const lastYRef = useRef(0);

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

  const effectivePlanName = useMemo(
    () =>
      String(
        planDetails?.planName ||
          auth?.subscription?.plan?.name ||
          planDetails?.displayName ||
          auth?.subscription?.plan?.displayName ||
          ''
      ),
    [
      planDetails?.planName,
      planDetails?.displayName,
      auth?.subscription?.plan?.name,
      auth?.subscription?.plan?.displayName,
    ]
  );
  const founderVipPromotion =
    planDetails?.founderVipPromotion ||
    auth?.subscription?.founderVipPromotion ||
    auth?.store?.settings?.acquisitionAttribution?.founderVipPromotion ||
    null;
  const isFounderVipTrial = Boolean(
    founderVipPromotion?.applied &&
      !planDetails?.planExempt &&
      !auth?.subscription?.planExempt &&
      String(planDetails?.status || auth?.subscription?.status || '').toUpperCase() === 'TRIAL'
  );
  const planLabel = useMemo(
    () => (isFounderVipTrial ? 'VIP FUNDADOR' : planLabelFromName(effectivePlanName)),
    [effectivePlanName, isFounderVipTrial]
  );
  const planValue = useMemo(() => {
    const isVip = Boolean(planDetails?.planExempt || auth?.subscription?.planExempt);
    if (isVip) return 'Isento';

    const status = String(planDetails?.status || auth?.subscription?.status || '').toUpperCase();
    if (isFounderVipTrial) {
      const end = new Date(planDetails?.endDate || auth?.subscription?.endDate || '').getTime();
      const daysLeft = Number.isFinite(end) ? Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24))) : null;
      return typeof daysLeft === 'number'
        ? `3 meses grátis · ${daysLeft} dias restantes`
        : '3 meses grátis';
    }
    if (status === 'TRIAL') return '7 dias grátis';
    const amount = Number(
      planDetails?.latestPaymentAmount ??
        auth?.subscription?.latestPaymentAmount ??
        planDetails?.planPrice ??
        auth?.subscription?.plan?.price ??
        0
    );
    if (Number.isFinite(amount) && amount > 0) {
      return `R$ ${amount.toFixed(2).replace('.', ',')}/mês`;
    }
    return '—';
  }, [
    planDetails?.planExempt,
    auth?.subscription?.planExempt,
    planDetails?.status,
    auth?.subscription?.status,
    planDetails?.latestPaymentAmount,
    auth?.subscription?.latestPaymentAmount,
    planDetails?.planPrice,
    auth?.subscription?.plan?.price,
    isFounderVipTrial,
    planDetails?.endDate,
    auth?.subscription?.endDate,
  ]);
  const planDue = useMemo(
    () => toDisplayDate(planDetails?.endDate || auth?.subscription?.endDate),
    [planDetails?.endDate, auth?.subscription?.endDate]
  );

  useEffect(() => {
    const storeId = auth?.store?.id;
    if (!storeId) return;
    subscriptionService
      .getByStore(storeId)
      .then((subscription: any) => {
        setPlanDetails({
          planExempt: Boolean(subscription?.planExempt),
          status: subscription?.status || '',
          planName: subscription?.planExempt ? 'vip' : subscription?.plan?.name || '',
          displayName: subscription?.planExempt ? 'Isento de plano' : subscription?.plan?.displayName || '',
          latestPaymentAmount: subscription?.latestPaymentAmount || null,
          planPrice: subscription?.plan?.price ?? null,
          endDate: subscription?.endDate || null,
          founderVipPromotion: subscription?.founderVipPromotion || null,
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

  useEffect(() => {
    const onOpenChangePassword = () => {
      setOpenPlanMenu(false);
      setOpenUserMenu(false);
      setChangePasswordOpen(true);
    };
    window.addEventListener('admin:open-change-password', onOpenChangePassword as EventListener);
    return () => {
      window.removeEventListener('admin:open-change-password', onOpenChangePassword as EventListener);
    };
  }, []);

  // Ação "Segurança da conta" do drawer de Conta (adminNavigation) — antes só
  // existia no menu do avatar do header.
  useEffect(() => {
    const onOpenMfa = () => {
      setOpenPlanMenu(false);
      setOpenUserMenu(false);
      setMfaPanelOpen(true);
    };
    window.addEventListener('admin:open-mfa', onOpenMfa as EventListener);
    return () => {
      window.removeEventListener('admin:open-mfa', onOpenMfa as EventListener);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    let ticking = false;
    let unlockTimer: ReturnType<typeof setTimeout> | null = null;
    const collapseAt = 104;
    const expandAt = 52;
    const deltaThreshold = 8;

    lastYRef.current = window.scrollY || document.documentElement.scrollTop || 0;
    collapseLockUntilRef.current = 0;

    const lockTransition = () => {
      collapseLockUntilRef.current = Date.now() + 420;
      if (unlockTimer) clearTimeout(unlockTimer);
      unlockTimer = setTimeout(() => {
        collapseLockUntilRef.current = 0;
      }, 430);
    };

    const update = () => {
      const isMobile = window.innerWidth < 768;
      if (!isMobile) {
        mobileCollapsedRef.current = false;
        collapseLockUntilRef.current = 0;
        setMobileCollapsed(false);
        return;
      }
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const delta = y - lastYRef.current;
      if (Math.abs(delta) < deltaThreshold) return;
      if (Date.now() < collapseLockUntilRef.current) {
        lastYRef.current = y;
        return;
      }
      const goingDown = delta > 0;
      const goingUp = delta < 0;
      const collapsed = mobileCollapsedRef.current;

      if (!collapsed && goingDown && y >= collapseAt) {
        mobileCollapsedRef.current = true;
        lockTransition();
        setMobileCollapsed(true);
      } else if (collapsed && goingUp && y <= expandAt) {
        mobileCollapsedRef.current = false;
        lockTransition();
        setMobileCollapsed(false);
      }

      lastYRef.current = y;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      frame = window.requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (unlockTimer) clearTimeout(unlockTimer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const toggleFocusMode = () => {
    const next = !isFocusMode;
    setIsFocusMode(next);
    window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: !next } }));
    onToggleHeader?.();
  };

  const handleChangePassword = async () => {
    const currentPassword = String(passwordForm.currentPassword || '');
    const newPassword = String(passwordForm.newPassword || '');
    const confirmPassword = String(passwordForm.confirmPassword || '');
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Preencha todos os campos de senha.', 'warning');
      return;
    }
    if (newPassword.length < 6) {
      showToast('A nova senha deve ter pelo menos 6 caracteres.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('A confirmação da nova senha não confere.', 'warning');
      return;
    }
    setChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      showToast('Senha atualizada com sucesso.', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setChangePasswordOpen(false);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível trocar a senha agora.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <header className="relative w-full">
      <div className="hidden md:block rounded-3xl border border-slate-200 bg-white overflow-hidden">
        <div
          className="relative h-44 lg:h-52"
          style={
            storeBanner
              ? {
                  backgroundImage: `url(${storeBanner})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : { backgroundColor: primaryColor }
          }
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/65" />
          <div className="absolute inset-x-0 bottom-0 px-6 pb-5 flex items-end justify-between gap-4">
            <div className="flex items-end gap-4 min-w-0">
              <div className="h-20 w-20 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden grid place-items-center shrink-0">
                {storeLogo ? (
                  <img src={storeLogo} alt={storeName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-black text-slate-800">{storeName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="pb-1 min-w-0">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-left text-2xl font-black text-white hover:text-white/90 transition-colors"
                  title="Trocar loja (em breve)"
                >
                  <span className="truncate max-w-[480px]">{storeName}</span>
                  <CaretDown size={18} />
                </button>
                <div className="mt-1 flex items-center gap-2 text-sm text-white/90">
                  <MapPinLine size={14} className="shrink-0" />
                  <span className="truncate">{storeLocation}</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 border border-white/25 text-white text-xs px-2.5 py-1">
                  <Storefront size={12} />
                  {storeSegment}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden sticky top-0 z-[80] rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div
          className={`relative origin-top transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
            mobileCollapsed ? 'h-0 opacity-0 -translate-y-2 scale-[0.97]' : 'h-40 opacity-100 translate-y-0 scale-100'
          }`}
          style={
            mobileCollapsed
              ? {}
              : storeBanner
              ? {
                  backgroundImage: `url(${storeBanner})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : { backgroundColor: primaryColor }
          }
        >
          {!mobileCollapsed && <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/30 to-black/65" />}
          {!mobileCollapsed && (
            <div className="absolute inset-x-0 bottom-0 px-4 pb-4 flex items-end gap-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
              <div className="h-14 w-14 rounded-full border-2 border-white bg-white shadow-lg overflow-hidden grid place-items-center shrink-0">
                {storeLogo ? (
                  <img src={storeLogo} alt={storeName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-black text-slate-800">{storeName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 pb-0.5">
                <p className="truncate text-lg font-black text-white">{storeName}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/90">
                  <MapPinLine size={12} className="shrink-0" />
                  <span className="truncate">{storeLocation}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 md:hidden rounded-2xl border border-slate-200 bg-white px-3 sm:px-4 py-2.5 flex items-center justify-end gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard', { state: { openNotifications: true } })}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
          title="Notificações"
          aria-label="Notificações"
        >
          <Bell size={16} />
        </button>
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('admin:open-account-drawer'))}
            className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_2px_8px_-6px_rgba(15,23,42,0.8)] transition-colors hover:bg-slate-100"
            aria-label="Conta da operação"
            title="Conta da operação"
          >
            {userAvatar ? (
              <img src={userAvatar} alt={fullUserName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[11px] font-black">{userInitials}</span>
            )}
          </button>
        </div>
      </div>

      <div className="hidden md:flex absolute top-4 right-4 z-[1100] items-center gap-2 rounded-full border border-white/25 bg-black/20 px-3 py-2 backdrop-blur-sm shadow-[0_14px_28px_-18px_rgba(2,6,23,0.75)]">
        <button
          type="button"
          onClick={toggleFocusMode}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
            isFocusMode ? 'bg-slate-900 text-white' : 'text-white hover:bg-white/20'
          }`}
          title="Modo foco"
          aria-label="Modo foco"
        >
          <Crosshair size={16} />
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/dashboard', { state: { openNotifications: true } })}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white hover:bg-white/20 transition-colors"
          title="Notificações"
          aria-label="Notificações"
        >
          <Bell size={16} />
        </button>

        <div className="relative" ref={planMenuRef}>
          <button
            type="button"
            onClick={() => setOpenPlanMenu((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 text-white text-[11px] font-semibold uppercase tracking-[0.14em] px-3 py-1 shadow-sm"
            aria-label="Abrir detalhes da assinatura"
          >
            {planLabel}
            <CaretDown size={12} />
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
            className="inline-flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white/20 transition-colors"
            aria-label="Abrir menu do usuário"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold overflow-hidden border border-white/40">
              {userAvatar ? (
                <img src={userAvatar} alt={fullUserName} className="h-full w-full object-cover" />
              ) : (
                userInitials
              )}
            </span>
            <span className="hidden lg:inline text-sm font-medium text-white">{userDisplay}</span>
            <CaretDown size={15} className="text-white/80" />
          </button>

          {openUserMenu && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-44 rounded-lg border border-slate-100 bg-white shadow-lg p-1.5 z-[1200]">
              {storeSlug ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpenUserMenu(false);
                    navigate(`/${storeSlug}`);
                  }}
                  className="w-full inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Storefront size={14} />
                  Minha vitrine
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setOpenUserMenu(false);
                  setChangePasswordOpen(true);
                }}
                className="w-full inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Key size={14} />
                Trocar senha
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenUserMenu(false);
                  setMfaPanelOpen(true);
                }}
                className="w-full inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ShieldCheck size={14} />
                Segurança da conta
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenUserMenu(false);
                  markManualLogoutRedirect('admin', '/hub');
                  logout();
                  navigate('/hub', { replace: true });
                }}
                className="w-full inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <SignOut size={14} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
      {changePasswordOpen && (
        <div className="fixed inset-0 z-[1500] bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Trocar senha</p>
              <button
                type="button"
                onClick={() => {
                  if (changingPassword) return;
                  setChangePasswordOpen(false);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <CaretDown size={14} className="rotate-45" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Senha atual</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  placeholder="Digite sua senha atual"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Nova senha</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  placeholder="Mínimo de 6 caracteres"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Confirmar nova senha</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  placeholder="Repita a nova senha"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setChangePasswordOpen(false)}
                disabled={changingPassword}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="h-10 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {changingPassword ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </div>
          </div>
        </div>
      )}
      <AccountMfaPanel open={mfaPanelOpen} authMode="admin" onClose={() => setMfaPanelOpen(false)} />
    </header>
  );
}
