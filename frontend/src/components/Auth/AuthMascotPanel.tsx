import { Headset, ShieldCheck, Sparkle } from '@phosphor-icons/react';

type AuthMascotPanelVariant = 'client' | 'admin' | 'motoboy';

interface AuthMascotPanelProps {
  variant: AuthMascotPanelVariant;
  mode?: 'login' | 'register';
}

const CONTENT: Record<AuthMascotPanelVariant, {
  label: string;
  support: string;
}> = {
  client: {
    label: 'Acesso seguro',
    support: 'Suporte no app',
  },
  admin: {
    label: 'Operação protegida',
    support: 'Ajuda operacional',
  },
  motoboy: {
    label: 'Rotas protegidas',
    support: 'Suporte no app',
  },
};

export function AuthMascotPanel({ variant, mode = 'login' }: AuthMascotPanelProps) {
  if (mode === 'register') return null;

  const content = CONTENT[variant];

  return (
    <section className="mt-2 border-t border-slate-100/90 pt-2 sm:hidden" aria-label="Segurança do acesso">
      <div className="relative overflow-hidden rounded-[1.15rem] border border-[#336886]/10 bg-white/70 px-2.5 py-2 shadow-[0_14px_30px_-26px_rgba(21,58,76,0.28)]">
        <div className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-[#5FD35A]/10 blur-2xl" aria-hidden="true" />
        <div className="flex items-center justify-center gap-2 text-[9.5px] font-black leading-none text-slate-500">
          <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.8rem] bg-[#153A4C] shadow-[0_12px_24px_-16px_rgba(21,58,76,0.55)]">
            <img src="/janocaminho.jpg" alt="" className="h-6 w-6 rounded-[0.55rem] object-cover ring-1 ring-white/35" />
            <Sparkle size={10} weight="fill" className="absolute -right-1 -top-1 text-[#5FD35A] drop-shadow-[0_0_8px_rgba(95,211,90,0.9)]" aria-hidden="true" />
          </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={12} weight="duotone" className="text-emerald-600" />
          {content.label}
        </span>
        <span className="h-0.5 w-0.5 rounded-full bg-slate-300" aria-hidden="true" />
        <span className="inline-flex items-center gap-1.5">
          <Headset size={12} weight="duotone" className="text-[#336886]" />
          {content.support}
        </span>
        </div>
      </div>
    </section>
  );
}
