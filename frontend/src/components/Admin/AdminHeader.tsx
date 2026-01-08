// @ts-nocheck
import { LayoutDashboard, LogOut, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { subscriptionService } from '../../services/subscriptionService';
import { PlanBadge } from '../PlanBadge';

type Props = {
  contextLabel?: string;
};

export function AdminHeader({ contextLabel = 'Painel da Loja' }: Props) {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const { branding } = useTheme();
  const [planDetails, setPlanDetails] = useState(null);

  const storeName = branding?.brandName || auth?.store?.name;
  const storeSlug = auth?.store?.slug;
  const socialLinks = auth?.store?.settings?.socialLinks || [];
  const instagramLink = socialLinks.find((link) => link?.type === 'instagram')?.value;
  const instagramHandle = instagramLink ? `@${instagramLink.replace('@', '')}` : '';

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
          {storeSlug && <p className="text-xs opacity-80">Id da loja: {storeSlug}</p>}
          {instagramHandle && (
            <a
              href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs opacity-80 hover:opacity-100"
            >
              Instagram {instagramHandle}
            </a>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <PlanBadge
          planName={planDetails?.planName}
          displayName={planDetails?.displayName}
          variant="dark"
          details={planDetails}
        />

        {/* Main Actions */}
        <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
          {navigationGroups.main.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="px-3 py-2 rounded-md text-xs font-semibold hover:bg-white/20 transition flex items-center gap-1.5"
                title={item.label}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Store Actions */}
        <div className="flex items-center gap-1">
          {navigationGroups.store.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/15 hover:bg-white/25 transition flex items-center gap-1.5"
                title={item.label}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{item.label}</span>
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
          className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 transition flex items-center gap-1.5 border border-red-300/20"
          title="Sair do sistema"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
