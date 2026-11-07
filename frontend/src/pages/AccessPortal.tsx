import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  CaretRight,
  Fingerprint,
  MapTrifold,
  Motorcycle,
  RocketLaunch,
  Storefront,
  UserCircle,
} from '@phosphor-icons/react';
import { AuthLayout } from '../layouts/AuthLayout';
import { nativeBiometricService } from '../services/nativeBiometricService';

// Portal de acesso multiperfil (Cliente · Lojista · Entregador · Condomínio · Turismo).
// Prioridade de produto (Edmilson, 07/11): cliente em destaque, depois lojista,
// entregador, condomínio e turismo/parceiros — um app para todos, cada acesso
// na sua área, sem poluir o fluxo de quem só quer pedir.
//
// Restauração da rota /entrar: desmontada em 802747e1 (junho/2026), o app ficou
// sem porta de entrada profissional para aparelhos sem sessão staff salva
// (a arquitetura 04/10 manteve apenas o quick-switch com sessão no aparelho).

type SavedProfile = {
  name: string;
  email: string;
  biometric: boolean;
  hasSession: boolean;
};

const readSession = (key: string): any => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const readSavedProfiles = () => {
  const customer = readSession('customerSession');
  const admin = readSession('adminSession');
  const motoboy = readSession('motoboySession');
  const profile = (session: any, fallbackName: string, biometric: boolean): SavedProfile => ({
    name: String(session?.store?.name || session?.user?.fullName || session?.user?.name || fallbackName).trim(),
    email: String(session?.user?.email || '').trim(),
    biometric,
    hasSession: Boolean(session?.token && session?.user),
  });
  return {
    customer: profile(customer, 'Cliente', nativeBiometricService.hasValidStoredCustomerEnrollment()),
    admin: profile(admin, 'Lojista', nativeBiometricService.hasValidStoredAdminEnrollment()),
    motoboy: profile(motoboy, 'Entregador', nativeBiometricService.hasValidStoredMotoboyEnrollment()),
  };
};

const stateChip = (p: SavedProfile): { label: string; tone: 'fast' | 'saved' | 'default' } => {
  if (p.biometric) return { label: 'Entrar rápido', tone: 'fast' };
  if (p.hasSession) return { label: 'Disponível aqui', tone: 'saved' };
  return { label: 'Entrar', tone: 'default' };
};

