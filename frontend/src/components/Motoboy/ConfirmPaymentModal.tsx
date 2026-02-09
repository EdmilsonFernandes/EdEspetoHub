import { useState } from 'react';
import { formatCurrency } from '../../utils/format';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cashTendered?: number | null) => void;
  amount: number;
  paymentMethod?: string;
};

export function ConfirmPaymentModal({ isOpen, onClose, onConfirm, amount, paymentMethod }: Props) {
  const [cashValue, setCashValue] = useState('');
  const normalizedMethod = (paymentMethod || '').toLowerCase();
  const isCash = normalizedMethod === 'cash' || normalizedMethod === 'dinheiro';

  if (!isOpen) return null;

  const handleConfirm = () => {
    const parsed = isCash ? Number(cashValue.replace(',', '.')) : null;
    onConfirm(Number.isFinite(parsed as number) ? (parsed as number) : null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md premium-card-glass p-5 space-y-4 shadow-xl motoboy-fade-up">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Confirmar pagamento</h3>
          <p className="text-sm text-slate-500">Total do pedido: {formatCurrency(amount || 0)}</p>
        </div>

        {isCash && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Valor recebido em dinheiro</label>
            <input
              value={cashValue}
              onChange={(event) => setCashValue(event.target.value)}
              placeholder="Ex: 50,00"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-press flex-1 rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm font-extrabold text-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="btn-press flex-1 rounded-xl bg-[linear-gradient(120deg,#16a34a,#059669)] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(5,150,105,0.6)]"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
