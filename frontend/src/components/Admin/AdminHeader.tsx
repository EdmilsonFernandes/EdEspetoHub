// @ts-nocheck
import { SignOut, Globe, Sparkle, ShieldCheck } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { subscriptionService } from '../../services/subscriptionService';
import { storeService } from '../../services/storeService';
import { PlanBadge } from '../PlanBadge';

type Props = {
  contextLabel?: string;
  onToggleHeader?: () => void;
};

export function AdminHeader({ contextLabel = 'Painel da Loja', onToggleHeader }: Props) {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const { branding } = useTheme();
  const [planDetails, setPlanDetails] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDetails, setShowMobileDetails] = useState(false);

  const storeSlug = auth?.store?.slug;
  const storeNameFromAuth = auth?.store?.name;
  const [storeNameOverride, setStoreNameOverride] = useState('');
  const storeName =
    storeNameOverride ||
    storeNameFromAuth ||
    branding?.brandName;
  const storeUrl = storeSlug ? `https://www.chamanoespeto.com.br/${storeSlug}` : '';
  const storeDescription = auth?.store?.settings?.description || '';
  const socialLinks = auth?.store?.settings?.socialLinks || [];
  const instagramLink = socialLinks.find((link) => link?.type === 'instagram')?.value;
  const instagramHandle = instagramLink ? `@${instagramLink.replace('@', '')}` : '';
  const userName = auth?.user?.fullName || auth?.user?.name || auth?.user?.email || 'Admin';
  const userRole = auth?.user?.role || 'ADMIN';
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const showDetails = !isMobile || showMobileDetails;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 767px)');
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
    } else {
      media.addListener(handleChange);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', handleChange);
      } else {
        media.removeListener(handleChange);
      }
    };
  }, []);

  useEffect(() => {
    const storeId = auth?.store?.id;
    if (!storeId) return;
    const loadPlan = async () => {
      try {
        const subscription = await subscriptionService.getByStore(storeId);
        setPlanDetails({
          planName: subscription?.planExempt ? 'vip' : subscription?.plan?.name || '',
          displayName: subscription?.planExempt
            ? subscription?.planExemptLabel || 'Cliente VIP'
            : subscription?.plan?.displayName || '',
          startDate: subscription?.startDate || null,
          endDate: subscription?.endDate || null,
          latestPaymentAt: subscription?.latestPaymentAt || null,
          latestPaymentStatus: subscription?.latestPaymentStatus || null,
          latestPaymentAmount: subscription?.latestPaymentAmount || null,
          planExempt: Boolean(subscription?.planExempt),
          planExemptLabel: subscription?.planExemptLabel || null,
        });
      } catch (error) {
        console.error('Falha ao carregar plano da loja', error);
      }
    };
    loadPlan();
  }, [auth?.store?.id]);

  useEffect(() => {
    if (!storeSlug) return;
    if (storeNameFromAuth && storeNameFromAuth.toLowerCase() !== storeSlug.toLowerCase()) {
      setStoreNameOverride('');
      return;
    }
    storeService
      .fetchBySlug(storeSlug)
      .then((store) => {
        if (store?.name) {
          setStoreNameOverride(store.name);
        }
      })
      .catch(() => {});
  }, [storeSlug, storeNameFromAuth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setShowMobileDetails(false);
    window.addEventListener('adminHeader:toggle', handler);
    return () => window.removeEventListener('adminHeader:toggle', handler);
  }, []);

  return (
    <header
      className="relative rounded-3xl border border-slate-200 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.5)] overflow-hidden"
      style={{
        background: `linear-gradient(120deg, ${branding?.primaryColor || 'var(--color-primary)'} 0%, ${
          branding?.secondaryColor || 'var(--color-secondary)'
        } 100%)`,
        color: '#fff',
      }}
    >
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.45),_transparent_55%)]" />
      <div className="absolute top-0 left-8 right-8 h-1 rounded-full bg-white/40" />
      <div className="px-5 pt-5 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden shadow-[0_16px_30px_-18px_rgba(0,0,0,0.35)] ring-1 ring-white/30">
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={storeName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-black">{storeName?.slice(0, 2)?.toUpperCase() || 'CE'}</span>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-[11px] uppercase tracking-[0.35em] font-semibold opacity-90">{contextLabel}</p>
              {planDetails?.planExempt && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] bg-emerald-100 text-emerald-700">
                  VIP
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black leading-tight">{storeName}</h1>
            {showDetails && storeDescription && (
              <p className="text-sm text-white/85 max-w-[520px] line-clamp-2">
                {storeDescription}
              </p>
            )}
            <div className={`${showMobileDetails ? 'flex' : 'hidden'} lg:flex flex-wrap items-center gap-2 text-xs`}>
              {storeSlug && (
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 opacity-95 hover:opacity-100 hover:bg-white/20 transition"
                >
                  <Globe size={12} weight="duotone" />
                  <span className="truncate">{storeUrl.replace('https://', '')}</span>
                </a>
              )}
              {instagramHandle && (
                <a
                  href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 opacity-95 hover:opacity-100 hover:bg-white/20 transition"
                >
                  <img src="/insta.avif" alt="Instagram" className="h-4 w-4 rounded-full" />
                  <span className="truncate">{instagramHandle}</span>
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowMobileDetails((prev) => !prev)}
            className="lg:hidden px-3 py-2 rounded-full text-xs font-semibold bg-white/15 hover:bg-white/25 transition border border-white/20"
          >
            {showMobileDetails ? 'Fechar' : 'Detalhes'}
          </button>
          {showDetails && (
            <div className="hidden lg:flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 border border-white/15">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {userInitials || 'AD'}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-semibold">{userName}</span>
                <span className="text-[10px] opacity-80">{userRole}</span>
              </div>
            </div>
          )}
          {showDetails && (
            <PlanBadge
              planName={planDetails?.planName}
              displayName={planDetails?.displayName}
              variant="dark"
              details={planDetails}
            />
          )}
        </div>
      </div>
      <div className="px-5 pb-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {showDetails && (
          <div className="flex items-center gap-2 text-xs font-semibold bg-white/10 border border-white/20 rounded-full px-2 py-1.5 w-fit">
            <ShieldCheck size={14} weight="duotone" />
            {planDetails?.planExempt ? 'Cliente VIP (isento de plano)' : 'Assinatura ativa'}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {onToggleHeader && (
            <div className="flex items-center rounded-full bg-white/10 border border-white/20 p-0.5 text-[11px] sm:text-xs font-semibold">
              <button
                type="button"
                className="px-3 py-1.5 rounded-full bg-white/20 text-white shadow-sm"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: true } }));
                }}
              >
                Mostrar painel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition flex items-center gap-1.5"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: false } }));
                }}
              >
                <Sparkle size={12} weight="duotone" />
                Modo foco
              </button>
            </div>
          )}
          <button
            onClick={() => {
              logout();
              navigate('/admin');
            }}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-semibold"
          >
            <SignOut size={14} weight="duotone" /> Sair
          </button>
        </div>
      </div>
      {showMobileDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm md:hidden flex items-end justify-center px-4 pb-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Info da loja</p>
                <p className="text-lg font-bold text-slate-900">{storeName}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileDetails(false)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                Fechar
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              {storeDescription && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {storeDescription}
                </div>
              )}
              {storeSlug && (
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 min-w-0"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Globe size={14} weight="duotone" className="text-slate-500" />
                    <span className="truncate">{storeUrl.replace('https://', '')}</span>
                  </span>
                  <span className="text-xs text-slate-400">Abrir</span>
                </a>
              )}
              {instagramHandle && (
                <a
                  href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 min-w-0"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <img src="/insta.avif" alt="Instagram" className="h-4 w-4 rounded-full" />
                    <span className="truncate">{instagramHandle}</span>
                  </span>
                  <span className="text-xs text-slate-400">Abrir</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
