// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { ChefHat, LayoutDashboard, LogOut, ShoppingCart } from 'lucide-react';
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
      <div className="flex flex-wrap items-center gap-2">
        <PlanBadge
          planName={planDetails?.planName}
          displayName={planDetails?.displayName}
          variant="dark"
          details={planDetails}
        />
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition flex items-center gap-1"
        >
          <LayoutDashboard size={14} /> Dashboard
        </button>
        <button
          onClick={() => navigate('/admin/orders')}
          className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition flex items-center gap-1"
        >
          <LayoutDashboard size={14} /> Pedidos
        </button>
        <button
          onClick={() => navigate('/admin/queue')}
          className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition flex items-center gap-1"
        >
          <ChefHat size={14} /> Fila
        </button>
        <button
          onClick={() => navigate(storeSlug ? `/${storeSlug}` : '/')}
          className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition flex items-center gap-1"
        >
          <ShoppingCart size={14} /> Vitrine
        </button>
        <button
          onClick={() => {
            logout();
            navigate('/admin');
          }}
          className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 transition flex items-center gap-1"
        >
          <LogOut size={14} /> Sair
        </button>
      </div>
    </header>
  );
}
