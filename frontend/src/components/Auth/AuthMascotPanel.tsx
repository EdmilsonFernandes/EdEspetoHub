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
    eyebrow: 'Bem-vindo de volta',
    title: 'Seu próximo pedido está a poucos cliques.',
    subtitle: 'Endereços, pedidos e acompanhamento ficam prontos para você continuar sem esforço.',
    accent: '#336886',
  },
  admin: {
    eyebrow: 'Operação protegida',
    title: 'Fila, vendas e atendimento no mesmo painel.',
    subtitle: 'Entre para cuidar da loja com uma experiência simples, rápida e segura.',
    accent: '#0d4f66',
  },
  motoboy: {
    eyebrow: 'Rotas no controle',
    title: 'Entregas, coletas e ganhos sem confusão.',
    subtitle: 'Acesse seu painel para aceitar pedidos e acompanhar sua operação.',
    accent: '#207A52',
  },
};

export function AuthMascotPanel({ variant, mode = 'login' }: AuthMascotPanelProps) {
  if (mode === 'register') return null;

  const content = CONTENT[variant];

  return (
    <section className="relative mt-3 overflow-hidden rounded-[2rem] border border-white/78 bg-[radial-gradient(circle_at_18%_12%,rgba(95,211,90,0.17),transparent_32%),linear-gradient(145deg,rgba(255,255,255,0.92),rgba(230,241,245,0.84))] px-4 pb-3.5 pt-4 shadow-[0_26px_58px_-46px_rgba(15,23,42,0.40)] sm:hidden">
      <div className="pointer-events-none absolute -bottom-10 -left-7 h-44 w-44 rounded-full bg-[#336886]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-4 h-28 w-28 rounded-full bg-[#5FD35A]/18 blur-3xl" />

      <div className="relative z-10 text-center">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/75 bg-white/72 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#336886] shadow-[0_12px_22px_-18px_rgba(15,23,42,0.34)]">
          <Sparkle size={11} weight="fill" style={{ color: content.accent }} />
          {content.eyebrow}
        </div>
        <h2 className="mx-auto max-w-[17rem] text-[1.45rem] font-black leading-[1.05] tracking-[-0.045em] text-slate-950">
          {content.title}
        </h2>
      </div>

      <div className="relative z-10 mt-1 min-h-[178px]">
        <div className="absolute -bottom-10 -left-8 h-[215px] w-[215px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.48)_47%,transparent_70%)]" />
        <img
          src="/janocaminho.jpg"
          alt="Robô Já no Caminho"
          className="absolute -bottom-8 -left-8 h-[210px] w-[210px] rounded-[3.15rem] object-cover shadow-[0_26px_52px_-34px_rgba(15,23,42,0.55)] ring-1 ring-white/80"
          loading="lazy"
        />
        <div className="absolute bottom-8 right-0 w-[55%] rounded-[1.4rem] border border-white/76 bg-white/72 px-3 py-3 text-right shadow-[0_22px_42px_-32px_rgba(15,23,42,0.42)] backdrop-blur">
          <p className="text-[12px] font-bold leading-relaxed text-slate-700">
            {content.subtitle}
          </p>
        </div>
      </div>

      <div className="relative z-10 -mt-1 grid grid-cols-2 gap-2">
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/72 bg-white/70 px-2.5 py-2 text-[10px] font-black text-slate-700 shadow-[0_14px_26px_-22px_rgba(15,23,42,0.32)] backdrop-blur">
          <Headset size={15} weight="duotone" className="text-[#336886]" />
          Central de ajuda
        </div>
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/72 bg-white/70 px-2.5 py-2 text-[10px] font-black text-slate-700 shadow-[0_14px_26px_-22px_rgba(15,23,42,0.32)] backdrop-blur">
          <ShieldCheck size={15} weight="duotone" className="text-emerald-600" />
          Segurança garantida
        </div>
      </div>
    </section>
  );
}
