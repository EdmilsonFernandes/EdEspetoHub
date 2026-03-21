// @ts-nocheck
<<<<<<< HEAD
import React, { useMemo, useState } from 'react';
import { AdminHeader } from '../components/Admin/AdminHeader';
import { CaretDown } from '@phosphor-icons/react';
=======
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminHeader } from '../components/Admin/AdminHeader';
import { AdminMobileBottomNav } from '../components/Admin/AdminMobileBottomNav';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChartBar, CheckSquare, CreditCard, Gear, Package, ShoppingCart, SignOut, Scooter, Star, X, UsersThree } from '@phosphor-icons/react';
>>>>>>> main

interface AdminLayoutProps {
  children: React.ReactNode;
  contextLabel?: string;
  showHeader?: boolean;
<<<<<<< HEAD
=======
  fluid?: boolean;
>>>>>>> main
}

export function AdminLayout({
  children,
  contextLabel = 'Painel',
  showHeader = true,
<<<<<<< HEAD
}: AdminLayoutProps) {
  const [headerVisible, setHeaderVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('adminHeader:visible');
    return stored ? stored === 'true' : true;
  });
  const handleToggleHeader = () => {
    setHeaderVisible((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminHeader:visible', String(next));
        window.dispatchEvent(new CustomEvent('adminHeader:toggle', { detail: { visible: next } }));
      }
      return next;
    });
  };
  const shouldShowHeader = useMemo(() => showHeader && headerVisible, [showHeader, headerVisible]);

  return (
    <div className="min-h-screen bg-slate-50" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <div className="mx-auto p-4 space-y-6">
        {shouldShowHeader && (
          <AdminHeader contextLabel={contextLabel} onToggleHeader={handleToggleHeader} />
        )}
        {!shouldShowHeader && showHeader && (
          <div className="sticky top-3 z-10">
            <div className="mx-auto max-w-md bg-white/90 backdrop-blur rounded-full border border-slate-200 shadow-md px-3 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Modo foco da fila
              </div>
              <button
                type="button"
                onClick={handleToggleHeader}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                <CaretDown size={14} weight="duotone" className="rotate-180" />
                Mostrar painel
              </button>
            </div>
          </div>
        )}
        {children}
      </div>
=======
  fluid = false,
}: AdminLayoutProps) {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const userRole = String(auth?.user?.role || '').toUpperCase();
  const isOperatorUser = userRole === 'OPERATOR' || userRole === 'CHURRASQUEIRO';
  const storeSlug = String(auth?.store?.slug || '').trim();
  const isVip = Boolean(auth?.store?.settings?.planExempt || auth?.subscription?.planExempt);
  const planName = String(auth?.subscription?.plan?.name || '').toLowerCase();
  const subscriptionStatus = String(auth?.subscription?.status || '').toUpperCase();
  const canUseMotoboys = Boolean(
    isVip ||
      auth?.features?.motoboyManagement ||
      subscriptionStatus === 'TRIAL' ||
      planName.includes('pro') ||
      planName.includes('vip')
  );

  const mobileNavItems = useMemo(
    () =>
      (isOperatorUser
        ? [
            { id: 'fila', label: 'Pedidos ao vivo', icon: CheckSquare },
            { id: 'cardapio', label: 'Catálogo', icon: Package },
          ]
        : [
            { id: 'resumo', label: 'Resumo', icon: ChartBar },
            { id: 'fila', label: 'Pedidos ao vivo', icon: CheckSquare },
            { id: 'vendas', label: 'Vendas', icon: ShoppingCart },
            { id: 'produtos', label: 'Produtos', icon: Package },
            { id: 'cardapio', label: 'Catálogo', icon: ShoppingCart },
            { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
            { id: 'motoboys', label: 'Entregadores', icon: Scooter, disabled: !canUseMotoboys },
            { id: 'usuarios', label: 'Usuários', icon: UsersThree },
            { id: 'config', label: 'Configurações', icon: Gear },
            { id: 'avaliacoes', label: 'Avaliações', icon: Star },
          ]),
    [isOperatorUser, canUseMotoboys]
  );

  useEffect(() => {
    const open = () => setMobileNavOpen(true);
    window.addEventListener('admin:open-global-nav', open as EventListener);
    return () => window.removeEventListener('admin:open-global-nav', open as EventListener);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('admin-mobile-menu-open', mobileNavOpen);
    window.dispatchEvent(new CustomEvent('admin:mobile-menu', { detail: { open: mobileNavOpen } }));
    return () => {
      document.body.classList.remove('admin-mobile-menu-open');
      window.dispatchEvent(new CustomEvent('admin:mobile-menu', { detail: { open: false } }));
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    // Reset any global overflow/class leak from public pages when entering admin routes.
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.classList.remove('admin-mobile-menu-open');
  }, [location.pathname]);

  const handleNavSelect = (id: string) => {
    if (id === 'fila') {
      navigate('/admin/queue');
      setMobileNavOpen(false);
      return;
    }
    if (id === 'vendas') {
      navigate('/admin/orders');
      setMobileNavOpen(false);
      return;
    }
    if (id === 'cardapio') {
      if (storeSlug) navigate(`/${storeSlug}`);
      setMobileNavOpen(false);
      return;
    }
    if (id === 'motoboys' && !canUseMotoboys) {
      navigate('/admin/renewal?focus=pro');
      setMobileNavOpen(false);
      return;
    }
    navigate('/admin/dashboard', { state: { activeTab: id } });
    setMobileNavOpen(false);
  };

  return (
    <div className="ds-admin-bg overflow-x-clip pb-24 lg:pb-0">
      <div
        key={location.pathname}
        className={
          fluid
            ? 'w-full px-3 py-3 sm:px-4 sm:py-4 lg:pl-0 lg:pr-10 lg:py-4 xl:pr-12 2xl:pr-14 space-y-3 sm:space-y-4'
            : 'w-full max-w-[1600px] mx-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-4 xl:px-8 space-y-3 sm:space-y-4'
        }
      >
        {showHeader && (
          <AdminHeader contextLabel={contextLabel} />
        )}
        {children}
      </div>
      <AdminMobileBottomNav />
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-[9999] bg-black/55 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)}>
          <aside
            className="h-full w-[85%] max-w-[360px] bg-white border-r border-slate-200 shadow-2xl p-4 flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Navegação</p>
                <p className="text-sm font-bold text-slate-900 truncate">{auth?.user?.fullName || auth?.user?.name || auth?.user?.email || 'Usuário'}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
                aria-label="Fechar menu"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
            <div className="pt-3 space-y-2 flex-1 overflow-y-auto">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavSelect(item.id)}
                    className={`w-full min-h-12 px-3 py-3 rounded-xl border text-left text-sm font-semibold flex items-center justify-between ${
                      item.disabled
                        ? 'border-violet-200 bg-violet-50 text-violet-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon size={16} weight="duotone" />
                      {item.label}
                    </span>
                    {item.disabled && <span className="text-[10px] font-bold rounded-full bg-violet-100 text-violet-700 px-2 py-0.5">Pro</span>}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                setMobileNavOpen(false);
                navigate('/admin');
              }}
              className="mt-3 w-full min-h-12 px-3 py-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <SignOut size={16} weight="bold" />
              Sair
            </button>
          </aside>
        </div>
      )}
>>>>>>> main
    </div>
  );
}
