import type { CSSProperties, ReactNode } from 'react';

export type PremiumTabItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
  title?: string;
  disabled?: boolean;
};

type PremiumTabsProps = {
  items: PremiumTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  containerClassName?: string;
  listClassName?: string;
  buttonClassName?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  getButtonStyle?: (item: PremiumTabItem, isActive: boolean) => CSSProperties | undefined;
  getButtonClassName?: (item: PremiumTabItem, isActive: boolean) => string | undefined;
};

export function PremiumTabs({
  items,
  activeId,
  onChange,
  containerClassName = '',
  listClassName = '',
  buttonClassName = '',
  activeClassName = '',
  inactiveClassName = '',
  getButtonStyle,
  getButtonClassName,
}: PremiumTabsProps) {
  return (
    <div
      className={[
        'rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white p-2 shadow-[0_20px_42px_-34px_rgba(15,23,42,0.35)]',
        containerClassName,
      ].join(' ')}
    >
      <div className={listClassName || 'flex flex-wrap gap-2 text-xs font-semibold text-slate-700'}>
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => !item.disabled && onChange(item.id)}
              title={item.title}
              disabled={item.disabled}
              aria-current={isActive ? 'true' : 'false'}
              style={getButtonStyle ? getButtonStyle(item, isActive) : undefined}
              className={[
                'rounded-xl border transition-all',
                item.icon ? 'px-3 py-2 text-[10px] sm:text-sm min-w-[108px] sm:min-w-[124px] min-h-[56px]' : 'px-3.5 py-2',
                item.icon ? 'flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center active:scale-95' : '',
                isActive
                  ? 'border-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white shadow-[0_16px_30px_-22px_rgba(15,23,42,0.75)]'
                  : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:shadow-md',
                isActive ? activeClassName : inactiveClassName,
                getButtonClassName ? getButtonClassName(item, isActive) : '',
                buttonClassName,
              ].join(' ')}
            >
              {item.icon ? (
                <span className={`relative grid place-items-center h-9 w-11 rounded-2xl ${isActive ? 'bg-white/15 ring-1 ring-white/25' : 'bg-slate-100 ring-1 ring-slate-200'}`}>
                  {item.icon}
                  {item.badge ? item.badge : null}
                </span>
              ) : null}
              <span className={item.icon ? 'leading-tight text-center whitespace-normal break-words' : 'whitespace-normal break-words'}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
