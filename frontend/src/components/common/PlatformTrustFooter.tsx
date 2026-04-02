import { ShieldCheck } from '@phosphor-icons/react';
import { AppVersionBadge } from './AppVersionBadge';

type PlatformTrustFooterProps = {
  className?: string;
  href?: string;
  tone?: 'light' | 'dark';
  align?: 'left' | 'center' | 'right';
  compact?: boolean;
};

export function PlatformTrustFooter({
  className = '',
  href = 'https://www.janocaminho.com.br',
  tone = 'light',
  align = 'center',
  compact = false,
}: PlatformTrustFooterProps) {
  const alignClass = align === 'left' ? 'justify-start text-left' : align === 'right' ? 'justify-end text-right' : 'justify-center text-center';
  const shellClass = tone === 'dark'
    ? 'border border-slate-700/80 bg-slate-900/70 text-slate-200'
    : 'border border-slate-200 bg-white text-slate-700';
  const badgeClass = tone === 'dark'
    ? 'border-slate-700 bg-slate-800/80 text-slate-300'
    : 'border-slate-200 bg-slate-50 text-slate-600';
  const versionClass = tone === 'dark' ? 'text-slate-400/70' : 'text-slate-400';

  return (
    <div className={`w-full ${className}`}>
      <div className={`flex ${alignClass}`}>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={`group inline-flex items-center gap-2.5 rounded-2xl px-3 py-2 transition-colors hover:border-slate-300 hover:text-slate-900 ${shellClass}`}
          aria-label="Plataforma Já no Caminho"
        >
          <span className="h-7 w-7 rounded-lg overflow-hidden border border-slate-200/70 shadow-sm bg-white">
            <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full object-cover" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className={`font-semibold leading-tight ${compact ? 'text-[11px]' : 'text-xs'}`}>Desenvolvido por Já no Caminho</span>
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

