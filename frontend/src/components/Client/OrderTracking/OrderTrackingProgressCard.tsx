import { CaretDown, Check, CheckCircle, Clock } from '@phosphor-icons/react';

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
      className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-xs"
      aria-labelledby="order-status-title"
    >
      <div className="p-4 sm:p-5">
        <p id="order-status-title" className="text-2xs font-bold uppercase tracking-wider text-[#2563EB]">
          Andamento do pedido
        </p>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {/* Status Atual */}
          <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
            <span
              className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                isCancelled
                  ? 'bg-rose-100 text-rose-600'
                  : isTerminal
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-500/20'
              }`}
            >
              {isTerminal || isCancelled ? (
                <CheckCircle size={20} weight="fill" />
              ) : (
                <Clock size={18} weight="bold" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-2xs font-bold uppercase tracking-wider text-slate-400">
                {isTerminal || isCancelled ? 'Situação final' : 'Status agora'}
              </p>
              <p className={`mt-0.5 text-sm font-black ${isCancelled ? 'text-rose-600' : 'text-slate-950'}`}>
                {currentStep?.label || 'Pedido recebido'}
              </p>
              {currentStep?.timestampLabel ? (
                <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200/60 shadow-2xs">
                  <Clock size={12} weight="bold" className="text-slate-400" />
                  {currentStep.timestampLabel}
                </p>
              ) : null}
            </div>
          </div>

          {/* Próximo Passo se houver */}
          {nextStep ? (
            <div className="flex items-start gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-3.5">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-2xs font-bold uppercase tracking-wider text-slate-400">Próximo passo</p>
                <p className="mt-0.5 text-sm font-bold text-slate-800">{nextStep.label}</p>
                <p className="mt-1 text-xs font-medium text-slate-400">Você será avisado quando mudar.</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Botão retrátil da timeline */}
      <button
        type="button"
        onClick={onToggle}
        className="jnc-hub-touch flex w-full items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-left transition hover:bg-slate-50"
        aria-expanded={expanded}
        aria-controls="order-status-timeline"
      >
        <div>
          <span className="block text-xs font-black text-slate-900">
            {expanded ? 'Ocultar andamento' : 'Ver andamento completo'}
          </span>
          <span className="mt-0.5 block text-2xs font-semibold text-slate-400">
            {steps.length} etapas com horários do pedido
          </span>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200/80 text-slate-500 shadow-2xs">
          <CaretDown
            size={14}
            weight="bold"
            className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Timeline ReUI com linha vertical e indicadores */}
      {expanded ? (
        <div id="order-status-timeline" className="border-t border-slate-100 bg-white p-4 sm:p-5">
          <div className="relative pl-3">
            {/* Linha guia de fundo */}
            <span className="pointer-events-none absolute bottom-4 left-[22px] top-4 w-[2px] rounded-full bg-slate-100" />
            
            {/* Linha de progresso preenchida */}
            {currentIndex > 0 ? (
              <span
                className="pointer-events-none absolute left-[22px] top-4 w-[2px] rounded-full transition-all duration-700"
                style={{
                  height: `${(currentIndex / Math.max(steps.length - 1, 1)) * 100}%`,
                  background: isCancelled ? '#fda4af' : '#10b981',
                }}
              />
            ) : null}

            <div className="space-y-4">
              {steps.map((step, stepIndex) => {
                const isCompleted = stepIndex < currentIndex;
                const isCurrent = stepIndex === currentIndex;

                return (
                  <div
                    key={step.id}
                    className={`relative z-[1] flex items-center gap-3.5 rounded-2xl p-2 transition-all ${
                      isCurrent
                        ? isCancelled
                          ? 'bg-rose-50/60 ring-1 ring-rose-200/60'
                          : 'bg-emerald-50/50 ring-1 ring-emerald-200/60'
                        : ''
                    }`}
                  >
                    {/* Node / Indicador */}
                    <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
                      {isCurrent && !isCancelled && !isTerminal ? (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                      ) : null}
                      <span
                        className={`relative z-[2] grid h-7 w-7 place-items-center rounded-full text-xs font-black transition-all ${
                          isCurrent
                            ? isCancelled
                              ? 'bg-rose-500 text-white shadow-sm ring-4 ring-rose-500/20'
                              : 'bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-600/20'
                            : isCompleted
                            ? isCancelled
                              ? 'bg-rose-100 text-rose-600 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'border-2 border-slate-200 bg-white text-slate-300'
                        }`}
                      >
                        {isCompleted || (isCurrent && isTerminal) ? (
                          <Check size={14} weight="bold" />
                        ) : (
                          <span>{stepIndex + 1}</span>
                        )}
                      </span>
                    </span>

                    {/* Rótulo da etapa e Timestamp */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs leading-tight ${
                          isCurrent
                            ? isCancelled
                              ? 'font-black text-rose-700'
                              : 'font-black text-slate-950'
                            : isCompleted
                            ? 'font-bold text-slate-700'
                            : 'font-medium text-slate-400'
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.timestampLabel ? (
                        <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                          <Clock size={11} weight="bold" className="text-slate-400" />
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
