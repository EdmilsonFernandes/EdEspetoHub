import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowsClockwise,
  Bell,
  Buildings,
  ChartLine,
  CheckCircle,
  CloudArrowUp,
  CopySimple,
  CreditCard,
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
import { storeService } from '../services/storeService';
import { customerAccountService } from '../services/customerAccountService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { SocialProofMarquee } from '../components/Landing/SocialProofMarquee';
import { SegmentPromoCarousel } from '../components/common/SegmentPromoCarousel';
import mercadoPagoLogo from '../assets/mercado-pago-logo.svg';

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
  const appStorePreviewSrc = '/marketing/google-play-preview.jpg';
  const androidApkQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=2&data=${encodeURIComponent(
    androidApkPublicUrl
  )}`;
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
    document.title = 'Já no Caminho | Sistema premium para vender, operar e entregar';
    const description =
      'Plataforma premium para lojistas: cardápio online, pedidos em tempo real, produção, entregas, pagamentos online e hub de vendas.';
    upsertMeta('description', description, 'name');
    upsertMeta('og:title', 'Já no Caminho | Sistema premium para vender, operar e entregar', 'property');
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
    { icon: Motorcycle,    title: 'Entregadores integrados', desc: 'Cadastre entregadores, gerencie vínculos e acompanhe ganhos.', accent: 'violet' },
    { icon: CurrencyDollar,title: 'Pagamento online',        desc: 'Pix, crédito e débito com Mercado Pago da própria loja.', accent: 'emerald' },
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

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:py-28 lg:py-36">
          <div className="grid items-center gap-16 lg:grid-cols-[1.15fr_0.85fr]">

            {/* ── Left: copy ── */}
            <div className="space-y-8 text-center lg:text-left">

              {/* Eyebrow badge */}
              <div className="animate-in fade-in slide-in-from-top-3 duration-700">
                <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/5 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-sky-300 backdrop-blur-md">
                  <Rocket size={12} weight="duotone" className="animate-pulse" />
                  Loja online, operação e entrega em um só painel
                </span>
              </div>

              {/* Headline */}
              <div className="animate-in fade-in slide-in-from-top-5 duration-700 delay-100 space-y-5">
                <h1 className="text-[2.6rem] font-black leading-[1.06] tracking-tight text-white sm:text-6xl xl:text-7xl">
                  Sua loja vendendo<br />
                  com cara de{' '}
                  <span className="animate-text-gradient bg-gradient-to-r from-sky-400 via-emerald-400 to-sky-400 bg-clip-text text-transparent">
                    aplicativo premium.
                  </span>
                </h1>
                <p className="mx-auto max-w-2xl text-base font-medium leading-relaxed text-slate-400 lg:mx-0 sm:text-xl">
                  Crie uma vitrine profissional, receba pedidos em tempo real, organize a produção, conecte entregadores e cobre online com Mercado Pago quando quiser.
                </p>
              </div>

              {/* CTAs */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 flex flex-col gap-4 sm:flex-row justify-center lg:justify-start">
                <button
                  type="button"
                  onClick={() => navigate('/create?plan=trial')}
                  className="group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-white px-8 py-4 text-base font-black text-slate-950 shadow-[0_20px_50px_-15px_rgba(255,255,255,0.22)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Começar teste grátis
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
                  { icon: ShieldCheck, text: '7 dias grátis', color: 'text-emerald-400' },
                  { icon: CurrencyDollar, text: 'Mercado Pago opcional', color: 'text-sky-400' },
                  { icon: ArrowsClockwise, text: 'Pedidos ao vivo', color: 'text-sky-400' },
                  { icon: Desktop, text: 'Painel + celular', color: 'text-indigo-400' },
                ].map(({ icon: Icon, text, color }) => (
                  <div key={text} className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-300">
                    <Icon size={15} weight="duotone" className={color} />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: premium payment/product preview ── */}
            <div className="animate-in zoom-in-95 fade-in duration-700 delay-250 relative flex items-center justify-center">
              <div className="pointer-events-none absolute -inset-8 rounded-full bg-[#00bcff]/10 blur-[90px]" />
              <div className="relative w-full max-w-xl rounded-[2.25rem] border border-white/10 bg-white/[0.07] p-3 shadow-2xl backdrop-blur-2xl">
                <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/92">
                  <div className="border-b border-white/[0.07] bg-white/[0.035] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Checkout integrado</p>
                        <h3 className="mt-1 text-xl font-black tracking-tight text-white">Cobrança online no pedido</h3>
                        <p className="mt-1 max-w-xs text-xs font-semibold leading-5 text-slate-400">
                          O cliente paga no fluxo da loja e o valor cai na conta Mercado Pago do próprio lojista.
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 shadow-[0_18px_38px_-24px_rgba(0,188,255,0.8)]">
                        <img src={mercadoPagoLogo} alt="Mercado Pago" className="h-8 w-auto" />
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="grid gap-3 sm:grid-cols-[0.95fr_1.05fr]">
                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Pedido #1027</p>
                          <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-emerald-300 ring-1 ring-emerald-400/20">Pago</span>
                        </div>
                        <p className="mt-4 text-sm font-black text-white">Combo família</p>
                        <div className="mt-4 space-y-2 text-xs font-semibold text-slate-400">
                          <div className="flex justify-between gap-3">
                            <span>Subtotal</span>
                            <span className="text-slate-200">R$ 89,90</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span>Entrega</span>
                            <span className="text-slate-200">R$ 6,00</span>
                          </div>
                          <div className="border-t border-white/[0.07] pt-2">
                            <div className="flex justify-between gap-3">
                              <span className="text-white">Total</span>
                              <span className="text-lg font-black text-white">R$ 95,90</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#00bcff]/20 bg-[#00bcff]/10 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-100">Conta conectada</p>
                            <p className="mt-1 text-sm font-black text-white">Mercado Pago do lojista</p>
                          </div>
                          <ShieldCheck size={22} weight="duotone" className="text-sky-200" />
                        </div>
                        <div className="mt-5 grid grid-cols-3 gap-2">
                          {[
                            { icon: QrCode, label: 'Pix' },
                            { icon: CreditCard, label: 'Crédito' },
                            { icon: CurrencyDollar, label: 'Débito' },
                          ].map(({ icon: Icon, label }) => (
                            <div key={label} className="rounded-xl bg-white/90 px-2 py-2 text-center text-[11px] font-black text-slate-900">
                              <Icon size={15} weight="duotone" className="mx-auto mb-1 text-[#009ee3]" />
                              {label}
                            </div>
                          ))}
                        </div>
                        <p className="mt-4 text-xs font-semibold leading-5 text-sky-50">
                          Se a loja não conectar a conta, o pedido continua funcionando no modo presencial.
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        { icon: ArrowsClockwise, label: 'Atualização ao vivo' },
                        { icon: Package, label: 'Produção sincronizada' },
                        { icon: Motorcycle, label: 'Entrega acompanhada' },
                      ].map(({ icon: Icon, label }) => (
                        <div key={label} className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-[11px] font-black text-slate-300">
                          <Icon size={14} weight="duotone" className="text-sky-300" />
                          {label}
                        </div>
                      ))}
                    </div>
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
                desc: 'Abra sua loja com 7 dias grátis e configure o básico em poucos minutos.',
                ringColor: 'ring-sky-200',
                bgColor: 'bg-sky-50',
                iconColor: 'text-sky-600',
                stepColor: 'text-sky-400',
              },
              {
                step: '02',
                icon: Storefront,
                title: 'Configure sua loja',
                desc: 'Cadastre produtos, horários, retirada, entrega, equipe e pagamentos online opcionais.',
                ringColor: 'ring-emerald-200',
                bgColor: 'bg-emerald-50',
                iconColor: 'text-emerald-600',
                stepColor: 'text-emerald-400',
              },
              {
                step: '03',
                icon: Package,
                title: 'Venda com controle',
                desc: 'Pedidos chegam ao vivo. Acompanhe produção, entregadores, status e cobrança em um painel.',
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
          PAGAMENTO ONLINE
      ══════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid items-center gap-10 rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_48%,#eef8ff_100%)] p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.55)] sm:p-10 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-sky-700 shadow-sm">
                <ShieldCheck size={13} weight="duotone" />
                Gateway do lojista
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
                  Dê ao cliente a experiência de pagar dentro do pedido.
                </h2>
                <p className="max-w-2xl text-sm font-medium leading-7 text-slate-600 sm:text-base">
                  O lojista conecta a própria conta Mercado Pago e libera cobrança online para Pix e cartão. Quem preferir manter o atendimento presencial continua recebendo pedidos normalmente.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { icon: QrCode, label: 'Pix online', tone: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                  { icon: CreditCard, label: 'Crédito', tone: 'text-sky-600 bg-sky-50 border-sky-100' },
                  { icon: CurrencyDollar, label: 'Débito', tone: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                  { icon: Storefront, label: 'Pagamento presencial', tone: 'text-slate-600 bg-white border-slate-200' },
                ].map(({ icon: Icon, label, tone }) => (
                  <span key={label} className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black shadow-sm ${tone}`}>
                    <Icon size={16} weight="duotone" />
                    {label}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => navigate('/create?plan=trial')}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-7 py-3.5 text-sm font-black text-white shadow-[0_18px_38px_-20px_rgba(15,23,42,0.75)] transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                Ativar minha loja
                <ArrowRight size={16} weight="bold" />
              </button>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_24px_55px_-45px_rgba(15,23,42,0.55)]">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <img src={mercadoPagoLogo} alt="Mercado Pago" className="h-9 w-auto max-w-[170px] object-contain" />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Conexão segura
                </span>
              </div>
              <div className="grid gap-3 py-5 sm:grid-cols-3">
                {[
                  { label: 'Pedido', value: 'R$ 86,90' },
                  { label: 'Forma', value: 'Pix online' },
                  { label: 'Status', value: 'Aguardando' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                    <p className="mt-1 text-sm font-black text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                    <QrCode size={22} weight="duotone" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-950">Cobrança gerada no checkout</p>
                    <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
                      O cliente finaliza o pedido e recebe o pagamento online quando a loja estiver conectada.
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-[11px] font-medium leading-5 text-slate-400">
                A conexão é feita por OAuth. O lojista autoriza com a própria conta e pode desconectar quando quiser.
              </p>
            </div>
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
                      onError={(e) => { (e.target as HTMLImageElement).src = '/janocaminho.jpg'; }}
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
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f8_48%,#f8fafc_100%)] py-20 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(51,104,134,0.16),_transparent_44%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/70 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="mb-12 max-w-3xl space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[#336886]">App + web hub</p>
            <h2 className="text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
              O Já no Caminho funciona como app, hub e vitrine online.
            </h2>
            <p className="text-sm font-medium leading-7 text-slate-600 sm:text-base">
              No Android, o lojista e o cliente podem instalar o app. No iPhone, a experiência segue pelo navegador com acesso rápido ao Hub enquanto a versão iOS não chega.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_30px_70px_-44px_rgba(15,23,42,0.5)] sm:p-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(95,211,90,0.10),transparent_32%),radial-gradient(circle_at_86%_20%,rgba(51,104,134,0.12),transparent_34%)]" />
              <div className="relative overflow-hidden rounded-[1.55rem] bg-slate-950 p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                <img
                  src={appStorePreviewSrc}
                  alt="Prévia do aplicativo Já no Caminho no Google Play"
                  loading="lazy"
                  className="aspect-[1011/500] w-full rounded-[1.25rem] object-cover"
                />
              </div>
              <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: GooglePlayLogo, title: 'Google Play', text: 'Em fase final de publicação' },
                  { icon: DeviceMobile, title: 'Android', text: 'Instalação rápida pelo APK' },
                  { icon: Desktop, title: 'iPhone e web', text: 'Acesso pelo navegador' },
                ].map(({ icon: Icon, title, text }) => (
                  <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                    <Icon size={18} weight="duotone" className="text-[#336886]" />
                    <p className="mt-2 text-xs font-black text-slate-950">{title}</p>
                    <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-500">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_52px_-30px_rgba(15,23,42,0.32)] backdrop-blur-xl sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#336886]/15 bg-[#336886]/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#336886]">
                <DeviceMobile size={13} weight="duotone" />
                Acesso para todos
              </div>
              <h3 className="mt-4 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
                Um app para comprar, vender e acompanhar pedidos.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                O Hub em <strong className="font-black text-slate-800">janocaminho.com.br/hub</strong> já atende cliente, lojista e entregador. A Play Store entra como canal oficial para deixar a instalação mais simples e confiável.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => navigate('/hub')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f172a] px-5 py-3 text-sm font-black text-white shadow-[0_16px_32px_-18px_rgba(15,23,42,0.85)] transition-all hover:scale-[1.01] active:scale-[0.98]"
                >
                  <Storefront size={16} weight="duotone" />
                  Acessar Hub web
                </button>
                <a
                  href={androidApkPath}
                  download
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 transition-colors hover:bg-slate-50"
                >
                  <DownloadSimple size={16} weight="bold" />
                  Baixar APK
                </a>
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                <GooglePlayLogo size={11} weight="duotone" />
                Google Play visível para testers até a publicação
              </div>

              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-center gap-4">
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
                    <p className="mt-1 text-xs leading-5 text-slate-600">Use o celular para instalar o app Android ou compartilhe o link com a equipe.</p>
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
              </div>

              <ol className="mt-5 space-y-3 text-sm text-slate-600">
                {[
                  <span>Android: instale pelo APK ou pela Google Play quando sua conta tiver acesso.</span>,
                  <span>iPhone: acesse pelo Safari e adicione o Hub à tela inicial.</span>,
                  <span>Lojista e cliente entram pelo mesmo app, cada um com sua área.</span>,
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white">{i + 1}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                <ShieldCheck size={11} weight="duotone" />
                Canal oficial em preparação
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
                Sua loja pronta para<br /> vender com estrutura.
              </h2>
              <p className="mx-auto max-w-2xl text-base font-medium leading-relaxed text-slate-400 sm:text-lg">
                Experimente uma plataforma feita para o comerciante que quer organizar pedidos, atender melhor e crescer sem depender de improviso.
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
