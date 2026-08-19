import { CaretDown, CheckCircle, Clock } from '@phosphor-icons/react';

export type OrderTrackingProgressStep = {
  id: string;
  label: string;
  timestampLabel?: string;
};

type Props = {
  steps: OrderTrackingProgressStep[];
  currentIndex: number;
  isCancelled: boolean;
  isTerminal: boolean;
  expanded: boolean;
  onToggle: () => void;
};

export function OrderTrackingProgressCard({
  steps,
  currentIndex,
  isCancelled,
  isTerminal,
  expanded,
  onToggle,
}: Props) {
  const currentStep = steps[currentIndex] || steps[0];
  const nextStep = steps[currentIndex + 1] || null;

  return (
    <section
      id="order-status-section"
      className="overflow-hidden rounded-[1.55rem] border border-[#d5e3ec] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,251,0.96))] shadow-[0_20px_40px_-34px_rgba(51,104,134,0.18)]"
      aria-labelledby="order-status-title"
    >
      <div className="px-4 pb-3 pt-4">
        <p id="order-status-title" className="text-[11px] font-black uppercase tracking-[0.18em] text-[#336886]">
          Andamento do pedido
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl border border-[#d9e6ee] bg-white/92 px-3.5 py-3 shadow-[0_12px_28px_-24px_rgba(51,104,134,0.14)]">
            <span
              className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                isCancelled
                  ? 'bg-rose-100 text-rose-600'
                  : isTerminal
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-emerald-500 text-slate-900 shadow-[0_0_0_5px_rgba(16,185,129,0.12)]'
              }`}
            >
              {isTerminal || isCancelled ? <CheckCircle size={17} weight="fill" /> : <Clock size={16} weight="bold" />}
            </span>
            <div className="min-w-0">
              <p className="text-2xs font-black uppercase tracking-[0.16em] text-slate-400">
                {isTerminal || isCancelled ? 'Situação final' : 'Agora'}
              </p>
              <p className={`mt-0.5 text-sm font-black ${isCancelled ? 'text-rose-600' : 'text-slate-950'}`}>
                {currentStep?.label || 'Pedido recebido'}
              </p>
              {currentStep?.timestampLabel ? (
                <p className="mt-1 text-[11px] font-semibold text-slate-500">{currentStep.timestampLabel}</p>
              ) : null}
            </div>
          </div>

          {nextStep ? (
            <div className="flex items-start gap-3 rounded-2xl border border-dashed border-[#cddde7] bg-white/55 px-3.5 py-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#d6e4ed] bg-[#f4f8fb] text-[#336886]">
                <span className="h-2 w-2 rounded-full bg-[#336886]" />
              </span>
              <div className="min-w-0">
                <p className="text-2xs font-black uppercase tracking-[0.16em] text-slate-400">Próximo passo</p>
                <p className="mt-0.5 text-sm font-black text-slate-800">{nextStep.label}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">Você será avisado quando mudar.</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="jnc-hub-touch flex w-full items-center justify-between gap-3 border-t border-[#dce9f1] bg-white/80 px-4 py-3 text-left"
        aria-expanded={expanded}
        aria-controls="order-status-timeline"
      >
        <span>
          <span className="block text-xs font-black text-[#153A4C]">
            {expanded ? 'Ocultar andamento' : 'Ver andamento completo'}
          </span>
          <span className="mt-0.5 block text-2xs font-semibold text-slate-500">
            {steps.length} etapas com horários do pedido
          </span>
        </span>
        <CaretDown
          size={17}
          weight="bold"
          className={`shrink-0 text-[#336886] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded ? (
        <div id="order-status-timeline" className="border-t border-[#dce9f1] bg-white/55 px-4 py-4">
          <div className="relative pl-1">
            <span className="pointer-events-none absolute bottom-6 left-[10px] top-3 w-[1.5px] rounded-full bg-[#dce9f1]/70" />
            {currentIndex > 0 ? (
              <span
                className="pointer-events-none absolute left-[10px] top-3 w-[1.5px] rounded-full transition-all duration-700"
                style={{
                  height: `${(currentIndex / Math.max(steps.length - 1, 1)) * 100}%`,
                  background: isCancelled ? '#fda4af' : 'linear-gradient(180deg,#336886,#336886)',
                }}
              />
            ) : null}

            <div className="space-y-3">
              {steps.map((step, stepIndex) => {
                const isCompleted = stepIndex < currentIndex;
                const isCurrent = stepIndex === currentIndex;

                return (
                  <div
                    key={step.id}
                    className={`relative z-[1] -ml-2 flex items-center gap-3 rounded-[1.1rem] px-2 py-1.5 transition-all duration-300 ${
                      isCurrent
                        ? isCancelled
                          ? 'bg-rose-50/80 shadow-[0_14px_28px_-24px_rgba(244,63,94,0.34)] ring-1 ring-rose-100'
                          : 'bg-white/92 shadow-[0_16px_34px_-26px_rgba(51,104,134,0.30)] ring-1 ring-[#d6e4ed]/80'
                        : ''
                    }`}
                  >
                    <span className="relative flex h-[22px] w-[22px] shrink-0 items-center justify-center">
                      {isCurrent && !isCancelled && !isTerminal ? (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      ) : null}
                      <span
                        className={`relative z-[2] grid h-[22px] w-[22px] place-items-center rounded-full border-2 transition-all duration-300 ${
                          isCurrent
                            ? isCancelled
                              ? 'border-rose-500 bg-rose-500 text-white shadow-[0_0_0_4px_rgba(244,63,94,0.2)]'
                              : 'border-emerald-500 bg-emerald-500 text-slate-900 ring-4 ring-emerald-500/20'
                            : isCompleted
                            ? isCancelled
                              ? 'border-rose-200 bg-rose-100 text-rose-600'
                              : 'border-emerald-200 bg-emerald-100 text-emerald-600'
                            : 'border-slate-200 bg-white text-slate-300'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle size={13} weight="fill" />
                        ) : (
                          <span className="text-2xs font-black">{stepIndex + 1}</span>
                        )}
                      </span>
                    </span>

                    <div className="min-w-0">
                      <span
                        className={`text-[12.5px] leading-tight ${
                          isCurrent
                            ? isCancelled
                              ? 'font-black text-rose-600'
                              : 'font-black text-slate-950'
                            : isCompleted
                            ? isCancelled
                              ? 'font-semibold text-rose-500'
                              : 'font-semibold text-slate-600'
                            : 'text-slate-300'
                        }`}
                      >
                        {step.label}
                      </span>
                      {(isCompleted || isCurrent) && step.timestampLabel ? (
                        <p className="mt-1 flex w-fit items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-2xs font-semibold text-slate-500">
                          <Clock size={9} weight="bold" />
                          {step.timestampLabel}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