export function AccessPortal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const nextPath = String(searchParams.get('next') || '').trim();
  const hubMode = String(searchParams.get('hub') || '') === '1';

  const saved = useMemo(() => readSavedProfiles(), []);

  const withContext = (path: string, allowNext = true) => {
    const params = new URLSearchParams();
    if (hubMode) params.set('hub', '1');
    if (allowNext && nextPath) params.set('next', nextPath);
    const suffix = params.toString() ? `${path.includes('?') ? '&' : '?'}${params.toString()}` : '';
    return `${path}${suffix}`;
  };

  const customerChip = stateChip(saved.customer);
  const adminChip = stateChip(saved.admin);
  const motoboyChip = stateChip(saved.motoboy);
  const customerGreeting =
    saved.customer.hasSession && saved.customer.name && saved.customer.name !== 'Cliente'
      ? `Bem-vindo de volta, ${saved.customer.name.split(' ')[0]}`
      : null;

  const personaTone = {
    brand: {
      iconShell: 'border-white/70 bg-[#E0EBFD] text-[#2563EB]',
      chipFast: 'bg-[#E0EBFD] text-[#1E40AF]',
      glow: 'group-hover:shadow-[0_26px_54px_-30px_rgba(37,99,235,0.55)]',
      ring: 'hover:border-[#C3D8FB]',
    },
    amber: {
      iconShell: 'border-amber-100 bg-amber-50 text-amber-700',
      chipFast: 'bg-amber-100 text-amber-800',
      glow: 'group-hover:shadow-[0_26px_54px_-30px_rgba(245,158,11,0.5)]',
      ring: 'hover:border-amber-200',
    },
    violet: {
      iconShell: 'border-violet-100 bg-violet-50 text-violet-600',
      chipFast: 'bg-violet-100 text-violet-700',
      glow: 'group-hover:shadow-[0_26px_54px_-30px_rgba(139,92,246,0.45)]',
      ring: 'hover:border-violet-200',
    },
    emerald: {
      iconShell: 'border-emerald-100 bg-emerald-50 text-emerald-700',
      chipFast: 'bg-emerald-100 text-emerald-800',
      glow: 'group-hover:shadow-[0_26px_54px_-30px_rgba(16,185,129,0.5)]',
      ring: 'hover:border-emerald-200',
    },
  };

  const personas = [
    {
      id: 'lojista',
      title: 'Lojista',
      description: 'Operar pedidos, cardápio, equipe e indicadores da loja.',
      icon: Storefront,
      route: withContext('/admin', true),
      chip: adminChip,
      subtitle: adminChip.tone === 'default' ? null : saved.admin.name && saved.admin.name !== 'Lojista' ? saved.admin.name : null,
      tone: personaTone.brand,
    },
    {
      id: 'entregador',
      title: 'Entregador',
      description: 'Rotas, coletas, entregas e ganhos do dia.',
      icon: Motorcycle,
      route: withContext('/motoboy/login', true),
      chip: motoboyChip,
      subtitle: motoboyChip.tone === 'default' ? null : saved.motoboy.name && saved.motoboy.name !== 'Entregador' ? saved.motoboy.name : null,
      tone: personaTone.amber,
    },
    {
      id: 'condominio',
      title: 'Condomínio',
      description: 'Feiras, lojas participantes e operação local.',
      icon: Buildings,
      route: '/condominio/login',
      chip: { label: 'Acessar', tone: 'default' as const },
      subtitle: null,
      tone: personaTone.violet,
    },
    {
      id: 'turismo',
      title: 'Turismo & Parceiros',
      description: 'Chalés, pousadas e serviços dos destinos.',
      icon: MapTrifold,
      route: '/parceiro',
      chip: { label: 'Acessar', tone: 'default' as const },
      subtitle: null,
      tone: personaTone.emerald,
    },
  ];

  const chipClass = (tone: 'fast' | 'saved' | 'default', fastTone: string) =>
    tone === 'fast'
      ? `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${fastTone}`
      : tone === 'saved'
        ? 'inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600'
        : 'inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600';

  return (
    <AuthLayout>
      <div className="ds-login-card-enter w-full max-w-[720px] space-y-4">
        {/* Hero */}
        <div className="space-y-2.5 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#153A4C]/10 bg-white/78 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[#153A4C] shadow-[0_16px_34px_-26px_rgba(21,58,76,0.4)]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(34,197,94,0.14)]" />
            Um app · todos os acessos
          </div>
          <h1 className="text-[2rem] font-black leading-[1.08] tracking-[-0.03em] text-slate-900 sm:text-[2.35rem]">
            Como você quer entrar?
          </h1>
          <p className="mx-auto max-w-lg text-sm font-semibold leading-6 text-slate-500 sm:text-[15px]">
            Cada perfil tem sua área própria, salva separadamente. Alternar entre eles não afeta os outros.
          </p>
        </div>

        {/* Cliente — destaque (prioridade 1) */}
        <button
          type="button"
          onClick={() => navigate(withContext('/cliente?mode=login', true))}
          className="group relative w-full overflow-hidden rounded-[1.6rem] bg-[linear-gradient(135deg,#0d526c_0%,#1E40AF_58%,#2563EB_100%)] p-5 text-left text-white shadow-[0_28px_60px_-30px_rgba(13,79,102,0.65)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 active:scale-[0.99] sm:p-6"
          aria-label="Entrar como cliente"
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -right-6 top-10 hidden h-24 w-24 rounded-full bg-white/8 blur-xl sm:block" />

          <div className="relative flex items-center gap-4 sm:gap-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[1.1rem] border border-white/25 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] sm:h-16 sm:w-16">
              <UserCircle size={30} weight="duotone" className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-200/85">Para pedir e acompanhar</span>
                {customerChip.tone === 'fast' ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200">
                    <Fingerprint size={11} weight="fill" />
                    Entrar rápido
                  </span>
                ) : customerChip.tone === 'saved' ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/85">
                    Disponível aqui
                  </span>
                ) : null}
              </div>
              <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-white sm:text-2xl">
                {customerGreeting || 'Cliente'}
              </h2>
              <p className="mt-0.5 truncate text-[13px] font-semibold text-sky-100/75">
                {customerGreeting
                  ? saved.customer.email || 'Sua conta está salva neste aparelho'
                  : 'Pedidos, endereços, favoritos e cupons em um só lugar.'}
              </p>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/25 bg-white/12 transition-transform duration-200 group-hover:translate-x-1 sm:h-12 sm:w-12">
              <ArrowRight size={19} weight="bold" className="text-white" />
            </span>
          </div>
        </button>

        {/* Perfis profissionais */}
        <div className="grid gap-3 sm:grid-cols-2">
          {personas.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => navigate(card.route)}
                className={`group relative flex min-h-[8.25rem] w-full flex-col overflow-hidden rounded-[1.45rem] border border-slate-200 bg-[linear-gradient(150deg,rgba(255,255,255,0.99)_0%,rgba(246,250,253,0.96)_100%)] p-4 text-left shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 active:scale-[0.99] ${card.tone.ring} ${card.tone.glow}`}
                aria-label={`Entrar como ${card.title}`}
              >
                <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(51,104,134,0.28),transparent)]" />
                <div className="flex items-start justify-between gap-3">
                  <span className={`grid h-11 w-11 place-items-center rounded-[0.95rem] border shadow-[0_14px_28px_-22px_rgba(15,23,42,0.4)] ${card.tone.iconShell}`}>
                    <Icon size={22} weight="duotone" />
                  </span>
                  {card.chip.tone === 'fast' ? (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.12em] ${card.tone.chipFast}`}>
                      <Fingerprint size={10} weight="fill" />
                      Entrar rápido
                    </span>
                  ) : (
                    <span className={chipClass(card.chip.tone, card.tone.chipFast)}>{card.chip.label}</span>
                  )}
                </div>
                <div className="mt-3 flex-1">
                  <h3 className="text-[15.5px] font-black tracking-[-0.02em] text-slate-950">{card.title}</h3>
                  <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">{card.description}</p>
                  {card.subtitle ? (
                    <p className="mt-1 truncate text-[11px] font-bold text-slate-400">{card.subtitle}</p>
                  ) : null}
                </div>
                <div className="mt-2 flex items-center justify-end">
                  <CaretRight size={16} weight="bold" className="text-slate-300 transition-all duration-200 group-hover:translate-x-1 group-hover:text-slate-600" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Primeiro acesso */}
        <div className="rounded-[1.5rem] border border-[#153A4C]/10 bg-[linear-gradient(135deg,rgba(21,58,76,0.05),rgba(255,255,255,0.9)_60%)] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#153A4C]/70">Primeiro acesso</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                Sem conta? Escolha o caminho certo para começar — leva menos de 2 minutos.
              </p>
            </div>
          </div>
          <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => navigate(withContext('/cliente?mode=register', true))}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-black text-slate-700 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.4)] transition-colors hover:bg-slate-50 active:scale-[0.98]"
            >
              <UserCircle size={17} weight="duotone" />
              Criar conta
            </button>
            <button
              type="button"
              onClick={() => navigate('/create?plan=trial')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#153A4C] px-4 py-2.5 text-[13px] font-black text-white shadow-[0_18px_36px_-22px_rgba(21,58,76,0.7)] transition-colors hover:bg-[#1c4b61] active:scale-[0.98]"
            >
              <Storefront size={17} weight="duotone" />
              Criar loja grátis
            </button>
            <button
              type="button"
              onClick={() => navigate('/motoboy/register')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-black text-slate-700 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.4)] transition-colors hover:bg-slate-50 active:scale-[0.98]"
            >
              <Motorcycle size={17} weight="duotone" />
              Ser entregador
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate('/condominio/solicitar')}
            className="mt-2.5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-2 text-xs font-black text-violet-700 transition-colors hover:bg-violet-50 active:scale-[0.98]"
          >
            <Buildings size={15} weight="duotone" />
            Solicitar acesso do meu condomínio
          </button>
        </div>

        {/* Rodapé */}
        <div className="flex flex-col items-center gap-2.5 pb-2">
          <button
            type="button"
            onClick={() => navigate(hubMode ? '/hub' : '/')}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/85 px-5 py-2.5 text-[13px] font-black text-slate-600 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.4)] transition-colors hover:bg-white active:scale-[0.98]"
          >
            <ArrowLeft size={15} weight="bold" />
            {hubMode ? 'Voltar para o app' : 'Voltar ao início'}
          </button>
          <p className="flex items-center gap-1.5 text-center text-[11px] font-semibold text-slate-400">
            <RocketLaunch size={13} weight="duotone" />
            Acessos independentes — entrar em um perfil não desconecta os outros.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
