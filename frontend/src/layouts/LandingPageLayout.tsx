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
      <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <a
              href="https://www.chamanoespeto.com.br"
              className="flex items-center gap-3"
            >
              <div className="h-10 w-10">
                <img src="/logo.svg" alt="Chama no Espeto" className="h-full w-full object-cover" draggable={false} />
              </div>
              <div className="hidden sm:block">
                <p className="text-2xl font-black text-gray-900 dark:text-white">Chama no Espeto</p>
              </div>
            </a>

            <div className="flex items-center gap-2 sm:gap-3">
              {!auth && (
                <>
                  <button
                    onClick={() => navigate('/create')}
                    className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold shadow-[0_10px_30px_-20px_rgba(220,38,38,0.8)] hover:bg-red-700 transition-colors"
                  >
                    Criar loja
                  </button>
                  <button
                    onClick={goToDemoGuide}
                    className="hidden md:inline-block px-3 py-2 sm:px-4 text-sm rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                  >
                    Ver demo guiada
                  </button>
                </>
              )}
              {auth && (
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="px-3 py-2 sm:px-4 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-all flex items-center gap-1.5"
                >
                  <SignOut size={16} weight="bold" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              )}
              <button
                onClick={() => navigate('/portfolio')}
                className="px-3 py-2 sm:px-4 text-sm rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <span className="hidden sm:inline">Portfólio</span>
                <span className="sm:hidden">Portfólio</span>
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="hidden md:inline-block px-3 py-2 sm:px-4 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                <span className="hidden sm:inline">Admin</span>
                <span className="sm:hidden">Admin</span>
              </button>
              <button
                onClick={toggleTheme}
                className="cursor-pointer p-2 rounded-lg dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
