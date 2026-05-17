import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { navigateBackOrFallback } from '../../utils/navigation';

type AppGlassHeaderProps = {
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  eyebrowLogoSrc?: string;
  eyebrowLogoAlt?: string;
  eyebrowLogoClassName?: string;
  backTo?: string;
  onBack?: () => void;
  right?: ReactNode;
  children?: ReactNode;
  topSlot?: ReactNode;
  className?: string;
  maxWidthClassName?: string;
};

export function AppGlassHeader({
  title,
  eyebrow,
  subtitle,
  eyebrowLogoSrc = '/janocaminho.jpg',
  eyebrowLogoAlt = 'Já no Caminho',
  eyebrowLogoClassName = 'object-cover',
  backTo = '/hub',
  onBack,
  right,
  children,
  topSlot,
  className = '',
  maxWidthClassName = 'max-w-2xl',
}: AppGlassHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    navigateBackOrFallback(navigate, backTo);
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[80] border-b border-white/70 bg-[linear-gradient(180deg,rgba(234,245,250,0.80)_0%,rgba(255,255,255,0.68)_58%,rgba(255,255,255,0.52)_100%)] pt-[env(safe-area-inset-top)] text-[#153A4C] shadow-[0_18px_44px_-34px_rgba(21,58,76,0.42)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/58 ${className}`}
    >
      {topSlot}
      <div className={`mx-auto ${maxWidthClassName} px-4`}>
        <div className="flex min-h-[3.72rem] items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/70 text-[#153A4C] shadow-[0_14px_28px_-22px_rgba(21,58,76,0.55)] ring-1 ring-[#d7e7ef]/70 transition-all active:scale-95"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} weight="bold" />
          </button>

          <div className="min-w-0 flex-1 text-center">
            {eyebrow ? (
              <div className="flex items-center justify-center gap-1.5">
                <img src={eyebrowLogoSrc} alt={eyebrowLogoAlt} className={`h-5 w-5 rounded-[0.45rem] bg-white shadow-sm ring-1 ring-white/70 ${eyebrowLogoClassName}`} />
                <p className="truncate text-[10px] font-black uppercase tracking-[0.22em] text-[#336886]/82">{eyebrow}</p>
              </div>
            ) : null}
            <h1 className="truncate text-[15px] font-black tracking-[-0.02em] text-[#153A4C]">{title}</h1>
            {subtitle ? <p className="mt-0.5 truncate text-[11px] font-semibold text-[#336886]/72">{subtitle}</p> : null}
          </div>

          <div className={`flex h-10 shrink-0 items-center justify-center ${right ? 'min-w-10' : 'w-10'}`}>
            {right ?? <span className="h-10 w-10" aria-hidden="true" />}
          </div>
        </div>
        {children ? <div className="pb-3">{children}</div> : null}
      </div>
    </header>
  );
}
