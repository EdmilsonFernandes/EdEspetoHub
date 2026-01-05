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
import { ChefHat, ShoppingCart, LayoutDashboard, LogOut } from 'lucide-react';
import { StoreIdentityCard } from '../components/Admin/StoreIdentityCard';
import { OpeningHoursCard } from '../components/Admin/OpeningHoursCard';
import { storeService } from '../services/storeService';

interface Props {
  session?: any;
}

export function AdminDashboard({ session: sessionProp }: Props) {
  const navigate = useNavigate();
  const { auth, hydrated, setAuth, logout } = useAuth();
  const { branding } = useTheme();

  const session = useMemo(() => sessionProp || auth, [sessionProp, auth]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'resumo' | 'produtos' | 'config' | 'fila'>('resumo');

  const storeId = session?.store?.id;
  const storeSlug = session?.store?.slug;
  const storeName = session?.store?.name;
  const storeLogo = branding?.logoUrl;
  const socialLinks = session?.store?.settings?.socialLinks || [];
  const whatsappNumber = session?.store?.owner?.phone || '';
  const instagramLink = socialLinks.find((link) => link?.type === 'instagram')?.value;
  const instagramHandle = instagramLink ? `@${instagramLink.replace('@', '')}` : '';
  const manualOpen = session?.store?.open ?? true;
  const [savingStatus, setSavingStatus] = useState(false);

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
              {instagramHandle && (
                <a
                  href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs opacity-80 hover:opacity-100"
                >
                  {instagramHandle}
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-sm font-semibold">Tema ativo</p>
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => navigate('/admin/queue')}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition flex items-center gap-1"
              >
                <ChefHat size={14} /> Fila do churrasqueiro
              </button>
              <button
                onClick={() => navigate('/admin/orders')}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition flex items-center gap-1"
              >
                <LayoutDashboard size={14} /> Pedidos
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
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => navigate('/admin/queue')}
                className="px-2.5 py-2 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition flex items-center gap-1"
              >
                <ChefHat size={14} />
              </button>
              <button
                onClick={() => navigate('/admin/orders')}
                className="px-2.5 py-2 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition flex items-center gap-1"
              >
                <LayoutDashboard size={14} />
              </button>
              <button
                onClick={() => navigate(storeSlug ? `/${storeSlug}` : '/')}
                className="px-2.5 py-2 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition flex items-center gap-1"
              >
                <ShoppingCart size={14} />
              </button>
              <button
                onClick={() => {
                  logout();
                  navigate('/admin');
                }}
                className="px-2.5 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 transition flex items-center gap-1"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </header>

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
