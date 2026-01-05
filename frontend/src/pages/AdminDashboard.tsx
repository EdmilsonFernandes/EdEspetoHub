// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import DashboardView from '../components/Admin/DashboardView';
import { ProductManager } from '../components/Admin/ProductManager';
import { GrillQueue } from '../components/Admin/GrillQueue';

interface Props {
  session?: any;
}

export function AdminDashboard({ session: sessionProp }: Props) {
  const navigate = useNavigate();
  const { auth, hydrated } = useAuth();
  const { setBranding, branding } = useTheme();

  const session = useMemo(() => sessionProp || auth, [sessionProp, auth]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState('');
  const brandingKeyRef = useRef('');

  const storeId = session?.store?.id;
  const storeSlug = session?.store?.slug;
  const storeName = session?.store?.name;
  const storeLogo = session?.store?.settings?.logoUrl;

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

    const primaryColor = session?.store?.settings?.primaryColor;
    const secondaryColor = session?.store?.settings?.secondaryColor;
    const logoUrl = session?.store?.settings?.logoUrl;
    const name = session?.store?.name;

    const key = `${session?.store?.id ?? ''}|${primaryColor ?? ''}|${secondaryColor ?? ''}|${logoUrl ?? ''}|${name ?? ''}`;
    if (!session?.store?.id) return;
    if (brandingKeyRef.current === key) return;
    brandingKeyRef.current = key;

    setBranding({
      primaryColor,
      secondaryColor,
      logoUrl,
      brandName: name,
    });
  }, [
    hydrated,
    navigate,
    session?.store?.id,
    session?.store?.name,
    session?.store?.settings?.logoUrl,
    session?.store?.settings?.primaryColor,
    session?.store?.settings?.secondaryColor,
    session?.token,
    session?.user?.role,
    setBranding,
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

  return (
    <div className="min-h-screen bg-slate-50" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <header
          className="p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between gap-4"
          style={{
            background: `linear-gradient(120deg, ${branding?.primaryColor || '#b91c1c'} 0%, ${branding?.secondaryColor || '#111827'} 100%)`,
            color: '#fff',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden">
              {storeLogo ? (
                <img src={storeLogo} alt={storeName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black">{storeName?.slice(0, 2)?.toUpperCase() || 'ED'}</span>
              )}
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide font-semibold opacity-90">Painel da Loja</p>
              <h1 className="text-2xl font-black leading-tight">{storeName}</h1>
              <p className="text-sm opacity-80">Slug: {storeSlug}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">Tema ativo</p>
            <p className="text-xs opacity-80">Cores aplicadas mesmo sem produtos/pedidos</p>
          </div>
        </header>

        <DashboardView orders={orders} customers={customers} />

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ProductManager products={products} />
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Identidade da loja</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Cor primária</span>
                  <span className="font-semibold" style={{ color: branding?.primaryColor }}>
                    {branding?.primaryColor || '#b91c1c'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cor secundária</span>
                  <span className="font-semibold" style={{ color: branding?.secondaryColor }}>
                    {branding?.secondaryColor || '#111827'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Logo</span>
                  <span className="font-semibold">{storeLogo ? 'Aplicada' : 'Padrão'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-3">Sessão</h3>
              <p className="text-sm text-slate-600">Token e storeId persistidos para chamadas autenticadas.</p>
              <ul className="mt-3 space-y-1 text-sm text-slate-700">
                <li><strong>Store ID:</strong> {storeId}</li>
                <li><strong>Slug:</strong> {storeSlug}</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <GrillQueue />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    </div>
  );
}
