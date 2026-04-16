import { ArrowSquareOut, ShieldCheck, Sparkle } from '@phosphor-icons/react';
import { AppVersionBadge } from './AppVersionBadge';

type PlatformTrustFooterProps = {
  className?: string;
  href?: string;
  tone?: 'light' | 'dark';
  align?: 'left' | 'center' | 'right';
  compact?: boolean;
  mode?: 'default' | 'minimal';
};

export function PlatformTrustFooter({
  className = '',
  href = 'https://www.janocaminho.com.br',
  tone = 'light',
  align = 'center',
  compact = false,
  mode = 'default',
}: PlatformTrustFooterProps) {
  const alignClass = align === 'left' ? 'justify-start text-left' : align === 'right' ? 'justify-end text-right' : 'justify-center text-center';
  const shellClass = tone === 'dark'
    ? 'border border-slate-700/80 bg-slate-900/70 text-slate-200'
    : 'border border-slate-200 bg-white text-slate-700';
  const badgeClass = tone === 'dark'
    ? 'border-slate-700 bg-slate-800/80 text-slate-300'
    : 'border-slate-200 bg-slate-50 text-slate-600';
  const minimalText = tone === 'dark' ? 'text-slate-400/90' : 'text-slate-500';
  const minimalMuted = tone === 'dark' ? 'text-slate-500/75' : 'text-slate-400';
  const minimalBrand = tone === 'dark' ? 'text-slate-300/90' : 'text-slate-700/90';
  const isLeft = align === 'left';
  const isRight = align === 'right';

  if (mode === 'minimal' && compact) {
    return (
      <div className={`w-full ${className}`}>
        <div className={`flex ${alignClass}`}>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className={`group inline-flex max-w-full items-center gap-2.5 overflow-hidden rounded-full border px-2.5 py-2 transition-all duration-300 hover:-translate-y-0.5 ${
              tone === 'dark'
                ? 'border-white/10 bg-white/5 text-slate-100 shadow-[0_18px_34px_-26px_rgba(2,6,23,0.85)]'
                : 'border-slate-200/85 bg-white/78 text-slate-700 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.22)]'
            }`}
            aria-label="Plataforma Já no Caminho"
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border p-0.5 transition-transform group-hover:scale-105 ${
                tone === 'dark'
                  ? 'border-white/10 bg-white'
                  : 'border-white bg-[linear-gradient(135deg,#ffffff,#eef7f5)]'
              }`}
            >
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full rounded-full object-cover" />
            </span>
            <span className={`min-w-0 text-left ${isRight ? 'order-first' : ''}`}>
              <span className={`block truncate text-[11px] font-black tracking-tight ${tone === 'dark' ? 'text-slate-100' : 'text-slate-950'}`}>
                Já no Caminho
              </span>
              <span className={`mt-0.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] ${minimalMuted}`}>
                <ShieldCheck size={11} weight="bold" className="shrink-0 text-emerald-500" />
                <span>App seguro</span>
                <span className="text-slate-300">•</span>
                <AppVersionBadge className="normal-case tracking-normal" />
              </span>
            </span>
          </a>
        </div>
      </div>
    );
  }

  if (mode === 'minimal') {
    return (
      <div className={`w-full ${className}`}>
        <div className={`flex ${alignClass}`}>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className={`group relative w-full max-w-full overflow-hidden rounded-[1.35rem] border px-3 py-3.5 transition-all duration-300 hover:-translate-y-0.5 ${
              tone === 'dark'
                ? 'border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.98)_0%,rgba(30,41,59,0.94)_52%,rgba(15,23,42,0.98)_100%)] text-slate-100 shadow-[0_24px_44px_-28px_rgba(2,6,23,0.9)]'
                : 'border-slate-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_54%,rgba(241,245,249,0.98)_100%)] text-slate-700 shadow-[0_24px_44px_-34px_rgba(15,23,42,0.18)]'
            }`}
            aria-label="Plataforma Já no Caminho"
          >
            <span
              className={`pointer-events-none absolute inset-0 opacity-90 ${
                tone === 'dark'
                  ? 'bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_30%)]'
                  : 'bg-[radial-gradient(circle_at_top_left,rgba(51,104,134,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_30%)]'
              }`}
            />
            <div
              className={`relative flex w-full gap-3 ${
                isLeft
                  ? 'items-center justify-between text-left'
                  : isRight
                  ? 'items-center justify-end text-right'
                  : 'flex-col items-center justify-center text-center sm:flex-row sm:items-center sm:justify-between sm:text-left'
              }`}
            >
              <div className={`min-w-0 ${isLeft ? '' : isRight ? 'order-2' : ''}`}>
                <div className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 ${
                  tone === 'dark'
                    ? 'border-white/10 bg-white/5 text-slate-300'
                    : 'border-slate-200 bg-white/80 text-slate-500'
                }`}>
                  <Sparkle size={10} weight="fill" />
                  <span className={`${compact ? 'text-[8px]' : 'text-[9px]'} font-bold uppercase tracking-[0.18em]`}>
                    plataforma enterprise
                  </span>
                </div>
                <p className={`mt-2 ${compact ? 'text-[9px]' : 'text-[10px]'} font-medium uppercase tracking-[0.18em] ${minimalText}`}>
                  desenvolvido por
                </p>
                <div className={`mt-1.5 inline-flex items-center gap-2 ${isLeft ? '' : isRight ? 'justify-end w-full' : 'justify-center sm:justify-start w-full'}`}>
                  <span className={`h-9 w-9 overflow-hidden rounded-xl border transition-all group-hover:scale-105 ${
                    tone === 'dark'
                      ? 'border-white/10 bg-white shadow-[0_12px_22px_-16px_rgba(255,255,255,0.55)]'
                      : 'border-slate-200 bg-white shadow-[0_12px_22px_-16px_rgba(15,23,42,0.22)]'
                  }`}>
                    <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full object-cover" />
                  </span>
                  <span className="min-w-0">
                    <span className={`block ${compact ? 'text-[10px]' : 'text-[11px]'} uppercase tracking-[0.18em] font-black ${minimalBrand}`}>
                      Já no Caminho
                    </span>
                    <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} ${minimalMuted}`}>
                      Infraestrutura, identidade e evolução contínua
                    </span>
                  </span>
                </div>
              </div>
              <div className={`flex shrink-0 items-center gap-2 ${isLeft ? '' : isRight ? 'order-1' : ''}`}>
                <div className={`rounded-2xl border px-2.5 py-2 ${
                  tone === 'dark'
                    ? 'border-white/10 bg-white/5 text-slate-200'
                    : 'border-slate-200 bg-white/85 text-slate-700'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={12} weight="bold" className="text-emerald-500" />
                    <span className={`text-[8px] font-bold uppercase tracking-[0.16em] ${minimalMuted}`}>
                      release ativa
                    </span>
                  </div>
                  <div className={`mt-1 text-[10px] font-black ${tone === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    <AppVersionBadge />
                  </div>
                </div>
                <span className={`hidden rounded-full border p-2 sm:inline-flex ${
                  tone === 'dark'
                    ? 'border-white/10 bg-white/5 text-slate-300'
                    : 'border-slate-200 bg-white/85 text-slate-500'
                }`}>
                  <ArrowSquareOut size={12} weight="bold" />
                </span>
              </div>
            </div>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className={`flex ${alignClass}`}>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={`group relative inline-flex items-center gap-3 overflow-hidden rounded-[1.35rem] px-3.5 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 ${shellClass}`}
          aria-label="Plataforma Já no Caminho"
        >
          <span
            className={`pointer-events-none absolute inset-0 ${
              tone === 'dark'
                ? 'bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_26%)]'
                : 'bg-[radial-gradient(circle_at_top_left,rgba(51,104,134,0.10),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_26%)]'
            }`}
          />
          <span className="relative h-10 w-10 rounded-xl overflow-hidden border border-slate-200/70 shadow-sm bg-white">
            <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full object-cover" />
          </span>
          <span className="relative flex min-w-0 flex-col text-left">
            <span className={`text-[9px] font-bold uppercase tracking-[0.18em] ${tone === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              ecossistema oficial
            </span>
            <span className={`mt-0.5 font-semibold leading-tight ${compact ? 'text-[11px]' : 'text-xs'}`}>Desenvolvido por Já no Caminho</span>
            <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
              <ShieldCheck size={12} weight="bold" />
              Plataforma segura
            </span>
          </span>
          <span className={`relative ml-1 rounded-xl border px-2.5 py-1.5 text-[10px] font-bold ${
            tone === 'dark'
              ? 'border-white/10 bg-white/5 text-slate-200'
              : 'border-slate-200 bg-white/85 text-slate-700'
          }`}>
            <AppVersionBadge prefix="build " />
          </span>
        </a>
      </div>
    </div>
  );
}

