// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Hero } from '../components/Hero';
import {
  Palette,
  Monitor,
  DeviceMobile,
  Rocket,
  Hamburger,
  ShoppingCart,
  ChefHat,
  ChartBar,
  Sparkle,
} from '@phosphor-icons/react';
import { platformService } from '../services/platformService';
import { planService } from '../services/planService';
import { BILLING_OPTIONS, PLAN_TIERS, getPlanName } from '../constants/planCatalog';
import { LandingPageLayout } from '../layouts/LandingPageLayout';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/format';

export function LandingPage() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [plans, setPlans] = useState([]);
  const [selectedShot, setSelectedShot] = useState(null);
  const [publicMetrics, setPublicMetrics] = useState(null);
  const [ticketAverage, setTicketAverage] = useState('35');
  const [ordersPerDay, setOrdersPerDay] = useState('25');
  const showcaseShots = [
    {
      title: 'Cardápio que vende',
      description: 'Visual leve, preços claros e CTA direto para pedir.',
      tag: 'Cardápio',
      image: '/marketing/menu-list.png',
    },
    {
      title: 'Detalhe do produto',
      description: 'Modal elegante com ponto da carne e varinha.',
      tag: 'Produto',
      image: '/marketing/item-modal.png',
    },
    {
      title: 'Checkout rápido',
      description: 'Resumo limpo + pagamento em segundos.',
      tag: 'Pagamento',
      image: '/marketing/checkout.png',
    },
    {
      title: 'Fila do churrasqueiro',
      description: 'Pedidos organizados, status e ações claras.',
      tag: 'Operação',
      image: '/marketing/grill-queue.png',
    },
    {
      title: 'Acompanhar pedido',
      description: 'Transparência total para o cliente.',
      tag: 'Cliente',
      image: '/marketing/order-tracking.png',
    },
    {
      title: 'Pedido pronto',
      description: 'Entrega com clareza e mensagem positiva.',
      tag: 'Entrega',
      image: '/marketing/order-ready.png',
    },
  ];

  const scrollToShowcase = () => {
    if (typeof document === 'undefined') return;
    const section = document.getElementById('product-showcase');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const data = await platformService.getPublicMetrics();
        setPublicMetrics(data || null);
      } catch (error) {
        console.error('Falha ao carregar métricas públicas', error);
      }
    };
    loadMetrics();
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
  const parsedTicket = Math.max(0, Number(ticketAverage) || 0);
  const parsedOrders = Math.max(0, Number(ordersPerDay) || 0);
  const monthlyEstimate = parsedTicket * parsedOrders * 30;
  const numberFormatter = useMemo(() => new Intl.NumberFormat('pt-BR'), []);
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
            7 dias grátis + sem cartão
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[56px] font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
            Crie seu cardápio online para
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600">
              {' '}
              espetos e porções{' '}
            </span>
            em minutos
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto">
            Monte a identidade da sua loja, publique um link exclusivo e receba pedidos de espetos, porções e bebidas em
            um só lugar. Teste grátis por 7 dias e ative o plano quando quiser.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              onClick={() => navigate('/create')}
              className="cursor-pointer px-8 py-4 text-lg rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
            >
              🚀 Criar minha loja agora
            </button>
            <button
              onClick={scrollToShowcase}
              className="cursor-pointer px-8 py-4 text-lg rounded-xl border-2 border-transparent text-gray-700 dark:text-gray-300 font-semibold hover:text-red-600 transition-colors"
            >
              ✨ Ver telas reais
            </button>
          </div>
          {publicMetrics && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm font-semibold text-slate-600">
              <span className="px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm">
                {numberFormatter.format(publicMetrics.activeStores || 0)} lojas ativas
              </span>
              <span className="px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm">
                {numberFormatter.format(publicMetrics.totalOrders || 0)} pedidos processados
              </span>
              <span className="px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm">
                {formatCurrency(publicMetrics.totalRevenue || 0)} em vendas geradas
              </span>
            </div>
          )}
        </div>
      </section>

      <Hero />

      <section id="product-showcase" className="bg-gradient-to-br from-rose-50 via-white to-amber-50 border-y border-rose-100 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.3em] text-red-500 font-bold">Produto real</p>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-3">
                Uma experiência bonita, rápida e viciante
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mt-4">
                As telas abaixo são do produto real. Tudo pensado para converter pedidos e manter a operação fluida.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {showcaseShots.map((shot) => (
              <div
                key={shot.title}
                className="rounded-3xl border border-white/80 bg-white/90 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.35)] overflow-hidden backdrop-blur cursor-pointer hover:-translate-y-1 hover:shadow-[0_28px_80px_-38px_rgba(15,23,42,0.45)] transition"
                onClick={() => setSelectedShot(shot)}
              >
                <div className="relative">
                  <img
                    src={shot.image}
                    alt={shot.title}
                    className="w-full h-64 sm:h-72 object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-700">
                    {shot.tag}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900">{shot.title}</h3>
                  <p className="text-sm text-gray-600 mt-2">{shot.description}</p>
                  <p className="text-[11px] text-slate-400 mt-3">Clique para ampliar</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_-50px_rgba(15,23,42,0.5)] overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-8 p-6 sm:p-10">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-red-500 font-bold">Simulador</p>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900">
                Descubra quanto sua loja pode gerar por mês
              </h2>
              <p className="text-base sm:text-lg text-gray-600">
                Faça uma conta rápida com o seu ticket médio e o volume diário de pedidos.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200">Base de 30 dias</span>
                <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200">Simulação instantânea</span>
                <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200">Ajuste em segundos</span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-rose-50 p-6 space-y-6">
              <div className="grid gap-5">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Ticket médio (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={ticketAverage}
                    onChange={(e) => setTicketAverage(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-semibold text-slate-800 focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Pedidos por dia</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={ordersPerDay}
                    onChange={(e) => setOrdersPerDay(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-semibold text-slate-800 focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-600 font-bold">Receita estimada</p>
                <p className="text-3xl font-black text-emerald-700 mt-2">{formatCurrency(monthlyEstimate)}</p>
                <p className="text-xs text-emerald-700 mt-1">estimativa mensal com base em 30 dias.</p>
              </div>
              <button
                onClick={() => navigate('/create')}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold shadow hover:from-red-600 hover:to-red-700 transition-all"
              >
                Quero esse resultado
              </button>
            </div>
          </div>
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
              7 dias grátis para experimentar. Depois, escolha o plano ideal para sua loja.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mb-4">
                <Palette className="text-white text-2xl" weight="duotone" />
              </div>
              <p className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Identidade visual flexível</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Logo, cores e slug exclusivo por loja.</p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mb-4">
                <Monitor className="text-white text-2xl" weight="duotone" />
              </div>
              <p className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Gestão completa</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Produtos, status e fila do churrasqueiro.</p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mb-4">
                <DeviceMobile className="text-white text-2xl" weight="duotone" />
              </div>
              <p className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Mobile-first</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Otimizado para celular e tablet.</p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mb-4">
                <Rocket className="text-white text-2xl" weight="duotone" />
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
            <Hamburger className="text-white text-9xl" weight="duotone" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-4">Tudo que você precisa</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Recursos completos para gerenciar seu negócio de espetinhos online.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 mb-6">
            7 dias grátis para testar • Sem compromisso
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
              period: '7 dias grátis',
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
                          Grátis
                        </div>
                        <p className="text-xs font-semibold text-slate-600 mb-2">
                          Use a plataforma por 7 dias sem cartão.
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{plan.period}</p>
                      </>
                    ) : plan.hasPrice ? (
                      <>
                        <div className="text-4xl font-black text-red-600 dark:text-red-500 mb-2">
                          R$ {plan.price.toFixed(2)}
                        </div>
                        <p className="text-xs font-semibold text-slate-600 mb-2">
                          7 dias grátis. Renovação pelo valor do plano.
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
                    {plan.isTest ? 'Começar grátis' : 'Começar Agora'}
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

      {selectedShot && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setSelectedShot(null)}
        >
          <div
            className="max-w-5xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-900">{selectedShot.title}</p>
                <p className="text-xs text-slate-500">{selectedShot.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShot(null)}
                className="px-3 py-1 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>
            <img
              src={selectedShot.image}
              alt={selectedShot.title}
              className="w-full h-[70vh] object-contain bg-slate-900"
            />
          </div>
        </div>
      )}

      <div className="h-16 sm:hidden" />
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-4">
        <div className="rounded-2xl border border-red-200 bg-white/95 backdrop-blur shadow-[0_12px_30px_rgba(15,23,42,0.18)] px-3 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-700">7 dias grátis + sem cartão</p>
            <p className="text-[11px] text-slate-500">Crie sua loja em minutos.</p>
          </div>
          <button
            onClick={() => navigate('/create')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-semibold shadow hover:from-red-600 hover:to-red-700 transition-all"
          >
            Criar minha loja agora
          </button>
        </div>
      </div>
    </LandingPageLayout>
  );
}
