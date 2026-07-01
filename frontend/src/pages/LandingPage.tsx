import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Buildings,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  GooglePlayLogo,
  Handshake,
  Lock,
  MapPin,
  Motorcycle,
  Package,
  Phone,
  Rocket,
  ShieldCheck,
  Storefront,
  User,
  UserCircle,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useRoleRedirect } from '../hooks/useRoleRedirect';
import { LandingPageLayout } from '../layouts/LandingPageLayout';
import { storeService } from '../services/storeService';
import { customerAccountService } from '../services/customerAccountService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { SocialProofMarquee } from '../components/Landing/SocialProofMarquee';
import { HubFlowSimulator } from '../components/Landing/HubFlowSimulator';
import { BentoFeatures } from '../components/Landing/BentoFeatures';
import { LandingUseCases } from '../components/Landing/LandingUseCases';
import { PricingSection } from '../components/Landing/PricingSection';
import { EcosystemDeckShowcase } from '../components/Landing/EcosystemDeckShowcase';

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
  const [customerAuthNotice, setCustomerAuthNotice] = useState('');
  const [customerVerifyPrompt, setCustomerVerifyPrompt] = useState<{ email: string; emailMasked?: string | null } | null>(null);
  const [customerVerifyCode, setCustomerVerifyCode] = useState('');
  const [customerVerifyLoading, setCustomerVerifyLoading] = useState(false);
  const [customerResendLoading, setCustomerResendLoading] = useState(false);
  const [customerResendCooldown, setCustomerResendCooldown] = useState(0);
  const [targetStoreSlug, setTargetStoreSlug] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = 'Já no Caminho | Venda online, organize pedidos e entregue melhor';
    const description =
      'Sistema para comerciantes venderem online sem comissão por pedido: cardápio digital, pedidos em tempo real, entregadores, pagamentos, condomínios, chalés e turismo local.';
    upsertMeta('description', description, 'name');
    upsertMeta('og:title', 'Já no Caminho | Venda online, organize pedidos e entregue melhor', 'property');
    upsertMeta('og:description', description, 'property');
    upsertMeta('og:image', 'https://www.janocaminho.com.br/janocaminho.jpg', 'property');
    upsertMeta('og:type', 'website', 'property');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || window.location.hash !== '#solucao-hospedagens') return;
    const timer = window.setTimeout(() => {
      document.getElementById('solucao-hospedagens')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, []);

  useRoleRedirect();

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

  useEffect(() => {
    if (customerResendCooldown <= 0) return;
    const timer = window.setTimeout(() => setCustomerResendCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [customerResendCooldown]);

  const handleCustomerAuthSubmit = async () => {
    if (customerAuthLoading) return;
    setCustomerAuthLoading(true);
    setCustomerAuthError('');
    setCustomerAuthNotice('');
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
        if (result?.next === 'VERIFY_EMAIL_CODE') {
          const targetEmail = String(result?.email || customerAuthForm.email || '').trim().toLowerCase();
          setCustomerVerifyPrompt({
            email: targetEmail,
            emailMasked: result?.emailMasked || targetEmail,
          });
          setCustomerVerifyCode('');
          {
            const cooldown = Number(result?.cooldownSec);
            setCustomerResendCooldown(Number.isFinite(cooldown) ? Math.max(0, cooldown) : 60);
          }
          setCustomerAuthNotice(
            result?.emailDeliveryStatus === 'failed' && result?.reason === 'ACCOUNT_PENDING_EMAIL_VERIFICATION'
              ? 'Encontramos sua conta aguardando confirmação, mas não conseguimos enviar um novo código agora. Se você já recebeu um código, pode tentar usá-lo; se não, toque em Reenviar código em instantes.'
              : result?.emailDeliveryStatus === 'failed'
              ? 'Sua conta foi criada, mas o envio do código falhou agora. Toque em Reenviar código para tentar novamente.'
              : result?.reason === 'ACCOUNT_PENDING_EMAIL_VERIFICATION'
              ? 'Encontramos sua conta. Falta só confirmar o e-mail; enviamos um novo código para você continuar.'
              : 'Enviamos um código de 4 dígitos para concluir seu cadastro.'
          );
          return;
        }
      } else {
        result = await customerAccountService.login({
          email: String(customerAuthForm.email || '').trim(),
          password: String(customerAuthForm.password || ''),
        });
      }
      if (!result?.token) throw new Error('Não foi possível autenticar.');
      localStorage.setItem('customerSession', JSON.stringify(result));
      setHasCustomerSession(true);
      const slug = String(targetStoreSlug || '').trim();
      if (slug) {
        navigate(`/${slug}`);
      } else {
        navigate('/');
      }
    } catch (error: any) {
      if (error?.code === 'AUTH-005') {
        const targetEmail = String(error?.details?.email || customerAuthForm.email || '').trim().toLowerCase();
        setCustomerVerifyPrompt({
          email: targetEmail,
          emailMasked: error?.details?.emailMasked || targetEmail,
        });
        setCustomerVerifyCode('');
        setCustomerResendCooldown(Number(error?.details?.resendCooldownSec || 60));
        setCustomerAuthNotice('Sua conta já existe e só falta confirmar o e-mail. Reenvie o código se precisar.');
        return;
      }
      setCustomerAuthError(error?.message || 'Falha ao autenticar cliente.');
    } finally {
      setCustomerAuthLoading(false);
    }
  };

  const finishCustomerAuth = (result: any) => {
    if (!result?.token) throw new Error('Não foi possível autenticar.');
    localStorage.setItem('customerSession', JSON.stringify(result));
    setHasCustomerSession(true);
    setShowCustomerAuth(false);
    setCustomerVerifyPrompt(null);
    setCustomerVerifyCode('');
    const slug = String(targetStoreSlug || '').trim();
    navigate(slug ? `/${slug}` : '/');
  };

  const handleCustomerVerifyCode = async () => {
    const email = String(customerVerifyPrompt?.email || customerAuthForm.email || '').trim().toLowerCase();
    const code = String(customerVerifyCode || '').replace(/\D/g, '').slice(0, 4);
    if (!email || code.length !== 4 || customerVerifyLoading) return;
    setCustomerVerifyLoading(true);
    setCustomerAuthError('');
    setCustomerAuthNotice('');
    try {
      const result = await customerAccountService.verifyEmailCode({ email, code });
      finishCustomerAuth(result);
    } catch (error: any) {
      setCustomerAuthError(error?.message || 'Código inválido ou expirado.');
    } finally {
      setCustomerVerifyLoading(false);
    }
  };

  const handleCustomerResendVerification = async () => {
    const email = String(customerVerifyPrompt?.email || customerAuthForm.email || '').trim().toLowerCase();
    if (!email || customerResendLoading || customerResendCooldown > 0) return;
    setCustomerResendLoading(true);
    setCustomerAuthError('');
    setCustomerAuthNotice('');
    try {
      const result = await customerAccountService.resendEmailCode(email);
      setCustomerVerifyPrompt((prev) => ({
        email,
        emailMasked: result?.emailMasked || prev?.emailMasked || email,
      }));
      setCustomerVerifyCode('');
      {
        const cooldown = Number(result?.cooldownSec);
        setCustomerResendCooldown(Number.isFinite(cooldown) ? Math.max(0, cooldown) : 60);
      }
      if (result?.emailDeliveryStatus === 'failed') {
        setCustomerAuthError('Não conseguimos enviar o código agora. Tente reenviar novamente em instantes.');
      } else {
        setCustomerAuthNotice(result?.message || 'Novo código enviado para seu e-mail.');
      }
    } catch (error: any) {
      setCustomerAuthError(error?.message || 'Não foi possível reenviar o código agora.');
    } finally {
      setCustomerResendLoading(false);
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

  const whatsAppBusinessMessage = encodeURIComponent('Olá, quero garantir uma das 50 vagas com 3 meses VIP no Já no Caminho.');
  const whatsAppBusinessHref = `https://wa.me/551239334979?text=${whatsAppBusinessMessage}`;
  const ctaPrimaryHref = whatsAppBusinessHref;

  const heroHighlights = [
    { icon: ShieldCheck, title: '3 meses VIP para as 50 primeiras', desc: 'Campanha de lançamento para a loja testar com estrutura real.' },
    { icon: Package, title: 'Pedido pronto para produzir', desc: 'Cardápio, checkout e impressão no mesmo fluxo.' },
    { icon: Motorcycle, title: 'Entrega conectada à loja', desc: 'Entregador recebe oferta, aceita e atualiza o cliente.' },
  ];

  return (
    <LandingPageLayout>
      <div className="bg-[#030712] text-slate-100 selection:bg-sky-500 selection:text-white">
        
        {/* ══════════════════════════════════════════════════════════════
            HERO (MODERN DARK CINEMATIC)
        ══════════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden pt-12 pb-24 sm:pt-16 sm:pb-32 lg:pt-24">
          {/* Malha de Grade CSS em background */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.12]" />
          
          {/* Glowing blobs */}
          <div className="pointer-events-none absolute left-[15%] top-[-10%] h-[350px] w-[350px] rounded-full bg-sky-500/10 blur-[100px]" />
          <div className="pointer-events-none absolute right-[10%] top-[20%] h-[400px] w-[400px] rounded-full bg-emerald-500/8 blur-[120px]" />
          
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
              
              {/* Left Copy */}
              <div className="space-y-8 text-center lg:col-span-7 lg:text-left">
                {/* Badge VIP */}
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/5 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-sky-300">
                  <Rocket size={14} weight="fill" className="animate-bounce" />
                  3 meses VIP para as 50 primeiras lojas
                </div>

                <div className="space-y-4">
                  <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.05]">
                    Seu negócio vendendo online<br />
                    <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 bg-[size:200%_auto] bg-clip-text text-transparent animate-pulse">
                      sem comissão por pedido.
                    </span>
                  </h1>
                  <p className="mx-auto max-w-xl text-slate-300 text-sm sm:text-base font-medium leading-relaxed lg:mx-0">
                    Do cardápio à entrega, tudo num só app — para comida, varejo e serviço local. O cliente paga e o dinheiro cai direto no seu Mercado Pago. Planos a partir de R$ 69,90/mês.
                  </p>
                </div>

                {/* CTAs */}
                <div className="flex flex-col gap-3 sm:flex-row justify-center lg:justify-start">
                  <button
                    type="button"
                    onClick={() => navigate('/create?plan=trial')}
                    className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-black text-slate-950 shadow-[0_20px_40px_-15px_rgba(255,255,255,0.25)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Criar minha loja
                    <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                  </button>
                  <a
                    href={ctaPrimaryHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-7 py-4 text-sm font-black text-white backdrop-blur-md transition-colors hover:bg-white/10 active:scale-[0.98]"
                  >
                    <WhatsappLogo size={18} weight="fill" className="text-emerald-400" />
                    Falar no WhatsApp
                  </a>
                </div>

                {/* Mini Highlights */}
                <div className="grid gap-3 sm:grid-cols-3 pt-4">
                  {heroHighlights.map(({ icon: Icon, title, desc }) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-left backdrop-blur-xl"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-sky-400">
                        <Icon size={18} weight="duotone" />
                      </div>
                      <p className="mt-3 text-xs font-black text-white leading-snug">{title}</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-400 leading-normal">{desc}</p>
                    </div>
                  ))}
                </div>

                {/* Login de cliente */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (hasCustomerSession) { navigate('/cliente/conta'); return; }
                      setShowCustomerAuth(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                  >
                    <UserCircle size={15} weight="duotone" />
                    {hasCustomerSession ? 'Minha conta de cliente →' : 'Já tenho conta de cliente →'}
                  </button>
                </div>
              </div>

              {/* Right Panel Showcase */}
              <div className="lg:col-span-5 relative flex items-center justify-center lg:justify-end">
                <div className="absolute -inset-4 rounded-full bg-sky-500/10 blur-[80px]" />
                
                {/* Cartão de visualização do Mercado Pago Checkout */}
                <div className="relative w-full max-w-[380px] rounded-3xl border border-white/10 bg-slate-900/60 p-4 shadow-2xl backdrop-blur-2xl">
                  
                  {/* Status do checkout */}
                  <div className="mb-3.5 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-sky-300">Checkout Unificado</p>
                      <p className="text-[12px] font-black text-white mt-0.5">Pagamento Direto na sua Conta</p>
                    </div>
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>

                  {/* Detalhes do Pedido Simulado */}
                  <div className="rounded-2xl border border-white/5 bg-slate-950 p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Pedido #1027</p>
                        <p className="text-[14px] font-black text-white mt-0.5">Combo Família VIP</p>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[9px] font-black uppercase text-emerald-300">
                        Pago via Pix
                      </span>
                    </div>

                    {/* Simulação da conexão Mercado Pago */}
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Gateway Seguro</span>
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-full">
                          <Lock size={10} weight="fill" />
                          Conexão Direta
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                        <img src={mercadoPagoLandingLogo} alt="Mercado Pago Logo" className="h-6 object-contain" />
                        <span className="text-[9.5px] font-black text-emerald-600">✓ Ativo</span>
                      </div>
                    </div>

                    {/* Preços */}
                    <div className="space-y-1.5 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>Itens (Combo)</span>
                        <span className="text-white">R$ 89,90</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxa de Entrega</span>
                        <span className="text-white">R$ 6,00</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-white border-t border-white/5 pt-2">
                        <span>Total Recebido</span>
                        <span className="text-emerald-400">R$ 95,90</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center mt-3 font-semibold">
                    Dinheiro direto no seu Mercado Pago · Sem reter saldo
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SIMULADOR INTERATIVO (O FLUXO ORQUESTRADO)
        ══════════════════════════════════════════════════════════════ */}
        <section className="relative bg-slate-950 py-20 sm:py-28 overflow-hidden border-t border-b border-white/5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(139,92,246,0.06),transparent_50%)]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <HubFlowSimulator />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SOCIAL PROOF (MARQUEE DE LOJAS PORTFÓLIO)
        ══════════════════════════════════════════════════════════════ */}
        {featuredStores.length > 0 && (
          <section className="bg-[#030712] py-8 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 text-center mb-4">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                Lojas do portfólio ativas na plataforma
              </p>
            </div>
            <SocialProofMarquee clients={featuredStores} />
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════
            BENTO GRID (FUNCIONALIDADES)
        ══════════════════════════════════════════════════════════════ */}
        <section className="relative bg-[#030712] py-20 sm:py-28 overflow-hidden">
          <div className="pointer-events-none absolute left-0 bottom-0 h-96 w-96 rounded-full bg-emerald-500/5 blur-[120px]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <BentoFeatures />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            APRESENTAÇÃO DO ECOSSISTEMA (SLIDESHOW DO PITCH DECK)
        ══════════════════════════════════════════════════════════════ */}
        <EcosystemDeckShowcase />

        <PricingSection />

        {/* ══════════════════════════════════════════════════════════════
            CASOS DE USO REAIS (SIMULADORES INTERATIVOS)
        ══════════════════════════════════════════════════════════════ */}
        <section className="relative bg-[#030712] pb-20 sm:pb-28 overflow-hidden">
          <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-500/5 blur-[120px]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <LandingUseCases />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            CAMPANHA VIP E SUPORTE
        ══════════════════════════════════════════════════════════════ */}
        <section className="relative bg-slate-950 py-16 sm:py-24 border-t border-b border-white/5">
          <div className="relative mx-auto max-w-6xl px-4">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              
              <div className="lg:col-span-6 space-y-4 text-center lg:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                  Sem burocracia
                </span>
                <h2 className="text-3xl font-black text-white sm:text-5xl leading-tight">
                  Como funciona os 3 meses VIP?
                </h2>
                <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed">
                  A nossa campanha de lançamento quer que você valide a plataforma sem risco financeiro. Nós ajudamos no setup inicial e tiramos todas as suas dúvidas.
                </p>
              </div>

              <div className="lg:col-span-6 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: Storefront, title: 'Loja pronta', desc: 'Cardápio, vitrine digital, horários e links estruturados.' },
                  { icon: WhatsappLogo, title: 'Suporte Oficial', desc: 'Contato direto e atendimento via WhatsApp Business.' },
                  { icon: ShieldCheck, title: 'Taxa Zero', desc: 'Teste sem taxas de adesão ou de intermediação.' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-3 backdrop-blur-xl">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-sky-400">
                      <Icon size={18} weight="duotone" />
                    </div>
                    <p className="text-sm font-black text-white leading-snug">{title}</p>
                    <p className="text-xs font-semibold text-slate-400 leading-normal">{desc}</p>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            COMO COMEÇAR (3 PASSOS RÁPIDOS)
        ══════════════════════════════════════════════════════════════ */}
        <section className="relative bg-[#030712] py-20 sm:py-28 overflow-hidden">
          <div className="mx-auto max-w-5xl px-4">
            
            <div className="mb-16 text-center space-y-3">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-sky-400">Praticidade</p>
              <h2 className="text-3xl font-black text-white sm:text-5xl">
                Crie e configure sua loja em minutos
              </h2>
              <p className="mx-auto max-w-xl text-slate-400 text-sm sm:text-base font-medium">
                Sem cadastros gigantescos ou necessidade de desenvolvedores. Gerencie tudo do celular ou computador.
              </p>
            </div>

            <div className="relative grid gap-6 sm:grid-cols-3">
              {/* Linha conectora no desktop */}
              <div className="pointer-events-none absolute left-[15%] right-[15%] top-11 hidden h-px bg-white/10 sm:block" />

              {[
                {
                  step: '01',
                  icon: User,
                  title: '1. Crie seu Login',
                  desc: 'Inscreva sua loja para garantir os 3 meses VIP de lançamento sem custos iniciais.'
                },
                {
                  step: '02',
                  icon: Storefront,
                  title: '2. Insira o Cardápio',
                  desc: 'Adicione seus produtos, fotos, adicionais, configure as formas de pagamento e entrega.'
                },
                {
                  step: '03',
                  icon: Rocket,
                  title: '3. Divulgue e Venda',
                  desc: 'Divulgue o link nos seus canais. O pedido cai direto no seu painel em tempo real.'
                }
              ].map(({ step, icon: Icon, title, desc }) => (
                <div key={step} className="relative flex flex-col items-center gap-4 rounded-3xl border border-white/5 bg-white/[0.02] p-6 text-center backdrop-blur-xl">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 shadow-lg">
                    <Icon size={22} weight="duotone" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-white">{title}</h3>
                    <p className="text-xs font-medium text-slate-400 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-14 text-center space-y-3">
              <button
                type="button"
                onClick={() => navigate('/create?plan=trial')}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4.5 text-sm font-black text-slate-950 shadow-2xl transition-transform hover:scale-[1.01] active:scale-[0.98]"
              >
                Garantir 3 Meses VIP Grátis
                <ArrowRight size={16} weight="bold" />
              </button>
              <p className="text-xs font-semibold text-slate-500">Sem burocracias ou cartão no cadastro</p>
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            HUB DE CONDOMÍNIOS (BANNER DE COMÉRCIO LOCAL)
        ══════════════════════════════════════════════════════════════ */}
        {/* ══════════════════════════════════════════════════════════════
            OUTRAS SOLUÇÕES (CONDOMÍNIOS, DESTINOS E HOSPEDAGENS) — secundário
        ══════════════════════════════════════════════════════════════ */}
        <section className="relative bg-slate-950 py-14 overflow-hidden border-t border-b border-white/5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Outras soluções</p>
              <h3 className="mt-2 text-lg font-black text-white sm:text-xl">Mais do que uma vitrine online</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: Buildings, title: 'Condomínios e feiras', desc: 'Vitrine hiperlocal: moradores veem quem entrega na portaria.', href: '/condominio/login', cta: 'Entrar no condomínio' },
                { icon: MapPin, title: 'Destinos e pousadas', desc: 'Hóspede escaneia o QR e vê quem entrega no chalé.', href: '/destinos', cta: 'Ver destinos' },
                { icon: Handshake, title: 'Sou parceiro de hospedagem', desc: 'Cadastre seu chalé/pousada e conecte comércios do entorno.', href: '/destinos/cadastrar', cta: 'Cadastrar hospedagem' },
              ].map(({ icon: Icon, title, desc, href, cta }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => navigate(href)}
                  className="group text-left rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-sky-400">
                    <Icon size={18} weight="duotone" />
                  </div>
                  <h4 className="mt-3 text-sm font-black text-white">{title}</h4>
                  <p className="mt-1 text-xs font-medium text-slate-400 leading-relaxed">{desc}</p>
                  <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-sky-400 transition-transform group-hover:translate-x-0.5">
                    {cta} <ArrowRight size={12} weight="bold" />
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            HOSPEDAGENS E TURISMO
        ══════════════════════════════════════════════════════════════ */}
        {/* (seção de hospedagens/turismo consolidada em "Outras soluções" acima) */}
{/* ══════════════════════════════════════════════════════════════
            DOWNLOAD DO APP (GOOGLE PLAY & SAFARI PWA)
        ══════════════════════════════════════════════════════════════ */}
        <section className="relative bg-slate-950 py-20 sm:py-28 overflow-hidden border-t border-white/5">
          <div className="pointer-events-none absolute left-1/3 top-0 h-[300px] w-[300px] rounded-full bg-violet-500/5 blur-[90px]" />
          
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              
              {/* Copy & Qr Code */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">
                  Mobilidade Completa
                </span>
                
                <h2 className="text-3xl font-black text-white sm:text-5xl leading-tight">
                  Toda a experiência em suas mãos
                </h2>
                
                <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
                  Clientes pedem, entregadores entregam e lojistas gerenciam o painel de produção direto pelo nosso aplicativo oficial ou via Web.
                </p>

                {/* QR Code Container */}
                <div className="flex flex-col sm:flex-row items-center gap-5 justify-center lg:justify-start bg-white/[0.02] border border-white/5 p-4 rounded-2xl max-w-md mx-auto lg:mx-0">
                  <div className="bg-white p-2 rounded-xl shrink-0">
                    <img src={googlePlayQrSrc} alt="QR Code Google Play" className="h-24 w-24 sm:h-28 sm:w-28 rounded-md" />
                  </div>
                  <div className="space-y-1 text-center sm:text-left">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">Google Play Store</p>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                      Escaneie o QR Code com a câmera do celular para baixar direto na loja oficial Android.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                  <a
                    href={googlePlayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#01875f] px-5 py-3 text-xs font-black text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <GooglePlayLogo size={16} weight="fill" />
                    Download Google Play
                  </a>
                  <button
                    type="button"
                    onClick={() => navigate('/hub')}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-black text-white hover:bg-white/10 active:scale-[0.98] transition-colors"
                  >
                    Acessar App Web
                  </button>
                </div>
              </div>

              {/* Preview da Playstore e App */}
              <div className="lg:col-span-5 relative flex flex-col gap-4 items-center">
                <div className="absolute -inset-4 rounded-full bg-emerald-500/5 blur-[80px]" />
                
                {/* Banner de Rastreamento Real no Celular */}
                <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl p-2.5 max-w-[320px]">
                  <div className="overflow-hidden rounded-[1.5rem]">
                    <img
                      src="/marketing/certo_play.png"
                      alt="Já no Caminho App Playstore Mockup"
                      className="w-full object-cover"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            FINAL CTA & URGENCE
        ══════════════════════════════════════════════════════════════ */}
        <section className="relative bg-[#030712] py-24 sm:py-32 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.08),transparent_50%)]" />
          
          <div className="relative mx-auto max-w-4xl px-4 text-center space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              Lançamento Oficial VIP
            </span>

            <h2 className="text-4xl font-black text-white sm:text-6xl tracking-tight leading-none">
              Garanta sua vaga<br /> com 3 meses grátis.
            </h2>
            
            <p className="mx-auto max-w-xl text-slate-400 text-sm sm:text-base font-medium leading-relaxed">
              Inicie seu cardápio digital, receba pagamentos e despache entregas hoje mesmo. Sem compromissos, cancele a qualquer momento.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => navigate('/create?plan=trial')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4.5 text-base font-black text-slate-950 shadow-2xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Garantir Vaga VIP (3 Meses Grátis)
                <ArrowRight size={16} weight="bold" />
              </button>
              <a
                href={whatsAppBusinessHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4.5 text-base font-black text-white hover:bg-white/10 active:scale-[0.98] transition-colors"
              >
                <WhatsappLogo size={18} weight="fill" className="text-emerald-400" />
                Tirar Dúvidas no WhatsApp
              </a>
            </div>

            <p className="text-xs font-semibold text-slate-500 pt-2">
              Campanha exclusiva limitada para comerciantes locais do entorno.
            </p>
          </div>
        </section>

      </div>

      {/* ══════════════════════════════════════════════════════════════
          MODAL: CUSTOMER AUTH (INTEGRIDADE TOTAL PRESERVADA)
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
            <div className="flex items-start justify-between gap-3 text-slate-900">
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
            <div className="mt-5 flex rounded-2xl border border-slate-200 bg-slate-50 p-1 text-slate-900">
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

            <div className="mt-5 space-y-3 text-slate-900">
              {customerVerifyPrompt ? (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      <EnvelopeSimple size={22} weight="duotone" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Confirmar e-mail</p>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700">
                        Digite o código enviado para{' '}
                        <span className="rounded-lg bg-white px-2 py-0.5 font-black text-slate-950">
                          {customerVerifyPrompt.emailMasked || customerVerifyPrompt.email}
                        </span>
                        .
                      </p>
                    </div>
                  </div>
                  <input
                    value={customerVerifyCode}
                    onChange={(e) => setCustomerVerifyCode(String(e.target.value || '').replace(/\D/g, '').slice(0, 4))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleCustomerVerifyCode();
                      }
                    }}
                    placeholder="0000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-2xl font-black tracking-[0.35em] text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                  {customerAuthNotice ? (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold leading-relaxed text-emerald-700">{customerAuthNotice}</p>
                  ) : null}
                  {customerAuthError ? (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold leading-relaxed text-rose-600">{customerAuthError}</p>
                  ) : null}
                  <button
                    type="button"
                    disabled={customerVerifyCode.length !== 4 || customerVerifyLoading}
                    onClick={handleCustomerVerifyCode}
                    className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition-opacity disabled:opacity-60 hover:opacity-90"
                  >
                    {customerVerifyLoading ? 'Validando...' : 'Confirmar e entrar'}
                  </button>
                  <button
                    type="button"
                    disabled={customerResendLoading || customerResendCooldown > 0}
                    onClick={handleCustomerResendVerification}
                    className="w-full text-center text-xs font-black uppercase tracking-[0.12em] text-slate-500 transition-colors hover:text-slate-900 disabled:text-slate-300"
                  >
                    {customerResendLoading
                      ? 'Reenviando...'
                      : customerResendCooldown > 0
                      ? `Reenviar em ${customerResendCooldown}s`
                      : 'Reenviar código'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerVerifyPrompt(null);
                      setCustomerVerifyCode('');
                      setCustomerAuthError('');
                      setCustomerAuthNotice('');
                    }}
                    className="w-full text-center text-xs font-semibold text-slate-400 transition-colors hover:text-slate-700"
                  >
                    Voltar para login
                  </button>
                </div>
              ) : null}

              {!customerVerifyPrompt ? (
                <>
              {customerAuthMode === 'register' && (
                <div className="relative">
                  <User size={15} weight="duotone" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={customerAuthForm.fullName}
                    onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Nome completo"
                    className="w-full rounded-xl border border-slate-200 py-2.5 bg-white text-slate-900 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
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
                    className="w-full rounded-xl border border-slate-200 py-2.5 bg-white text-slate-900 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
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
                  className="w-full rounded-xl border border-slate-200 py-2.5 bg-white text-slate-900 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
              <div className="relative">
                <Lock size={15} weight="duotone" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={customerAuthForm.password}
                  onChange={(e) => setCustomerAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Senha"
                  className="w-full rounded-xl border border-slate-200 py-2.5 bg-white text-slate-900 pl-10 pr-10 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
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
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 bg-white accent-slate-900"
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
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 bg-white accent-slate-900"
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
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </LandingPageLayout>
  );
}
