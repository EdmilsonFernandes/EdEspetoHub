// @ts-nocheck
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChartLineUp, DeviceMobile, ShieldCheckered } from '@phosphor-icons/react';
import { GradientBackground } from '@/components/reui/auth-2/gradient-background';

/**
 * Pele split-screen do login admin (30/10, bloco ReUI auth-2 a pedido do
 * Edmilson) com o CONTEÚDO do painel esquerdo ORIGINAL do AuthLayout
 * (brand, "Sua gestão de elite começa aqui.", 3 pilares e selo de ambiente
 * seguro) — o pedido: visual novo, conteúdo de antes.
 * Toda a lógica de auth (MFA/biometria/ativação) continua no AdminLogin.
 */

const PILLARS = [
  { text: 'Painel de alta performance', icon: ChartLineUp },
  { text: 'Operação mobile sem ruído visual', icon: DeviceMobile },
  { text: 'Acesso segmentado por perfil', icon: ShieldCheckered },
];

function ProofPanel() {
  return (
    <aside className="relative flex min-h-64 flex-col justify-between overflow-hidden px-10 py-10 lg:min-h-svh lg:px-14 lg:py-12">
      <GradientBackground />

      <div className="relative z-10 flex items-center gap-3.5">
        <div className="h-[3.4rem] w-[3.4rem] shrink-0 overflow-hidden rounded-full border-[3px] border-white/90 bg-white p-0.5 shadow-[0_14px_34px_-16px_rgba(0,0,0,0.5)]">
          <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full rounded-full object-cover" />
        </div>
        <div className="leading-tight">
          <p className="text-lg font-black tracking-tight text-white">Já no Caminho</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-300/80">Plataforma SaaS</p>
        </div>
      </div>

      <div className="relative z-10 space-y-3">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-sky-300/80">
          <span className="h-px w-5 bg-sky-400/50" />
          Plataforma unificada
        </p>
        <h1 className="bg-gradient-to-br from-white via-sky-50 to-sky-300 bg-clip-text text-4xl font-black leading-[1.12] tracking-[-0.03em] text-transparent xl:text-[2.75rem]">
          Sua gestão
          <br />
          de elite
          <br />
          começa aqui.
        </h1>
        <p className="max-w-xs text-[0.95rem] font-medium leading-relaxed text-sky-100/70">
          Fluxo profissional, visual consistente e operação pronta para escalar.
        </p>
      </div>

      <div className="relative z-10 space-y-3">
        {PILLARS.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/15">
              <item.icon size={17} weight="duotone" className="text-cyan-300" />
            </span>
            <p className="text-sm font-semibold text-sky-100/85">{item.text}</p>
          </div>
        ))}
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">Ambiente seguro e criptografado</p>
        </div>
      </div>
    </aside>
  );
}

export function AdminLoginSplitLayout({
  backTo,
  backLabel = 'Voltar',
  children,
}: {
  backTo?: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-background w-full lg:grid lg:min-h-svh lg:grid-cols-[minmax(0,1fr)_640px]">
      <ProofPanel />

      <section className="bg-background flex min-w-0 flex-col px-6 pt-6 pb-3 sm:px-8 sm:pt-8 sm:pb-4 lg:min-h-svh lg:px-12 lg:pt-6 lg:pb-3">
        <div className="mx-auto flex w-full max-w-[38rem] flex-1 flex-col">
          {backTo && (
            <div className="flex shrink-0 items-center">
              <Link
                to={backTo}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
              >
                <ArrowLeft size={14} weight="bold" />
                {backLabel}
              </Link>
            </div>
          )}
          <div className="flex flex-1 flex-col justify-center py-8">{children}</div>
          <footer className="text-muted-foreground mx-auto flex shrink-0 items-center justify-center gap-4 pb-2 text-center text-xs">
            <span>© {new Date().getFullYear()} Já no Caminho</span>
            <Link to="/terms" className="hover:text-primary transition-colors hover:underline hover:underline-offset-4">
              Termos
            </Link>
          </footer>
        </div>
      </section>
    </div>
  );
}
