import { useEffect, useMemo, type ReactNode } from 'react';
import { X } from '@phosphor-icons/react';

type ContextSideDrawerBadge = {
  label: string;
  tone?: 'brand' | 'success' | 'neutral' | 'dark';
};

type ContextSideDrawerAction = {
  id: string;
  section?: string;
  label: string;
  description?: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger';
};

type ContextSideDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  subtitle?: string;
  leading: ReactNode;
  badges?: ContextSideDrawerBadge[];
  actions: ContextSideDrawerAction[];
  footerTitle?: string;
  footerSubtitle?: string;
  footer?: ReactNode;
  side?: 'left' | 'right';
};

export function ContextSideDrawer({
  isOpen,
  onClose,
  eyebrow,
  title,
  subtitle,
  leading,
  badges = [],
  actions,
  footerTitle,
  footerSubtitle,
  footer,
  side = 'right',
}: ContextSideDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const groupedActions = useMemo(() => {
    const groups: Array<{ key: string; label: string; actions: ContextSideDrawerAction[] }> = [];
    const lookup = new Map<string, { key: string; label: string; actions: ContextSideDrawerAction[] }>();

    actions.forEach((action) => {
      const label = String(action.section || '').trim();
      const key = label || '__default__';
      let group = lookup.get(key);
      if (!group) {
        group = { key, label, actions: [] };
        lookup.set(key, group);
        groups.push(group);
      }
      group.actions.push(action);
    });

    return groups;
  }, [actions]);

  return (
    <div
      className={`fixed inset-0 z-[10040] transition-opacity duration-300 ${
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[3px]" onClick={onClose} />
      <aside
        className={`absolute inset-y-0 ${side === 'right' ? 'right-0' : 'left-0'} flex h-full w-[320px] max-w-[88vw] flex-col border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99)_0%,rgba(246,249,251,0.98)_100%)] shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] transition-transform duration-300 ${
          side === 'right'
            ? `border-l ${isOpen ? 'translate-x-0' : 'translate-x-full'}`
            : `border-r ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
        }`}
      >
        <div className="relative border-b border-slate-200/80 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#336886]/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[1.2rem] border border-white/90 bg-white shadow-[0_14px_26px_-18px_rgba(15,23,42,0.22)]">
                {leading}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
                <h2 className="mt-1 truncate text-[1.1rem] font-black tracking-[-0.03em] text-slate-950">{title}</h2>
                {subtitle ? <p className="mt-1 text-[12px] font-semibold leading-relaxed text-slate-500">{subtitle}</p> : null}
                {badges.length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {badges.map((badge) => (
                      <span
                        key={badge.label}
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
                          badge.tone === 'success'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                            : badge.tone === 'brand'
                              ? 'border border-[#d8e5ee] bg-[#edf5fa] text-[#336886]'
                              : badge.tone === 'dark'
                                ? 'border border-slate-200 bg-slate-900 text-white'
                                : 'border border-slate-200 bg-white/90 text-slate-500'
                        }`}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-500 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.25)] transition-all active:scale-95"
              aria-label="Fechar conta"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {groupedActions.map((group) => (
              <div key={group.key} className="space-y-2">
                {group.label ? (
                  <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {group.label}
                  </p>
                ) : null}
                {group.actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      action.onClick();
                      onClose();
                    }}
                    className={`flex w-full items-center gap-3 rounded-[1.25rem] border px-3.5 py-3 text-left transition-all active:scale-[0.98] ${
                      action.tone === 'danger'
                        ? 'border-rose-100 bg-rose-50/75 text-rose-700 hover:bg-rose-50'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-[#d8e5ee] hover:bg-[#f7fafc]'
                    }`}
                  >
                    <div
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] border ${
                        action.tone === 'danger'
                          ? 'border-rose-100 bg-rose-100/80 text-rose-500'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      {action.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[14px] leading-tight ${action.tone === 'danger' ? 'font-black' : 'font-semibold'}`}>{action.label}</p>
                      {action.description ? (
                        <p className={`mt-0.5 text-[11px] font-semibold ${action.tone === 'danger' ? 'text-rose-700/70' : 'text-slate-500'}`}>
                          {action.description}
                        </p>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {footer ? (
          <div className="border-t border-slate-200/80 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : (footerTitle || footerSubtitle) ? (
          <div className="border-t border-slate-200/80 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footerTitle ? <p className="text-[11px] font-black text-slate-900">{footerTitle}</p> : null}
            {footerSubtitle ? <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{footerSubtitle}</p> : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
