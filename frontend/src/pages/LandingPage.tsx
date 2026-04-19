import { useEffect, useState, useRef } from 'react';
import {
  ArrowRight,
  ArrowsClockwise,
  Bell,
  Buildings,
  ChartLine,
  CheckCircle,
  CloudArrowUp,
  CopySimple,
  CurrencyDollar,
  Desktop,
  DeviceMobile,
  DownloadSimple,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  GooglePlayLogo,
  Handshake,
  ListChecks,
  Lock,
  MapPin,
  Motorcycle,
  Package,
  Phone,
  QrCode,
  Rocket,
  ShieldCheck,
  Star,
  Storefront,
  TrendUp,
  User,
  UserCircle,
  UserPlus,
  UsersThree,
  X,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { LandingPageLayout } from '../layouts/LandingPageLayout';
import { platformService } from '../services/platformService';
import { storeService } from '../services/storeService';
import { customerAccountService } from '../services/customerAccountService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { SocialProofMarquee } from '../components/Landing/SocialProofMarquee';
import { SegmentPromoCarousel } from '../components/common/SegmentPromoCarousel';

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

const formatPhoneBr = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export function LandingPage() {
  const navigate = useNavigate();
  const androidApkPath = '/downloads/ja-no-caminho-android-latest.apk';
  const androidApkPublicUrl = 'https://www.janocaminho.com.br/downloads/ja-no-caminho-android-latest.apk';
  const androidApkQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=2&data=${encodeURIComponent(
    androidApkPublicUrl
  )}`;
  const [metrics, setMetrics] = useState<{
    activeStores?: number;
    totalOrders?: number;
    totalRevenue?: number;
  } | null>(null);
  const [featuredStores, setFeaturedStores] = useState<Array<{ id: string; name: string; slug: string; logoUrl?: string | null }>>([]);
  const [showCustomerAuth, setShowCustomerAuth] = useState(false);
  const [hasCustomerSession, setHasCustomerSession] = useState(false);
  const [customerAuthMode, setCustomerAuthMode] = useState<'login' | 'register'>('login');
  const [customerAuthForm, setCustomerAuthForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    termsAccepted: false,
    lgpdAccepted: false,
  });
  const [customerAuthLoading, setCustomerAuthLoading] = useState(false);
  const [customerAuthError, setCustomerAuthError] = useState('');
  const [targetStoreSlug, setTargetStoreSlug] = useState('');
  const [apkLinkCopied, setApkLinkCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = 'Já no Caminho | Plataforma completa para gestão de pedidos e entregas';
    const description =
      'Plataforma de gestão de pedidos, entregas e retirada para qualquer comércio. Sistema moderno com painel administrativo completo.';
    upsertMeta('description', description, 'name');
    upsertMeta('og:title', 'Já no Caminho | Plataforma completa para gestão de pedidos e entregas', 'property');
    upsertMeta('og:description', description, 'property');
    upsertMeta('og:image', 'https://www.janocaminho.com.br/janocaminho-logo.png', 'property');
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
        if (!customerAuthForm.termsAccepted || !customerAuthForm.lgpdAccepted) {
          throw new Error('Aceite os termos de uso e a política de privacidade para criar sua conta.');
        }
        result = await customerAccountService.register({
          fullName: String(customerAuthForm.fullName || '').trim(),
          email: String(customerAuthForm.email || '').trim(),
          phone: String(customerAuthForm.phone || '').trim(),
          password: String(customerAuthForm.password || ''),
          termsAccepted: Boolean(customerAuthForm.termsAccepted),
          lgpdAccepted: Boolean(customerAuthForm.lgpdAccepted),
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

  const handleCustomerForgotPassword = async () => {
    const email = String(customerAuthForm.email || '').trim();
    if (!email) {
      setCustomerAuthError('Informe seu e-mail para recuperar a senha.');
      return;
    }
    setCustomerAuthLoading(true);
    setCustomerAuthError('');
    try {
      await customerAccountService.forgotPassword(email);
      setCustomerAuthError('Enviamos um link de recuperação para seu e-mail.');
    } catch (error: any) {
      setCustomerAuthError(error?.message || 'Não foi possível enviar recuperação.');
    } finally {
      setCustomerAuthLoading(false);
    }
  };

  const handleCopyApkLink = async () => {
    try {
      await navigator.clipboard.writeText(androidApkPublicUrl);
      setApkLinkCopied(true);
      window.setTimeout(() => setApkLinkCopied(false), 2200);
    } catch {
      setApkLinkCopied(false);
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
    return () => { mounted = false; };
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
                logoUrl: resolveAssetUrl(store?.settings?.logoUrl || undefined) || '/janocaminho.jpg',
              }))
              .filter((store: any) => Boolean(store.slug))
          : [];
        setFeaturedStores(normalized.slice(0, 20));
      })
      .catch(() => {
        if (!mounted) return;
        setFeaturedStores([]);
      });
    return () => { mounted = false; };
  }, []);

  const ctaPrimaryHref = 'mailto:contato@janocaminho.com.br';

  const features = [
    { icon: ListChecks,    title: 'Pedidos em tempo real',   desc: 'Novos pedidos chegam na hora, atualizados em todos os dispositivos.', accent: 'sky' },
    { icon: Package,       title: 'Fila de produção',        desc: 'Pendente, produzindo, pronto — controle visual de cada etapa.', accent: 'amber' },
    { icon: Motorcycle,    title: 'Motoboys integrados',     desc: 'Cadastre entregadores, gerencie ciclos e acompanhe ganhos.', accent: 'violet' },
    { icon: CurrencyDollar,title: 'PIX automático',          desc: 'BR Code gerado por pedido. Cliente escaneia, pagamento confirmado.', accent: 'emerald' },
    { icon: ChartLine,     title: 'Dashboard analítico',     desc: 'Faturamento, ticket médio e comparativos por período.', accent: 'sky' },
    { icon: MapPin,        title: 'Rastreamento',            desc: 'Clientes acompanham o pedido do preparo até a porta.', accent: 'rose' },
    { icon: Buildings,     title: 'Hub de condomínios',      desc: 'Vitrine própria em feiras e condomínios. Retirada ou entrega.', accent: 'indigo' },
    { icon: Desktop,       title: 'Multi-dispositivo',       desc: 'Admin no PC, app mobile para o time, PWA instalável.', accent: 'sky' },
    { icon: Bell,          title: 'Notificações push',       desc: 'Alerta automático de novos pedidos. Nunca perca uma venda.', accent: 'amber' },
    { icon: UsersThree,    title: 'Multi-usuário',           desc: 'Admin, operador e lojista com acessos distintos.', accent: 'violet' },
    { icon: Star,          title: 'Destaque na plataforma',  desc: 'Promova sua loja com destaque pago no marketplace.', accent: 'amber' },
    { icon: TrendUp,       title: 'Marketplace público',     desc: 'Sua loja visível para todos os clientes da plataforma.', accent: 'emerald' },
  ];

  const accentMap: Record<string, { bg: string; icon: string }> = {
    sky:     { bg: 'bg-sky-400/10',     icon: 'text-sky-400' },
    amber:   { bg: 'bg-amber-400/10',   icon: 'text-amber-400' },
    violet:  { bg: 'bg-violet-400/10',  icon: 'text-violet-400' },
    emerald: { bg: 'bg-emerald-400/10', icon: 'text-emerald-400' },
    rose:    { bg: 'bg-rose-400/10',    icon: 'text-rose-400' },
    indigo:  { bg: 'bg-indigo-400/10',  icon: 'text-indigo-400' },
  };

  return (
    <LandingPageLayout>

      {/* ══════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[linear-gradient(145deg,#020617_0%,#0f172a_55%,#020617_100%)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,_rgba(47,157,247,0.18),_transparent_42%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_rgba(16,185,129,0.12),_transparent_42%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(99,102,241,0.05),_transparent_60%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:py-32 lg:py-44">
          <div className="grid items-center gap-16 lg:grid-cols-[1.15fr_0.85fr]">

            {/* ── Left: copy ── */}
            <div className="space-y-8 text-center lg:text-left">

              {/* Eyebrow badge */}
              <div className="animate-in fade-in slide-in-from-top-3 duration-700">
                <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/5 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-sky-300 backdrop-blur-md">
                  <Rocket size={12} weight="duotone" className="animate-pulse" />
                  Plataforma SaaS para comércios
                </span>
              </div>

              {/* Headline */}
              <div className="animate-in fade-in slide-in-from-top-5 duration-700 delay-100 space-y-5">
                <h1 className="text-[2.6rem] font-black leading-[1.06] tracking-tight text-white sm:text-6xl xl:text-7xl">
                  Pedidos, produção<br />
                  e entrega —{' '}
                  <span className="animate-text-gradient bg-gradient-to-r from-sky-400 via-emerald-400 to-sky-400 bg-clip-text text-transparent">
                    no mesmo lugar.
                  </span>
                </h1>
                <p className="mx-auto max-w-xl text-base font-medium leading-relaxed text-slate-400 lg:mx-0 sm:text-xl">
                  Sistema completo para lojistas, vendedores, feiras e delivery. Configure em minutos e comece a vender hoje.
                </p>
              </div>

              {/* CTAs */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 flex flex-col gap-4 sm:flex-row justify-center lg:justify-start">
                <button
                  type="button"
                  onClick={() => navigate('/create?plan=trial')}
                  className="group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-white px-8 py-4 text-base font-black text-slate-950 shadow-[0_20px_50px_-15px_rgba(255,255,255,0.22)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Criar minha loja grátis
                  <ArrowRight size={17} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                </button>
                <a
                  href={ctaPrimaryHref}
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-black text-white backdrop-blur-md transition-all hover:bg-white/10 active:scale-[0.98]"
                >
                  <EnvelopeSimple size={17} weight="duotone" className="text-sky-300" />
                  Fale por e-mail
                </a>
              </div>

              {/* Subtle customer login */}
              <div className="animate-in fade-in duration-700 delay-300">
                <button
                  type="button"
                  onClick={() => {
                    if (hasCustomerSession) { navigate('/cliente/conta'); return; }
                    setShowCustomerAuth(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-300"
                >
                  <UserCircle size={14} weight="duotone" />
                  {hasCustomerSession ? 'Minha conta de cliente' : 'Já tenho conta de cliente'}
                </button>
              </div>

              {/* Trust strip */}
              <div className="animate-in fade-in duration-700 delay-300 flex flex-wrap justify-center gap-x-6 gap-y-2 opacity-55 lg:justify-start">
                {[
                  { icon: ShieldCheck, text: 'Sem cartão de crédito', color: 'text-emerald-400' },
                  { icon: ArrowsClockwise, text: 'Dados em tempo real', color: 'text-sky-400' },
                  { icon: Desktop, text: 'Multi-dispositivo', color: 'text-indigo-400' },
                ].map(({ icon: Icon, text, color }) => (
                  <div key={text} className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-300">
                    <Icon size={15} weight="duotone" className={color} />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: live metrics card ── */}
            <div className="animate-in zoom-in-95 fade-in duration-700 delay-250 relative flex items-center justify-center lg:h-[520px]">
              <div className="pointer-events-none absolute -inset-8 rounded-full bg-sky-500/8 blur-[90px]" />
              <div className="relative w-full max-w-sm rounded-[2.75rem] border border-white/10 bg-slate-900/60 p-7 shadow-2xl backdrop-blur-2xl sm:p-9 lg:max-w-none">
                <div className="space-y-7">

                  {/* Card header */}
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-6">
                    <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-sky-400/10">
                      <Storefront size={26} weight="duotone" className="text-sky-400" />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Monitor ao vivo</p>
                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        <p className="text-xs font-semibold text-emerald-400">Sistema online</p>
                      </div>
                    </div>
                  </div>

                  {/* Live metrics */}
                  <div className="grid gap-6">
                    <div className="space-y-1">
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-600">Lojas ativas</p>
                      <p className="text-5xl font-black text-white">
                        {metrics
                          ? <Counter value={metrics.activeStores || 0} />
                          : <span className="text-slate-700">—</span>
                        }
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-600">Pedidos processados</p>
                      <p className="text-5xl font-black text-white">
                        {metrics
                          ? <Counter value={metrics.totalOrders || 0} />
                          : <span className="text-slate-700">—</span>
                        }
                      </p>
                    </div>
                  </div>

                  {/* Trial nudge */}
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Comece hoje</p>
                    <p className="mt-1 text-sm font-bold text-white">7 dias grátis, sem cartão.</p>
                    <p className="mt-0.5 text-xs text-slate-500">Cancele a qualquer momento.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SOCIAL PROOF MARQUEE
      ══════════════════════════════════════════════════════════════ */}
      {featuredStores.length > 0 && <SocialProofMarquee clients={featuredStores} />}

      {/* ══════════════════════════════════════════════════════════════
          SEGMENT PROMO CAROUSEL
      ══════════════════════════════════════════════════════════════ */}
      <section className="bg-[linear-gradient(180deg,#edf6ff_0%,#ffffff_100%)] py-12 sm:py-14">
        <div className="mx-auto max-w-6xl px-4">
          <SegmentPromoCarousel className="shadow-[0_22px_46px_-34px_rgba(15,23,42,0.42)]" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          COMO FUNCIONA
      ══════════════════════════════════════════════════════════════ */}
      <section className="border-y border-slate-100 bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-4">

          <div className="mb-16 text-center space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-sky-600">Simples assim</p>
            <h2 className="text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Do cadastro ao primeiro pedido<br className="hidden sm:block" /> em menos de 10 minutos.
            </h2>
            <p className="mx-auto max-w-xl text-base font-medium text-slate-500 leading-relaxed">
              Sem burocracia, sem instalação. Basta criar sua conta e configurar sua loja pelo painel web.
            </p>
          </div>

          <div className="relative grid gap-10 sm:grid-cols-3">
            {/* Connector line — desktop only */}
            <div className="pointer-events-none absolute left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] top-11 hidden h-px bg-gradient-to-r from-sky-200 via-emerald-200 to-indigo-200 sm:block" />

            {[
              {
                step: '01',
                icon: UserPlus,
                title: 'Crie sua conta',
                desc: 'Cadastro em 2 minutos. Sem cartão de crédito — 7 dias gratuitos para testar tudo.',
                ringColor: 'ring-sky-200',
                bgColor: 'bg-sky-50',
                iconColor: 'text-sky-600',
                stepColor: 'text-sky-400',
              },
              {
                step: '02',
                icon: Storefront,
                title: 'Configure sua loja',
                desc: 'Adicione produtos, defina área de entrega, formas de pagamento e horários de funcionamento.',
                ringColor: 'ring-emerald-200',
                bgColor: 'bg-emerald-50',
                iconColor: 'text-emerald-600',
                stepColor: 'text-emerald-400',
              },
              {
                step: '03',
                icon: Package,
                title: 'Comece a receber',
                desc: 'Pedidos chegam em tempo real. Gerencie produção, motoboys e PIX de um só lugar.',
                ringColor: 'ring-indigo-200',
                bgColor: 'bg-indigo-50',
                iconColor: 'text-indigo-600',
                stepColor: 'text-indigo-400',
              },
            ].map(({ step, icon: Icon, title, desc, ringColor, bgColor, iconColor, stepColor }) => (
              <div key={step} className="relative flex flex-col items-center text-center gap-5">
                <div className={`relative z-10 flex h-[88px] w-[88px] flex-col items-center justify-center gap-1 rounded-3xl ring-2 ${ringColor} ${bgColor} shadow-sm`}>
                  <Icon size={30} weight="duotone" className={iconColor} />
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${stepColor}`}>{step}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900">{title}</h3>
                  <p className="text-sm font-medium leading-relaxed text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <button
              type="button"
              onClick={() => navigate('/create?plan=trial')}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-9 py-4 text-sm font-black text-white shadow-[0_20px_40px_-20px_rgba(15,23,42,0.75)] transition-all hover:scale-[1.01] active:scale-[0.98]"
            >
              Começar agora — é grátis
              <ArrowRight size={16} weight="bold" />
            </button>
            <p className="mt-3 text-xs font-medium text-slate-400">7 dias grátis · Sem cartão · Cancele quando quiser</p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FEATURES GRID
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-slate-950 py-24 sm:py-32">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_center,_rgba(47,157,247,0.07),_transparent_65%)]" />

        <div className="relative mx-auto max-w-7xl px-4">

          <div className="mb-16 text-center space-y-4">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-sky-400">Tudo incluso</p>
            <h2 className="text-3xl font-black leading-tight text-white sm:text-5xl">
              Não é só um cardápio online.<br className="hidden sm:block" /> É uma operação completa.
            </h2>
            <p className="mx-auto max-w-2xl text-base font-medium leading-relaxed text-slate-400 sm:text-lg">
              De pedidos a entregas, de pagamentos a análises — cada recurso foi pensado para o comerciante brasileiro.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.04] sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, desc, accent }) => {
              const colors = accentMap[accent] || accentMap['sky'];
              return (
                <div
                  key={title}
                  className="group flex flex-col gap-4 bg-slate-950 p-6 transition-colors hover:bg-white/[0.03]"
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${colors.bg} transition-transform group-hover:scale-110`}>
                    <Icon size={22} weight="duotone" className={colors.icon} />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-black text-white">{title}</h3>
                    <p className="text-xs font-medium leading-relaxed text-slate-500">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-14 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => navigate('/create?plan=trial')}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-950 shadow-[0_20px_40px_-15px_rgba(255,255,255,0.18)] transition-all hover:scale-[1.01] active:scale-[0.98]"
            >
              Experimente tudo por 7 dias
              <ArrowRight size={16} weight="bold" />
            </button>
            <a
              href={ctaPrimaryHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-black text-slate-300 backdrop-blur-md transition-all hover:bg-white/10 active:scale-[0.98]"
            >
              <EnvelopeSimple size={15} weight="duotone" className="text-sky-300" />
              Fale por e-mail
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          HUB DE CONDOMÍNIOS
      ══════════════════════════════════════════════════════════════ */}
      <section className="overflow-hidden bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">

            {/* Copy */}
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">
                <Buildings size={13} weight="duotone" />
                Comércio hiperlocal
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
                  Sua loja também pode vender dentro de condomínios.
                </h2>
                <p className="text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
                  Feiras, eventos internos e comércios de bairro ganham uma vitrine própria dentro do Hub. O cliente escolhe o condomínio, vê as lojas disponíveis e faz o pedido pelo mesmo fluxo profissional.
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  'Lojas por condomínio',
                  'Feiras com curadoria',
                  'Retirada na barraca',
                  'Entrega no apartamento',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 shadow-sm">
                    <CheckCircle size={16} weight="fill" className="shrink-0 text-emerald-500" />
                    <span className="text-sm font-black text-slate-800">{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                <a
                  href={ctaPrimaryHref}
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-black text-white shadow-[0_18px_36px_-18px_rgba(15,23,42,0.8)] transition-all hover:scale-[1.01] active:scale-[0.98]"
                >
                  Quero levar para meu condomínio
                </a>
                <button
                  type="button"
                  onClick={() => navigate('/hub')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-black text-slate-800 transition-all hover:bg-slate-50 active:scale-[0.98]"
                >
                  Ver Hub
                  <ArrowRight size={15} weight="bold" />
                </button>
              </div>
            </div>

            {/* Visual mock */}
            <div className="relative">
              <div className="rounded-[2.25rem] border border-slate-200/80 bg-[linear-gradient(145deg,#f8fafc,#ffffff)] p-4 shadow-[0_32px_64px_-40px_rgba(15,23,42,0.4)] sm:p-5">
                <div className="rounded-[1.7rem] border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Comprando na feira</p>
                      <p className="mt-0.5 text-lg font-black text-slate-950">Condomínio Spazio Campo Azuli</p>
                    </div>
                    <span className="rounded-xl bg-[#336886]/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#336886]">Trocar</span>
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-[1.25rem] border border-[#336886]/15 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                    <img
                      src="/uploads/condominiums/azuli.png"
                      alt="Condomínio Spazio Campo Azuli"
                      loading="lazy"
                      className="h-12 w-12 rounded-[1rem] border border-slate-100 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/janocaminho-logo.png'; }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-950">Lojas deste condomínio</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Feira aberta — pedidos pelo app</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">Ativo</span>
                  </div>

                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    {[
                      { title: 'Churrasquinho', desc: 'Retirar na barraca' },
                      { title: 'Queijos artesanais', desc: 'Entrega no apartamento' },
                      { title: 'Verduras frescas', desc: 'Pedido antecipado' },
                      { title: 'Brechó da Brisa', desc: 'Compra local' },
                    ].map((item) => (
                      <div key={item.title} className="rounded-[1.2rem] border border-slate-100 bg-slate-50 p-3">
                        <p className="text-sm font-black text-slate-900">{item.title}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                  {[
                    { value: '1 app', label: 'Hub geral e condomínio' },
                    { value: '0 atrito', label: 'Cliente escolhe onde está' },
                    { value: '+vendas', label: 'Comunidade perto da loja' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                      <p className="text-lg font-black">{item.value}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          INFRAESTRUTURA
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-slate-950 py-24 sm:py-32">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,_rgba(16,185,129,0.06),_transparent_60%)]" />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="mb-16 text-center space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-400">Construído para não parar</p>
            <h2 className="text-3xl font-black leading-tight text-white sm:text-5xl">
              A tecnologia trabalha.<br className="hidden sm:block" /> Você vende.
            </h2>
            <p className="mx-auto max-w-xl text-base font-medium leading-relaxed text-slate-400">
              Infraestrutura profissional para que você nunca perca um pedido, mesmo nos momentos de maior movimento.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: CloudArrowUp,
                title: 'Sempre no ar',
                desc: 'Hospedagem em nuvem com alta disponibilidade. Seu sistema funciona nos dias de maior pico sem lentidão.',
                accent: 'sky',
              },
              {
                icon: ArrowsClockwise,
                title: 'Atualização instantânea',
                desc: 'Pedidos, status e notificações sincronizados em tempo real em todos os dispositivos da equipe.',
                accent: 'emerald',
              },
              {
                icon: ChartLine,
                title: 'Dados que guiam decisões',
                desc: 'Dashboard com faturamento, ticket médio e desempenho por período. Tudo visível com clareza.',
                accent: 'indigo',
              },
            ].map(({ icon: Icon, title, desc, accent }) => {
              const colors = accentMap[accent] || accentMap['sky'];
              return (
                <div
                  key={title}
                  className="group rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-md transition-all hover:border-white/10 hover:bg-white/[0.04]"
                >
                  <div className={`mb-6 flex h-13 w-13 items-center justify-center rounded-2xl ${colors.bg} transition-transform group-hover:scale-110`}>
                    <Icon size={28} weight="duotone" className={colors.icon} />
                  </div>
                  <h3 className="mb-3 text-xl font-black text-white">{title}</h3>
                  <p className="text-sm font-medium leading-relaxed text-slate-400">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          APP DOWNLOAD
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] py-20 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.14),_transparent_45%)]" />
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-sky-600">Acesso mobile</p>
            <h2 className="text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
              Instale o app e gerencie<br className="hidden sm:block" /> de qualquer lugar.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Download CTA */}
            <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_52px_-30px_rgba(15,23,42,0.32)] backdrop-blur-xl sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-sky-700">
                <DeviceMobile size={13} weight="duotone" />
                App Android
              </div>
              <h3 className="mt-4 text-2xl font-black leading-tight text-slate-900 sm:text-3xl">
                Baixe o app do<br />Já no Caminho
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                Instale agora no Android com experiência app-like e acesso rápido ao Hub. Play Store em breve.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href={androidApkPath}
                  download
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(120deg,#0f172a,#1e293b)] px-5 py-3 text-sm font-black text-white shadow-[0_16px_32px_-18px_rgba(15,23,42,0.85)] transition-all hover:scale-[1.01] active:scale-[0.98]"
                >
                  <DownloadSimple size={16} weight="bold" />
                  Baixar APK
                </a>
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-400"
                  title="Publicação em andamento"
                >
                  <GooglePlayLogo size={16} weight="duotone" />
                  Em breve na Play Store
                </button>
              </div>
            </div>

            {/* QR + steps */}
            <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_52px_-30px_rgba(15,23,42,0.32)] backdrop-blur-xl sm:p-8">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Instalação rápida</p>
              <div className="mt-4 flex items-center gap-4">
                <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                  <img
                    src={androidApkQrSrc}
                    alt="QR Code para baixar o app Android"
                    loading="lazy"
                    className="h-24 w-24 rounded-lg object-cover sm:h-28 sm:w-28"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Baixar via QR Code</p>
                  <p className="mt-1 text-xs text-slate-600">Escaneie no celular e instale em poucos passos.</p>
                  <button
                    type="button"
                    onClick={handleCopyApkLink}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <CopySimple size={12} weight="bold" />
                    {apkLinkCopied ? 'Link copiado!' : 'Copiar link'}
                  </button>
                </div>
              </div>
              <ol className="mt-5 space-y-3 text-sm text-slate-600">
                {[
                  <span>Toque em <strong className="font-black text-slate-800">Baixar APK</strong>.</span>,
                  'Autorize a instalação de fontes desconhecidas no Android.',
                  'Instale e abra. Publicação na Play Store em andamento.',
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white">{i + 1}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                <QrCode size={11} weight="duotone" />
                Play Store em breve
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-slate-900 py-24 sm:py-32">
        <div className="pointer-events-none absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_center,_rgba(47,157,247,0.4),_transparent_65%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="rounded-[3rem] border border-white/10 bg-white/[0.025] p-8 text-center backdrop-blur-2xl sm:p-16 space-y-10">

            <div className="space-y-5">
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-400">Vamos escalar?</p>
              <h2 className="text-3xl font-black leading-tight text-white sm:text-6xl">
                Sua gestão de elite<br /> começa agora.
              </h2>
              <p className="mx-auto max-w-2xl text-base font-medium leading-relaxed text-slate-400 sm:text-lg">
                Junte-se a centenas de comerciantes que transformaram sua operação com o Já no Caminho. Experimente 7 dias por nossa conta — sem cartão.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => navigate('/create?plan=trial')}
                className="inline-flex items-center gap-2.5 rounded-2xl bg-white px-10 py-5 text-lg font-black text-slate-950 shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Iniciar teste grátis
                <ArrowRight size={19} weight="bold" />
              </button>
              <a
                href={ctaPrimaryHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 justify-center rounded-2xl border border-white/15 bg-white/5 px-10 py-5 text-lg font-black text-white backdrop-blur-md transition-all hover:bg-white/10 active:scale-[0.98]"
              >
                <EnvelopeSimple size={19} weight="duotone" className="text-sky-300" />
                Tirar dúvidas por e-mail
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 border-t border-white/[0.06] pt-10">
              {[
                { icon: ShieldCheck, text: 'Sem cartão', color: 'text-emerald-400' },
                { icon: CheckCircle, text: 'Setup em 5 min', color: 'text-sky-400' },
                { icon: Handshake, text: 'Suporte incluído', color: 'text-indigo-400' },
                { icon: TrendUp, text: '7 dias grátis', color: 'text-amber-400' },
              ].map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex flex-col items-center gap-2">
                  <Icon size={26} weight="duotone" className={color} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          MODAL: CUSTOMER AUTH
      ══════════════════════════════════════════════════════════════ */}
      {showCustomerAuth && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => { setShowCustomerAuth(false); setShowPassword(false); }}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-200 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Área do cliente</p>
                <h3 className="mt-0.5 text-xl font-black text-slate-900">
                  {customerAuthMode === 'register' ? 'Criar conta de cliente' : 'Entrar na sua conta'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowCustomerAuth(false); setShowPassword(false); }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-900"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Mode toggle — segmented pill */}
            <div className="mt-5 flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              {(['login', 'register'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setCustomerAuthMode(mode); setShowPassword(false); }}
                  className={`flex-1 rounded-xl py-2 text-xs font-black transition-all ${
                    customerAuthMode === mode
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {mode === 'login' ? 'Já tenho conta' : 'Criar conta grátis'}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {customerAuthMode === 'register' && (
                <div className="relative">
                  <User size={15} weight="duotone" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={customerAuthForm.fullName}
                    onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Nome completo"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              )}
              {customerAuthMode === 'register' && (
                <div className="relative">
                  <Phone size={15} weight="duotone" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={customerAuthForm.phone}
                    onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, phone: formatPhoneBr(e.target.value) }))}
                    placeholder="Telefone (opcional)"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              )}
              <div className="relative">
                <EnvelopeSimple size={15} weight="duotone" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={customerAuthForm.email}
                  onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="E-mail"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
              <div className="relative">
                <Lock size={15} weight="duotone" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={customerAuthForm.password}
                  onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Senha"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeSlash size={16} weight="duotone" /> : <Eye size={16} weight="duotone" />}
                </button>
              </div>

              {customerAuthMode === 'register' && (
                <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <label className="flex cursor-pointer items-start gap-2.5 text-[11px] font-semibold leading-relaxed text-slate-600">
                    <input
                      type="checkbox"
                      checked={customerAuthForm.termsAccepted}
                      onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, termsAccepted: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-slate-900"
                    />
                    <span>
                      Li e aceito os{' '}
                      <a href="/terms" target="_blank" rel="noreferrer" className="font-black text-slate-900 underline underline-offset-2">
                        Termos de Uso
                      </a>
                      .
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2.5 text-[11px] font-semibold leading-relaxed text-slate-600">
                    <input
                      type="checkbox"
                      checked={customerAuthForm.lgpdAccepted}
                      onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, lgpdAccepted: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-slate-900"
                    />
                    <span>
                      Autorizo o uso dos meus dados conforme a{' '}
                      <a href="/terms#lgpd" target="_blank" rel="noreferrer" className="font-black text-slate-900 underline underline-offset-2">
                        Política de Privacidade
                      </a>
                      .
                    </span>
                  </label>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Ir para loja</label>
                <select
                  value={targetStoreSlug}
                  onChange={(e) => setTargetStoreSlug(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-400"
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

              {customerAuthError && (
                <p className={`rounded-xl px-3 py-2 text-xs font-semibold ${customerAuthError.includes('recuperação') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                  {customerAuthError}
                </p>
              )}

              <button
                type="button"
                disabled={customerAuthLoading}
                onClick={handleCustomerAuthSubmit}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition-opacity disabled:opacity-60 hover:opacity-90"
              >
                {customerAuthLoading
                  ? 'Processando...'
                  : customerAuthMode === 'register'
                  ? 'Criar conta e entrar'
                  : 'Entrar'}
              </button>

              {customerAuthMode === 'login' && (
                <button
                  type="button"
                  onClick={handleCustomerForgotPassword}
                  className="w-full text-center text-xs font-semibold text-slate-400 transition-colors hover:text-slate-700"
                >
                  Esqueci minha senha
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </LandingPageLayout>
  );
}
