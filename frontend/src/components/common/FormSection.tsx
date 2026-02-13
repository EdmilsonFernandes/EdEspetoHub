import type { ReactNode } from 'react';

type FormSectionVariant = 'primary' | 'success' | 'warning' | 'neutral';

interface FormSectionProps {
  title: string;
  children?: ReactNode;
  variant?: FormSectionVariant;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
  headingId?: string;
}

const containerToneByVariant: Record<FormSectionVariant, string> = {
  primary:
    'border-slate-200 bg-white shadow-[0_20px_44px_-34px_rgba(15,23,42,0.32)]',
  success:
    'border-emerald-200/80 bg-[linear-gradient(165deg,rgba(240,253,244,0.92),rgba(255,255,255,0.98))] shadow-[0_20px_44px_-34px_rgba(5,150,105,0.28)]',
  warning:
    'border-amber-200/80 bg-[linear-gradient(165deg,rgba(255,251,235,0.95),rgba(255,255,255,0.98))] shadow-[0_20px_44px_-34px_rgba(217,119,6,0.28)]',
  neutral:
    'border-slate-200/90 bg-slate-50/80 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.24)]',
};

const titleToneByVariant: Record<FormSectionVariant, string> = {
  primary: 'text-slate-900',
  success: 'text-emerald-900',
  warning: 'text-amber-900',
  neutral: 'text-slate-900',
};

const joinClasses = (...values: Array<string | undefined>) =>
  values.filter(Boolean).join(' ');

const glowToneByVariant: Record<FormSectionVariant, string> = {
  primary: 'from-slate-100/70 via-white to-transparent',
  success: 'from-emerald-100/80 via-white to-transparent',
  warning: 'from-amber-100/80 via-white to-transparent',
  neutral: 'from-slate-100/80 via-white to-transparent',
};

export function FormSection({
  title,
  subtitle,
  actions,
  children,
  variant = 'primary',
  className,
  contentClassName,
  headingId,
}: FormSectionProps) {
  const resolvedHeadingId = headingId || `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <section
      aria-labelledby={resolvedHeadingId}
      className={joinClasses(
        'relative overflow-hidden rounded-3xl border p-4 sm:p-5 lg:p-6 transition-shadow',
        containerToneByVariant[variant],
        className
      )}
    >
      <div
        aria-hidden="true"
        className={joinClasses('pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b', glowToneByVariant[variant])}
      />
      <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={resolvedHeadingId} className={joinClasses('text-base sm:text-lg font-black leading-tight', titleToneByVariant[variant])}>
            {title}
          </h2>
          {subtitle ? <p className="mt-1 text-xs sm:text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {actions ? <div className="w-full sm:w-auto shrink-0">{actions}</div> : null}
      </div>
      {children ? <div className="relative mb-4 h-px bg-slate-200/80" /> : null}
      <div className={joinClasses('relative space-y-4', contentClassName)}>{children}</div>
    </section>
  );
}
