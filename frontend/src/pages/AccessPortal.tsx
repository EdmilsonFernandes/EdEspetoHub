import { ArrowLeft, ArrowRight, Buildings, Scooter, Storefront, UserCircle } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';

export function AccessPortal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const nextPath = String(searchParams.get('next') || '').trim();
  const hubMode = String(searchParams.get('hub') || '') === '1';

  const appendContext = useMemo(() => {
    return (path: string, allowNext = true) => {
      const params = new URLSearchParams();
      if (hubMode) params.set('hub', '1');
      if (allowNext && nextPath) params.set('next', nextPath);
      const suffix = params.toString() ? `?${params.toString()}` : '';
      return `${path}${suffix}`;
    };
  }, [hubMode, nextPath]);

  const accessCards = [
    {
      id: 'cliente',
      title: 'Cliente',
      description: 'Acompanhar pedidos, salvar enderecos e revisar compras.',
      icon: UserCircle,
      eyebrow: 'Compras e histórico',
      accent: 'from-[#153A4C]/12 via-[#336886]/6 to-transparent',
      iconTone: 'text-[#153A4C]',
      badgeTone: 'border-sky-100 bg-sky-50 text-sky-700',
      route: appendContext('/cliente', true),
    },
    {
      id: 'lojista',
      title: 'Lojista',
      description: 'Operar pedidos, equipe, cardapio e indicadores da loja.',
      icon: Storefront,
      eyebrow: 'Operação da loja',
      accent: 'from-[#153A4C]/12 via-[#336886]/6 to-transparent',
      iconTone: 'text-[#153A4C]',
      badgeTone: 'border-emerald-100 bg-emerald-50 text-emerald-700',
      route: appendContext('/admin', true),
    },
    {
      id: 'entregador',
      title: 'Entregador',
      description: 'Entrar para ver rotas, coletas, entregas e ganhos.',
      icon: Scooter,
      eyebrow: 'Rotas e ganhos',
      accent: 'from-[#153A4C]/12 via-[#336886]/6 to-transparent',
      iconTone: 'text-[#153A4C]',
      badgeTone: 'border-amber-100 bg-amber-50 text-amber-700',
      route: appendContext('/motoboy/login', true),
    },
    {
      id: 'condominio',
      title: 'Condominio',
      description: 'Gerenciar feiras, lojas participantes e operacao local.',
      icon: Buildings,
      eyebrow: 'Gestão local',
      accent: 'from-[#153A4C]/12 via-[#336886]/6 to-transparent',
      iconTone: 'text-[#153A4C]',
      badgeTone: 'border-violet-100 bg-violet-50 text-violet-700',
      route: '/condominio/login',
    },
  ];

  return (
    <AuthLayout>
      <div className="w-full max-w-[720px] space-y-4 ds-login-card-enter">
        <div className="text-center space-y-3">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#153A4C]/10 bg-white/78 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[#153A4C] shadow-[0_16px_34px_-26px_rgba(21,58,76,0.4)]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(34,197,94,0.14)]" />
            Entrada principal
          </div>
          <div>
            <h1 className="text-[2rem] font-black tracking-[-0.03em] text-slate-900 sm:text-[2.35rem]">
              Escolha como deseja entrar
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-[15px]">
              Um acesso único para cada perfil, com a mesma assinatura visual da plataforma e sem perder clareza.
            </p>
          </div>
        </div>

        <div className="ds-card-elevated space-y-5 border-white/40 bg-white/84 p-5 shadow-[0_26px_70px_-46px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:p-7">
          <div className="rounded-[1.55rem] border border-[#153A4C]/10 bg-[linear-gradient(135deg,rgba(21,58,76,0.06),rgba(255,255,255,0.92)_58%,rgba(51,104,134,0.05)_100%)] px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#153A4C]/72">Acesso inteligente</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              Cada entrada abaixo leva direto para o fluxo certo, sem login cruzado e sem ruído para quem só quer continuar.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {accessCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => navigate(card.route)}
                  className="group relative overflow-hidden rounded-[1.55rem] border border-slate-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-5 text-left shadow-[0_18px_38px_-30px_rgba(15,23,42,0.38)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_22px_48px_-30px_rgba(15,23,42,0.48)] active:scale-[0.99]"
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent}`} />
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(51,104,134,0.3),transparent)]" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div className={`grid h-12 w-12 place-items-center rounded-2xl border border-white/70 bg-white/92 shadow-[0_18px_34px_-24px_rgba(255,255,255,0.75)] ${card.iconTone}`}>
                      <Icon size={24} weight="duotone" />
                    </div>
                    <ArrowRight size={18} weight="bold" className="mt-1 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-500" />
                  </div>
                  <div className="relative mt-4">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${card.badgeTone}`}>
                      {card.eyebrow}
                    </span>
                    <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">{card.title}</h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{card.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-[1.6rem] border border-[#153A4C]/10 bg-[linear-gradient(135deg,rgba(21,58,76,0.06),rgba(255,255,255,0.82))] p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#153A4C]/70">Primeiro acesso do condominio</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                  Se o condomínio ainda não foi liberado, comece pela solicitação e volte depois para a entrada principal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/condominio/solicitar')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#153A4C]/14 bg-white px-4 py-3 text-sm font-black text-[#153A4C] shadow-[0_18px_34px_-26px_rgba(21,58,76,0.35)] transition hover:bg-slate-50"
              >
                <Buildings size={18} weight="duotone" />
                Solicitar acesso
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate('/create?plan=trial')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#153A4C] px-4 py-3 text-sm font-black text-white shadow-[0_22px_40px_-26px_rgba(21,58,76,0.7)] transition hover:bg-[#1c4b61] active:scale-[0.99]"
            >
              <Storefront size={18} weight="duotone" />
              Criar loja gratis
            </button>
            <button
              type="button"
              onClick={() => navigate(hubMode ? '/hub' : '/')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft size={16} weight="bold" />
              {hubMode ? 'Voltar para o app' : 'Voltar ao início'}
            </button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
