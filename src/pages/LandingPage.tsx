import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { Hero } from '../components/Hero';
import { useTheme } from '../contexts/ThemeContext';
import Lottie from 'lottie-react';
import fireAnimation from '../assets/fire.json';

export function LandingPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const goToDemoStore = () => {
    navigate('/test-store');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <p className="text-2xl font-black text-gray-900 dark:text-white">Chama no Espeto</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <button
                onClick={goToDemoStore}
                className="px-3 py-2 sm:px-4 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="hidden sm:inline">Ver loja demo</span>
                <span className="sm:hidden">Demo</span>
              </button>
              <button
                onClick={() => navigate('/create')}
                className="px-3 py-2 sm:px-4 text-sm rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
              >
                <span className="hidden sm:inline">Criar Loja</span>
                <span className="sm:hidden">Criar</span>
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="px-3 py-2 sm:px-4 text-sm rounded-lg border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all"
              >
                <span className="hidden sm:inline">Admin</span>
                <span className="sm:hidden">Admin</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <Hero />
      <main>
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="text-center space-y-6">
            <span className="inline-flex items-center px-3 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-full uppercase tracking-wide border border-red-100 dark:border-red-800">
              🔥 Plataforma multi-loja
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-gray-900 dark:text-white leading-tight">
              Crie sites de pedidos de
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600">
                {' '}
                churrasco{' '}
              </span>
              personalizados
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto">
              Configure a identidade visual do seu espeto e publique um link exclusivo para seus clientes fazerem
              pedidos online.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button
                onClick={() => navigate('/create')}
                className="px-8 py-4 text-lg rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
              >
                🚀 Criar minha loja agora
              </button>
              <button
                onClick={goToDemoStore}
                className="px-8 py-4 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                👀 Ver loja demo
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700 py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white text-center mb-12">Recursos da Plataforma</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-gray-50 dark:bg-gray-900 border border-red-100 dark:border-red-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-2xl">🎨</span>
                </div>
                <p className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Identidade visual flexível</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Logo, cores e slug exclusivo por loja.</p>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-gray-900 border border-red-100 dark:border-red-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-2xl">⚡</span>
                </div>
                <p className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Gestão completa</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Produtos, status e fila do churrasqueiro.</p>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-gray-900 border border-red-100 dark:border-red-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-2xl">📱</span>
                </div>
                <p className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Mobile-first</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Otimizado para celular e tablet.</p>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-gray-900 border border-red-100 dark:border-red-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-2xl">🚀</span>
                </div>
                <p className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Setup rápido</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sua loja online em minutos.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-xl p-8 sm:p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg mb-6">
              <span className="text-white text-4xl">🍖</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-4">Tudo que você precisa</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Recursos completos para gerenciar seu negócio de espetinhos online.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <span className="text-red-500 text-xl">✓</span>
                <span>Cardápio personalizado</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <span className="text-red-500 text-xl">✓</span>
                <span>Integração com WhatsApp</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <span className="text-red-500 text-xl">✓</span>
                <span>Painel administrativo</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <span className="text-red-500 text-xl">✓</span>
                <span>Fila do churrasqueiro</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-gray-300 dark:text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white font-black flex items-center justify-center">
                  CS
                </div>
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
                <button onClick={goToDemoStore} className="block hover:text-red-400 transition-colors">
                  Ver Demo
                </button>
                <button onClick={() => navigate('/admin')} className="block hover:text-red-400 transition-colors">
                  Admin
                </button>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white mb-3">Contato</h3>
              <p className="text-sm text-gray-400">contato@chamanoespeto.com.br</p>
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
