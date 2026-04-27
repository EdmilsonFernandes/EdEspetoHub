// @ts-nocheck
import React from 'react';
import { X } from '@phosphor-icons/react';
import { formatDateTime } from '../../utils/format';

const renderJson = (value: any) => {
  if (!value) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export function PaymentTechnicalModal({ open, title, audit, onClose }) {
  if (!open || !audit) return null;
  const summary = audit?.summary || null;
  const technical = audit?.technical || null;
  const events = Array.isArray(audit?.events) ? audit.events : [];

  return (
    <div className="fixed inset-0 z-[360] bg-slate-950/60 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl max-h-[88vh] overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{title || 'Detalhes técnicos'}</p>
            <h3 className="text-base font-black text-slate-900">{summary?.providerPaymentId || 'Transação Mercado Pago'}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">ID do Pagamento</p>
              <p className="mt-1 text-sm font-black text-slate-900 break-all">{summary?.providerPaymentId || '—'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Referência Externa</p>
              <p className="mt-1 text-sm font-black text-slate-900 break-all">{summary?.externalReference || '—'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Último evento</p>
              <p className="mt-1 text-sm font-black text-slate-900">
                {summary?.lastEventAt ? formatDateTime(summary.lastEventAt) : '—'}
              </p>
            </div>
          </div>

          {events.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
              <p className="text-sm font-black text-slate-900">Linha do tempo técnica</p>
              <div className="mt-3 space-y-2">
                {events.map((event: any) => (
                  <div key={event.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-800">{event?.eventStageLabel || 'Evento'}</p>
                      <p className="text-[11px] text-slate-500">{formatDateTime(event?.createdAt)}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {event?.providerStatusDetailLabel || event?.providerStatusLabel || 'Sem detalhe adicional'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-sm font-black text-slate-900">Dados Enviados (Request)</p>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-600">
                {renderJson(technical?.latestRequestPayload)}
              </pre>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-sm font-black text-slate-900">Resposta Recebida (Response)</p>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-600">
                {renderJson(technical?.latestResponsePayload)}
              </pre>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-sm font-black text-slate-900">Erro Registrado</p>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-600">
                {renderJson(technical?.latestErrorPayload)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
