// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { useToast } from '../contexts/ToastContext';
import { superAdminService } from '../services/superAdminService';
import { formatCurrency, formatDateTime } from '../utils/format';

const STORAGE_KEY = 'superAdminToken';

const statusTone = (status: string) => {
  const value = String(status || '').toUpperCase();
  if (value === 'APPROVED') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (value === 'REJECTED') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (value === 'CANCELLED' || value === 'EXPIRED') return 'bg-slate-100 text-slate-700 border-slate-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
};

export function SuperAdminHighlights() {
  const { showToast } = useToast();
  const [token] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [reviewingId, setReviewingId] = useState('');

  const [reviewForm, setReviewForm] = useState({
    requestId: '',
    status: 'APPROVED',
    durationDays: 7,
    startsAt: '',
    priceAmount: '',
    paymentStatus: 'PENDING',
    adminNote: '',
  });

  const currentRequest = useMemo(
    () => requests.find((request: any) => String(request?.id || '') === String(reviewForm.requestId || '')),
    [requests, reviewForm.requestId]
  );

  const loadRequests = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const payload = await superAdminService.fetchFeaturedRequests(token, {
        status: statusFilter,
        limit: 300,
      });
      setRequests(Array.isArray(payload) ? payload : []);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível carregar as solicitações.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [token, statusFilter]);

  if (!token) {
    return <Navigate to="/superadmin" replace />;
  }

  const openReview = (request: any) => {
    setReviewForm({
      requestId: String(request?.id || ''),
      status: 'APPROVED',
      durationDays: Number(request?.durationDays || 7),
      startsAt: '',
      priceAmount: request?.priceAmount != null ? String(request.priceAmount) : '',
      paymentStatus: String(request?.paymentStatus || 'PENDING').toUpperCase() === 'PAID' ? 'PAID' : 'PENDING',
      adminNote: '',
    });
  };

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reviewForm.requestId) {
      showToast('Selecione uma solicitação para revisar.', 'warning');
      return;
    }
    setReviewingId(reviewForm.requestId);
    try {
      await superAdminService.reviewFeaturedRequest(token, reviewForm.requestId, {
        status: reviewForm.status as any,
        durationDays: Number(reviewForm.durationDays || 7),
        startsAt: reviewForm.startsAt || undefined,
        priceAmount: reviewForm.priceAmount !== '' ? Number(reviewForm.priceAmount) : undefined,
        paymentStatus: reviewForm.paymentStatus as any,
        adminNote: String(reviewForm.adminNote || '').trim() || undefined,
      });
      showToast('Solicitação revisada com sucesso.', 'success');
      setReviewForm({
        requestId: '',
        status: 'APPROVED',
        durationDays: 7,
        startsAt: '',
        priceAmount: '',
        paymentStatus: 'PENDING',
        adminNote: '',
      });
      await loadRequests();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível revisar a solicitação.', 'error');
    } finally {
      setReviewingId('');
    }
  };

  return (
    <AdminLayout contextLabel="Super Admin · Destaques">
      <div className="space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Monetização do Hub</p>
              <h1 className="text-xl font-black text-slate-900">Gestão de destaques patrocinados</h1>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
              >
                <option value="ALL">Todos</option>
                <option value="PENDING">Pendentes</option>
                <option value="APPROVED">Aprovados</option>
                <option value="REJECTED">Rejeitados</option>
                <option value="EXPIRED">Expirados</option>
              </select>
              <button
                type="button"
                onClick={loadRequests}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Atualizar
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Carregando solicitações...</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma solicitação encontrada.</p>
          ) : (
            <div className="space-y-2">
              {requests.map((request: any) => {
                const status = String(request?.status || '').toUpperCase();
                const canReview = status === 'PENDING';
                return (
                  <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {request?.product?.name || 'Produto'} • {request?.store?.name || 'Loja'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Criado em {formatDateTime(request?.createdAt)} • {Number(request?.durationDays || 0)} dia(s) • {Number(request?.requestedSlots || 1)} slot(s)
                        </p>
                        {request?.publicNote && (
                          <p className="text-xs text-slate-600 mt-1">{request.publicNote}</p>
                        )}
                        {request?.adminNote && (
                          <p className="text-xs text-slate-600 mt-1">Nota: {request.adminNote}</p>
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
                          <p className="text-[11px] text-slate-500">{formatDateTime(request.startsAt)} - {formatDateTime(request.endsAt)}</p>
                        )}
                        {canReview && (
                          <button
                            type="button"
                            onClick={() => openReview(request)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                          >
                            Revisar
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

        <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <h2 className="text-base font-black text-slate-900">Revisar solicitação</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Se aprovar, o item entra em destaque no Hub dentro da janela definida.
          </p>

          <form onSubmit={submitReview} className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold text-slate-600">Solicitação</span>
              <select
                value={reviewForm.requestId}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, requestId: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Selecione uma solicitação</option>
                {requests
                  .filter((request: any) => String(request?.status || '').toUpperCase() === 'PENDING')
                  .map((request: any) => (
                    <option key={request.id} value={request.id}>
                      {request?.store?.name || 'Loja'} • {request?.product?.name || 'Produto'} • {formatDateTime(request?.createdAt)}
                    </option>
                  ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Status</span>
              <select
                value={reviewForm.status}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, status: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="APPROVED">Aprovar</option>
                <option value="REJECTED">Rejeitar</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Duração (dias)</span>
              <input
                type="number"
                min={1}
                max={180}
                value={reviewForm.durationDays}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, durationDays: Number(event.target.value || 7) }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Início (opcional)</span>
              <input
                type="datetime-local"
                value={reviewForm.startsAt}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Valor cobrado (R$)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={reviewForm.priceAmount}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, priceAmount: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Pagamento</span>
              <select
                value={reviewForm.paymentStatus}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, paymentStatus: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="PENDING">Pendente</option>
                <option value="PAID">Pago</option>
              </select>
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold text-slate-600">Nota interna</span>
              <textarea
                rows={3}
                value={reviewForm.adminNote}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, adminNote: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm resize-y"
              />
            </label>

            {currentRequest && (
              <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">{currentRequest?.store?.name || 'Loja'} • {currentRequest?.product?.name || 'Produto'}</p>
                <p>Criado em {formatDateTime(currentRequest?.createdAt)} • slots: {Number(currentRequest?.requestedSlots || 1)} • duração solicitada: {Number(currentRequest?.durationDays || 0)} dia(s)</p>
              </div>
            )}

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={Boolean(reviewingId)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {reviewingId ? 'Processando...' : 'Salvar revisão'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </AdminLayout>
  );
}
