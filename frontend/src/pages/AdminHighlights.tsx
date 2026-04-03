// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { productService } from '../services/productService';
import { featuredService } from '../services/featuredService';
import { formatCurrency, formatDateTime } from '../utils/format';

const statusTone = (status: string) => {
  const value = String(status || '').toUpperCase();
  if (value === 'APPROVED') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (value === 'REJECTED') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (value === 'CANCELLED' || value === 'EXPIRED') return 'bg-slate-100 text-slate-700 border-slate-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
};

export function AdminHighlights() {
  const { auth } = useAuth();
  const { showToast } = useToast();
  const storeId = String(auth?.store?.id || '').trim();
  const role = String(auth?.user?.role || '').toUpperCase();
  const canReview = role === 'ADMIN' || role === 'OPERATOR' || role === 'CHURRASQUEIRO';

  const [products, setProducts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    productId: '',
    durationDays: 7,
    requestedSlots: 1,
    publicNote: '',
  });

  const productOptions = useMemo(
    () =>
      (products || [])
        .filter((product: any) => Number(product?.price || product?.promoPrice || 0) > 0)
        .sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR')),
    [products]
  );

  const loadAll = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [storeProducts, featuredRequests] = await Promise.all([
        productService.list(storeId),
        featuredService.listByStore(storeId),
      ]);
      setProducts(Array.isArray(storeProducts) ? storeProducts : []);
      setRequests(Array.isArray(featuredRequests) ? featuredRequests : []);
      setForm((prev) => ({
        ...prev,
        productId: prev.productId || String(storeProducts?.[0]?.id || ''),
      }));
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível carregar os destaques.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [storeId]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canReview) return;
    if (!form.productId) {
      showToast('Selecione um produto para solicitar destaque.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await featuredService.createByStore({
        productId: form.productId,
        durationDays: Number(form.durationDays || 7),
        requestedSlots: Number(form.requestedSlots || 1),
        publicNote: String(form.publicNote || '').trim(),
      }, storeId);
      showToast('Solicitação enviada para revisão do super admin.', 'success');
      setForm((prev) => ({ ...prev, publicNote: '' }));
      await loadAll();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível criar a solicitação.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      await featuredService.cancelByStore(requestId, storeId);
      showToast('Solicitação cancelada.', 'success');
      await loadAll();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível cancelar a solicitação.', 'error');
    }
  };

  return (
    <AdminLayout contextLabel="Destaques">
      <div className="space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Impulsionar catálogo</p>
            <h1 className="text-xl font-black text-slate-900">Destaques patrocinados</h1>
            <p className="text-sm text-slate-600 mt-1">
              Solicite destaque de produtos para aparecer no Hub Já no Caminho. Aprovação e janela são definidas pelo super admin.
            </p>
          </div>

          <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Produto</span>
              <select
                value={form.productId}
                onChange={(event) => setForm((prev) => ({ ...prev, productId: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Selecione um produto</option>
                {productOptions.map((product: any) => (
                  <option key={product.id} value={product.id}>
                    {product.name} • {formatCurrency(Number(product?.promoActive ? product?.promoPrice : product?.price || 0))}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Duração (dias)</span>
              <input
                type="number"
                min={1}
                max={180}
                value={form.durationDays}
                onChange={(event) => setForm((prev) => ({ ...prev, durationDays: Number(event.target.value || 7) }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Quantidade de slots</span>
              <input
                type="number"
                min={1}
                max={10}
                value={form.requestedSlots}
                onChange={(event) => setForm((prev) => ({ ...prev, requestedSlots: Number(event.target.value || 1) }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold text-slate-600">Observação para análise (opcional)</span>
              <textarea
                value={form.publicNote}
                onChange={(event) => setForm((prev) => ({ ...prev, publicNote: event.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm resize-y"
                placeholder="Ex: quero promover este item no final de semana."
              />
            </label>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !canReview}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {submitting ? 'Enviando...' : 'Solicitar destaque'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-black text-slate-900">Minhas solicitações</h2>
            <button
              type="button"
              onClick={loadAll}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Atualizar
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma solicitação enviada ainda.</p>
          ) : (
            <div className="space-y-2">
              {requests.map((request: any) => {
                const status = String(request?.status || '').toUpperCase();
                const canCancel = status === 'PENDING' || status === 'REJECTED';
                return (
                  <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{request?.product?.name || 'Produto'}</p>
                        <p className="text-xs text-slate-500">
                          Criado em {formatDateTime(request?.createdAt)} • {Number(request?.durationDays || 0)} dia(s) • {Number(request?.requestedSlots || 1)} slot(s)
                        </p>
                        {request?.publicNote && (
                          <p className="text-xs text-slate-600 mt-1">{request.publicNote}</p>
                        )}
                        {request?.adminNote && (
                          <p className="text-xs text-slate-600 mt-1">Nota do admin: {request.adminNote}</p>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusTone(status)}`}>
                          {status}
                        </span>
                        {request?.priceAmount != null && (
                          <p className="text-xs font-semibold text-slate-700">{formatCurrency(Number(request.priceAmount || 0))}</p>
                        )}
                        {request?.startsAt && request?.endsAt && (
                          <p className="text-[11px] text-slate-500">
                            {formatDateTime(request.startsAt)} - {formatDateTime(request.endsAt)}
                          </p>
                        )}
                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => handleCancel(String(request.id))}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
