import { useEffect, useState, useRef } from 'react';
import {
  CheckCircle,
  Cube,
  Handshake,
  Rocket,
  Storefront,
  X,
  TrendUp,
  ShieldCheck,
  Desktop,
  UserCircle,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { LandingPageLayout } from '../layouts/LandingPageLayout';
import { platformService } from '../services/platformService';
import { storeService } from '../services/storeService';
import { customerAccountService } from '../services/customerAccountService';
import { formatCurrency } from '../utils/format';
import { SocialProofMarquee } from '../components/Landing/SocialProofMarquee';

const Counter = ({ value, duration = 2000, prefix = '', suffix = '', formatter }: { value: number; duration?: number; prefix?: string; suffix?: string; formatter?: (v: number) => string }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const currentCount = Math.floor(progress * value);
      
      if (currentCount !== countRef.current) {
        setCount(currentCount);
        countRef.current = currentCount;
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{prefix}{formatter ? formatter(count) : count}{suffix}</span>;
};

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
  const [activeProof, setActiveProof] = useState<{ title: string; image: string; description?: string } | null>(null);
  const [featuredStores, setFeaturedStores] = useState<Array<{ id: string; name: string; slug: string; logoUrl?: string | null }>>([]);
  const [showCustomerAuth, setShowCustomerAuth] = useState(false);
  const [hasCustomerSession, setHasCustomerSession] = useState(false);
  const [customerAuthMode, setCustomerAuthMode] = useState<'login' | 'register'>('login');
  const [customerAuthForm, setCustomerAuthForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [customerAuthLoading, setCustomerAuthLoading] = useState(false);
  const [customerAuthError, setCustomerAuthError] = useState('');
  const [targetStoreSlug, setTargetStoreSlug] = useState('');

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
    const sync = () => {
      try {
        const raw = localStorage.getItem('customerSession');
        const parsed = raw ? JSON.parse(raw) : null;
        setHasCustomerSession(Boolean(parsed?.token));
      } catch {
        setHasCustomerSession(false);
      }
    };
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    if (!targetStoreSlug && featuredStores.length > 0) {
      setTargetStoreSlug(featuredStores[0].slug);
    }
  }, [featuredStores, targetStoreSlug]);

  const handleCustomerAuthSubmit = async () => {
    if (customerAuthLoading) return;
    setCustomerAuthLoading(true);
    setCustomerAuthError('');
    try {
      let result: any;
      if (customerAuthMode === 'register') {
        result = await customerAccountService.register({
          fullName: String(customerAuthForm.fullName || '').trim(),
          email: String(customerAuthForm.email || '').trim(),
          phone: String(customerAuthForm.phone || '').trim(),
          password: String(customerAuthForm.password || ''),
        });
      } else {
        result = await customerAccountService.login({
          email: String(customerAuthForm.email || '').trim(),
          password: String(customerAuthForm.password || ''),
        });
      }

      if (!result?.token) throw new Error('Não foi possível autenticar.');
      localStorage.setItem('customerSession', JSON.stringify(result));

      const slug = String(targetStoreSlug || '').trim();
      if (slug) {
        navigate(`/${slug}`);
      } else {
        navigate('/');
      }
    } catch (error: any) {
      setCustomerAuthError(error?.message || 'Falha ao autenticar cliente.');
    } finally {
      setCustomerAuthLoading(false);
    }
  };

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
  const proofVisuals = [
    {
      title: 'Gestão Estratégica',
      image: '/marketing/dashboard-real.png',
      description: 'Visão 360º do seu faturamento, ticket médio e performance por período.',
      alt: 'Dashboard administrativo com indicadores de vendas, operação e desempenho da loja',
    },
    {
      title: 'Fila de Produção',
      image: '/marketing/fila-real.png',
      description: 'Controle visual de cada etapa do pedido, do preparo à saída para entrega.',
      alt: 'Tela de fila de pedidos em tempo real com status operacionais e priorização',
    },
    {
      title: 'Painel de Operações',
      image: '/marketing/pedidos-real.png',
      description: 'Gestão centralizada de múltiplos pedidos, pagamentos e logística reversa.',
      alt: 'Painel de pedidos com controle de produção, pagamento e acompanhamento logístico',
    },
  ];

  return (
    <LandingPageLayout>
      <section className="relative overflow-hidden bg-[linear-gradient(145deg,#020617_0%,#0f172a_50%,#020617_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(47,157,247,0.15),_transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.1),_transparent_40%)]" />
        
        <div className="max-w-7xl mx-auto px-4 py-24 sm:py-32 lg:py-40 relative">
          <div className="grid gap-16 lg:grid-cols-[1.2fr_0.8fr] items-center">
            <div className="space-y-8 text-center lg:text-left">
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-1000">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-300 backdrop-blur-md">
                  <Rocket size={16} weight="duotone" className="animate-pulse" />
                  SaaS de Alta Performance
                </div>
                <h1 className="text-4xl sm:text-6xl xl:text-7xl font-black tracking-tight leading-[1.1] text-white">
                  Sua gestão <br />
                  <span className="bg-gradient-to-r from-sky-400 via-emerald-400 to-sky-400 bg-clip-text text-transparent animate-text-gradient">levada a sério.</span>
                </h1>
                <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                  Abandone a confusão. Estruture pedidos, produção e logística em um único fluxo profissional e escale seu negócio com tecnologia de ponta.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                <a
                  href={ctaPrimaryHref}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-base font-black text-slate-950 shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Solicitar Demonstração
                </a>
                <button
                  type="button"
                  onClick={() => navigate('/create?plan=trial')}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-black text-white backdrop-blur-md hover:bg-white/10 transition-all active:scale-[0.98]"
                >
                  Criar minha loja
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (hasCustomerSession) {
                      navigate('/cliente/conta');
                      return;
                    }
                    setShowCustomerAuth(true);
                  }}
                  className="inline-flex items-center gap-2 justify-center rounded-2xl border border-sky-300/30 bg-sky-500/10 px-8 py-4 text-base font-black text-sky-100 backdrop-blur-md hover:bg-sky-500/15 transition-all active:scale-[0.98]"
                >
                  <UserCircle size={18} weight="duotone" />
                  {hasCustomerSession ? 'Minha conta' : 'Entrar como cliente'}
                </button>
              </div>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-6 opacity-60">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300 uppercase tracking-widest">
                  <ShieldCheck size={18} weight="duotone" className="text-emerald-400" />
                  AWS Cloud Native
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300 uppercase tracking-widest">
                  <TrendUp size={18} weight="duotone" className="text-sky-400" />
                  Real-time Analytics
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300 uppercase tracking-widest">
                  <Desktop size={18} weight="duotone" className="text-indigo-400" />
                  Multi-device UI
                </div>
              </div>
            </div>

            <div className="relative lg:h-[500px] flex items-center justify-center animate-in zoom-in-95 fade-in duration-1000 delay-300">
              <div className="absolute -inset-4 bg-sky-500/10 rounded-full blur-[80px] animate-pulse" />
              <div className="relative w-full max-w-sm lg:max-w-none premium-border-gradient rounded-[2.5rem] bg-slate-900/40 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl border border-white/10">
                <div className="space-y-8">
                  <div className="flex items-center justify-between pb-6 border-b border-white/5">
                    <div className="h-12 w-12 rounded-2xl bg-sky-400/10 flex items-center justify-center">
                      <Storefront size={24} weight="duotone" className="text-sky-400" />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Monitor Público</p>
                      <p className="text-xs font-medium text-emerald-400">Sistema Online</p>
                    </div>
                  </div>
                  
                  <div className="grid gap-6">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Lojas Ativas</p>
                      <p className="text-4xl font-black text-white text-glow-sky">
                        {metrics ? <Counter value={metrics.activeStores || 0} /> : '---'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pedidos Processados</p>
                      <p className="text-4xl font-black text-white">
                        {metrics ? <Counter value={metrics.totalOrders || 0} /> : '---'}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                      <p className="text-xs font-bold text-emerald-500/80 uppercase tracking-widest">Receita Movimentada</p>
                      <p className="text-2xl font-black text-emerald-400">
                        {metrics ? <Counter value={metrics.totalRevenue || 0} formatter={formatCurrency} /> : '---'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {featuredStores.length > 0 && <SocialProofMarquee clients={featuredStores} />}

      <section className="bg-slate-950 py-24 sm:py-32 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-xs uppercase tracking-[0.4em] text-sky-400 font-black">Infraestrutura</h2>
            <p className="text-3xl sm:text-5xl font-black text-white leading-tight">
              Projetado para quem não <br className="hidden sm:block" /> pode parar de vender.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                title: 'Escalabilidade AWS',
                desc: 'Operação baseada em microserviços, pronta para picos de vendas sem lentidão.',
                icon: Cloud,
              },
              {
                title: 'Sincronização Real-time',
                desc: 'Pedidos e status atualizados instantaneamente em todos os dispositivos.',
                icon: ArrowsClockwise,
              },
              {
                title: 'Data-driven Design',
                desc: 'Cada pixel focado em reduzir cliques e acelerar a tomada de decisão.',
                icon: ChartLine,
              },
            ].map((item, i) => (
              <div key={i} className="group p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:bg-white/[0.05] transition-all hover:border-white/10">
                <div className="h-12 w-12 rounded-2xl bg-sky-400/10 flex items-center justify-center text-sky-400 mb-6 group-hover:scale-110 transition-transform">
                  <item.icon size={28} weight="duotone" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-24 sm:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
            <div className="space-y-4">
              <h2 className="text-xs uppercase tracking-[0.4em] text-sky-600 font-black">Visual Proof</h2>
              <p className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
                Um painel que <br /> trabalha para você.
              </p>
            </div>
            <p className="text-slate-500 max-w-md font-medium leading-relaxed">
              Interface projetada para decisão rápida, execução diária e escala operacional. Experimente a clareza de dados reais.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {proofVisuals.map((item, i) => (
              <div
                key={i}
                className="group relative cursor-pointer"
                onClick={() => setActiveProof(item)}
              >
                <div className="relative rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-950 shadow-2xl overflow-hidden aspect-[4/3] group-hover:scale-[1.02] transition-all duration-500">
                  <img src={item.image} alt={item.alt} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                    <p className="text-white font-bold flex items-center gap-2">
                      Visualizar detalhes
                      <ArrowRight size={18} />
                    </p>
                  </div>
                </div>
                <div className="mt-6 space-y-2">
                  <h3 className="text-lg font-black text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {activeProof && (
        <div className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-md p-4 sm:p-10 flex items-center justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-6xl rounded-[2.5rem] overflow-hidden bg-white shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">{activeProof.title}</h3>
                <p className="text-sm text-slate-500 font-medium">{activeProof.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveProof(null)}
                className="h-12 w-12 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors"
              >
                <X size={24} weight="bold" />
              </button>
            </div>
            <div className="bg-slate-950 p-4 sm:p-8 overflow-y-auto max-h-[70vh]">
              <img src={activeProof.image} alt={activeProof.title} className="w-full h-auto object-contain rounded-3xl shadow-2xl" />
            </div>
          </div>
        </div>
      )}

      {showCustomerAuth && (
        <div className="fixed inset-0 z-[130] bg-slate-950/85 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-black">Área do cliente</p>
                <h3 className="text-xl font-black text-slate-900">
                  {customerAuthMode === 'register' ? 'Criar conta' : 'Entrar na sua conta'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerAuth(false)}
                className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setCustomerAuthMode('login')}
                className={`rounded-xl px-3 py-2 text-xs font-bold border ${customerAuthMode === 'login' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setCustomerAuthMode('register')}
                className={`rounded-xl px-3 py-2 text-xs font-bold border ${customerAuthMode === 'register' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
              >
                Cadastro
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {customerAuthMode === 'register' && (
                <input
                  value={customerAuthForm.fullName}
                  onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Nome completo"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              )}
              {customerAuthMode === 'register' && (
                <input
                  value={customerAuthForm.phone}
                  onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Telefone (opcional)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              )}
              <input
                value={customerAuthForm.email}
                onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="E-mail"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <input
                type="password"
                value={customerAuthForm.password}
                onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Senha"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />

              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Ir para loja</label>
                <select
                  value={targetStoreSlug}
                  onChange={(e) => setTargetStoreSlug(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
                >
                  {featuredStores.length === 0 ? (
                    <option value="">Selecionar depois</option>
                  ) : (
                    featuredStores.map((store) => (
                      <option key={store.id} value={store.slug}>
                        {store.name} ({store.slug})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {customerAuthError ? <p className="text-sm text-rose-600">{customerAuthError}</p> : null}

              <button
                type="button"
                disabled={customerAuthLoading}
                onClick={handleCustomerAuthSubmit}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {customerAuthLoading ? 'Processando...' : customerAuthMode === 'register' ? 'Criar e entrar' : 'Entrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="bg-slate-900 py-24 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_rgba(47,157,247,0.3),_transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="rounded-[3rem] border border-white/10 bg-white/[0.02] backdrop-blur-2xl p-8 sm:p-16 text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-xs uppercase tracking-[0.4em] text-emerald-400 font-black">Vamos escalar?</h2>
              <p className="text-3xl sm:text-6xl font-black text-white leading-tight">
                Sua gestão de elite <br /> começa agora.
              </p>
              <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg font-medium leading-relaxed">
                Junte-se a centenas de empresas que transformaram sua operação com a Já no Caminho. Experimente 7 dias por nossa conta.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={ctaPrimaryHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-10 py-5 text-lg font-black text-slate-950 shadow-2xl hover:scale-[1.02] transition-all"
              >
                Solicitar Demonstração
              </a>
              <button
                type="button"
                onClick={() => navigate('/create?plan=trial')}
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-10 py-5 text-lg font-black text-white backdrop-blur-md hover:bg-white/10 transition-all"
              >
                Iniciar Teste Grátis
              </button>
            </div>
            
            <div className="pt-8 flex items-center justify-center gap-8 border-t border-white/5">
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck size={24} weight="duotone" className="text-emerald-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sem Cartão</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <CheckCircle size={24} weight="duotone" className="text-sky-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Setup em 5min</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Handshake size={24} weight="duotone" className="text-indigo-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Suporte 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </LandingPageLayout>
  );
}

const Cloud = (props: any) => <Cube {...props} />;
const ArrowsClockwise = (props: any) => <Rocket {...props} />;
const ChartLine = (props: any) => <TrendUp {...props} />;
const ArrowRight = (props: any) => <Rocket {...props} className="rotate-90" />;


