import { Headset, ShieldCheck, Sparkle } from '@phosphor-icons/react';

type AuthMascotPanelVariant = 'client' | 'admin' | 'motoboy';

interface AuthMascotPanelProps {
  variant: AuthMascotPanelVariant;
  mode?: 'login' | 'register';
}

const CONTENT: Record<AuthMascotPanelVariant, {
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: string;
}> = {
  client: {
    eyebrow: 'Conta protegida',
    title: 'Entre e continue seu pedido.',
    subtitle: 'Pedidos, endereços e acompanhamento no mesmo acesso.',
    accent: '#336886',
  },
  admin: {
    eyebrow: 'Operação protegida',
    title: 'Acesse sua loja com segurança.',
    subtitle: 'Fila, vendas e atendimento sem trocar de painel.',
    accent: '#0d4f66',
  },
  motoboy: {
    eyebrow: 'Rotas no controle',
    title: 'Entregas e ganhos no controle.',
    subtitle: 'Aceite pedidos e acompanhe sua operação com clareza.',
    accent: '#207A52',
  },
};

export function AuthMascotPanel({ variant, mode = 'login' }: AuthMascotPanelProps) {
  if (mode === 'register') return null;

  const content = CONTENT[variant];

  return (
    <section className="relative mt-2 overflow-hidden rounded-[1.35rem] border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.84),rgba(236,245,248,0.68))] px-3 py-2.5 shadow-[0_16px_34px_-32px_rgba(15,23,42,0.38)] backdrop-blur-xl sm:hidden">
      <div className="pointer-events-none absolute -left-10 -top-10 h-24 w-24 rounded-full bg-[#5FD35A]/14 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 -right-10 h-36 w-36 rounded-full bg-[#336886]/12 blur-3xl" />
      <img
        src="/janocaminho.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-8 -right-6 h-24 w-24 rounded-[1.8rem] object-cover opacity-[0.055]"
        loading="lazy"
      />

      <div className="relative z-10 flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/85 bg-white p-1 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.36)]">
          <img
            src="/janocaminho.jpg"
            alt="Já no Caminho"
            className="h-full w-full rounded-[0.85rem] object-cover"
            loading="lazy"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-[0.18em] text-[#336886]">
            <Sparkle size={10} weight="fill" style={{ color: content.accent }} />
            {content.eyebrow}
          </div>
          <h2 className="mt-0.5 text-[13px] font-black leading-tight tracking-[-0.03em] text-slate-950">
            {content.title}
          </h2>
          <p className="mt-0.5 text-[10.5px] font-semibold leading-snug text-slate-500">
            {content.subtitle}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] font-black text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={13} weight="duotone" className="text-emerald-600" />
              Acesso seguro
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Headset size={13} weight="duotone" className="text-[#336886]" />
              Suporte no app
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
