// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import DashboardView from '../components/Admin/DashboardView';
import { ProductManager } from '../components/Admin/ProductManager';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { StoreIdentityCard } from '../components/Admin/StoreIdentityCard';
import { OpeningHoursCard } from '../components/Admin/OpeningHoursCard';
import { storeService } from '../services/storeService';
import { AdminHeader } from '../components/Admin/AdminHeader';
import { BrandingSettings } from '../components/Admin/BrandingSettings';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

interface Props {
  session?: any;
}

export function AdminDashboard({ session: sessionProp }: Props) {
  const navigate = useNavigate();
  const { auth, hydrated, setAuth } = useAuth();
  const { branding, setBranding } = useTheme();

  const session = useMemo(() => sessionProp || auth, [sessionProp, auth]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'resumo' | 'produtos' | 'config' | 'fila'>('resumo');

  const storeId = session?.store?.id;
  const storeSlug = session?.store?.slug;
  const socialLinks = session?.store?.settings?.socialLinks || [];
  const whatsappNumber = session?.store?.owner?.phone || '';
  const instagramLink = socialLinks.find((link) => link?.type === 'instagram')?.value;
  const instagramHandle = instagramLink ? `@${instagramLink.replace('@', '')}` : '';
  const manualOpen = session?.store?.open ?? true;
  const [savingStatus, setSavingStatus] = useState(false);
  const [brandingDraft, setBrandingDraft] = useState(() => ({
    brandName: session?.store?.name || '',
    logoUrl: resolveAssetUrl(session?.store?.settings?.logoUrl) || '',
    logoFile: '',
    primaryColor: session?.store?.settings?.primaryColor || '#b91c1c',
    secondaryColor: session?.store?.settings?.secondaryColor || '#111827',
    instagram: instagramHandle?.replace('@', '') || '',
  }));
  const [savingBranding, setSavingBranding] = useState(false);

  const updateAuthStore = (updates) => {
    if (!auth?.store) return;
    setAuth({
      ...auth,
      store: {
        ...auth.store,
        ...updates,
        settings: {
          ...auth.store.settings,
          ...(updates.settings || {}),
        },
      },
    });
  };


  /* =========================
   * PROTEÇÃO DE ROTA (ADMIN)
   * ========================= */
  useEffect(() => {
    console.count('AdminDashboard guard effect');
    if (!hydrated) return;

    if (!session?.token || session?.user?.role !== 'ADMIN' || !session?.store) {
      navigate('/admin');
      return;
    }

  }, [hydrated, navigate, session?.store, session?.token, session?.user?.role]);

  useEffect(() => {
    setBrandingDraft({
      brandName: session?.store?.name || '',
      logoUrl: resolveAssetUrl(session?.store?.settings?.logoUrl) || '',
      logoFile: '',
      primaryColor: session?.store?.settings?.primaryColor || '#b91c1c',
      secondaryColor: session?.store?.settings?.secondaryColor || '#111827',
      instagram: instagramHandle?.replace('@', '') || '',
    });
  }, [
    session?.store?.name,
    session?.store?.settings?.logoUrl,
    session?.store?.settings?.primaryColor,
    session?.store?.settings?.secondaryColor,
    instagramHandle,
  ]);

  /* =========================
   * CARREGA PRODUTOS + PEDIDOS
   * ========================= */
  useEffect(() => {
    if (!storeId && !storeSlug) return;

    const storeIdentifier = storeId || storeSlug;

    const unsubscribeProducts = productService.subscribe(setProducts, storeIdentifier);
    const unsubscribeOrders = orderService.subscribeAll(storeIdentifier, setOrders);

    return () => {
      unsubscribeProducts?.();
      unsubscribeOrders?.();
    };
  }, [storeId, storeSlug]);

  /* =========================
   * CLIENTES PARA RELATÓRIO
   * ========================= */
  const customers = useMemo(() => {
    const byPhone = new Map();

    (orders || []).forEach((order) => {
      const key = order.phone || order.customerName || order.id;
      if (!byPhone.has(key)) {
        byPhone.set(key, { name: order.customerName || 'Cliente', phone: order.phone || '-' });
      }
    });

    return Array.from(byPhone.values());
  }, [orders]);

  /* =========================
   * RENDER
   * ========================= */
  if (!session?.store) {
    return <div style={{ padding: 24 }}>Carregando painel da loja...</div>;
  }


  const toggleManualOpen = async () => {
    if (!storeId) return;
    setSavingStatus(true);
    try {
      const nextOpen = !manualOpen;
      const updated = await storeService.setStatus(storeId, nextOpen);
      updateAuthStore({ open: updated?.open ?? nextOpen });
    } catch (err) {
      console.error('Erro ao atualizar status manual', err);
      setError('Nao foi possivel atualizar o status da loja.');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!storeId) return;
    setSavingBranding(true);
    setError('');
    try {
      const payload = {
        name: brandingDraft.brandName,
        logoFile: brandingDraft.logoFile || undefined,
        logoUrl: brandingDraft.logoFile ? undefined : brandingDraft.logoUrl || undefined,
        primaryColor: brandingDraft.primaryColor,
        secondaryColor: brandingDraft.secondaryColor,
        socialLinks: brandingDraft.instagram ? [{ type: 'instagram', value: brandingDraft.instagram }] : [],
      };
      const updated = await storeService.update(storeId, payload);
      updateAuthStore(updated);
      setBranding({
        primaryColor: updated?.settings?.primaryColor,
        secondaryColor: updated?.settings?.secondaryColor,
        logoUrl: updated?.settings?.logoUrl,
        brandName: updated?.name,
      });
    } catch (err) {
      console.error('Erro ao salvar identidade', err);
      setError('Nao foi possivel salvar a identidade da loja.');
    } finally {
      setSavingBranding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <AdminHeader contextLabel="Painel da Loja" />

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'resumo', label: 'Resumo' },
            { id: 'produtos', label: 'Produtos' },
            { id: 'config', label: 'Configurações' },
            { id: 'fila', label: 'Fila do churrasqueiro' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                activeTab === tab.id
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'resumo' && <DashboardView orders={orders} customers={customers} />}

        {activeTab === 'produtos' && <ProductManager products={products} />}

        {activeTab === 'config' && (
          <div className="space-y-4">
            <BrandingSettings branding={brandingDraft} onChange={setBrandingDraft} storeSlug={storeSlug} />
            <div className="flex justify-end">
              <button
                onClick={handleSaveBranding}
                disabled={savingBranding}
                className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {savingBranding ? 'Salvando...' : 'Salvar identidade'}
              </button>
            </div>
            <StoreIdentityCard
              branding={branding}
              socialLinks={socialLinks}
              manualOpen={manualOpen}
              onToggleOpen={savingStatus ? undefined : toggleManualOpen}
              whatsappNumber={whatsappNumber}
            />
            <OpeningHoursCard />
          </div>
        )}

        {activeTab === 'fila' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <GrillQueue />
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    </div>
  );
}
