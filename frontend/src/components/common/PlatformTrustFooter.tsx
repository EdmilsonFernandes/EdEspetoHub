import { ArrowSquareOut, ShieldCheck } from '@phosphor-icons/react';

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
  const isDark = tone === 'dark';
  const alignClass = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';

  // Sidebar / inline compact pill (mode=minimal + compact)
  if (mode === 'minimal' && compact) {
    return (
      <div className={`w-full ${className}`}>
        <div className={`flex ${alignClass}`}>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label="Plataforma Já no Caminho"
            className={`group inline-flex items-center gap-2 overflow-hidden rounded-2xl border px-3 py-2.5 transition-all duration-300 hover:-translate-y-0.5 ${
              isDark
                ? 'border-white/10 bg-white/5 hover:bg-white/8'
                : 'border-slate-200/80 bg-white/80 hover:bg-white hover:border-slate-300 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.18)]'
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[0.6rem] border transition-transform group-hover:scale-105 ${
              isDark ? 'border-white/10 bg-white' : 'border-slate-100 bg-white shadow-sm'
            }`}>
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full object-cover" />
            </span>
            <span className="min-w-0">
              <span className={`block truncate text-[11px] font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Já no Caminho
              </span>
              <span className={`flex items-center gap-1 text-[9px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                <ShieldCheck size={9} weight="fill" className="shrink-0 text-emerald-500" />
                Sobre o app
              </span>
            </span>
          </a>
        </div>
      </div>
    );
  }

  // Standard card (all other cases: default mode, minimal non-compact)
  return (
    <div className={`w-full ${className}`}>
      <div className={`flex ${alignClass}`}>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label="Plataforma Já no Caminho"
          className={`group relative w-full max-w-full overflow-hidden rounded-[1.45rem] border transition-all duration-300 hover:-translate-y-0.5 ${
            isDark
              ? 'border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.95)_0%,rgba(21,58,76,0.85)_100%)] shadow-[0_20px_44px_-30px_rgba(0,0,0,0.8)]'
              : 'border-slate-200/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(245,249,252,0.96)_54%,rgba(255,255,255,0.98)_100%)] shadow-[0_16px_40px_-28px_rgba(15,23,42,0.16)] hover:shadow-[0_20px_48px_-28px_rgba(15,23,42,0.22)]'
          }`}
        >
          {/* Ambient glow */}
          <span className={`pointer-events-none absolute inset-0 ${
            isDark
              ? 'bg-[radial-gradient(circle_at_top_left,rgba(51,104,134,0.22),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_32%)]'
              : 'bg-[radial-gradient(circle_at_top_left,rgba(51,104,134,0.09),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.07),transparent_32%)]'
          }`} />

          <div className={`relative flex items-center gap-3.5 ${compact ? 'px-3.5 py-3' : 'px-4 py-3.5'}`}>
            {/* Logo */}
            <span className={`flex shrink-0 items-center justify-center overflow-hidden border transition-transform group-hover:scale-[1.04] ${
              compact ? 'h-10 w-10 rounded-[0.8rem]' : 'h-11 w-11 rounded-[0.9rem]'
            } ${isDark ? 'border-white/12 bg-white shadow-[0_10px_20px_-12px_rgba(255,255,255,0.4)]' : 'border-slate-200 bg-white shadow-[0_8px_18px_-12px_rgba(15,23,42,0.25)]'}`}>
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full object-cover" />
            </span>

            {/* Text */}
            <span className="min-w-0 flex-1">
              <span className={`block ${compact ? 'text-[9px]' : 'text-[9.5px]'} font-bold uppercase tracking-[0.18em] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                desenvolvido por
              </span>
              <span className={`block font-black tracking-tight ${compact ? 'text-[12px]' : 'text-[13px]'} ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Já no Caminho
              </span>
              <span className={`mt-0.5 inline-flex items-center gap-1.5 ${compact ? 'text-[9px]' : 'text-[9.5px]'} font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <ShieldCheck size={10} weight="fill" className="shrink-0 text-emerald-500" />
                Plataforma segura
              </span>
            </span>

            {/* External link icon */}
            <span className={`ml-auto flex shrink-0 items-center justify-center rounded-full border p-2 transition-all group-hover:scale-105 ${
              isDark
                ? 'border-white/10 bg-white/6 text-slate-400 group-hover:text-slate-200'
                : 'border-slate-200 bg-white/80 text-slate-400 group-hover:text-[#336886]'
            }`}>
              <ArrowSquareOut size={12} weight="bold" />
            </span>
          </div>
        </a>
      </div>
    </div>
  );
}
