// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { SignOut, Browsers, BookOpen, ChefHat } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { subscriptionService } from '../../services/subscriptionService';
import { AppHeader } from '../common/AppHeader';

type Props = {
  contextLabel?: string;
  onToggleHeader?: () => void;
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

export function AdminHeader({ contextLabel = 'Painel da Loja', onToggleHeader }: Props) {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const { branding } = useTheme();
  const [planLabel, setPlanLabel] = useState('');

  const storeSlug = auth?.store?.slug;
  const storeName = auth?.store?.name || branding?.brandName || 'Minha loja';
  const storeLogo = auth?.store?.settings?.logoUrl || branding?.logoUrl || '';
  const storeBanner = auth?.store?.settings?.bannerUrl || '';
  const userName = auth?.user?.fullName || auth?.user?.name || auth?.user?.email || 'Admin';
  const role = auth?.user?.role || 'ADMIN';
  const segment = segmentLabelMap[String(auth?.store?.settings?.segment || 'outros').toLowerCase()] || 'Comércio';
  const city = [auth?.store?.settings?.city, String(auth?.store?.settings?.state || '').toUpperCase()].filter(Boolean).join(' • ');

  useEffect(() => {
    const storeId = auth?.store?.id;
    if (!storeId) return;
    subscriptionService
      .getByStore(storeId)
      .then((subscription) => {
        if (subscription?.planExempt) {
          setPlanLabel('VIP');
          return;
        }
        const rawName = subscription?.plan?.displayName || subscription?.plan?.name || '';
        const cycle = subscription?.plan?.durationDays >= 360 ? 'Anual' : 'Mensal';
        setPlanLabel(rawName ? `${rawName} · ${cycle}` : '');
      })
      .catch(() => setPlanLabel(''));
  }, [auth?.store?.id]);

  const actions = useMemo(() => {
    const items = [
      {
        id: 'dashboard',
        label: 'Painel',
        icon: <Browsers size={14} weight="duotone" />,
        tone: 'ghost',
        onClick: () => navigate('/admin/dashboard'),
      },
      storeSlug
        ? {
            id: 'store',
            label: 'Vitrine',
            icon: <BookOpen size={14} weight="duotone" />,
            tone: 'ghost',
            onClick: () => navigate(`/${storeSlug}`),
          }
        : null,
      {
        id: 'queue',
        label: 'Operação',
        icon: <ChefHat size={14} weight="duotone" />,
        tone: 'ghost',
        onClick: () => navigate('/admin/queue'),
      },
      onToggleHeader
        ? {
            id: 'focus',
            label: 'Modo foco',
            tone: 'ghost',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: false } }));
            },
          }
        : null,
      {
        id: 'logout',
        label: 'Sair',
        icon: <SignOut size={14} weight="duotone" />,
        tone: 'danger',
        onClick: () => {
          logout();
          navigate('/admin');
        },
      },
    ].filter(Boolean);
    return items as any[];
  }, [navigate, logout, onToggleHeader, storeSlug]);

  return (
    <AppHeader
      variant="admin"
      storeName={storeName}
      storeLogo={storeLogo}
      bannerUrl={storeBanner}
      subtitle={contextLabel}
      status="Operando"
      city={city}
      segment={segment}
      plan={planLabel}
      userName={userName}
      role={role}
      actions={actions}
    />
  );
}

