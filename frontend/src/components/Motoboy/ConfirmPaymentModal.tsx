import { useEffect, useState } from 'react';
import { formatCurrency } from '../../utils/format';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cashTendered?: number | null) => void;
  amount: number;
  paymentMethod?: string;
  pixKey?: string | null;
  pixPayload?: string | null;
  defaultCashTendered?: number | null;
};

export function ConfirmPaymentModal({
  isOpen,
  onClose,
  onConfirm,
  amount,
  paymentMethod,
  pixKey,
  pixPayload,
  defaultCashTendered,
}: Props) {
  const [cashValue, setCashValue] = useState('');
  const normalizedMethod = (paymentMethod || '').toLowerCase();
  const isCash = normalizedMethod === 'cash' || normalizedMethod === 'dinheiro';
  const isPix = normalizedMethod === 'pix' || normalizedMethod === 'pix_loja' || normalizedMethod === 'pix_presencial';
  const isManualPix = normalizedMethod === 'pix_loja' || normalizedMethod === 'pix_presencial';

  useEffect(() => {
    if (!isOpen) return;
    setCashValue('');
  }, [defaultCashTendered, isOpen]);

  if (!isOpen) return null;

  const totalValue = Number(amount || 0);
  const pixQrUrl =
    isPix && pixPayload
      ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(pixPayload)}`
      : null;
  const informedCash = defaultCashTendered !== undefined && defaultCashTendered !== null ? Number(defaultCashTendered) : null;
  const changeDue =
    informedCash !== null && Number.isFinite(informedCash) && informedCash > totalValue ? informedCash - totalValue : 0;
  const hasTypedCash = cashValue.trim().length > 0;
  const typedCashValue = Number(cashValue.trim().replace(',', '.'));
  const hasValidTypedCash = hasTypedCash && Number.isFinite(typedCashValue);
  const effectiveCashValue = !isCash
    ? null
    : hasTypedCash
      ? (hasValidTypedCash ? typedCashValue : null)
      : informedCash !== null && Number.isFinite(informedCash)
        ? informedCash
        : null;
  const effectiveChange = effectiveCashValue !== null ? effectiveCashValue - totalValue : null;
  const cashConfirmDisabled =
    isCash &&
    (
      effectiveCashValue === null ||
      !Number.isFinite(Number(effectiveCashValue)) ||
      Number(effectiveCashValue) < totalValue
    );

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        return true;
      } catch {
        return false;
      }
    }
  };

  const handleConfirm = () => {
    if (isCash) {
      if (cashConfirmDisabled) return;
      onConfirm(effectiveCashValue);
      return;
    }
    onConfirm(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto premium-card-glass p-5 space-y-4 shadow-xl motoboy-fade-up">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Confirmar pagamento</h3>
          <p className="text-sm text-slate-500">Total do pedido: {formatCurrency(amount || 0)}</p>
        </div>

        {isPix && (pixKey || pixPayload) && (
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 space-y-3">
            <div>
              <p className="text-sm font-extrabold text-slate-900">{isManualPix ? 'Pix da loja' : 'Pix'}</p>
              <p className="text-xs text-slate-600">
                {isManualPix
                  ? 'Mostre a chave para o cliente e confirme somente depois de conferir o recebimento.'
                  : 'Mostre o QR Code para o cliente escanear, ou use o copia e cola.'}
              </p>
            </div>
            {pixQrUrl && (
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 flex flex-col items-center gap-2">
                <img
                  src={pixQrUrl}
                  alt="QR Code Pix"
                  className="h-44 w-44 rounded-xl border border-slate-200 bg-white object-contain"
                  loading="lazy"
                />
                <p className="text-[11px] text-slate-500 text-center">
                  Dica: deixe o brilho do celular alto para facilitar a leitura.
                </p>
              </div>
            )}
            {(pixKey || pixPayload) ? (
              <details className="rounded-2xl border border-slate-200 bg-white/70 p-3">
                <summary className="cursor-pointer text-xs font-extrabold text-slate-800">
                  Ver chave e copia e cola
                </summary>
                <div className="mt-3 space-y-3">
                  {pixKey ? (
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Chave</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-[11px] text-slate-800 overflow-hidden text-ellipsis whitespace-nowrap">
                          {pixKey}
                        </code>
                        <button
                          type="button"
                          onClick={() => void copyText(pixKey)}
                          className="btn-press rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-extrabold text-slate-800"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {pixPayload ? (
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Copia e cola</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-[11px] text-slate-800 overflow-hidden text-ellipsis whitespace-nowrap">
                          {pixPayload}
                        </code>
                        <button
                          type="button"
                          onClick={() => void copyText(pixPayload)}
                          className="btn-press rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-extrabold text-slate-800"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </details>
            ) : null}
          </div>
        )}

        {!isCash && (
          <div className={`rounded-2xl border p-3 text-xs font-semibold ${
            isManualPix
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}>
            {isManualPix
              ? 'Este Pix não é validado automaticamente pelo sistema. Confirme apenas depois de verificar o pagamento no app do banco da loja.'
              : 'Confirme o recebimento para liberar a conclusão da entrega.'}
          </div>
        )}

        {isCash && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Valor recebido em dinheiro</label>
            {informedCash !== null && Number.isFinite(informedCash) && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <p className="font-extrabold">Cliente informou no pedido</p>
                <p className="mt-2 text-lg font-black">
                  Paga com: {formatCurrency(informedCash)}
                </p>
                <p className="mt-1 text-base font-extrabold">
                  Troco: {formatCurrency(changeDue)}
                </p>
              </div>
            )}
            <input
              value={cashValue}
              onChange={(event) => setCashValue(event.target.value)}
              placeholder="0,00"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-700">
              <p className="font-extrabold uppercase tracking-[0.18em] text-slate-500">Calculo em tempo real</p>
              {effectiveCashValue !== null ? (
                <>
                  <p className="mt-2 font-semibold">
                    Troco = Valor Recebido - Valor do Pedido
                  </p>
                  <p className="mt-1 font-black text-slate-900">
                    {formatCurrency(effectiveCashValue)} - {formatCurrency(totalValue)} = {formatCurrency(effectiveChange || 0)}
                  </p>
                  {Number(effectiveCashValue) < totalValue ? (
                    <p className="mt-2 font-semibold text-rose-600">
                      Valor insuficiente. Informe um valor igual ou maior que {formatCurrency(totalValue)}.
                    </p>
                  ) : Number(effectiveCashValue) > totalValue ? (
                    <p className="mt-2 font-semibold text-emerald-700">
                      Troco devido: {formatCurrency(effectiveChange || 0)}
                    </p>
                  ) : (
                    <p className="mt-2 font-semibold text-emerald-700">Valor exato recebido.</p>
                  )}
                </>
              ) : hasTypedCash ? (
                <p className="mt-2 font-semibold text-rose-600">Informe um valor valido em dinheiro.</p>
              ) : (
                <p className="mt-2 text-slate-500">Preencha o valor recebido para validar o troco antes de confirmar.</p>
              )}
            </div>
            {informedCash !== null && Number.isFinite(informedCash) && (
              <p className="text-[11px] text-slate-500">
                Dica: pode deixar vazio e só confirmar para usar o valor informado pelo cliente.
              </p>
            )}
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
            disabled={Boolean(cashConfirmDisabled)}
            className="btn-press flex-1 rounded-xl bg-[linear-gradient(120deg,#16a34a,#059669)] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(5,150,105,0.6)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
