// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { Hero } from '../components/Hero';
import { useTheme } from '../contexts/ThemeContext';
import { Palette, MonitorCog, Smartphone, Rocket, Ham} from 'lucide-react';
import { platformService } from '../services/platformService';
import { planService } from '../services/planService';
import { BILLING_OPTIONS, PLAN_TIERS, getPlanName } from '../constants/planCatalog';

export function LandingPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [isAnnual, setIsAnnual] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [plans, setPlans] = useState([]);

  const goToDemoStore = () => {
    navigate('/chamanoespeto/demo');
  };

  const goToAdminDemo = () => {
    navigate('/admin/demo');
  };

  useEffect(() => {
    platformService.listStores()
  }, []);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const data = await planService.list();
        setPlans(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Falha ao carregar planos', error);
      }
    };
    loadPlans();
  }, []);

  const billingKey = isAnnual ? 'yearly' : 'monthly';
  const billing = BILLING_OPTIONS[billingKey];
  const plansByName = useMemo(() => {
    const map = {};
    plans.forEach((plan) => {
      map[plan.name] = plan;
    });
    return map;
  }, [plans]);
  const currentPlans = PLAN_TIERS.map((tier) => {
    const planKey = getPlanName(tier.key, billingKey);
    const plan = plansByName[planKey];
    const price = plan?.price ?? null;
    const promo = plan?.promoPrice ?? null;
    return {
      name: plan?.displayName || tier.label,
      price: Number(price),
      hasPrice: price !== null && price !== undefined,
      promo: promo ? Number(promo) : null,
      period: billing.period,
      features: tier.features,
      popular: tier.popular,
      savings: billing.savings,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10">
                <img src="/logo.svg" alt="Chama no Espeto" className="h-full w-full object-cover" draggable={false} />
              </div>
              <div className="hidden sm:block">
                <p className="text-2xl font-black text-gray-900 dark:text-white">Chama no Espeto</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigate('/create')}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold shadow-[0_10px_30px_-20px_rgba(220,38,38,0.8)] hover:bg-red-700 transition-colors"
              >
                Criar loja
              </button>
              <button
                onClick={goToDemoStore}
                className="px-3 py-2 sm:px-4 text-sm rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <span className="hidden sm:inline">Ver loja demo</span>
                <span className="sm:hidden">Demo</span>
              </button>
              <button
                onClick={goToAdminDemo}
                className="px-3 py-2 sm:px-4 text-sm rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <span className="hidden sm:inline">Admin demo</span>
                <span className="sm:hidden">Admin</span>
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="px-3 py-2 sm:px-4 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                <span className="hidden sm:inline">Admin</span>
                <span className="sm:hidden">Admin</span>
              </button>
              <button
                onClick={toggleTheme}
                className="cursor-pointer p-2 rounded-lg dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="text-center space-y-6">
            <span className="animate-bounce inline-flex items-center px-4 py-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 text-white text-xs font-bold rounded-full uppercase tracking-[0.2em] shadow-lg">
              7 dias gratis + sem cartao
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[56px] font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
              Crie sites de pedidos de
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500">
                {' '}
                churrasco {' '}
              </span>
              personalizados
            </h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto">
              Configure a identidade visual do seu espeto, publique um link exclusivo e teste tudo gratis por 7 dias.
              Ao finalizar o periodo, voce escolhe o plano para continuar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button
                onClick={() => navigate('/create')}
                className="cursor-pointer px-8 py-4 text-lg rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
              >
                🚀 Criar minha loja agora
              </button>
              <button
                onClick={goToDemoStore}
                className="cursor-pointer px-8 py-4 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                👀 Ver loja demo
              </button>
              <button
                onClick={goToAdminDemo}
                className="cursor-pointer px-8 py-4 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                🧾 Ver admin demo
              </button>
            </div>
          </div>
        </section>

      <Hero />


        {/* Features Section */}
        <section className="bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700 py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white text-center mb-12">Recursos da Plataforma</h2>
            <div className="max-w-2xl mx-auto mb-10 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                7 dias gratis para experimentar. Depois, escolha o plano ideal para sua loja.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-gray-50 dark:bg-gray-900 border border-red-100 dark:border-red-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-500 rounded-xl flex items-center justify-center mb-4">
                 <Palette className="text-white text-2xl" />
                </div>
                <p className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Identidade visual flexível</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Logo, cores e slug exclusivo por loja.</p>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-gray-900 border border-red-100 dark:border-red-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-4">
                  <MonitorCog className="text-white text-2xl" />
                </div>
                <p className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Gestão completa</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Produtos, status e fila do churrasqueiro.</p>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-gray-900 border border-red-100 dark:border-red-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center mb-4">
                  <Smartphone className="text-white text-2xl" />
                </div>
                <p className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Mobile-first</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Otimizado para celular e tablet.</p>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-gray-900 border border-red-100 dark:border-red-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4">
                  <Rocket className="text-white text-2xl" />
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
              <Ham className="text-white text-9xl" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-4">Tudo que você precisa</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Recursos completos para gerenciar seu negócio de espetinhos online.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-red-50 text-red-600 border border-red-100 mb-6">
              7 dias gratis para testar • Sem compromisso
            </div>
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

        {/* Pricing Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-8">Planos Simples e Transparentes</h2>

            {/* Toggle Switch */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className={`text-lg font-semibold ${!isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                Mensal
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${isAnnual ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-9' : 'translate-x-1'
                    }`}
                />
              </button>
              <span className={`text-lg font-semibold ${isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                Anual
              </span>
                <span className={`ml-2 inline-block px-3 py-1 rounded-full text-sm font-semibold transition-colors ${isAnnual
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}>
                Economize até 25%
              </span>
            </div>

            <p className="text-lg text-gray-600 dark:text-gray-300">Escolha o plano ideal para seu negócio</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-6 md:items-center">
            <div className="md:col-span-3">
              <div className="bg-gradient-to-r from-amber-50 via-white to-red-50 border border-amber-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-amber-700">7 dias gratis para experimentar</p>
                  <p className="text-xs text-amber-700/80">
                    Use tudo agora e, ao final do periodo gratuito, escolha o plano ideal para continuar.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/create')}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:opacity-90"
                >
                  Comecar gratis
                </button>
              </div>
            </div>
            {/* Carousel for mobile, grid for desktop */}
            {currentPlans.map((plan, index) => (
              <div
                key={index}
                className={`transition-all duration-300 ${index === carouselIndex ? 'block md:block' : 'hidden md:block'
                  }`}
              >
                <div
                  className={`relative rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all h-full flex flex-col ${plan.popular
                    ? 'md:scale-105 md:z-10 bg-white dark:bg-gray-800 border-2 border-red-500 shadow-2xl'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-1 rounded-full text-xs font-bold">
                        MAIS POPULAR
                      </span>
                    </div>
                  )}
                  <div className={`text-center mb-6 ${plan.popular ? 'mt-2' : ''}`}>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                    {plan.hasPrice ? (
                      <>
                        <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600 mb-2">
                          R$ {plan.price.toFixed(2)}
                        </div>
                        {plan.promo && (
                          <p className="text-xs font-semibold text-red-600 mb-2">
                            7 dias gratis + 1º mes por R$ {plan.promo.toFixed(2)}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 dark:text-gray-400">{plan.period}</p>
                      </>
                    ) : (
                      <div className="text-lg font-semibold text-gray-500 mb-2">Indisponível</div>
                    )}
                  </div>
                  <ul className="space-y-3 mb-8 flex-grow">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                        <span className="text-red-500 text-lg">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate('/create')}
                    className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${plan.popular
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg'
                      : 'border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                      }`}
                  >
                    Começar Agora
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Carousel Controls */}
          <div className="flex md:hidden justify-center items-center gap-4 mt-8">
            <button
              onClick={() => setCarouselIndex((prev) => (prev - 1 + currentPlans.length) % currentPlans.length)}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              aria-label="Previous plan"
            >
              ←
            </button>
            <div className="flex gap-2">
              {currentPlans.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCarouselIndex(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${index === carouselIndex
                    ? 'bg-red-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  aria-label={`Go to plan ${index + 1}`}
                />
              ))}
            </div>
            <button
              onClick={() => setCarouselIndex((prev) => (prev + 1) % currentPlans.length)}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              aria-label="Next plan"
            >
              →
            </button>
          </div>
        </section>
      </main>

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
