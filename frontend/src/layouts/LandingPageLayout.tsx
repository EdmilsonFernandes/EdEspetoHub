// @ts-nocheck
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { ChatCircleText, Moon, SignOut, Storefront, Sun, Truck } from '@phosphor-icons/react';

interface LandingPageLayoutProps {
  children: React.ReactNode;
}

export function LandingPageLayout({ children }: LandingPageLayoutProps) {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const goToDemoGuide = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('scrollToDemoFlow', 'true');
    }
    navigate('/');
  };

  const navLinks = [
    { id: 'home', label: 'Início', onClick: () => navigate('/') },
    { id: 'portfolio', label: 'Portfólio', onClick: () => navigate('/portfolio') },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(47,157,247,0.14),_transparent_48%),radial-gradient(circle_at_bottom_right,_rgba(95,211,90,0.16),_transparent_45%)] bg-gray-50 dark:bg-slate-950">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[linear-gradient(120deg,rgba(5,11,22,0.9),rgba(17,24,39,0.9))] backdrop-blur-xl shadow-[0_20px_40px_-30px_rgba(0,0,0,0.75)]">
        <div className="h-1 bg-[linear-gradient(90deg,#2f9df7,#18b3f9,#5fd35a)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 sm:py-4">
            <a href="https://www.janocaminho.com.br" className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 sm:hidden rounded-2xl bg-slate-900 shadow-[0_14px_28px_-18px_rgba(47,157,247,0.7)] ring-1 ring-sky-200/70 overflow-hidden shrink-0">
                <img
                  src="/janocaminho.jpg"
                  alt="Jano Caminho"
                  className="h-full w-full object-cover object-[12%_center]"
                  draggable={false}
                />
              </div>
              <div className="hidden sm:block h-12 w-36 rounded-2xl bg-slate-900 shadow-[0_14px_28px_-18px_rgba(47,157,247,0.7)] ring-1 ring-sky-200/70 overflow-hidden shrink-0">
                <img
                  src="/janocaminho.jpg"
                  alt="Jano Caminho"
                  className="h-full w-full object-cover object-center"
                  draggable={false}
                />
              </div>
              <div className="leading-tight min-w-0">
                <p className="text-base sm:text-xl font-black text-white truncate">Jano Caminho</p>
                <p className="hidden sm:block text-xs text-slate-300">Pedidos e gestão em um só lugar</p>
              </div>
            </a>

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

          <div className="sm:hidden pb-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {!auth && (
                <button
                  type="button"
                  onClick={() => navigate('/create')}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-full bg-brand-gradient text-white font-black whitespace-nowrap shadow-sm"
                >
                  <Storefront size={14} weight="duotone" />
                  Criar loja
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-full border border-white/20 bg-white/10 text-slate-100 whitespace-nowrap"
              >
                Início
              </button>
              <button
                type="button"
                onClick={() => navigate('/portfolio')}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-full border border-white/20 bg-white/10 text-slate-100 whitespace-nowrap"
              >
                <Storefront size={14} weight="duotone" />
                Portfólio
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-full border border-white/20 bg-white/10 text-slate-100 whitespace-nowrap"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => navigate('/motoboy/login')}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 whitespace-nowrap"
              >
                <Truck size={14} weight="duotone" />
                Entregador
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-full border border-white/20 bg-white/10 text-slate-100 whitespace-nowrap"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon size={14} weight="duotone" /> : <Sun size={14} weight="duotone" />}
                {theme === 'light' ? 'Escuro' : 'Claro'}
              </button>
              {auth && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 whitespace-nowrap"
                >
                  <SignOut size={14} weight="bold" />
                  Sair
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main> {children} </main>
      <a
        href="https://wa.me/5512997822784"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-white shadow-[0_18px_42px_-24px_rgba(5,150,105,0.75)] hover:bg-emerald-500 transition"
        aria-label="Falar no WhatsApp"
      >
        <ChatCircleText size={18} weight="duotone" />
        <span className="hidden sm:inline text-sm font-bold">WhatsApp</span>
      </a>
      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-gray-300 dark:text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl font-black text-white">Jano Caminho</span>
              </div>
              <p className="text-sm text-gray-400">Plataforma completa para gestão de pedidos e entregas online.</p>
            </div>
            <div>
              <h3 className="font-bold text-white mb-3">Links Rápidos</h3>
              <div className="space-y-2 text-sm">
                <button onClick={() => navigate('/create')} className="block hover:text-sky-400 transition-colors">
                  Criar Loja
                </button>
                <button onClick={goToDemoGuide} className="block hover:text-sky-400 transition-colors">
                  Ver Demo
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
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500 space-y-1">
            <p>Edmilson Tecnologia da Informacao • CNPJ 44.771.427/0001-69</p>
            © {new Date().getFullYear()} Jano Caminho. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

