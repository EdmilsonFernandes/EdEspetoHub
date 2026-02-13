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
    'border-slate-200 bg-white shadow-[0_18px_36px_-28px_rgba(15,23,42,0.28)]',
  success:
    'border-emerald-200/80 bg-[linear-gradient(165deg,rgba(240,253,244,0.9),rgba(255,255,255,0.96))] shadow-[0_18px_36px_-28px_rgba(5,150,105,0.25)]',
  warning:
    'border-amber-200/80 bg-[linear-gradient(165deg,rgba(255,251,235,0.95),rgba(255,255,255,0.97))] shadow-[0_18px_36px_-28px_rgba(217,119,6,0.25)]',
  neutral:
    'border-slate-200/90 bg-slate-50/70 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.22)]',
};

const titleToneByVariant: Record<FormSectionVariant, string> = {
  primary: 'text-slate-900',
  success: 'text-emerald-900',
  warning: 'text-amber-900',
  neutral: 'text-slate-900',
};

const joinClasses = (...values: Array<string | undefined>) =>
  values.filter(Boolean).join(' ');

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
        'rounded-3xl border p-4 sm:p-5',
        containerToneByVariant[variant],
        className
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={resolvedHeadingId} className={joinClasses('text-base font-black', titleToneByVariant[variant])}>
            {title}
          </h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-600">{subtitle}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className={joinClasses('space-y-4', contentClassName)}>{children}</div>
    </section>
  );
}
