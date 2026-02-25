// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Browsers } from '@phosphor-icons/react';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { AdminLayout } from '../layouts/AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { AppHeader } from '../components/common/AppHeader';

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

export function AdminQueue() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const storeSlug = auth?.store?.slug;
  const storeLogo = resolveAssetUrl(auth?.store?.settings?.logoUrl || auth?.store?.logoUrl || '');
  const storeName = String(auth?.store?.name || 'Minha loja');
  const segment =
    segmentLabelMap[String(auth?.store?.settings?.segment || 'outros').toLowerCase()] || 'Comércio';
  const city = [auth?.store?.settings?.city, String(auth?.store?.settings?.state || '').toUpperCase()].filter(Boolean).join(' • ');

  if (!auth?.store) {
    return <div style={{ padding: 24 }}>Carregando fila da loja...</div>;
  }

  return (
    <AdminLayout contextLabel="Central de Pedidos" showHeader={false}>
      <div className="mx-auto w-full max-w-[1320px] space-y-4">
        <AppHeader
          variant="operations"
          storeName={storeName}
          storeLogo={storeLogo}
          bannerUrl={auth?.store?.settings?.bannerUrl || ''}
          subtitle="Central de Pedidos"
          status="Operação ao vivo"
          segment={segment}
          city={city}
          actions={[
            {
              id: 'dashboard',
              label: 'Painel',
              icon: <Browsers size={14} weight="duotone" />,
              tone: 'ghost',
              onClick: () => navigate('/admin/dashboard'),
            },
            {
              id: 'store',
              label: 'Vitrine',
              icon: <BookOpen size={14} weight="duotone" />,
              tone: 'ghost',
              onClick: () => {
                if (storeSlug) navigate(`/${storeSlug}`);
              },
            },
            {
              id: 'focus',
              label: 'Modo foco',
              tone: 'primary',
              onClick: () => window.dispatchEvent(new CustomEvent('adminHeader:set', { detail: { visible: false } })),
            },
          ]}
        />

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm overflow-x-hidden">
          <GrillQueue />
        </div>
      </div>
    </AdminLayout>
  );
}

