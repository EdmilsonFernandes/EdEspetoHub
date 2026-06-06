import { useEffect, useMemo, useState } from 'react';
import { Package, X } from '@phosphor-icons/react';

type PostalShipmentPayload = {
  trackingCode: string;
  trackingUrl?: string;
  markPosted: boolean;
};

type Props = {
  open: boolean;
  order: any | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: PostalShipmentPayload) => Promise<void> | void;
};

const normalizeTrackingCode = (value: string) =>
  String(value || '')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toUpperCase()
    .slice(0, 40);

const isLikelyValidTrackingCode = (value: string) => {
  const normalized = normalizeTrackingCode(value);
  return /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(normalized) || /^[A-Z0-9][A-Z0-9._-]{5,39}$/.test(normalized);
};

export function PostalShipmentModal({ open, order, loading, onClose, onSubmit }: Props) {
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [markPosted, setMarkPosted] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTrackingCode(normalizeTrackingCode(String(order?.shipment?.trackingCode || '')));
    setTrackingUrl(String(order?.shipment?.trackingUrl || ''));
    setMarkPosted(true);
    setError('');
  }, [open, order]);

  const orderLabel = useMemo(() => {
    const customer = String(order?.customerName || order?.name || 'Cliente').trim();
    return customer || 'Cliente';
  }, [order]);

  if (!open || !order) return null;

  const handleSubmit = async () => {
    const normalizedCode = normalizeTrackingCode(trackingCode);
    if (!normalizedCode) {
      setError('Informe o código de rastreio do pedido.');
      return;
    }
    if (!isLikelyValidTrackingCode(normalizedCode)) {
      setError('Confira o código de rastreio. Ele parece incompleto.');
      return;
    }
    setError('');
    await onSubmit({
      trackingCode: normalizedCode,
      trackingUrl: trackingUrl.trim() || undefined,
      markPosted,
    });
  };

  return (
    <div className="fixed inset-0 z-[360] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_90px_-45px_rgba(15,23,42,0.75)]">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-5">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15">
              <Package size={22} weight="duotone" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Envio postal</p>
              <h3 className="mt-1 text-lg font-black text-slate-950">Informar rastreio</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Pedido de {orderLabel}. O cliente verá essa atualização no acompanhamento do pedido.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X size={17} weight="bold" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Código de rastreio
            </label>
            <input
              value={trackingCode}
              onChange={(event) => setTrackingCode(normalizeTrackingCode(event.target.value))}
              placeholder="AA123456789BR"
              autoCapitalize="characters"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-black uppercase tracking-[0.12em] text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Aceita códigos dos Correios e rastreios genéricos. Para Correios, use o formato com letras e números.
            </p>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Link de rastreio opcional
            </label>
            <input
              value={trackingUrl}
              onChange={(event) => setTrackingUrl(event.target.value)}
              placeholder="Se deixar vazio, o sistema usa o link oficial dos Correios"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          <button
            type="button"
            onClick={() => setMarkPosted((value) => !value)}
            className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
              markPosted ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <span>
              <span className="block text-sm font-black">Marcar pedido como postado</span>
              <span className="mt-0.5 block text-xs font-medium opacity-75">
                Atualiza o pedido para despachado e registra a postagem na timeline.
              </span>
            </span>
            <span className={`h-6 w-11 rounded-full p-1 transition ${markPosted ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <span className={`block h-4 w-4 rounded-full bg-white transition ${markPosted ? 'translate-x-5' : ''}`} />
            </span>
          </button>

          {error ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-[1.4] rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-[0_18px_45px_-24px_rgba(15,23,42,0.95)] transition active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? 'Salvando...' : 'Salvar rastreio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
