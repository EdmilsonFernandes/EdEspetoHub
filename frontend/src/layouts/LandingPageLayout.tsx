// @ts-nocheck
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun, SignOut } from '@phosphor-icons/react';

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
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-[0_20px_40px_-30px_rgba(15,23,42,0.45)]">
        <div className="h-1 bg-[linear-gradient(90deg,#ef4444,#f97316,#f59e0b)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 sm:py-4">
            <a href="https://www.chamanoespeto.com.br" className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white shadow-[0_12px_24px_-16px_rgba(239,68,68,0.8)] ring-1 ring-red-200 overflow-hidden">
                <img src="/logo.svg" alt="Chama no Espeto" className="h-full w-full object-cover" draggable={false} />
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-xl font-black text-gray-900 dark:text-white">Chama no Espeto</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pedidos, produção e vendas em um só lugar</p>
              </div>
            </a>

            <div className="flex items-center gap-2 sm:gap-3">
              {!auth && (
                <button
                  onClick={() => navigate('/create')}
                  className="px-4 py-2 text-sm rounded-full bg-brand-gradient text-white font-semibold shadow-[0_16px_30px_-20px_rgba(239,68,68,0.9)] hover:opacity-90 transition"
                >
                  Criar loja
                </button>
              )}
              {auth && (
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="px-3 py-2 sm:px-4 text-sm rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-all flex items-center gap-1.5"
                >
                  <SignOut size={16} weight="bold" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              )}
              <button
                onClick={() => navigate('/portfolio')}
                className="px-3 py-2 sm:px-4 text-sm rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                Portfólio
              </button>
              <a
                href="/#guia-usuario"
                className="px-3 py-2 sm:px-4 text-sm rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                Guia
              </a>
              <button
                onClick={() => navigate('/admin')}
                className="px-3 py-2 sm:px-4 text-sm rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                Admin
              </button>
              <button
                onClick={toggleTheme}
                className="cursor-pointer p-2 rounded-full border border-slate-200/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon size={18} weight="duotone" /> : <Sun size={18} weight="duotone" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main> {children} </main>
      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-gray-300 dark:text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl font-black text-white">Chama no Espeto</span>
              </div>
              <p className="text-sm text-gray-400">Plataforma completa para gestão de pedidos de churrasco online.</p>
            </div>
            <div>
              <h3 className="font-bold text-white mb-3">Links Rápidos</h3>
              <div className="space-y-2 text-sm">
                <button onClick={() => navigate('/create')} className="block hover:text-red-400 transition-colors">
                  Criar Loja
                </button>
                <button onClick={goToDemoGuide} className="block hover:text-red-400 transition-colors">
                  Ver Demo
                </button>
                <button onClick={() => navigate('/admin')} className="block hover:text-red-400 transition-colors">
                  Admin
                </button>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white mb-3">Contato</h3>
              <a href="mailto:contato@chamanoespeto.com.br" className="text-sm text-gray-400">
                contato@chamanoespeto.com.br
              </a>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Chama no Espeto. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
