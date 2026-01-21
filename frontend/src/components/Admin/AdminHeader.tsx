// @ts-nocheck
import { LayoutDashboard, LogOut, Package, Globe, Instagram } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { subscriptionService } from '../../services/subscriptionService';
import { storeService } from '../../services/storeService';
import { PlanBadge } from '../PlanBadge';

type Props = {
  contextLabel?: string;
};

export function AdminHeader({ contextLabel = 'Painel da Loja' }: Props) {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const { branding } = useTheme();
  const [planDetails, setPlanDetails] = useState(null);
  const [showMobileDetails, setShowMobileDetails] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('adminHeader:details') === 'true';
  });

  const storeSlug = auth?.store?.slug;
  const storeNameFromAuth = auth?.store?.name;
  const [storeNameOverride, setStoreNameOverride] = useState('');
  const storeName =
    storeNameOverride ||
    (storeNameFromAuth &&
    storeSlug &&
    storeNameFromAuth.toLowerCase() === storeSlug.toLowerCase() &&
    branding?.brandName
      ? branding.brandName
      : storeNameFromAuth || branding?.brandName);
  const storeUrl = storeSlug ? `https://www.chamanoespeto.com.br/${storeSlug}` : '';
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

  const navigationGroups = {
    main: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    ],
    store: [
      { label: 'Vitrine', icon: Package, path: storeSlug ? `/${storeSlug}` : '/' },
    ],
  };

  useEffect(() => {
    const storeId = auth?.store?.id;
    if (!storeId) return;
    const loadPlan = async () => {
      try {
        const subscription = await subscriptionService.getByStore(storeId);
        setPlanDetails({
          planName: subscription?.plan?.name || '',
          displayName: subscription?.plan?.displayName || '',
          startDate: subscription?.startDate || null,
          endDate: subscription?.endDate || null,
          latestPaymentAt: subscription?.latestPaymentAt || null,
          latestPaymentStatus: subscription?.latestPaymentStatus || null,
          latestPaymentAmount: subscription?.latestPaymentAmount || null,
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

  return (
    <header
      className="p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
      style={{
        background: `linear-gradient(120deg, ${branding?.primaryColor || 'var(--color-primary)'} 0%, ${
          branding?.secondaryColor || 'var(--color-secondary)'
        } 100%)`,
        color: '#fff',
      }}
    >
      <div className="flex items-center gap-3 w-full md:w-auto justify-between">
        <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt={storeName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-black">{storeName?.slice(0, 2)?.toUpperCase() || 'CE'}</span>
          )}
        </div>
        <div>
          <p className="text-sm uppercase tracking-wide font-semibold opacity-90">{contextLabel}</p>
          <h1 className="text-xl font-black leading-tight">{storeName}</h1>
          <div className={`${showMobileDetails ? 'block' : 'hidden'} md:block mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 text-xs w-full max-w-full`}>
            {storeSlug && (
              <a
                href={storeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 opacity-95 hover:opacity-100 hover:bg-white/20 transition w-full sm:w-auto min-w-0"
              >
                <Globe size={12} />
                <span className="truncate">{storeUrl.replace('https://', '')}</span>
              </a>
            )}
            {instagramHandle && (
              <a
                href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 opacity-95 hover:opacity-100 hover:bg-white/20 transition w-full sm:w-auto min-w-0"
              >
                <Instagram size={12} />
                <span className="truncate">{instagramHandle}</span>
              </a>
            )}
          </div>
        </div>
        </div>
        <button
          type="button"
          onClick={() =>
            setShowMobileDetails((prev) => {
              const next = !prev;
              if (typeof window !== 'undefined') {
                localStorage.setItem('adminHeader:details', String(next));
              }
              return next;
            })
          }
          className="md:hidden px-3 py-2 rounded-full text-xs font-semibold bg-white/15 hover:bg-white/25 transition border border-white/20"
        >
          {showMobileDetails ? 'Ocultar' : 'Detalhes'}
        </button>
      </div>
      <div className={`w-full md:w-auto flex flex-col sm:flex-row md:items-center gap-3 ${showMobileDetails ? 'flex' : 'hidden'} md:flex`}>
        <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 border border-white/15 w-full sm:w-auto">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
            {userInitials || 'AD'}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-semibold">{userName}</span>
            <span className="text-[10px] opacity-80">{userRole}</span>
          </div>
        </div>
        <PlanBadge
          planName={planDetails?.planName}
          displayName={planDetails?.displayName}
          variant="dark"
          details={planDetails}
        />

        {/* Main Actions */}
        <div className="flex flex-wrap items-center gap-1 bg-white/10 rounded-lg p-1 w-full sm:w-auto">
          {navigationGroups.main.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="px-3 py-2 rounded-md text-[11px] sm:text-xs font-semibold hover:bg-white/20 transition flex flex-col sm:flex-row items-center gap-1.5 text-center"
                title={item.label}
              >
                <Icon size={14} />
                <span className="leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Store Actions */}
        <div className="flex flex-wrap items-center gap-1 w-full sm:w-auto">
          {navigationGroups.store.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="px-3 py-2 rounded-lg text-[11px] sm:text-xs font-semibold bg-white/15 hover:bg-white/25 transition flex flex-col sm:flex-row items-center gap-1.5 text-center"
                title={item.label}
              >
                <Icon size={14} />
                <span className="leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <button
          onClick={() => {
            logout();
            navigate('/admin');
          }}
          className="px-3 py-2 rounded-lg text-[11px] sm:text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 transition flex flex-col sm:flex-row items-center gap-1.5 border border-red-300/20 w-full sm:w-auto text-center"
          title="Sair do sistema"
        >
          <LogOut size={14} />
          <span className="leading-tight">Sair</span>
        </button>
      </div>
    </header>
  );
}
