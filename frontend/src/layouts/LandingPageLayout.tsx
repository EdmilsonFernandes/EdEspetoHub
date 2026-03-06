// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { ChatCircleText, House, List, Moon, SignOut, Storefront, Sun, Truck, X } from '@phosphor-icons/react';

interface LandingPageLayoutProps {
  children: React.ReactNode;
}

export function LandingPageLayout({ children }: LandingPageLayoutProps) {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const goToDemoGuide = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('scrollToDemoFlow', 'true');
    }
    navigate('/');
  };

  const navLinks = [
    { id: 'home', label: 'Início', onClick: () => navigate('/') },
    { id: 'portfolio', label: 'Portfólio', onClick: () => navigate('/portfolio') },
    { id: 'architecture', label: 'Arquitetura', onClick: () => navigate('/arquitetura') },
  ];

  const mobilePrimaryNav = useMemo(
    () => [
      { id: 'home', label: 'Início', icon: House, onClick: () => navigate('/'), active: location.pathname === '/' },
      {
        id: 'admin',
        label: 'Admin',
        icon: Storefront,
        onClick: () => navigate('/admin'),
        active: location.pathname.startsWith('/admin'),
      },
      {
        id: 'motoboy',
        label: 'Entregador',
        icon: Truck,
        onClick: () => navigate('/motoboy/login'),
        active: location.pathname.startsWith('/motoboy'),
      },
      { id: 'menu', label: 'Menu', icon: List, onClick: () => setMobileMenuOpen(true), active: mobileMenuOpen },
    ],
    [location.pathname, mobileMenuOpen, navigate]
  );

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(47,157,247,0.14),_transparent_48%),radial-gradient(circle_at_bottom_right,_rgba(95,211,90,0.16),_transparent_45%)] bg-gray-50 dark:bg-slate-950"
      style={{ fontFamily: 'Inter, Geist, system-ui, -apple-system, Segoe UI, sans-serif' }}
    >
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[linear-gradient(120deg,rgba(5,11,22,0.9),rgba(17,24,39,0.9))] backdrop-blur-xl shadow-[0_20px_40px_-30px_rgba(0,0,0,0.75)]">
        <div className="h-1 bg-[linear-gradient(90deg,#2f9df7,#18b3f9,#5fd35a)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 sm:py-4">
            <a href="https://www.janocaminho.com.br" className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 sm:hidden rounded-2xl bg-slate-900 shadow-[0_14px_28px_-18px_rgba(47,157,247,0.7)] ring-1 ring-sky-200/70 overflow-hidden shrink-0">
                <img
                  src="/janocaminho.jpg"
                  alt="Já no Caminho"
                  className="h-full w-full object-cover object-[12%_center]"
                  draggable={false}
                />
              </div>
              <div className="hidden sm:block h-12 w-36 rounded-2xl bg-slate-900 shadow-[0_14px_28px_-18px_rgba(47,157,247,0.7)] ring-1 ring-sky-200/70 overflow-hidden shrink-0">
                <img
                  src="/janocaminho.jpg"
                  alt="Já no Caminho"
                  className="h-full w-full object-cover object-center"
                  draggable={false}
                />
              </div>
              <div className="leading-tight min-w-0">
                <p className="text-base sm:text-xl font-black text-white truncate">Já no Caminho</p>
                <p className="hidden sm:block text-xs text-slate-300">Pedidos e gestão em um só lugar</p>
              </div>
            </a>
            <div className="sm:hidden flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="cursor-pointer p-2 rounded-full border border-white/20 text-slate-100 hover:bg-white/10 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon size={18} weight="duotone" /> : <Sun size={18} weight="duotone" />}
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex items-center justify-center p-2 rounded-full border border-white/20 text-slate-100 hover:bg-white/10 transition-colors"
                aria-label="Abrir menu"
              >
                <List size={18} weight="bold" />
              </button>
            </div>

            <nav className="hidden lg:flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1.5 shadow-sm">
              {navLinks.map((item) => {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold text-slate-100 hover:bg-white/10 transition"
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="hidden sm:flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              {!auth && (
                <button
                  onClick={() => navigate('/create')}
                  className="inline-flex px-4 py-2 text-sm rounded-full bg-brand-gradient text-white font-black shadow-[0_16px_30px_-20px_rgba(239,68,68,0.9)] hover:opacity-95 active:scale-[0.99] transition"
                >
                  Criar loja
                </button>
              )}
              <button
                onClick={() => navigate('/admin')}
                className="inline-flex px-3 py-2 sm:px-4 text-sm rounded-full border border-white/20 text-slate-100 hover:bg-white/10 transition-all"
              >
                Admin loja
              </button>
              <button
                onClick={() => navigate('/motoboy/login')}
                className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 text-sm rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-all"
              >
                <Truck size={16} weight="duotone" />
                Entrar entregador
              </button>
              {auth && (
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 text-sm rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50 transition-all"
                >
                  <SignOut size={16} weight="bold" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              )}
              <button
                onClick={toggleTheme}
                className="cursor-pointer p-2 rounded-full border border-white/20 text-slate-100 hover:bg-white/10 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon size={18} weight="duotone" /> : <Sun size={18} weight="duotone" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="pb-24 sm:pb-0"> {children} </main>

      <div className={`sm:hidden fixed inset-0 z-[75] transition ${mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className={`absolute inset-0 bg-slate-950/45 transition-opacity duration-250 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          aria-label="Fechar menu"
        />
        <aside
          className={`absolute right-0 top-0 h-full w-[84vw] max-w-[22rem] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Menu mobile"
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">Menu</p>
              <p className="text-xs text-slate-500">Já no Caminho</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              aria-label="Fechar"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
          <div className="p-4 space-y-2">
            {!auth && (
              <button
                type="button"
                onClick={() => navigate('/create')}
                className="w-full inline-flex items-center justify-between rounded-xl px-4 py-3 bg-brand-gradient text-white font-black"
              >
                Criar loja
                <Storefront size={18} weight="duotone" />
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/portfolio')}
              className="w-full inline-flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Portfólio
              <Storefront size={18} weight="duotone" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/arquitetura')}
              className="w-full inline-flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Arquitetura
              <House size={18} weight="duotone" />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full inline-flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              {theme === 'light' ? 'Modo escuro' : 'Modo claro'}
              {theme === 'light' ? <Moon size={18} weight="duotone" /> : <Sun size={18} weight="duotone" />}
            </button>
            {auth && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="w-full inline-flex items-center justify-between rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300"
              >
                Sair
                <SignOut size={18} weight="bold" />
              </button>
            )}
          </div>
        </aside>
      </div>

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-[70] border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_-12px_24px_-20px_rgba(2,6,23,0.9)]">
        <div className="grid grid-cols-4 gap-1 px-2 pt-1 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
          {mobilePrimaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center rounded-xl py-2 text-[10px] font-bold tracking-[0.08em] transition ${
                  item.active
                    ? 'text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Icon size={18} weight={item.active ? 'fill' : 'duotone'} />
                <span className="mt-1 leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <a
        href="https://wa.me/5512997822784"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-24 sm:bottom-5 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-white shadow-[0_18px_42px_-24px_rgba(5,150,105,0.75)] hover:bg-emerald-500 transition"
        aria-label="Falar no WhatsApp"
      >
        <ChatCircleText size={18} weight="duotone" />
        <span className="hidden sm:inline text-sm font-bold">WhatsApp</span>
      </a>
      {/* Footer */}
      <footer className="bg-gradient-to-b from-transparent to-slate-900/50 dark:to-black text-gray-300 dark:text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl font-black text-white">Já no Caminho</span>
              </div>
              <p className="text-sm text-gray-400">Plataforma completa para gestão de pedidos e entregas online.</p>
            </div>
            <div>
              <h3 className="font-bold text-white mb-3">Links rápidos</h3>
              <div className="space-y-2 text-sm">
                <button onClick={() => navigate('/create')} className="block hover:text-sky-400 transition-colors">
                  Criar Loja
                </button>
                <button onClick={goToDemoGuide} className="block hover:text-sky-400 transition-colors">
                  Ver Demo
                </button>
                <button onClick={() => navigate('/arquitetura')} className="block hover:text-sky-400 transition-colors">
                  Arquitetura
                </button>
                <a href="/terms" className="block hover:text-sky-400 transition-colors">
                  Termos e Privacidade
                </a>
                <button onClick={() => navigate('/admin')} className="block hover:text-sky-400 transition-colors">
                  Admin
                </button>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white mb-3">Contato</h3>
              <a href="mailto:contato@janocaminho.com.br" className="text-sm text-gray-400">
                contato@janocaminho.com.br
              </a>
            </div>
            <div>
              <h3 className="font-bold text-white mb-3">Desenvolvimento</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <p>
                  <span className="text-white font-semibold">Edmilson Lopes</span>
                  <br />
                  Arquiteto principal e liderança técnica
                </p>
                <p>
                  Equipe Já no Caminho
                  <br />
                  Frontend, backend, produto e operação
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500 space-y-1">
            <p>Edmilson Tecnologia da Informação • CNPJ 44.771.427/0001-69</p>
            © {new Date().getFullYear()} Já no Caminho. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

