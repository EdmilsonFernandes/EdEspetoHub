import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass, House, Plus, Storefront } from '@phosphor-icons/react';
import { AppGlassHeader } from '../common/AppGlassHeader';

type PublicDestinationShellProps = {
  children: ReactNode;
  active?: 'destinations' | 'city' | 'place' | 'register';
  contextLabel?: string;
  backTo?: string;
  backLabel?: string;
  ctaTo?: string;
  ctaLabel?: string;
};

export function PublicDestinationShell({
  children,
  active = 'destinations',
  contextLabel = 'Destinos',
  backTo = '/hub',
  backLabel = 'Voltar',
  ctaTo = '/destinos/cadastrar#dados-parceiro',
  ctaLabel = 'Cadastrar parceiro',
}: PublicDestinationShellProps) {
  const navItems = [
    { id: 'home', label: 'Início', to: '/', icon: House },
    { id: 'destinations', label: 'Destinos', to: '/destinos', icon: Compass },
    { id: 'register', label: 'Participar', to: '/destinos/cadastrar#dados-parceiro', icon: Plus },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f4f1ea] pb-[calc(var(--jnk-native-nav-height,0px)+1.5rem)] pt-[calc(env(safe-area-inset-top)+4.35rem)] text-slate-950 sm:pt-0">
      <header className="sticky top-0 z-[60] hidden border-b border-white/10 bg-[linear-gradient(135deg,rgba(7,17,31,0.98)_0%,rgba(12,35,53,0.96)_54%,rgba(7,17,31,0.98)_100%)] text-white shadow-[0_18px_44px_-30px_rgba(2,6,23,0.92)] backdrop-blur-xl sm:block sm:pt-[env(safe-area-inset-top)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)]" />
        <div className="pointer-events-none absolute right-10 top-2 h-14 w-28 rounded-full bg-[#84cc16]/12 blur-2xl" />
        <div className="pointer-events-none absolute left-20 top-0 h-14 w-28 rounded-full bg-sky-400/12 blur-2xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="group flex min-w-0 items-center gap-2.5 rounded-full pr-2 transition hover:bg-white/[0.04]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] border border-white/80 bg-white p-0.5 shadow-[0_16px_30px_-20px_rgba(255,255,255,0.5)]">
                <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full rounded-[0.72rem] object-cover" />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-black tracking-[-0.03em] sm:text-base">Já no Caminho</span>
                <span className="block truncate text-[9px] font-black uppercase tracking-[0.18em] text-sky-200/78 sm:text-[10px]">Destinos e turismo local</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-1 rounded-full border border-white/8 bg-white/[0.04] p-1 md:flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                const selected = active === item.id || ((active === 'city' || active === 'place') && item.id === 'destinations');
                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-black transition ${
                      selected ? 'bg-white text-[#07111f]' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <Icon size={14} weight={selected ? 'fill' : 'duotone'} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/hub"
                className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-slate-200 transition hover:bg-white/[0.08] sm:inline-flex"
              >
                <Storefront size={14} weight="duotone" className="text-emerald-300" />
                Abrir app
              </Link>
              <Link
                to={ctaTo}
                className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(180deg,#b7ef53_0%,#84cc16_100%)] px-3.5 py-2 text-xs font-black text-[#07111f] shadow-[0_16px_28px_-18px_rgba(132,204,22,0.62)] transition hover:scale-[1.01] active:scale-[0.98]"
              >
                <Plus size={13} weight="bold" />
                {ctaLabel}
              </Link>
            </div>
          </div>

          <div className="mt-2 hidden items-center justify-between gap-3 rounded-full border border-white/8 bg-white/[0.035] px-2 py-1.5 sm:flex">
            <Link to={backTo} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/[0.1]">
              <ArrowRight size={12} className="rotate-180" weight="bold" />
              {backLabel}
            </Link>
            <span className="min-w-0 truncate text-[11px] font-black uppercase tracking-[0.16em] text-sky-100/82">
              {contextLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-[#84cc16] shadow-[0_0_16px_rgba(132,204,22,0.6)]" />
              Ambiente oficial
            </span>
          </div>
        </div>
      </header>

      <AppGlassHeader
        title={contextLabel}
        eyebrow={active === 'destinations' ? 'Já no Caminho' : 'Destinos'}
        backTo={backTo}
        className="sm:hidden"
        maxWidthClassName="max-w-6xl"
        right={(
          <Link
            to="/hub"
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-white/82 p-0.5 shadow-[0_14px_26px_-20px_rgba(21,58,76,0.55)] active:scale-95"
            aria-label="Abrir início"
          >
            <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full rounded-full object-cover" />
          </Link>
        )}
      />

      <div className="relative">
        {children}
      </div>
    </main>
  );
}
