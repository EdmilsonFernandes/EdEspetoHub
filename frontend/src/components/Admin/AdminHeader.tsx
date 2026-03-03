// @ts-nocheck
import { SignOut, Globe, Sparkle, Storefront, List, X } from '@phosphor-icons/react';
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
  const [compactDesktop, setCompactDesktop] = useState(false);
  const [mobileCompact, setMobileCompact] = useState(false);

  const storeSlug = auth?.store?.slug;
  const storeNameFromAuth = auth?.store?.name;
  const [storeNameOverride, setStoreNameOverride] = useState('');
  const storeName = storeNameOverride || storeNameFromAuth || branding?.brandName;
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
  const headerLabel = (contextLabel || 'Painel admin').trim() || 'Painel admin';
  const opsCards = [
    { id: 'segment', label: 'Segmento', value: storeSegmentLabel },
    { id: 'location', label: 'Local', value: storeLocation || 'Não definido' },
  ];

  const headerBackgroundStyle = {
    backgroundColor: '#0b1220',
    backgroundImage:
      'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(17,24,39,0.95) 60%, rgba(2,6,23,0.94) 100%)',
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
      if (!isDesktop) {
        setCompactDesktop(false);
        return;
      }
      const y = window.scrollY;
      setCompactDesktop((prev) => {
        if (prev) return y > 44;
        return y > 96;
      });
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleMobileCompact = () => {
      const mobile = window.innerWidth < 768;
      if (!mobile) {
        setMobileCompact(false);
        return;
      }
      const y = window.scrollY;
      setMobileCompact((prev) => {
        if (prev) return y > 28;
        return y > 72;
      });
    };
    handleMobileCompact();
    window.addEventListener('scroll', handleMobileCompact, { passive: true });
    window.addEventListener('resize', handleMobileCompact);
    return () => {
      window.removeEventListener('scroll', handleMobileCompact);
      window.removeEventListener('resize', handleMobileCompact);
    };
  }, []);

  useEffect(() => {
    const storeId = auth?.store?.id;
    if (!storeId) return;
    const loadPlan = async () => {
      try {
        const subscription = await subscriptionService.getByStore(storeId);
        setPlanDetails({
          status: subscription?.status || null,
          planName: subscription?.planExempt ? 'vip' : subscription?.plan?.name || '',
          displayName: subscription?.planExempt ? 'Isento de plano' : subscription?.plan?.displayName || '',
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
      className="relative z-[500] isolate w-full -mx-3 sm:-mx-4 lg:-mx-6 xl:-mx-8 rounded-2xl border border-slate-700/40 shadow-[0_14px_32px_-22px_rgba(15,23,42,0.38)] overflow-visible"
      style={headerBackgroundStyle}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/10" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />

      <div className={`md:hidden px-3 transition-all duration-200 ${mobileCompact ? 'py-1.5' : 'py-2'}`}>
        <div className={`w-full flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.05] px-2.5 ${mobileCompact ? 'py-1.5' : 'py-2'}`}>
          <div className={`${mobileCompact ? 'w-9 h-9 rounded-lg' : 'w-11 h-11 rounded-xl'} bg-white/95 ring-1 ring-white/80 overflow-hidden flex items-center justify-center shadow-[0_14px_28px_-18px_rgba(0,0,0,0.55)]`}>
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={storeName} className="w-full h-full object-contain p-1" />
            ) : (
              <span className="text-sm font-black text-slate-800">{storeName?.slice(0, 2)?.toUpperCase() || 'JC'}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-white/70">{headerLabel}</p>
            <h1 className={`${mobileCompact ? 'text-sm' : 'text-base'} font-black text-white truncate`}>{storeName}</h1>
            <p className="text-[11px] text-white/70 truncate">{storeSegmentLabel}{storeLocation ? ` • ${storeLocation}` : ''}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowMobileDetails(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white"
            aria-label="Abrir menu"
          >
            <List size={18} weight="bold" />
          </button>
        </div>
      </div>

      <div className={`hidden md:flex md:flex-col px-4 pb-1 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)_auto] gap-2 transition-all duration-200 ${compactDesktop ? 'pt-1 min-h-[88px] lg:items-center' : 'pt-1.5 min-h-[110px] lg:items-start'}`}>
        <div className="flex items-start gap-3 rounded-xl border border-white/16 bg-white/[0.05] backdrop-blur max-w-[920px] shadow-[0_10px_24px_-18px_rgba(0,0,0,0.52)] px-3 py-1.5">
          <div className={`rounded-xl bg-white/95 flex items-center justify-center overflow-hidden shadow-[0_14px_24px_-16px_rgba(0,0,0,0.5)] ring-1 ring-white/80 ${compactDesktop ? 'w-11 h-11' : 'w-14 h-14'}`}>
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={storeName} className="w-full h-full object-contain p-1" />
            ) : (
              <span className="text-xl font-black text-slate-800">{storeName?.slice(0, 2)?.toUpperCase() || 'CE'}</span>
            )}
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-[0.28em] font-semibold text-white/75">{headerLabel}</p>
              {planDetails?.planExempt && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] bg-emerald-100 text-emerald-700">
                  VIP
                </span>
              )}
            </div>
            <h1 className={`font-black leading-tight truncate max-w-[42ch] ${compactDesktop ? 'text-[18px] sm:text-[21px]' : 'text-[20px] sm:text-[25px]'}`}>{storeName}</h1>
            <div className={`${showMobileDetails ? 'flex' : 'hidden'} lg:flex flex-wrap items-center gap-2 text-xs`}>
              {visibleDesktopChips.map((chip) =>
                chip.href ? (
                  <a
                    key={chip.id}
                    href={chip.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/16 opacity-90 hover:opacity-100 hover:bg-white/14 transition"
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/16 opacity-90"
                  >
                    {chip.icon}
                    <span className="truncate">{chip.label}</span>
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {!compactDesktop && (
          <div className="hidden lg:grid grid-cols-1 gap-1.5 rounded-xl border border-white/14 bg-white/[0.05] backdrop-blur p-2 shadow-[0_8px_18px_-16px_rgba(0,0,0,0.36)]">
            {opsCards.map((card) => (
              <div key={card.id} className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">{card.label}</p>
                <p className="text-[13px] font-semibold text-white truncate">{card.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 rounded-xl border border-white/16 bg-white/[0.05] backdrop-blur px-2.5 py-1.5 shadow-[0_10px_20px_-16px_rgba(0,0,0,0.44)]">
          {showDetails && (
            <div className="hidden lg:flex items-center gap-2 bg-black/20 rounded-full px-2.5 py-1 border border-white/20" title="Conta logada">
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

      <div className={`hidden md:flex px-4 flex-col lg:flex-row lg:items-center lg:justify-end gap-2 rounded-b-2xl border-t border-white/10 transition-all duration-200 ${compactDesktop ? 'pb-1' : 'pb-2'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://www.janocaminho.com.br"
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/20 text-[11px] font-semibold text-white/90 hover:bg-white/12 hover:text-white transition ${compactDesktop ? 'lg:hidden' : ''}`}
            title="Ir para janocaminho.com.br"
          >
            <span className="h-5 w-5 rounded-full overflow-hidden bg-slate-900/70 ring-1 ring-white/35">
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full object-cover object-center" />
            </span>
            <span className="hidden sm:inline">Desenvolvido por</span>
            <span className="font-bold">Já no Caminho</span>
          </a>
          {onToggleHeader && (
            <div className="flex items-center rounded-full bg-white/8 border border-white/18 p-0.5 text-[11px] sm:text-xs font-semibold shadow-[0_6px_14px_-12px_rgba(0,0,0,0.35)]">
              <button
                type="button"
                className="px-3 py-1.5 rounded-full bg-white/12 text-white shadow-[0_4px_10px_-8px_rgba(0,0,0,0.3)]"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: true } }));
                }}
              >
                Mostrar painel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition flex items-center gap-1.5"
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
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-white/8 hover:bg-white/12 border border-white/18 text-xs font-semibold"
          >
            <SignOut size={14} weight="duotone" /> Sair
          </button>
        </div>
      </div>

      {showMobileDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm md:hidden flex items-end justify-center px-4 pb-6" onClick={() => setShowMobileDetails(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Menu da loja</p>
                <p className="text-lg font-bold text-slate-900 truncate">{storeName}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileDetails(false)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                aria-label="Fechar menu"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <div className="mt-3">
              <PlanBadge
                planName={planDetails?.planName}
                displayName={planDetails?.displayName}
                details={planDetails}
              />
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

            <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
              <a
                href="https://www.janocaminho.com.br"
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-4 w-4 rounded-full object-cover" />
                Já no Caminho
              </a>

              {onToggleHeader && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: true } }));
                      setShowMobileDetails(false);
                    }}
                  >
                    Mostrar painel
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 inline-flex items-center justify-center gap-1.5"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: false } }));
                      setShowMobileDetails(false);
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
              >
                <SignOut size={14} weight="duotone" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
