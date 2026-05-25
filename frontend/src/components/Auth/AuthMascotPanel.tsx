import { Headset, ShieldCheck } from '@phosphor-icons/react';

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
    <section className="mt-1.5 border-t border-slate-100/90 pt-1.5 sm:hidden" aria-label="Segurança do acesso">
      <div className="flex items-center justify-center gap-2 px-1 py-0.5 text-[9px] font-black leading-none text-slate-500">
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
    </section>
  );
}
