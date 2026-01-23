// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [publicMetrics, setPublicMetrics] = useState(null);
  const [ticketAverage, setTicketAverage] = useState('20');
  const [ordersPerDay, setOrdersPerDay] = useState('15');
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqActive, setFaqActive] = useState<number | null>(0);
  const [faqCategory, setFaqCategory] = useState('Planos');
  const [guideStep, setGuideStep] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchActiveRef = useRef(false);
  const guideSteps = [
    {
      title: 'Crie sua loja',
      role: 'Admin',
      summary: 'Cadastre dados básicos e publique seu link exclusivo.',
      image: '/marketing/checkout.png',
      bullets: [
        'Nome, telefone e endereço da loja',
        'Identidade visual com logo e cores',
        'Link público pronto para divulgar',
      ],
    },
    {
      title: 'Monte o cardápio',
      role: 'Admin',
      summary: 'Cadastre produtos, fotos e promoções em minutos.',
      image: '/marketing/menu-list.png',
      bullets: [
        'Categorias e descrição completas',
        'Preço promocional + destaque',
        'Tudo atualiza em tempo real',
      ],
    },
    {
      title: 'Cliente faz o pedido',
      role: 'Cliente',
      summary: 'Pedido rápido no celular com acompanhamento automático.',
      image: '/marketing/order-tracking.png',
      bullets: [
        'Escolhe ponto da carne e varinha',
        'Recebe link de acompanhamento',
        'Atualizações visuais de status',
      ],
    },
    {
      title: 'Fila do churrasqueiro',
      role: 'Operação',
      summary: 'Pedido organizado, preparo e finalização sem confusão.',
      image: '/marketing/grill-queue.png',
      bullets: [
        'Fila com status claros',
        'Tempo e prioridade visíveis',
        'Pagamento confirmado no final',
      ],
    },
  ];
  const faqItems = [
    {
      category: 'Planos',
      question: 'Como crio minha loja?',
      answer:
        'Clique em “Criar minha loja”, preencha os dados e confirme o e-mail. Você já entra no trial de 7 dias.',
    },
    {
      category: 'Planos',
      question: 'O que acontece depois do trial de 7 dias?',
      answer:
        'A loja fica inativa até renovar. Basta escolher um plano e gerar o pagamento.',
    },
    {
      category: 'Pagamentos',
      question: 'Quais são as formas de pagamento?',
      answer:
        'Pix, cartão e boleto (conforme disponibilidade do Mercado Pago).',
    },
    {
      category: 'Operação',
      question: 'Como vejo a fila do churrasqueiro?',
      answer:
        'No painel admin, clique em “Fila do churrasqueiro”. Ela atualiza automaticamente.',
    },
    {
      category: 'Planos',
      question: 'Consigo trocar de plano depois?',
      answer:
        'Sim. Vá em Pagamentos > Renovar assinatura e escolha um novo plano.',
    },
    {
      category: 'Operação',
      question: 'Como edito meu cardápio?',
      answer:
        'No painel admin, acesse Produtos para editar nome, preço, promoções e imagem.',
    },
    {
      category: 'Operação',
      question: 'Como mudar horários de funcionamento?',
      answer:
        'Em Configurações > Horários você ajusta os dias e horários da loja.',
    },
    {
      category: 'Operação',
      question: 'Dá para mudar a cor da loja?',
      answer:
        'Sim. Em Configurações > Identidade visual você altera cores, logo e descrição.',
    },
    {
      category: 'Operação',
      question: 'Como gerar QR Code para as mesas?',
      answer:
        'No Resumo do admin existe o card “QR do cardápio” com opção de imprimir.',
    },
    {
      category: 'Operação',
      question: 'Consigo ver meus ganhos?',
      answer:
        'Sim. No Resumo você acompanha receita total, ticket médio e vendas por dia.',
    },
    {
      category: 'Suporte',
      question: 'Suporte e ajuda',
      answer:
        'Chame no WhatsApp da loja ou use o e-mail de contato configurado no painel.',
    },
    {
      category: 'Operação',
      question: 'O cliente acompanha o pedido?',
      answer:
        'Sim. Após enviar, ele recebe um link para acompanhar o status em tempo real.',
    },
    {
      category: 'Operação',
      question: 'Posso editar cardápio e promoções?',
      answer:
        'Sim. Você edita produtos, fotos, preço promocional e destaque direto no painel.',
    },
  ];
  const faqCategories = ['Planos', 'Operação', 'Pagamentos', 'Suporte'];
  const filteredFaqItems = useMemo(
    () => faqItems.filter((item) => item.category === faqCategory),
    [faqItems, faqCategory]
  );
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

  useEffect(() => {
    setFaqActive(null);
  }, [faqCategory]);

  const billingKey = isAnnual ? 'yearly' : 'monthly';
  const billing = BILLING_OPTIONS[billingKey];
  const guideShots = useMemo(
    () =>
      guideSteps.map((step) => ({
        title: step.title,
        description: step.summary,
        image: step.image,
      })),
    [guideSteps]
  );
  const activeShot = lightbox?.shots?.[lightbox.index];
  const selectedIndex = lightbox?.index ?? 0;
  const handlePrevShot = () => {
    if (!lightbox?.shots?.length) return;
    const nextIndex = selectedIndex <= 0 ? lightbox.shots.length - 1 : selectedIndex - 1;
    setLightbox({ shots: lightbox.shots, index: nextIndex });
  };
  const handleNextShot = () => {
    if (!lightbox?.shots?.length) return;
    const nextIndex = selectedIndex >= lightbox.shots.length - 1 ? 0 : selectedIndex + 1;
    setLightbox({ shots: lightbox.shots, index: nextIndex });
  };
  const openLightbox = (shots, index = 0, label = '') => {
    if (!shots?.length) return;
    setLightbox({ shots, index, label });
  };
  const handleTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchActiveRef.current = true;
  };
  const handleTouchEnd = (event) => {
    if (!touchActiveRef.current) return;
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchActiveRef.current = false;
    if (Math.abs(deltaX) < 50) return;
    if (Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;
    if (deltaX > 0) {
      handlePrevShot();
    } else {
      handleNextShot();
    }
  };
  useEffect(() => {
    if (!lightbox) return;
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
        setLightbox(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightbox, handlePrevShot, handleNextShot]);
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20">
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
              className="cursor-pointer px-8 py-4 text-lg rounded-xl border-2 border-slate-200 bg-white/90 text-gray-700 font-semibold hover:text-red-600 hover:border-red-200 transition-colors shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-red-400"
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

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-red-500 font-bold">Como funciona</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-3">
              Em 3 passos, sua operação roda sozinha
            </h2>
            <p className="text-base sm:text-lg text-gray-600 mt-3 max-w-xl">
              Você cria, publica e começa a receber pedidos no mesmo dia. O cliente acompanha e o churrasqueiro recebe tudo organizado.
            </p>
            <div className="mt-6 space-y-4">
              {[
                {
                  title: 'Crie sua loja',
                  desc: 'Cadastre dados básicos, escolha cores e publique seu link.',
                  icon: Palette,
                },
                {
                  title: 'Monte o cardápio',
                  desc: 'Adicione produtos, fotos e promoções em minutos.',
                  icon: ShoppingCart,
                },
                {
                  title: 'Receba pedidos',
                  desc: 'Fila do churrasqueiro atualiza sozinha e o cliente acompanha.',
                  icon: ChefHat,
                },
              ].map((step, index) => {
                const Icon = step.icon;
                return (
                <div key={step.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-500 text-white font-black flex items-center justify-center shadow-sm">
                    <Icon size={18} weight="duotone" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900">{step.title}</p>
                    <p className="text-sm text-gray-600">{step.desc}</p>
                  </div>
                </div>
              )})}
            </div>
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-600">
              <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200">Sem cartão</span>
              <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200">Cancelamento fácil</span>
              <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200">Suporte humano</span>
            </div>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-white to-rose-50 p-6 shadow-[0_20px_70px_-45px_rgba(15,23,42,0.5)]">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Para quem é</p>
            <h3 className="text-xl font-black text-gray-900 mt-3">Feito para quem vende rápido</h3>
            <p className="text-sm text-gray-600 mt-2">
              Espetos, porções, bebidas e combos. Ideal para operações com fluxo alto.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-semibold text-slate-700">
              {['Churrasqueiros', 'Quiosques', 'Food trucks', 'Restaurantes'].map((label) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 flex items-center gap-2 shadow-sm"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="guia-usuario" className="bg-slate-900 text-white py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-300 font-bold">Guia do usuario</p>
              <h2 className="text-3xl sm:text-4xl font-black mt-3">
                Entenda o fluxo completo antes de criar sua loja
              </h2>
              <p className="text-base sm:text-lg text-slate-300 mt-3 max-w-2xl">
                Clique nas etapas para ver o que acontece em cada tela. O sistema foi feito para reduzir
                tempo de atendimento e aumentar pedidos no balcão e nas mesas.
              </p>
            </div>
            <button
              onClick={() => navigate('/create')}
              className="px-6 py-3 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 transition"
            >
              Quero começar agora
            </button>
          </div>

          <div className="mt-10 grid lg:grid-cols-[0.45fr_0.55fr] gap-6">
            <div className="space-y-3">
              {guideSteps.map((step, index) => (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setGuideStep(index)}
                  className={`w-full text-left px-4 py-4 rounded-2xl border transition ${
                    guideStep === index
                      ? 'bg-white text-slate-900 border-white shadow-[0_12px_30px_-18px_rgba(0,0,0,0.45)] ring-2 ring-amber-200/70'
                      : 'bg-slate-800/60 text-slate-200 border-slate-700 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-amber-300 font-semibold">
                        {step.role}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <h3 className="text-lg font-bold">{step.title}</h3>
                        {guideStep === index && (
                          <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                            Você está aqui
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        guideStep === index ? 'bg-amber-100 text-amber-800' : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </div>
                  <p className="text-sm mt-3 text-slate-300">
                    {step.summary}
                  </p>
                </button>
              ))}
            </div>

            <div className="rounded-[28px] bg-white text-slate-900 p-6 sm:p-8 shadow-[0_25px_80px_-40px_rgba(0,0,0,0.55)]">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">
                Etapa {guideStep + 1} de {guideSteps.length}
              </p>
              <h3 className="text-2xl font-black mt-3">{guideSteps[guideStep].title}</h3>
              <p className="text-sm text-slate-600 mt-2">
                {guideSteps[guideStep].summary}
              </p>
              <div
                className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 cursor-pointer hover:shadow-lg transition"
                onClick={() => openLightbox(guideShots, guideStep, 'Guia do usuário')}
              >
                <img
                  src={guideSteps[guideStep].image}
                  alt={guideSteps[guideStep].title}
                  className="w-full h-48 sm:h-52 object-cover"
                  loading="lazy"
                />
              </div>
              <div className="mt-6 space-y-3">
                {guideSteps[guideStep].bullets.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-1 w-2.5 h-2.5 rounded-full bg-red-500" />
                    <p className="text-sm text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Dica: combine o link da loja com o QR Code do cardápio para acelerar pedidos no salão.
              </div>
            </div>
          </div>
        </div>
      </section>

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
            {showcaseShots.map((shot, index) => (
              <div
                key={shot.title}
                className="rounded-3xl border border-white/80 bg-white/90 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.35)] overflow-hidden backdrop-blur cursor-pointer hover:-translate-y-1 hover:shadow-[0_28px_80px_-38px_rgba(15,23,42,0.45)] transition"
                onClick={() => openLightbox(showcaseShots, index, 'Produto real')}
              >
                <div className="relative">
                  <img
                    src={shot.image}
                    alt={shot.title}
                    className="w-full h-56 sm:h-64 lg:h-72 object-cover"
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
                  <label className="text-sm font-semibold text-slate-700">Valor médio por pedido (R$)</label>
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

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">
        <div className="rounded-[32px] bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white p-8 sm:p-12 shadow-[0_26px_80px_-50px_rgba(239,68,68,0.7)]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.3em] text-white/70 font-semibold">Pronto para vender mais?</p>
              <h2 className="text-3xl sm:text-4xl font-black mt-3">
                Comece hoje e veja sua fila cheia amanhã
              </h2>
              <p className="text-base sm:text-lg text-white/85 mt-3">
                Ative sua loja em minutos. Sem cartão para começar e com suporte humano quando precisar.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/create')}
                className="px-6 py-3 rounded-xl bg-white text-red-600 font-semibold shadow hover:shadow-lg transition"
              >
                Criar minha loja agora
              </button>
              <button
                onClick={scrollToShowcase}
                className="px-6 py-3 rounded-xl border border-white/60 text-white font-semibold hover:bg-white/10 transition"
              >
                Ver o produto em ação
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Guia rápido</span>
            <span className="text-slate-500">Tudo em minutos</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#guia-usuario"
              className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Guia do usuário
            </a>
            <a
              href="/terms"
              className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Termos
            </a>
            <a
              href="https://wa.me/5512997822784"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      {lightbox && activeShot && (
        <div
          className="fixed inset-0 z-50 bg-gradient-to-br from-black/70 via-black/60 to-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="max-w-5xl w-full bg-white rounded-[32px] overflow-hidden shadow-[0_40px_120px_-50px_rgba(0,0,0,0.8)]"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-white/90">
                <div>
                  {lightbox?.label && (
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{lightbox.label}</p>
                  )}
                  <p className="text-sm font-semibold text-slate-900">{activeShot.title}</p>
                  <p className="text-xs text-slate-500">{activeShot.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[11px] text-slate-400 mr-2">
                    {selectedIndex + 1}/{lightbox?.shots?.length || 0}
                  </span>
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
                  onClick={() => setLightbox(null)}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 sm:p-4">
              <img
                src={activeShot.image}
                alt={activeShot.title}
                className="w-full h-[60vh] sm:h-[72vh] object-contain rounded-2xl border border-white/10 shadow-[0_18px_60px_-32px_rgba(0,0,0,0.9)]"
              />
            </div>
            <div className="px-4 pb-2 sm:hidden">
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-500 text-center">
                Arraste para navegar
              </div>
            </div>
            {lightbox?.shots?.length > 1 && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {lightbox.shots.map((shot, index) => (
                    <button
                      key={`${shot.title}-${index}`}
                      type="button"
                      onClick={() => setLightbox({ shots: lightbox.shots, index, label: lightbox.label })}
                      className={`flex-shrink-0 rounded-xl border ${
                        index === selectedIndex
                          ? 'border-brand-primary ring-2 ring-brand-primary/40'
                          : 'border-slate-200'
                      }`}
                    >
                      <img
                        src={shot.image}
                        alt={shot.title}
                        className="h-12 w-20 sm:h-16 sm:w-24 object-cover rounded-xl"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3">
        {faqOpen && (
          <div className="w-[320px] sm:w-[360px] rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-red-600 to-red-500 text-white">
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">Ajuda rápida</p>
              <h3 className="text-lg font-bold">Tire dúvidas em segundos</h3>
            </div>
            <div className="px-4 pt-3">
              <div className="flex flex-wrap gap-2">
                {faqCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setFaqCategory(category)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition ${
                      faqCategory === category
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 space-y-3 max-h-[320px] overflow-y-auto">
              {filteredFaqItems.map((item, index) => (
                <button
                  key={item.question}
                  type="button"
                  onClick={() => setFaqActive((prev) => (prev === index ? null : index))}
                  className="w-full text-left rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 hover:bg-slate-100 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{item.question}</p>
                    <span className="text-xs text-slate-400">{faqActive === index ? '−' : '+'}</span>
                  </div>
                  {faqActive === index && (
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.answer}</p>
                  )}
                </button>
              ))}
            </div>
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => setFaqOpen(false)}
                className="w-full px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50"
              >
                Fechar FAQ
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setFaqOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-4 py-3 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.7)] hover:bg-slate-800 transition"
        >
          <span className="text-lg">💬</span>
          <span className="text-sm font-semibold">{faqOpen ? 'Fechar' : 'Dúvidas?'}</span>
        </button>
      </div>

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
