// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Hero } from '../components/Hero';
import { Palette, MonitorCog, Smartphone, Rocket, Ham, ShoppingCart, ChefHat, BarChart3, Sparkles } from 'lucide-react';
import { DemoTour } from '../components/Landing/DemoTour';
import { platformService } from '../services/platformService';
import { planService } from '../services/planService';
import { BILLING_OPTIONS, PLAN_TIERS, getPlanName } from '../constants/planCatalog';
import { LandingPageLayout } from '../layouts/LandingPageLayout';
import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [plans, setPlans] = useState([]);
  const [tourOpen, setTourOpen] = useState(false);

  const goToDemoStore = () => {
    navigate('/chamanoespeto/demo');
  };

  const goToAdminDemo = () => {
    navigate('/admin/demo');
  };
  const goToDemoGuide = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('scrollToDemoFlow', 'true');
    }
    navigate('/');
  };
  const scrollToFlow = () => {
    if (typeof document === 'undefined') return;
    const section = document.getElementById('demo-flow');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    platformService.listStores();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const shouldScroll = sessionStorage.getItem('scrollToDemoFlow') === 'true';
    if (shouldScroll) {
      sessionStorage.removeItem('scrollToDemoFlow');
      setTimeout(scrollToFlow, 50);
    }
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
    plans.forEach(plan => {
      map[plan.name] = plan;
    });
    return map;
  }, [plans]);
  const currentPlans = PLAN_TIERS.map(tier => {
    const planKey = getPlanName(tier.key, billingKey);
    const plan = plansByName[planKey];
    const price = plan?.price ?? null;
    return {
      name: plan?.displayName || tier.label,
      price: Number(price),
      hasPrice: price !== null && price !== undefined,
      period: billing.period,
      features: tier.features,
      popular: tier.popular,
      savings: billing.savings,
      id: plan?.id,
    };
  });

  return (
    <LandingPageLayout>
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center space-y-6">
          <span className="animate-bounce inline-flex items-center px-4 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full uppercase tracking-[0.2em] shadow-lg">
            7 dias gratis + sem cartao
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[56px] font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
            Crie sites de pedidos de
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600">
              {' '}
              churrasco{' '}
            </span>
            personalizados
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto">
            Configure a identidade visual do seu espeto, publique um link exclusivo e teste tudo gratis por 7 dias. Ao
            finalizar o periodo, voce escolhe o plano para continuar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              onClick={() => navigate('/create')}
              className="cursor-pointer px-8 py-4 text-lg rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
            >
              🚀 Criar minha loja agora
            </button>
            <button
              onClick={goToDemoGuide}
              className="cursor-pointer px-8 py-4 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              👀 Ver demo guiada
            </button>
            <button
              onClick={() => setTourOpen(true)}
              className="cursor-pointer px-8 py-4 text-lg rounded-xl border-2 border-transparent text-gray-700 dark:text-gray-300 font-semibold hover:text-red-600 transition-colors"
            >
              ✨ Tour interativo
            </button>
            <button
              onClick={scrollToFlow}
              className="cursor-pointer px-8 py-4 text-lg rounded-xl border-2 border-transparent text-gray-700 dark:text-gray-300 font-semibold hover:text-red-600 transition-colors"
            >
              ✨ Como funciona
            </button>
          </div>
        </div>
      </section>

      <Hero />

      {/* Demo Flow Section */}
      <section id="demo-flow" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-red-500 font-bold">Demo guiada</p>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mt-3">
            Veja o fluxo completo em 3 passos
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mt-4 max-w-3xl mx-auto">
            Primeiro você cadastra os produtos, depois faz o pedido no cardápio e, por fim, acompanha a fila do
            churrasqueiro e as métricas no painel.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center mb-4">
              <MonitorCog />
            </div>
            <p className="text-sm font-semibold text-red-500">Passo 1</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-2">Cadastre produtos</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
              Monte categorias, precos e imagens para o cardapio ficar pronto em minutos.
            </p>
            <button
              onClick={goToAdminDemo}
              className="mt-5 w-full px-4 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
            >
              Abrir painel demo
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center mb-4">
              <ShoppingCart />
            </div>
            <p className="text-sm font-semibold text-red-500">Passo 2</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-2">Receba pedidos</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
              O cliente escolhe, envia o pedido e voce recebe tudo organizado no painel.
            </p>
            <button
              onClick={goToDemoStore}
              className="mt-5 w-full px-4 py-3 rounded-xl border-2 border-red-500 text-red-500 font-semibold hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            >
              Abrir cardapio demo
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="w-12 h-12 rounded-2xl bg-gray-900 dark:bg-gray-700 text-white flex items-center justify-center mb-4">
              <ChefHat />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Passo 3</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-2">Fila + dashboard</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
              A fila do churrasqueiro atualiza quase em tempo real e o dashboard mostra resultados do dia.
            </p>
            <button
              onClick={() => navigate('/create')}
              className="mt-5 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:from-red-600 hover:to-red-700 transition-all"
            >
              Quero minha loja
            </button>
          </div>
        </div>
        <div className="mt-10 flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <ChefHat size={16} />
            Fila atualiza a cada 5s
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 size={16} />
            Dashboard com metricas
          </div>
          <button
            onClick={() => setTourOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors font-semibold"
          >
            <Sparkles size={14} />
            Tour interativo
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white text-center mb-12">
            Recursos da Plataforma
          </h2>
          <div className="max-w-2xl mx-auto mb-10 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              7 dias gratis para experimentar. Depois, escolha o plano ideal para sua loja.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mb-4">
                <Palette className="text-white text-2xl" />
              </div>
              <p className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Identidade visual flexível</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Logo, cores e slug exclusivo por loja.</p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mb-4">
                <MonitorCog className="text-white text-2xl" />
              </div>
              <p className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Gestão completa</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Produtos, status e fila do churrasqueiro.</p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mb-4">
                <Smartphone className="text-white text-2xl" />
              </div>
              <p className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Mobile-first</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Otimizado para celular e tablet.</p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mb-4">
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
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-xl p-8 sm:p-12 text-center">
          <div className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg mb-6">
            <Ham className="text-white text-9xl" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-4">Tudo que você precisa</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Recursos completos para gerenciar seu negócio de espetinhos online.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 mb-6">
            7 dias gratis para testar • Sem compromisso
          </div>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <span className="text-red-600 dark:text-red-500 text-xl font-bold">✓</span>
              <span>Cardápio personalizado</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <span className="text-red-600 dark:text-red-500 text-xl font-bold">✓</span>
              <span>Integração com WhatsApp</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <span className="text-red-600 dark:text-red-500 text-xl font-bold">✓</span>
              <span>Painel administrativo</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <span className="text-red-600 dark:text-red-500 text-xl font-bold">✓</span>
              <span>Fila do churrasqueiro</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-8">
            Planos Simples e Transparentes
          </h2>

          {/* Toggle Switch */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span
              className={`text-lg font-semibold ${!isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
            >
              Mensal
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                isAnnual ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  isAnnual ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
            <span
              className={`text-lg font-semibold ${isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
            >
              Anual
            </span>
            <span
              className={`ml-2 inline-block px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                isAnnual
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
              }`}
            >
              Economize até 25%
            </span>
          </div>

          <p className="text-lg text-gray-600 dark:text-gray-300">Escolha o plano ideal para seu negócio</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-6 items-stretch">
          {/* Create combined array with test plan first */}
          {(() => {
            const testPlan = {
              name: 'Teste completo',
              price: 0,
              hasPrice: true,
              period: '7 dias gratis',
              features: [
                'Cardápio personalizado',
                'Integração com WhatsApp',
                'Painel administrativo',
                'Fila do churrasqueiro',
              ],
              popular: false,
              isTest: true,
              id: 'test-plan-7days',
            };
            const allPlans = [testPlan, ...currentPlans];
            return allPlans.map((plan, index) => (
              <div
                key={index}
                className={`transition-all duration-300 ${
                  index === carouselIndex ? 'block md:block' : 'hidden md:block'
                }`}
              >
                <div
                  className={`relative rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all h-full flex flex-col ${
                    plan.isTest
                      ? 'bg-white dark:bg-gray-800 border-2 border-amber-400 ring-2 ring-amber-200/60'
                      : plan.popular
                      ? 'md:z-10 bg-white dark:bg-gray-800 border-2 border-red-500 shadow-2xl'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {plan.isTest && (
                    <span className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      7 DIAS GRATIS
                    </span>
                  )}
                  {plan.popular && !plan.isTest && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-1 rounded-full text-xs font-bold">
                        MAIS POPULAR
                      </span>
                    </div>
                  )}
                  <div className={`text-center mb-6 ${(plan.isTest || plan.popular) ? 'mt-2' : ''}`}>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                    {plan.isTest ? (
                      <>
                        <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600 mb-2">
                          Gratis
                        </div>
                        <p className="text-xs font-semibold text-slate-600 mb-2">
                          Use a plataforma por 7 dias sem cartao.
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{plan.period}</p>
                      </>
                    ) : plan.hasPrice ? (
                      <>
                        <div className="text-4xl font-black text-red-600 dark:text-red-500 mb-2">
                          R$ {plan.price.toFixed(2)}
                        </div>
                        <p className="text-xs font-semibold text-slate-600 mb-2">
                          7 dias gratis. Renovacao pelo valor do plano.
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{plan.period}</p>
                      </>
                    ) : (
                      <div className="text-lg font-semibold text-gray-500 mb-2">Indisponível</div>
                    )}
                  </div>
                  <ul className="space-y-3 mb-8 flex-grow">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                        <span className={`text-lg ${plan.isTest ? 'text-amber-500' : 'text-red-500'}`}>✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                        navigate(`/create?planId=${plan.id}`);
                    }}
                    className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${
                      plan.isTest
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow'
                        : plan.popular
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg'
                        : 'border-2 border-red-500 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950'
                    }`}
                  >
                    {plan.isTest ? 'Começar gratis' : 'Começar Agora'}
                  </button>
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Mobile Carousel Controls */}
        <div className="flex md:hidden justify-center items-center gap-4 mt-8">
          <button
            onClick={() => setCarouselIndex(prev => {
              const allPlans = [1, ...currentPlans].length; // testPlan + currentPlans
              return (prev - 1 + allPlans) % allPlans;
            })}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Previous plan"
          >
            ←
          </button>
          <div className="flex gap-2">
            {(() => {
              const allPlans = [1, ...currentPlans].length;
              return Array.from({ length: allPlans }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCarouselIndex(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === carouselIndex ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  aria-label={`Go to plan ${index + 1}`}
                />
              ));
            })()}
          </div>
          <button
            onClick={() => setCarouselIndex(prev => {
              const allPlans = [1, ...currentPlans].length;
              return (prev + 1) % allPlans;
            })}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Next plan"
          >
            →
          </button>
        </div>
      </section>

      <DemoTour open={tourOpen} onClose={() => setTourOpen(false)} />
    </LandingPageLayout>
  );
}
