// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TicketPercent, Plus, X, CheckCircle2, Loader2 } from 'lucide-react';
import { apiClient } from '../config/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

type AdminCoupon = {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minSubtotal: number | null;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
};

const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Cupons de desconto da loja (benchmark iFood §12) — painel do lojista.
 * Criar/desativar cupons; o cliente aplica no checkout e o desconto é
 * sempre revalidado pelo backend no fechamento do pedido.
 */
export default function AdminCoupons() {
  const { auth } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const storeId = String(auth?.store?.id || '').trim();

  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('10');
  const [minSubtotal, setMinSubtotal] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const loadCoupons = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const data = await apiClient.get(`/stores/${storeId}/coupons`);
      setCoupons(Array.isArray(data) ? data : []);
    } catch {
      showToast('Não foi possível carregar os cupons.', 'error');
    } finally {
      setLoading(false);
    }
  }, [storeId, showToast]);

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

  const handleCreate = async () => {
    if (!code.trim() || !Number(discountValue)) {
      showToast('Preencha código e valor do desconto.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/stores/${storeId}/coupons`, {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: Number(discountValue),
        minSubtotal: minSubtotal || null,
        maxUses: maxUses || null,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
      });
      showToast('Cupom salvo!', 'success');
      setFormOpen(false);
      setCode('');
      setDiscountValue('10');
      setMinSubtotal('');
      setMaxUses('');
      setExpiresAt('');
      await loadCoupons();
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Não foi possível salvar o cupom.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (couponId: string) => {
    try {
      await apiClient.delete(`/stores/${storeId}/coupons/${couponId}`);
      setCoupons((prev) => prev.map((c) => (c.id === couponId ? { ...c, active: false } : c)));
      showToast('Cupom desativado.', 'success');
    } catch {
      showToast('Não foi possível desativar.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 active:scale-95"
              aria-label="Voltar"
            >
              <X size={16} className="rotate-45" />
            </button>
            <div>
              <p className="text-2xs font-black uppercase tracking-[0.18em] text-slate-400">Sua loja</p>
              <h1 className="text-base font-black tracking-tight text-slate-900">Cupons de desconto</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen((prev) => !prev)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-black uppercase tracking-[0.1em] text-white active:scale-95"
          >
            {formOpen ? <X size={14} /> : <Plus size={14} />}
            {formOpen ? 'Fechar' : 'Novo cupom'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        {formOpen && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-600">Código</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="BEMVINDO10"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold uppercase tracking-wide"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-600">Tipo de desconto</span>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value === 'fixed' ? 'fixed' : 'percent')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
                >
                  <option value="percent">Percentual (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-600">
                  {discountType === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'}
                </span>
                <input
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))}
                  inputMode="decimal"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-600">Pedido mínimo (R$, opcional)</span>
                <input
                  value={minSubtotal}
                  onChange={(e) => setMinSubtotal(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))}
                  inputMode="decimal"
                  placeholder="Ex: 40"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-600">Usos máximos (opcional)</span>
                <input
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  placeholder="Ex: 100"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-600">Válido até (opcional)</span>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-black uppercase tracking-[0.1em] text-white active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:px-6"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <TicketPercent size={16} />}
              Salvar cupom
            </button>
          </section>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Carregando cupons...
          </div>
        ) : coupons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <TicketPercent size={28} className="mx-auto text-slate-300" />
            <p className="mt-2 text-sm font-black text-slate-700">Nenhum cupom ainda</p>
            <p className="mt-1 text-xs text-slate-500">
              Crie um cupom e ele aparece no checkout dos seus clientes como "1 cupom disponível".
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {coupons.map((coupon) => (
              <li
                key={coupon.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm ${
                  coupon.active ? 'border-slate-200' : 'border-slate-100 opacity-60'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-black tracking-wider text-white">
                      {coupon.code}
                    </span>
                    {coupon.active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-black uppercase tracking-wide text-emerald-700">
                        <CheckCircle2 size={11} /> Ativo
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-black uppercase tracking-wide text-slate-500">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-bold text-slate-800">
                    {coupon.discountType === 'percent'
                      ? `${coupon.discountValue}% OFF`
                      : `${formatBRL(coupon.discountValue)} OFF`}
                    {coupon.minSubtotal ? ` · mín. ${formatBRL(coupon.minSubtotal)}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {coupon.usedCount}{coupon.maxUses ? `/${coupon.maxUses}` : ''} usos
                    {coupon.expiresAt ? ` · até ${new Date(coupon.expiresAt).toLocaleDateString('pt-BR')}` : ''}
                  </p>
                </div>
                {coupon.active && (
                  <button
                    type="button"
                    onClick={() => handleDeactivate(coupon.id)}
                    className="inline-flex h-9 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-2xs font-black uppercase tracking-[0.1em] text-rose-600 active:scale-95"
                  >
                    Desativar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
