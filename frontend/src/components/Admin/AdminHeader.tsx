// @ts-nocheck
import { SignOut, Globe, Sparkle, ShieldCheck, Storefront, PushPin } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { subscriptionService } from '../../services/subscriptionService';
import { storeService } from '../../services/storeService';
import { PlanBadge } from '../PlanBadge';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';

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
  const [showDesktopDetails, setShowDesktopDetails] = useState(false);
  const [compactDesktop, setCompactDesktop] = useState(false);
  const [pinExpanded, setPinExpanded] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('adminHeader:pinExpanded') === 'true';
  });

  const storeSlug = auth?.store?.slug;
  const storeNameFromAuth = auth?.store?.name;
  const [storeNameOverride, setStoreNameOverride] = useState('');
  const storeName =
    storeNameOverride ||
    storeNameFromAuth ||
    branding?.brandName;
  const storeUrl = storeSlug ? `https://www.janocaminho.com.br/${storeSlug}` : '';
  const storeDescription = auth?.store?.settings?.description || '';
  const storeSegmentRaw = String(auth?.store?.settings?.segment || '').toLowerCase();
  const storeSegmentLabelMap: Record<string, string> = {
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
  const storeSegmentLabel = storeSegmentLabelMap[storeSegmentRaw] || 'Comércio';
  const storeCity = String(auth?.store?.settings?.city || '').trim();
  const storeState = String(auth?.store?.settings?.state || '').trim().toUpperCase();
  const storeLocation = [storeCity, storeState].filter(Boolean).join(' • ');
  const socialLinks = auth?.store?.settings?.socialLinks || [];
  const instagramLink = socialLinks.find((link) => link?.type === 'instagram')?.value;
  const instagramHandle = instagramLink ? `@${instagramLink.replace('@', '')}` : '';
  const bannerUrl = resolveAssetUrl(auth?.store?.settings?.bannerUrl || '') || '';
  const bannerPosition = auth?.store?.settings?.bannerPosition === 'top' ? 'top center' : 'center';
  const hasBanner = Boolean(bannerUrl);
  const userName = auth?.user?.fullName || auth?.user?.name || auth?.user?.email || 'Admin';
  const userRole = auth?.user?.role || 'ADMIN';
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const showDetails = !isMobile || showMobileDetails;
  const infoChips = [
    {
      id: 'segment',
      label: storeSegmentLabel,
      icon: <Storefront size={12} weight="duotone" />,
    },
    ...(storeLocation
      ? [
          {
            id: 'location',
            label: storeLocation,
            icon: <Globe size={12} weight="duotone" />,
          },
        ]
      : []),
    ...(storeSlug
      ? [
          {
            id: 'storeUrl',
            label: storeUrl.replace('https://', ''),
            icon: <Globe size={12} weight="duotone" />,
            href: storeUrl,
          },
        ]
      : []),
    ...(instagramHandle
      ? [
          {
            id: 'instagram',
            label: instagramHandle,
            image: '/insta.avif',
            href: `https://instagram.com/${instagramHandle.replace('@', '')}`,
          },
        ]
      : []),
  ];
  const visibleDesktopChips = infoChips.slice(0, 2);
  const hiddenDesktopChips = infoChips.slice(2);
  const planStatusRaw = String(planDetails?.status || '').toUpperCase();
  const planStatusLabel =
    planDetails?.planExempt
      ? 'VIP ativo'
      : planStatusRaw === 'ACTIVE'
      ? 'Plano ativo'
      : planStatusRaw === 'TRIAL'
      ? 'Trial ativo'
      : planStatusRaw === 'EXPIRING'
      ? 'Expirando'
      : planStatusRaw === 'PENDING'
      ? 'Pendente'
      : 'Sem status';
  const opsCards = [
    { id: 'segment', label: 'Segmento', value: storeSegmentLabel },
    { id: 'location', label: 'Local', value: storeLocation || 'Não definido' },
    { id: 'plan', label: 'Assinatura', value: planStatusLabel },
  ];
  const headerBackgroundStyle = hasBanner
    ? {
        backgroundColor: '#0f172a',
        backgroundImage: `linear-gradient(120deg, rgba(15,23,42,0.34) 0%, rgba(15,23,42,0.5) 100%), url(${bannerUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: `center, ${bannerPosition}`,
        backgroundRepeat: 'no-repeat',
        color: '#fff',
      }
    : {
        backgroundImage: `linear-gradient(120deg, ${branding?.primaryColor || 'var(--color-primary)'} 0%, ${branding?.secondaryColor || 'var(--color-secondary)'} 100%)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        color: '#fff',
      };

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
    if (typeof window === 'undefined') return;
    const handleScroll = () => {
      const isDesktop = window.innerWidth >= 1024;
      setCompactDesktop(isDesktop && window.scrollY > 64 && !pinExpanded);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [pinExpanded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('adminHeader:pinExpanded', String(pinExpanded));
    if (pinExpanded) {
      setCompactDesktop(false);
    }
  }, [pinExpanded]);

  useEffect(() => {
    const storeId = auth?.store?.id;
    if (!storeId) return;
    const loadPlan = async () => {
      try {
        const subscription = await subscriptionService.getByStore(storeId);
        setPlanDetails({
          status: subscription?.status || null,
          planName: subscription?.planExempt ? 'vip' : subscription?.plan?.name || '',
          displayName: subscription?.planExempt
            ? 'Isento de plano'
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

  useEffect(() => {
    if (isMobile && showDesktopDetails) {
      setShowDesktopDetails(false);
    }
  }, [isMobile, showDesktopDetails]);

  return (
    <header
      className="relative z-[90] isolate rounded-3xl border border-slate-200/80 shadow-[0_26px_64px_-34px_rgba(15,23,42,0.58)] overflow-visible"
      style={headerBackgroundStyle}
    >
      <div className="pointer-events-none absolute inset-0 opacity-35 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.34),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900/12 via-transparent to-slate-900/22" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[40%] bg-gradient-to-l from-slate-950/40 via-slate-900/20 to-transparent" />
      <div className="pointer-events-none absolute top-0 left-8 right-8 h-0.5 rounded-full bg-white/40" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/12" />
      <div className="md:hidden px-3 py-3 space-y-2.5">
        <div className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-slate-950/34 px-2.5 py-2 backdrop-blur-[4px]">
          <div className="w-11 h-11 rounded-xl bg-white/90 ring-1 ring-white/80 overflow-hidden flex items-center justify-center shadow-[0_14px_28px_-18px_rgba(0,0,0,0.55)]">
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={storeName} className="w-full h-full object-contain p-1" />
            ) : (
              <span className="text-sm font-black text-slate-800">{storeName?.slice(0, 2)?.toUpperCase() || 'JC'}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-white/80">{contextLabel}</p>
            <h1 className="text-base font-black text-white truncate">{storeName}</h1>
            <p className="text-[11px] text-white/80 truncate">
              {storeSegmentLabel}{storeLocation ? ` • ${storeLocation}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowMobileDetails(true)}
            className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-white/15 border border-white/25 text-white hover:bg-white/25 transition"
          >
            Detalhes
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/20 bg-slate-950/34 px-2.5 py-2 backdrop-blur-[4px]">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">Assinatura</p>
            <p className="text-xs font-semibold text-white truncate">{planStatusLabel}</p>
          </div>
          <PlanBadge
            planName={planDetails?.planName}
            displayName={planDetails?.displayName}
            variant="dark"
            details={planDetails}
          />
        </div>

        <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/20 bg-slate-950/30 px-2.5 py-2">
          {onToggleHeader && (
            <div className="flex items-center rounded-full bg-white/12 border border-white/25 p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-full bg-white/20 text-white shadow-sm"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: true } }));
                }}
              >
                Painel
              </button>
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-full text-white/85 hover:text-white hover:bg-white/15 transition"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: false } }));
                }}
              >
                Foco
              </button>
            </div>
          )}
          <button
            onClick={() => {
              logout();
              navigate('/admin');
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-[11px] font-semibold text-white"
          >
            <SignOut size={13} weight="duotone" /> Sair
          </button>
        </div>
      </div>

      <div className={`hidden md:flex md:flex-col px-4 pb-2.5 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)_auto] gap-3 transition-all duration-200 ${compactDesktop ? 'pt-2 min-h-[112px] lg:items-center' : 'pt-3 min-h-[156px] lg:items-start'}`}>
        <div className={`flex items-start gap-3 rounded-2xl border border-white/22 bg-slate-950/30 backdrop-blur-[4px] max-w-[920px] shadow-[0_16px_36px_-26px_rgba(0,0,0,0.7)] transition-all duration-200 ${compactDesktop ? 'px-3 py-2' : 'px-3.5 py-2.5'}`}>
          <div className={`rounded-2xl bg-white/90 backdrop-blur flex items-center justify-center overflow-hidden shadow-[0_18px_32px_-18px_rgba(0,0,0,0.56)] ring-1 ring-white/80 transition-all duration-200 ${compactDesktop ? 'w-12 h-12' : 'w-16 h-16'}`}>
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={storeName} className="w-full h-full object-contain p-1" />
            ) : (
              <span className="text-xl font-black text-slate-800">{storeName?.slice(0, 2)?.toUpperCase() || 'CE'}</span>
            )}
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-[0.32em] font-semibold text-white/90">{contextLabel}</p>
              {planDetails?.planExempt && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] bg-emerald-100 text-emerald-700">
                  VIP
                </span>
              )}
            </div>
            <h1 className={`font-black leading-tight truncate max-w-[42ch] drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-all duration-200 ${compactDesktop ? 'text-[18px] sm:text-[22px]' : 'text-[22px] sm:text-[28px]'}`}>{storeName}</h1>
            {showDetails && storeDescription && !compactDesktop && (
              <p className="text-xs sm:text-sm text-white/85 max-w-[520px] line-clamp-1 sm:line-clamp-2">
                {storeDescription}
              </p>
            )}
            <div className={`${showMobileDetails ? 'flex' : 'hidden'} lg:flex flex-wrap items-center gap-2 text-xs ${compactDesktop ? 'lg:mt-0.5' : ''}`}>
              {visibleDesktopChips.map((chip) =>
                chip.href ? (
                  <a
                    key={chip.id}
                    href={chip.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/14 border border-white/28 opacity-95 shadow-sm hover:opacity-100 hover:bg-white/22 transition"
                  >
                    {chip.image ? (
                      <img src={chip.image} alt="" className="h-4 w-4 rounded-full" />
                    ) : (
                      chip.icon
                    )}
                    <span className="truncate">{chip.label}</span>
                  </a>
                ) : (
                  <span
                    key={chip.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/14 border border-white/28 opacity-95 shadow-sm"
                  >
                    {chip.icon}
                    <span className="truncate">{chip.label}</span>
                  </span>
                )
              )}
              {hiddenDesktopChips.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDesktopDetails((prev) => !prev)}
                  className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/25 text-white/90 hover:bg-white/20 transition"
                >
                  {showDesktopDetails ? 'Ocultar detalhes' : `+${hiddenDesktopChips.length} detalhes`}
                </button>
              )}
            </div>
          </div>
        </div>
        {!compactDesktop && (
          <div className="hidden lg:grid grid-cols-1 gap-2 rounded-2xl border border-white/20 bg-slate-950/34 backdrop-blur-[4px] p-2.5 shadow-[0_16px_34px_-24px_rgba(0,0,0,0.72)]">
            {opsCards.map((card) => (
              <div key={card.id} className="rounded-xl border border-white/15 bg-white/10 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">{card.label}</p>
                <p className="text-[13px] font-semibold text-white truncate">{card.value}</p>
              </div>
            ))}
          </div>
        )}
        <div className={`flex items-center gap-2 rounded-2xl border border-white/20 bg-slate-950/34 backdrop-blur-[4px] px-2.5 shadow-[0_16px_34px_-24px_rgba(0,0,0,0.72)] transition-all duration-200 ${compactDesktop ? 'py-1.5' : 'py-2'}`}>
          <button
            type="button"
            onClick={() => setPinExpanded((prev) => !prev)}
            className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-semibold transition ${
              pinExpanded
                ? 'bg-white/22 border-white/35 text-white'
                : 'bg-white/10 border-white/22 text-white/85 hover:bg-white/18 hover:text-white'
            }`}
            title={pinExpanded ? 'Desafixar cabeçalho expandido' : 'Fixar cabeçalho expandido'}
            aria-label={pinExpanded ? 'Desafixar cabeçalho expandido' : 'Fixar cabeçalho expandido'}
          >
            <PushPin size={13} weight={pinExpanded ? 'fill' : 'duotone'} />
            {pinExpanded ? 'Expandido fixo' : 'Fixar expandido'}
          </button>
          <button
            type="button"
            onClick={() => setShowMobileDetails((prev) => !prev)}
            className="lg:hidden px-3 py-2 rounded-full text-xs font-semibold bg-white/15 hover:bg-white/25 transition border border-white/20"
          >
            {showMobileDetails ? 'Fechar' : 'Detalhes'}
          </button>
          {showDetails && (
            <div className="hidden lg:flex items-center gap-2 bg-slate-950/32 rounded-full px-2.5 py-1 border border-white/20 backdrop-blur-[2px]" title="Conta logada">
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
      {showDesktopDetails && (
        <div className="hidden lg:block px-4 pb-2">
          <div className="rounded-2xl border border-white/20 bg-slate-950/35 backdrop-blur-[4px] p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {infoChips.map((chip) =>
                chip.href ? (
                  <a
                    key={chip.id}
                    href={chip.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/14 border border-white/28 text-white hover:bg-white/22 transition"
                  >
                    {chip.image ? (
                      <img src={chip.image} alt="" className="h-4 w-4 rounded-full" />
                    ) : (
                      chip.icon
                    )}
                    <span className="truncate">{chip.label}</span>
                  </a>
                ) : (
                  <span
                    key={chip.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/14 border border-white/28 text-white"
                  >
                    {chip.icon}
                    <span className="truncate">{chip.label}</span>
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      )}
      <div className={`px-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 rounded-b-3xl border-t border-white/12 transition-all duration-200 ${compactDesktop ? 'pb-2.5' : 'pb-3.5'}`}>
        {showDetails && (
          <div className="flex items-center gap-2 text-[11px] font-semibold bg-slate-950/34 border border-white/25 rounded-full px-2 py-1.5 w-fit backdrop-blur-[2px]" title="Status da assinatura">
            <ShieldCheck size={14} weight="duotone" />
            {planDetails?.planExempt ? 'Isento de plano' : 'Assinatura ativa'}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://www.janocaminho.com.br"
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/12 border border-white/30 text-[11px] font-semibold text-white/95 hover:bg-white/20 hover:text-white transition ${compactDesktop ? 'lg:hidden' : ''}`}
            title="Ir para janocaminho.com.br"
          >
            <span className="h-5 w-5 rounded-full overflow-hidden bg-slate-900/70 ring-1 ring-white/35">
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full object-cover object-center" />
            </span>
            <span className="hidden sm:inline">Powered by</span>
            <span className="font-bold">Já no Caminho</span>
          </a>
          {onToggleHeader && (
            <div className="flex items-center rounded-full bg-white/12 border border-white/25 p-0.5 text-[11px] sm:text-xs font-semibold">
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
              {storeSegmentLabel && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Segmento: <span className="font-semibold text-slate-700">{storeSegmentLabel}</span>
                </div>
              )}
              {storeLocation && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Localização: <span className="font-semibold text-slate-700">{storeLocation}</span>
                </div>
              )}
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
