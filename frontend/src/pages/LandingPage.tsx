import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowsClockwise,
  Bell,
  Buildings,
  ChartLine,
  CheckCircle,
  CloudArrowUp,
  CreditCard,
  CurrencyDollar,
  Desktop,
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
const mercadoPagoLandingLogo = '/mercado-pago-horizontal.png';

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
  const googlePlayUrl = 'https://play.google.com/store/apps/details?id=com.janocaminho.app';
  const googlePlayQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(googlePlayUrl)}`;
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
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Checkout integrado</p>
                        <h3 className="mt-1 text-xl font-black tracking-tight text-white">Cobrança online no pedido</h3>
                        <p className="mt-1 max-w-xs text-xs font-semibold leading-5 text-slate-400">
                          O cliente paga no fluxo da loja e o valor cai na conta Mercado Pago do próprio lojista.
                        </p>
                      </div>
                      <div className="relative w-full max-w-[290px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(145deg,rgba(13,25,48,0.94),rgba(2,52,81,0.92))] px-4 py-3 shadow-[0_28px_56px_-32px_rgba(0,158,227,0.55)] sm:w-[270px]">
                        <div className="pointer-events-none absolute -left-5 top-3 h-14 w-14 rounded-full bg-[#009ee3]/30 blur-2xl" />
                        <div className="pointer-events-none absolute -right-5 bottom-2 h-14 w-14 rounded-full bg-[#84cc16]/20 blur-2xl" />
                        <div className="relative rounded-[1rem] border border-white/70 bg-white/96 px-3 py-2 shadow-[0_18px_34px_-24px_rgba(255,255,255,0.65)]">
                          <img src={mercadoPagoLandingLogo} alt="Mercado Pago" className="h-14 w-full object-contain object-left" />
                        </div>
                        <div className="relative mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-100 backdrop-blur-xl">
                          <Lock size={11} weight="duotone" className="text-sky-300" />
                          Autorização segura
                        </div>
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

                      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(13,25,48,0.92),rgba(5,44,68,0.9))] p-4 shadow-[0_28px_60px_-36px_rgba(2,132,199,0.6)]">
                        <div className="pointer-events-none absolute -left-4 top-8 h-16 w-16 rounded-full bg-[#009ee3]/20 blur-2xl" />
                        <div className="pointer-events-none absolute -right-4 bottom-5 h-16 w-16 rounded-full bg-[#84cc16]/15 blur-2xl" />
                        <div className="relative flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-200">Conta conectada</p>
                            <p className="mt-1 text-sm font-black text-white">Mercado Pago do lojista</p>
                          </div>
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-xl">
                            <ShieldCheck size={20} weight="duotone" className="text-emerald-300" />
                          </div>
                        </div>
                        <div className="relative mt-4 flex items-center gap-3 rounded-[1.15rem] border border-white/10 bg-white/[0.05] px-3 py-3 backdrop-blur-xl">
                          <div className="rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                            MP
                          </div>
                          <div className="relative flex-1">
                            <span className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-dashed border-sky-300/35" />
                            <span className="relative mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.1]">
                              <Lock size={15} weight="duotone" className="text-sky-300" />
                            </span>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
                            JNC
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {[
                            { icon: QrCode, label: 'Pix' },
                            { icon: CreditCard, label: 'Crédito' },
                            { icon: CurrencyDollar, label: 'Débito' },
                          ].map(({ icon: Icon, label }) => (
                            <div key={label} className="rounded-[1rem] border border-white/10 bg-white/[0.08] px-2 py-2 text-center text-[11px] font-black text-white backdrop-blur-xl">
                              <Icon size={15} weight="duotone" className="mx-auto mb-1 text-sky-300" />
                              {label}
                            </div>
                          ))}
                        </div>
                        <p className="relative mt-4 text-xs font-semibold leading-5 text-slate-300">
                          Recebimento direto na conta da loja, com fallback presencial quando a cobrança online estiver desligada.
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
          <div className="grid items-center gap-10 rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.08),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(132,204,22,0.08),transparent_28%),linear-gradient(135deg,#f8fafc_0%,#ffffff_48%,#eef8ff_100%)] p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.55)] sm:p-10 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-sky-700 shadow-sm backdrop-blur-xl">
                <ShieldCheck size={13} weight="duotone" />
                JNC Payment Bridge
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
                  { icon: QrCode, label: 'Pix online', tone: 'text-emerald-700 bg-white/85 border-emerald-100' },
                  { icon: CreditCard, label: 'Crédito', tone: 'text-sky-700 bg-white/85 border-sky-100' },
                  { icon: CurrencyDollar, label: 'Débito', tone: 'text-indigo-700 bg-white/85 border-indigo-100' },
                  { icon: Storefront, label: 'Fallback presencial', tone: 'text-slate-700 bg-white/85 border-slate-200' },
                ].map(({ icon: Icon, label, tone }) => (
                  <span key={label} className={`inline-flex items-center gap-2 rounded-[1rem] border px-3 py-2 text-xs font-black shadow-sm backdrop-blur-xl ${tone}`}>
                    <Icon size={16} weight="duotone" />
                    {label}
                  </span>
                ))}
              </div>
              <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/80 p-4 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0d1930,#0b4d72)] text-white shadow-[0_18px_30px_-18px_rgba(2,132,199,0.45)]">
                    <Lock size={20} weight="duotone" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-950">Conexão segura, sem repasse manual</p>
                    <p className="mt-1 text-xs font-medium leading-5 text-slate-600 sm:text-sm">
                      A loja autoriza no ambiente do Mercado Pago e o dinheiro cai direto na conta dela, com visual de checkout nativo no pedido.
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/create?plan=trial')}
                className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#84cc16,#65a30d)] px-7 py-3.5 text-sm font-black text-[#0d1930] shadow-[0_22px_44px_-22px_rgba(132,204,22,0.6)] transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                Ativar minha loja
                <ArrowRight size={16} weight="bold" />
              </button>
            </div>

            <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-900/5 bg-[linear-gradient(135deg,#091223_0%,#0d1930_44%,#07324c_100%)] p-1 shadow-[0_36px_90px_-50px_rgba(2,132,199,0.55)]">
              <div className="pointer-events-none absolute left-8 top-10 h-24 w-24 rounded-full bg-[#009ee3]/25 blur-3xl" />
              <div className="pointer-events-none absolute bottom-8 right-8 h-24 w-24 rounded-full bg-[#84cc16]/18 blur-3xl" />
              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-5 py-5 backdrop-blur-[20px] sm:px-6 sm:py-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-200">Mercado Pago integrado</p>
                    <p className="mt-2 max-w-sm text-xs font-medium leading-5 text-slate-400">
                      Conta do lojista conectada ao checkout do pedido.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/95 px-4 py-3 shadow-[0_22px_42px_-28px_rgba(0,158,227,0.65)]">
                      <img src={mercadoPagoLandingLogo} alt="Mercado Pago" className="h-16 w-full max-w-[250px] object-contain object-left" />
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-100 backdrop-blur-xl">
                      <Lock size={11} weight="duotone" className="text-sky-300" />
                      Conta conectada
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-200">Checkout com cara de plataforma</p>
                  <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-300">
                    O cliente paga dentro do fluxo da loja e a cobrança segue para a conta conectada do próprio lojista, sem repasse manual.
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                      Mercado Pago
                    </div>
                    <div className="relative flex-1">
                      <span className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-dashed border-sky-300/35" />
                      <span className="relative mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.1] shadow-[0_14px_30px_-18px_rgba(0,158,227,0.55)]">
                        <Lock size={18} weight="duotone" className="text-sky-300" />
                      </span>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
                      JNC Checkout
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-medium leading-5 text-slate-300">
                    OAuth seguro para autorizar uma vez e manter Pix, crédito e débito dentro do pedido.
                  </p>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {[
                    { icon: QrCode, label: 'Pix', accent: 'text-emerald-300' },
                    { icon: CreditCard, label: 'Crédito', accent: 'text-sky-300' },
                    { icon: CurrencyDollar, label: 'Débito', accent: 'text-indigo-300' },
                  ].map(({ icon: Icon, label, accent }) => (
                    <div key={label} className="rounded-[1rem] border border-white/10 bg-white/[0.08] px-3 py-3 text-center backdrop-blur-xl">
                      <Icon size={17} weight="duotone" className={`mx-auto mb-1.5 ${accent}`} />
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {[
                    { label: 'Pedido', value: 'R$ 86,90' },
                    { label: 'Fluxo', value: 'Checkout online' },
                    { label: 'Recebedor', value: 'Conta da loja' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1rem] border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur-xl">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                      <p className="mt-1 text-sm font-black text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-4 py-3 text-[11px] font-medium leading-5 text-slate-300 backdrop-blur-xl">
                  Se a loja preferir manter o atendimento presencial, o pedido continua operando sem bloquear o restante da jornada.
                </div>
              </div>
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
      <section className="bg-white py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] border border-emerald-100 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_60%,#ecfdf5_100%)] p-6 shadow-[0_16px_40px_-24px_rgba(16,185,129,0.2)] sm:flex-row sm:items-center sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Buildings size={24} weight="duotone" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">Comércio hiperlocal</p>
                <h3 className="mt-1 text-lg font-black leading-tight text-slate-950 sm:text-xl">Sua loja também vende dentro de condomínios.</h3>
                <p className="mt-1.5 max-w-lg text-sm font-medium leading-relaxed text-slate-600">
                  Feiras, eventos e comércios de bairro ganham vitrine própria no Hub. Cliente escolhe o condomínio e faz o pedido pelo mesmo fluxo.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['Lojas por condomínio', 'Retirada na barraca', 'Entrega no apartamento'].map((item) => (
                    <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-bold text-emerald-700">
                      <CheckCircle size={11} weight="fill" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <a
                href="/condominio/solicitar"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-[0_12px_28px_-14px_rgba(15,23,42,0.6)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Quero para meu condomínio
                <ArrowRight size={14} weight="bold" />
              </a>
              <button
                type="button"
                onClick={() => navigate('/hub')}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Ver Hub
              </button>
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

          {/* Header */}
          <div className="mb-12 max-w-3xl space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[#336886]">App + web hub</p>
            <h2 className="text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
              O Já no Caminho funciona como app, hub e vitrine online.
            </h2>
            <p className="text-sm font-medium leading-7 text-slate-600 sm:text-base">
              No Android, baixe direto pela Google Play. No iPhone, a experiência segue pelo navegador com acesso rápido ao Hub enquanto a versão iOS não chega.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">

            {/* Coluna esquerda — imagens reais da Play Store */}
            <div className="flex flex-col gap-4">
              {/* Banner do app na Play Store */}
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_70px_-44px_rgba(15,23,42,0.45)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(95,211,90,0.08),transparent_32%),radial-gradient(circle_at_86%_20%,rgba(51,104,134,0.10),transparent_34%)]" />
                <img
                  src="/marketing/playstore.png"
                  alt="Já no Caminho na Google Play Store"
                  loading="lazy"
                  className="w-full rounded-[2rem] object-cover"
                />
              </div>
              {/* Screenshot da página da Play Store */}
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.35)]">
                <div className="overflow-hidden rounded-[1.5rem] border border-slate-100">
                  <img
                    src="/marketing/playstore-aberto.png"
                    alt="Página do Já no Caminho na Google Play Store"
                    loading="lazy"
                    className="w-full object-cover"
                  />
                </div>
                <div className="mt-3 flex items-center gap-2 px-1">
                  <GooglePlayLogo size={14} weight="fill" className="text-[#01875f]" />
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.18em]">Google Play Store — Oficial</span>
                </div>
              </div>
            </div>

            {/* Coluna direita — CTA + QR code */}
            <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_52px_-30px_rgba(15,23,42,0.32)] backdrop-blur-xl sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">
                <ShieldCheck size={13} weight="duotone" />
                Disponível na Google Play
              </div>
              <h3 className="mt-4 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
                Um app para comprar, vender e acompanhar pedidos.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                Baixe agora pelo canal oficial. Lojista, cliente e entregador — tudo em um só app.
              </p>

              {/* Botões */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <a
                  href={googlePlayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#01875f] px-5 py-3 text-sm font-black text-white shadow-[0_16px_32px_-18px_rgba(1,135,95,0.7)] transition-all hover:scale-[1.02] hover:bg-[#017a56] active:scale-[0.98]"
                >
                  <GooglePlayLogo size={18} weight="fill" />
                  Baixar na Google Play
                </a>
                <button
                  type="button"
                  onClick={() => navigate('/hub')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 transition-colors hover:bg-slate-50"
                >
                  <Storefront size={16} weight="duotone" />
                  Acessar Hub web
                </button>
              </div>

              {/* QR Code */}
              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-center gap-4">
                  <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                    <img
                      src={googlePlayQrSrc}
                      alt="QR Code para baixar o app na Google Play"
                      loading="lazy"
                      className="h-24 w-24 rounded-lg sm:h-28 sm:w-28"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Escaneie para baixar</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Aponte a câmera do celular para o QR code e instale direto pela Google Play.</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                      <GooglePlayLogo size={11} weight="fill" />
                      Google Play oficial
                    </div>
                  </div>
                </div>
              </div>

              {/* Apple badge */}
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden="true">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-black text-slate-950">App Store — Em breve</p>
                  <p className="text-[11px] font-medium text-slate-500">Versão iOS em desenvolvimento. No iPhone, use pelo Safari.</p>
                </div>
              </div>

              <ol className="mt-5 space-y-3 text-sm text-slate-600">
                {[
                  <span>Android: baixe pelo botão acima ou escaneie o QR code.</span>,
                  <span>iPhone: acesse pelo Safari e adicione o Hub à tela inicial.</span>,
                  <span>Lojista e cliente entram pelo mesmo app, cada um com sua área.</span>,
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white">{i + 1}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
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
