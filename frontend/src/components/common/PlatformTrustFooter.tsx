import { ShieldCheck } from '@phosphor-icons/react';
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
  const versionClass = tone === 'dark' ? 'text-slate-400/70' : 'text-slate-400';
  const minimalText = tone === 'dark' ? 'text-slate-400/90' : 'text-slate-500';
  const minimalMuted = tone === 'dark' ? 'text-slate-500/75' : 'text-slate-400';
  const minimalBorder = tone === 'dark' ? 'border-slate-700/50' : 'border-slate-200';
  const minimalBrand = tone === 'dark' ? 'text-slate-300/90' : 'text-slate-700/90';
  const isLeft = align === 'left';
  const isRight = align === 'right';

  if (mode === 'minimal') {
    return (
      <div className={`w-full ${className}`}>
        <div className={`flex ${alignClass}`}>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className={`group w-full max-w-full border-t px-2 py-4 ${minimalBorder} ${minimalText}`}
            aria-label="Plataforma Já no Caminho"
          >
            <div
              className={`flex w-full gap-2 ${
                isLeft
                  ? 'items-center justify-between text-left'
                  : isRight
                  ? 'items-center justify-end text-right'
                  : 'flex-col items-center justify-center text-center sm:flex-row sm:items-center sm:justify-between sm:text-left'
              }`}
            >
              <div className={`min-w-0 ${isLeft ? '' : isRight ? 'order-2' : ''}`}>
                <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-medium uppercase tracking-[0.15em] ${minimalText}`}>
                  desenvolvido por
                </p>
                <div className={`mt-0.5 inline-flex items-center gap-1.5 ${isLeft ? '' : isRight ? 'justify-end w-full' : 'justify-center sm:justify-start w-full'}`}>
                  <span className="h-5 w-5 overflow-hidden rounded-md border border-slate-300/60 bg-white transition-all group-hover:scale-110">
                    <img src="/jnc.png" alt="JNC" className="h-full w-full object-cover" />
                  </span>
                  <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} uppercase tracking-[0.14em] font-bold ${minimalBrand}`}>
                    Jano Caminho
                  </span>
                </div>
              </div>
              <div className={`flex shrink-0 items-center gap-1.5 ${isLeft ? '' : isRight ? 'order-1' : ''}`}>
                <ShieldCheck size={12} weight="bold" className="text-emerald-600/50" />
                <span className={`text-[8px] ${minimalMuted}`}>
                  <AppVersionBadge />
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
          className={`group inline-flex items-center gap-2.5 rounded-2xl px-3 py-2 transition-colors hover:border-slate-300 hover:text-slate-900 ${shellClass}`}
          aria-label="Plataforma Jano Caminho"
        >
          <span className="h-7 w-7 rounded-lg overflow-hidden border border-slate-200/70 shadow-sm bg-white">
            <img src="/jnc.png" alt="JNC" className="h-full w-full object-cover" />
          </span>
          <span className="flex min-w-0 flex-col text-left">
            <span className={`font-semibold leading-tight ${compact ? 'text-[11px]' : 'text-xs'}`}>Desenvolvido por Jano Caminho</span>
            <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
              <ShieldCheck size={12} weight="bold" />
              Plataforma segura
            </span>
          </span>
          <span className={`ml-1 text-[10px] ${versionClass}`}>
            <AppVersionBadge />
          </span>
        </a>
      </div>
    </div>
  );
}

