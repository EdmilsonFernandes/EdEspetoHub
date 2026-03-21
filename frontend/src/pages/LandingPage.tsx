<<<<<<< HEAD
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
  const [ticketAverage, setTicketAverage] = useState('20');
  const [ordersPerDay, setOrdersPerDay] = useState('15');
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
  const selectedIndex = useMemo(
    () => showcaseShots.findIndex((shot) => shot.title === selectedShot?.title),
    [showcaseShots, selectedShot]
  );
  const handlePrevShot = () => {
    if (!showcaseShots.length) return;
    const nextIndex = selectedIndex <= 0 ? showcaseShots.length - 1 : selectedIndex - 1;
    setSelectedShot(showcaseShots[nextIndex]);
  };
  const handleNextShot = () => {
    if (!showcaseShots.length) return;
    const nextIndex = selectedIndex >= showcaseShots.length - 1 ? 0 : selectedIndex + 1;
    setSelectedShot(showcaseShots[nextIndex]);
  };
  useEffect(() => {
    if (!selectedShot) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrevShot();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNextShot();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedShot(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedShot, handlePrevShot, handleNextShot]);
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
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
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

          <div className="mt-8 rounded-[32px] border border-white/90 bg-white/90 shadow-[0_22px_70px_-45px_rgba(15,23,42,0.4)] overflow-hidden">
            <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 p-5 sm:p-7">
              <div className="rounded-3xl overflow-hidden border border-slate-200 bg-slate-50">
                <video
                  className="w-full h-full object-cover"
                  poster="/marketing/menu-list.png"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                >
                  <source src="/marketing/marketing-demo.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="space-y-4">
                <span className="inline-flex w-fit px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  Demo guiada em 40s
                </span>
                <h3 className="text-2xl font-black text-gray-900">Veja o fluxo completo do cliente ao churrasqueiro</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Do cardápio compacto ao pedido confirmado, fila do churrasqueiro e acompanhamento em tempo real.
                  Tudo pensado para ser rápido no celular e elegante no desktop.
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200">Cardápio</span>
                  <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200">Checkout</span>
                  <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200">Fila</span>
                  <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200">Acompanhamento</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
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
=======
﻿import { useEffect, useState } from 'react';
import {
  CheckCircle,
  Cube,
  Handshake,
  Package,
  Pill,
  Rocket,
  ShoppingCart,
  Storefront,
  Truck,
  Wine,
  X,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { LandingPageLayout } from '../layouts/LandingPageLayout';
import { platformService } from '../services/platformService';
import { storeService } from '../services/storeService';
import { formatCurrency } from '../utils/format';
import { SocialProofMarquee } from '../components/Landing/SocialProofMarquee';

const upsertMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
  if (typeof document === 'undefined') return;
  const selector = `meta[${attr}="${name}"]`;
  let tag = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

export function LandingPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<{
    activeStores?: number;
    totalOrders?: number;
    totalRevenue?: number;
  } | null>(null);
  const [activeProof, setActiveProof] = useState<{ title: string; image: string } | null>(null);
  const [featuredStores, setFeaturedStores] = useState<Array<{ id: string; name: string; slug: string; logoUrl?: string | null }>>([]);

  useEffect(() => {
    document.title = 'Já no Caminho | Plataforma completa para gestão de pedidos e entregas';
    const description =
      'Plataforma de gestão de pedidos, entregas e retirada para qualquer comércio. Sistema moderno com painel administrativo completo.';

    upsertMeta('description', description, 'name');
    upsertMeta('og:title', 'Já no Caminho | Plataforma completa para gestão de pedidos e entregas', 'property');
    upsertMeta('og:description', description, 'property');
    upsertMeta('og:image', 'https://www.janocaminho.com.br/janocaminho.jpg', 'property');
    upsertMeta('og:type', 'website', 'property');
  }, []);

  useEffect(() => {
    let mounted = true;
    platformService
      .getPublicMetrics()
      .then((data) => {
        if (!mounted) return;
        setMetrics({
          activeStores: Number(data?.activeStores) || 0,
          totalOrders: Number(data?.totalOrders) || 0,
          totalRevenue: Number(data?.totalRevenue) || 0,
        });
      })
      .catch(() => {
        if (!mounted) return;
        setMetrics(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    storeService
      .listPortfolio()
      .then((data: any) => {
        if (!mounted) return;
        const normalized = Array.isArray(data)
          ? data
              .map((store: any, index: number) => ({
                id: String(store?.id || store?.slug || `store-${index}`),
                name: String(store?.name || 'Loja ativa'),
                slug: String(store?.slug || ''),
                logoUrl: store?.settings?.logoUrl || null,
              }))
              .filter((store: any) => Boolean(store.slug))
          : [];
        setFeaturedStores(normalized.slice(0, 20));
      })
      .catch(() => {
        if (!mounted) return;
        setFeaturedStores([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const ctaPrimaryHref = 'https://wa.me/5512997822784';
  const trustBadges = [
    'Cloud-native na AWS',
    'Operação em tempo real',
    'Segurança e rastreabilidade',
    'Mobile-first para equipes',
    'Impressão automática de pedidos',
  ];
  const proofVisuals = [
    {
      title: 'Dashboard de gestão',
      image: '/marketing/dashboard-real.png',
      alt: 'Dashboard administrativo com indicadores de vendas, operação e desempenho da loja',
    },
    {
      title: 'Fila de pedidos',
      image: '/marketing/fila-real.png',
      alt: 'Tela de fila de pedidos em tempo real com status operacionais e priorização',
    },
    {
      title: 'Painel de pedidos',
      image: '/marketing/pedidos-real.png',
      alt: 'Painel de pedidos com controle de produção, pagamento e acompanhamento logístico',
    },
  ];

  return (
    <LandingPageLayout>
      <section className="relative overflow-hidden bg-[linear-gradient(145deg,#050b16_0%,#0f172a_50%,#111827_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(47,157,247,0.24),_transparent_55%)]" />
        <div className="max-w-7xl mx-auto px-4 py-20 sm:py-28 lg:py-32 relative">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="space-y-5 text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/40 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200">
                <Rocket size={14} weight="duotone" />
                Plataforma SaaS profissional
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100">
                Totalmente integrado com impressoras Bluetooth/Térmicas
              </span>
              <h1 className="bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-3xl sm:text-5xl font-black text-transparent leading-[1.05]">
                Transforme sua operação em um padrão de alta performance
              </h1>
              <p className="text-sm sm:text-lg text-slate-200 max-w-2xl mx-auto lg:mx-0">
                Estruture pedidos, produção e entrega em um único fluxo profissional, com experiência mobile e dados em tempo real.
              </p>
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                {trustBadges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-100"
                  >
                    {badge}
                  </span>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <a
                  href={ctaPrimaryHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Solicitar demonstração no WhatsApp"
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-base sm:text-sm font-black text-white shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all"
                >
                  Solicitar demonstração
                </a>
                <button
                  type="button"
                  onClick={() => navigate('/create?plan=trial')}
                  aria-label="Criar minha loja agora"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/40 bg-transparent px-5 py-3 text-base sm:text-sm font-black text-white hover:bg-white/10 transition-all"
                >
                  Criar minha loja
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/instalar')}
                  aria-label="Ver como instalar no Android e iPhone"
                  className="inline-flex items-center justify-center rounded-2xl border border-sky-300/40 bg-sky-400/10 px-5 py-3 text-base sm:text-sm font-black text-sky-100 hover:bg-sky-400/20 transition-all"
                >
                  Instalar no Android e iPhone
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur p-5 shadow-[0_26px_64px_-36px_rgba(0,0,0,0.6)]">
              <img
                src="/janocaminho.jpg"
                alt="Logo da plataforma Já no Caminho em destaque no hero"
                className="w-full h-52 sm:h-60 rounded-2xl bg-slate-950 object-contain p-2"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                <div className="rounded-xl border border-white/25 bg-white/10 backdrop-blur-md p-3">
                  <p className="text-[11px] text-slate-300 uppercase tracking-[0.2em]">Lojas ativas</p>
                  <p className="text-base sm:text-lg font-black text-white leading-tight">{metrics?.activeStores ?? '-'}</p>
                </div>
                <div className="rounded-xl border border-white/25 bg-white/10 backdrop-blur-md p-3">
                  <p className="text-[11px] text-slate-300 uppercase tracking-[0.2em]">Pedidos processados</p>
                  <p className="text-base sm:text-lg font-black text-white leading-tight">{metrics?.totalOrders ?? '-'}</p>
                </div>
                <div className="col-span-2 sm:col-span-1 rounded-xl border border-emerald-300/35 bg-emerald-400/10 backdrop-blur-md p-3">
                  <p className="text-[11px] text-emerald-200 uppercase tracking-[0.2em]">Receita pública</p>
                  <p className="text-base sm:text-lg font-black text-emerald-100 leading-tight">
                    {metrics ? formatCurrency(metrics.totalRevenue || 0) : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {featuredStores.length > 0 && <SocialProofMarquee clients={featuredStores} />}

      <section className="bg-[linear-gradient(140deg,#020617,#0f172a_55%,#111827)] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-300 font-semibold">Padrão empresarial</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Disponibilidade</p>
                <p className="text-sm font-black text-white">Infraestrutura escalável</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Confiabilidade</p>
                <p className="text-sm font-black text-white">Fluxo estável de operação</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Crescimento</p>
                <p className="text-sm font-black text-white">Pronto para expansão</p>
              </div>
            </div>
          </div>
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300 font-semibold">Como funciona</p>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2">Fluxo simples para vender todos os dias</h2>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl mx-auto">
              Um processo claro, auditável e padronizado para qualquer operação comercial.
            </p>
          </div>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
            {[
              {
                title: 'Cliente realiza pedido online',
                icon: ShoppingCart,
                text: 'Link da loja compartilhado no WhatsApp, Instagram e Google, com compra rápida no celular.',
              },
              {
                title: 'Pedido aparece no painel administrativo',
                icon: Package,
                text: 'A equipe recebe o pedido com status organizado para produção e operação sem confusão.',
              },
              {
                title: 'Entrega ou retirada com status em tempo real',
                icon: Truck,
                text: 'Cliente, loja e entregador acompanham o andamento com atualização de cada etapa.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 transition-all hover:border-cyan-300/40 hover:shadow-[0_22px_52px_-30px_rgba(34,211,238,0.55)]">
                  <div className="h-10 w-10 rounded-2xl bg-white/10 text-white grid place-items-center">
                    <Icon size={18} weight="duotone" />
                  </div>
                  <h3 className="text-base font-black text-white mt-4">{item.title}</h3>
                  <p className="text-sm text-slate-300 mt-2">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(135deg,#0b1220,#111827_60%,#0f172a)] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 space-y-10">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300 font-semibold">Benefícios</p>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2">Valor direto para o seu negócio</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                'Aumente suas vendas com pedidos online',
                'Centralize toda operação em um único painel',
                'Controle entregas e retirada em tempo real',
                'Gestão financeira em tempo real',
                'Impressão automática de pedidos',
              ].map((text) => (
                <div key={text} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 flex items-center gap-3 transition-all hover:border-cyan-300/40 hover:shadow-[0_22px_52px_-30px_rgba(34,211,238,0.55)]">
                  <CheckCircle size={18} weight="duotone" className="text-emerald-600 shrink-0" />
                  <p className="text-sm font-semibold text-slate-100">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300 font-semibold">Segmentos atendidos</p>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2">Pronto para diferentes operações</h2>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl">
              Arquitetura flexível para restaurantes, varejo local, conveniência, farmácia, adega e novos formatos.
            </p>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Restaurantes', icon: Storefront },
                { label: 'Adegas', icon: Wine },
                { label: 'Farmácias', icon: Pill },
                { label: 'Lanchonetes', icon: Handshake },
                { label: 'Mercados', icon: Cube },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-4 text-center transition-all hover:border-cyan-300/40 hover:shadow-[0_22px_52px_-30px_rgba(34,211,238,0.55)]">
                    <div className="mx-auto h-10 w-10 rounded-2xl bg-white/10 text-white grid place-items-center">
                      <Icon size={18} weight="duotone" />
                    </div>
                    <p className="text-sm font-semibold text-slate-100 mt-3">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(145deg,#020617,#0f172a_55%,#111827)] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300 font-semibold">Planos</p>
          <h2 className="text-2xl sm:text-4xl font-black text-white mt-2">Escolha o plano ideal para sua operação</h2>
          <p className="mt-2 text-sm text-slate-300 max-w-2xl">
            Comece no trial completo e evolua sem trocar de plataforma. Todos os planos incluem cardápio online, operação e monitoramento.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                name: 'Trial completo',
                price: '7 dias grátis',
                caption: 'sem cartão de crédito',
                cta: 'Iniciar trial',
                featured: false,
                route: '/create?plan=trial',
              },
              {
                name: 'Basic Mensal',
                price: 'R$ 79,00',
                caption: 'por mês',
                cta: 'Escolher Basic',
                featured: false,
                route: '/create?plan=basic&billing=monthly',
              },
              {
                name: 'Pro Mensal',
                price: 'R$ 119,00',
                caption: 'por mês',
                cta: 'Escolher Pro',
                featured: true,
                route: '/create?plan=pro&billing=monthly',
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-3xl border p-6 backdrop-blur-md bg-white/5 transition-all ${
                  plan.featured
                    ? 'border-cyan-300/40 shadow-[0_28px_60px_-40px_rgba(34,211,238,0.8)]'
                    : 'border-white/10'
                }`}
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300 font-semibold">{plan.name}</p>
                <p className="mt-3 text-3xl font-black text-white">{plan.price}</p>
                <p className="text-xs text-slate-400">{plan.caption}</p>
                <button
                  type="button"
                  onClick={() => navigate(plan.route)}
                  className={`mt-5 w-full rounded-2xl px-4 py-2.5 text-sm font-black transition-all ${
                    plan.featured
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                      : 'border border-white/20 bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  {plan.cta}
                </button>
>>>>>>> main
              </div>
            ))}
          </div>
        </div>
      </section>

<<<<<<< HEAD
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
          className="fixed inset-0 z-50 bg-gradient-to-br from-black/70 via-black/60 to-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedShot(null)}
        >
          <div
            className="max-w-5xl w-full bg-white rounded-[32px] overflow-hidden shadow-[0_40px_120px_-50px_rgba(0,0,0,0.8)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-white/90">
              <div>
                <p className="text-sm font-semibold text-slate-900">{selectedShot.title}</p>
                <p className="text-xs text-slate-500">{selectedShot.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-[11px] text-slate-400 mr-2">Use ← → para navegar</span>
                <button
                  type="button"
                  onClick={handlePrevShot}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={handleNextShot}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Próxima
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedShot(null)}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 sm:p-4">
              <img
                src={selectedShot.image}
                alt={selectedShot.title}
                className="w-full h-[72vh] object-contain rounded-2xl border border-white/10 shadow-[0_18px_60px_-32px_rgba(0,0,0,0.9)]"
              />
=======
      <section className="bg-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-700 font-semibold">Prova visual</p>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-2">Painel administrativo em operação real</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">
            Interface projetada para decisão rápida, execução diária e escala operacional.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {proofVisuals.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setActiveProof(item)}
                aria-label={`Abrir visual do painel: ${item.title}`}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_-26px_rgba(15,23,42,0.35)]"
              >
                <div className="rounded-[2rem] border-[8px] border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
                  <img src={item.image} alt={item.alt} loading="lazy" className="w-full h-40 sm:h-56 object-cover" />
                </div>
                <p className="text-sm italic text-slate-400 mt-3">{item.title}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeProof && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-5xl rounded-3xl overflow-hidden bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-extrabold text-slate-900">{activeProof.title}</p>
              <button
                type="button"
                onClick={() => setActiveProof(null)}
                className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center"
                aria-label="Fechar zoom"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
            <div className="bg-slate-950 p-3 sm:p-5">
              <img src={activeProof.image} alt={`Visual ampliado: ${activeProof.title}`} className="w-full max-h-[78vh] object-contain rounded-2xl" />
>>>>>>> main
            </div>
          </div>
        </div>
      )}

<<<<<<< HEAD
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
=======
      <section className="bg-[linear-gradient(120deg,#0f172a,#1e293b)] py-14 sm:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="rounded-3xl border border-white/15 bg-white/5 p-7 sm:p-10 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sky-200 font-semibold">Próximo passo</p>
              <h2 className="text-2xl sm:text-4xl font-black mt-2">Transforme sua operação em um padrão de alta performance</h2>
              <p className="text-sm text-slate-200 mt-2 max-w-2xl">
                Estruture pedidos, produção e entrega em um único fluxo profissional, com experiência mobile, dados confiáveis e gestão em tempo real.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={ctaPrimaryHref}
                target="_blank"
                rel="noreferrer"
                aria-label="Solicitar demonstração com especialista"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-base sm:text-sm font-black text-slate-900"
              >
                Solicitar demonstração
              </a>
              <button
                type="button"
                onClick={() => navigate('/create?plan=trial')}
                aria-label="Criar minha loja e começar agora"
                className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-transparent px-5 py-3 text-base sm:text-sm font-black text-white hover:bg-white/10"
              >
                Criar minha loja
              </button>
            </div>
          </div>
        </div>
      </section>
    </LandingPageLayout>
  );
}

>>>>>>> main
