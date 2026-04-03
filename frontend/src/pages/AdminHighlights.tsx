// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { productService } from '../services/productService';
import { featuredService } from '../services/featuredService';
import { formatCurrency, formatDateTime } from '../utils/format';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

type DurationUnit = 'DAY' | 'WEEK' | 'MONTH';

const DURATION_META: Record<DurationUnit, { label: string; days: number }> = {
  DAY: { label: '1 dia (24h)', days: 1 },
  WEEK: { label: '1 semana (7 dias)', days: 7 },
  MONTH: { label: '1 mês (30 dias)', days: 30 },
};

const statusTone = (status: string) => {
  const value = String(status || '').toUpperCase();
  if (value === 'APPROVED') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (value === 'PAID_WAITING_SLOT') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  if (value === 'PENDING_PAYMENT') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (value === 'PAYMENT_FAILED') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (value === 'REJECTED') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (value === 'CANCELLED' || value === 'EXPIRED') return 'bg-slate-100 text-slate-700 border-slate-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const statusLabel = (status: string) => {
  const value = String(status || '').toUpperCase();
  if (value === 'APPROVED') return 'Ativo';
  if (value === 'PAID_WAITING_SLOT') return 'Pago aguardando vaga';
  if (value === 'PENDING_PAYMENT') return 'Aguardando pagamento';
  if (value === 'PAYMENT_FAILED') return 'Pagamento falhou';
  if (value === 'REJECTED') return 'Recusado';
  if (value === 'CANCELLED') return 'Cancelado';
  if (value === 'EXPIRED') return 'Encerrado';
  return value || 'Pendente';
};

const paymentStatusLabel = (value: string) => {
  const status = String(value || '').toUpperCase();
  if (status === 'PAID') return 'Pago';
  if (status === 'FAILED') return 'Falhou';
  return 'Pendente';
};

const paymentMethodLabel = (value: string) => {
  const method = String(value || '').toUpperCase();
  if (method === 'CREDIT_CARD') return 'Cartão';
  return 'PIX';
};

export function AdminHighlights() {
  const { auth } = useAuth();
  const { showToast } = useToast();
  const storeId = String(auth?.store?.id || '').trim();

  const [products, setProducts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pricing, setPricing] = useState<any>({
    prices: { DAY: 14.9, WEEK: 79.9, MONTH: 249.9 },
    maxActiveSlots: 50,
    activeSlots: 0,
    availableSlots: 50,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [paymentCountdownMs, setPaymentCountdownMs] = useState(0);
  const paidToastShownRef = useRef<Set<string>>(new Set());
  const [form, setForm] = useState({
    productId: '',
    durationUnit: 'DAY' as DurationUnit,
    paymentMethod: 'PIX' as 'PIX' | 'CREDIT_CARD',
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
      const [storeProducts, featuredRequests, pricingSummary] = await Promise.all([
        productService.list(storeId),
        featuredService.listByStore(storeId),
        featuredService.getPricingByStore(storeId),
      ]);
      setProducts(Array.isArray(storeProducts) ? storeProducts : []);
      setRequests(Array.isArray(featuredRequests) ? featuredRequests : []);
      setPricing(pricingSummary || pricing);
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

  const formatCountdown = (ms: number) => {
    const safe = Math.max(0, Number(ms || 0));
    const totalSec = Math.floor(safe / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const openPayment = (request: any) => {
    setSelectedRequest(request);
    setPaymentOpen(true);
    const paymentStatus = String(request?.paymentStatus || '').toUpperCase();
    const status = String(request?.status || '').toUpperCase();
    const terminalStatus = status === 'CANCELLED' || status === 'EXPIRED' || status === 'REJECTED';
    const shouldStartCountdown = paymentStatus !== 'PAID' && !terminalStatus;
    setPaymentCountdownMs(shouldStartCountdown ? 5 * 60 * 1000 : 0);
    if (shouldStartCountdown && request?.id) {
      window.setTimeout(() => {
        void refreshPaymentStatusByRequest(String(request.id), true);
      }, 120);
    }
  };

  const openCreate = () => {
    if (!form.productId && productOptions.length > 0) {
      setForm((prev) => ({ ...prev, productId: String(productOptions[0]?.id || '') }));
    }
    setCreateOpen(true);
  };

  const closeCreate = () => setCreateOpen(false);
  const closePayment = () => {
    setPaymentOpen(false);
    setSelectedRequest(null);
    setPaymentCountdownMs(0);
  };

  const copyText = async (text: string, okMessage: string) => {
    try {
      await navigator.clipboard.writeText(String(text || ''));
      showToast(okMessage, 'success');
    } catch {
      showToast('Não foi possível copiar agora.', 'warning');
    }
  };

  const refreshPaymentStatusByRequest = async (requestIdRaw: string, silent = false) => {
    const requestId = String(requestIdRaw || '').trim();
    if (!requestId || !storeId) return;
    const previous = requests.find((entry) => String(entry?.id || '') === requestId) || selectedRequest;
    try {
      const updated = await featuredService.refreshPaymentByStore(requestId, storeId);
      setRequests((prev) =>
        (Array.isArray(prev) ? prev : []).map((entry) =>
          String(entry?.id || '') === String(updated?.id || '') ? updated : entry
        )
      );
      setSelectedRequest((prev: any) =>
        String(prev?.id || '') === String(updated?.id || '') ? updated : prev
      );
      const becamePaid =
        String(previous?.paymentStatus || '').toUpperCase() !== 'PAID' &&
        String(updated?.paymentStatus || '').toUpperCase() === 'PAID';
      if (becamePaid) {
        if (!paidToastShownRef.current.has(requestId)) {
          paidToastShownRef.current.add(requestId);
          showToast('Pagamento confirmado. Seu destaque foi atualizado.', 'success');
        }
        await loadAll();
        closePayment();
      }
    } catch (error: any) {
      if (!silent) showToast(error?.message || 'Não foi possível atualizar o pagamento agora.', 'warning');
    }
  };

  const refreshSelectedPaymentStatus = async (silent = false) => {
    const requestId = String(selectedRequest?.id || '').trim();
    if (!requestId) return;
    await refreshPaymentStatusByRequest(requestId, silent);
  };

  useEffect(() => {
    if (!paymentOpen || !selectedRequest?.id) return;
    const paymentStatus = String(selectedRequest?.paymentStatus || '').toUpperCase();
    const status = String(selectedRequest?.status || '').toUpperCase();
    const terminalStatus = status === 'CANCELLED' || status === 'EXPIRED' || status === 'REJECTED';
    const shouldPoll = !terminalStatus && paymentStatus !== 'PAID' && paymentCountdownMs > 0;
    if (!shouldPoll) return;
    const first = window.setTimeout(() => {
      void refreshSelectedPaymentStatus(true);
    }, 400);
    const timer = window.setInterval(() => {
      void refreshSelectedPaymentStatus(true);
    }, 3000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [paymentOpen, selectedRequest?.id, selectedRequest?.status, selectedRequest?.paymentStatus, storeId, paymentCountdownMs]);

  useEffect(() => {
    if (!paymentOpen || !selectedRequest?.id) return;
    const paymentStatus = String(selectedRequest?.paymentStatus || '').toUpperCase();
    if (paymentStatus === 'PAID') return;
    if (paymentCountdownMs <= 0) return;
    const timer = window.setInterval(() => {
      setPaymentCountdownMs((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paymentOpen, selectedRequest?.id, selectedRequest?.paymentStatus, paymentCountdownMs]);

  useEffect(() => {
    if (!paymentOpen || !selectedRequest?.id) return;
    const paymentStatus = String(selectedRequest?.paymentStatus || '').toUpperCase();
    if (paymentStatus === 'PAID') return;
    if (paymentCountdownMs > 0) return;
    showToast('Tempo de tentativa expirado. Reabra o pagamento para tentar novamente.', 'warning');
    closePayment();
  }, [paymentOpen, selectedRequest?.id, selectedRequest?.paymentStatus, paymentCountdownMs]);

  useEffect(() => {
    if (!paymentOpen || !selectedRequest) return;
    const paymentStatus = String(selectedRequest?.paymentStatus || '').toUpperCase();
    if (paymentStatus !== 'PAID') return;
    setPaymentOpen(false);
    setSelectedRequest(null);
  }, [paymentOpen, selectedRequest]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.productId) {
      showToast('Selecione um produto para destacar.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const created = await featuredService.createByStore(
        {
          productId: form.productId,
          durationUnit: form.durationUnit,
          paymentMethod: form.paymentMethod,
          publicNote: String(form.publicNote || '').trim(),
        },
        storeId
      );
      showToast('Solicitação criada. Faça o pagamento para ativar o destaque.', 'success');
      setCreateOpen(false);
      setForm((prev) => ({ ...prev, publicNote: '' }));
      await loadAll();
      openPayment(created);
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

  const selectedPrice = Number(pricing?.prices?.[form.durationUnit] || 0);
  const selectedDays = DURATION_META[form.durationUnit]?.days || 1;

  return (
    <AdminLayout contextLabel="Destaques">
      <div className="space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Hub Já no Caminho</p>
              <h1 className="text-xl font-black text-slate-900">Destaques patrocinados</h1>
              <p className="text-sm text-slate-600 mt-1">
                A ativação ocorre automaticamente após pagamento confirmado. Validade começa no momento da aprovação do pagamento.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
            >
              Novo destaque
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Vagas ativas</p>
              <p className="mt-1 text-xl font-black text-slate-900">{Number(pricing?.activeSlots || 0)} / {Number(pricing?.maxActiveSlots || 50)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Preço diário</p>
              <p className="mt-1 text-xl font-black text-slate-900">{formatCurrency(Number(pricing?.prices?.DAY || 0))}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Preço mensal</p>
              <p className="mt-1 text-xl font-black text-slate-900">{formatCurrency(Number(pricing?.prices?.MONTH || 0))}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-black text-slate-900">Meus destaques</h2>
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
            <p className="text-sm text-slate-500">Nenhum destaque solicitado ainda.</p>
          ) : (
            <div className="space-y-2">
              {requests.map((request: any) => {
                const status = String(request?.status || '').toUpperCase();
                const canCancel = status === 'PENDING_PAYMENT' || status === 'PAYMENT_FAILED' || status === 'REJECTED';
                const canPay = status === 'PENDING_PAYMENT' && String(request?.paymentStatus || '').toUpperCase() !== 'PAID';
                const isActive = status === 'APPROVED' && String(request?.paymentStatus || '').toUpperCase() === 'PAID';
                return (
                  <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <img
                          src={resolveAssetUrl(request?.product?.imageUrl || undefined) || '/janocaminho.jpg'}
                          alt={request?.product?.name || 'Produto'}
                          className="h-11 w-11 rounded-xl object-cover border border-slate-200 bg-white"
                        />
                        <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{request?.product?.name || 'Produto'}</p>
                        <p className="text-xs text-slate-500">
                          Criado em {formatDateTime(request?.createdAt)} • {DURATION_META[String(request?.durationUnit || 'DAY').toUpperCase() as DurationUnit]?.label || `${Number(request?.durationDays || 1)} dia(s)`}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          Pagamento: <strong>{paymentStatusLabel(request?.paymentStatus)}</strong>
                          {` • Método: ${paymentMethodLabel(request?.paymentMethod)}`}
                          {request?.priceAmount != null ? ` • ${formatCurrency(Number(request.priceAmount || 0))}` : ''}
                        </p>
                        {request?.paymentPaidAt && (
                          <p className="text-xs text-slate-600 mt-1">Pagamento confirmado em {formatDateTime(request.paymentPaidAt)}</p>
                        )}
                        {isActive && request?.endsAt && (
                          <p className="text-xs font-semibold text-emerald-700 mt-1">
                            Em destaque até {formatDateTime(request.endsAt)}
                          </p>
                        )}
                        {status === 'PAID_WAITING_SLOT' && (
                          <p className="text-xs font-semibold text-indigo-700 mt-1">Pagamento confirmado. Entrará no Hub assim que abrir uma vaga.</p>
                        )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusTone(status)}`}>
                          {statusLabel(status)}
                        </span>
                        {(request?.paymentQrCodeBase64 || request?.paymentLink || request?.paymentQrCodeText) && (
                          <button
                            type="button"
                            onClick={() => openPayment(request)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                          >
                            {canPay ? 'Pagar agora' : 'Ver pagamento'}
                          </button>
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

      {createOpen && (
        <div className="fixed inset-0 z-[320] bg-slate-950/55 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl">
            <div className="mb-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Novo destaque</p>
              <h3 className="text-lg font-black text-slate-900">Escolha produto e duração</h3>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <label className="space-y-1 block">
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

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">Duração</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(['DAY', 'WEEK', 'MONTH'] as DurationUnit[]).map((unit) => {
                    const active = form.durationUnit === unit;
                    return (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, durationUnit: unit }))}
                        className={`rounded-xl border px-3 py-2 text-left ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
                      >
                        <p className="text-xs font-black uppercase tracking-[0.1em]">{DURATION_META[unit].label}</p>
                        <p className="text-sm font-bold mt-1">{formatCurrency(Number(pricing?.prices?.[unit] || 0))}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500">
                  Após pagamento aprovado, o destaque inicia na hora e dura {selectedDays} dia(s), encerrando automaticamente.
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">Forma de pagamento</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, paymentMethod: 'PIX' }))}
                    className={`rounded-xl border px-3 py-2 text-sm font-bold ${form.paymentMethod === 'PIX' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
                  >
                    PIX
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, paymentMethod: 'CREDIT_CARD' }))}
                    className={`rounded-xl border px-3 py-2 text-sm font-bold ${form.paymentMethod === 'CREDIT_CARD' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
                  >
                    Cartão
                  </button>
                </div>
              </div>

              <label className="space-y-1 block">
                <span className="text-xs font-semibold text-slate-600">Observação (opcional)</span>
                <textarea
                  value={form.publicNote}
                  onChange={(event) => setForm((prev) => ({ ...prev, publicNote: event.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm resize-none"
                  placeholder="Ex: campanha de fim de semana."
                />
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-600">Total a pagar</p>
                <p className="text-lg font-black text-slate-900">{formatCurrency(selectedPrice)}</p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCreate}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {submitting ? 'Gerando pagamento...' : 'Gerar cobrança'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paymentOpen && selectedRequest && (
        <div className="fixed inset-0 z-[320] bg-slate-950/55 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl">
            <div className="mb-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Pagamento do destaque</p>
              <h3 className="text-lg font-black text-slate-900">{selectedRequest?.product?.name || 'Produto'}</h3>
              <p className="text-xs text-slate-600 mt-1">
                Status: <strong>{paymentStatusLabel(selectedRequest?.paymentStatus)}</strong>
                {selectedRequest?.paymentExpiresAt ? ` • expira em ${formatDateTime(selectedRequest.paymentExpiresAt)}` : ''}
              </p>
              {String(selectedRequest?.paymentStatus || '').toUpperCase() !== 'PAID' && paymentCountdownMs > 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  Tempo para atualização automática: <strong>{formatCountdown(paymentCountdownMs)}</strong>
                </p>
              )}
            </div>

            {selectedRequest?.paymentQrCodeBase64 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 flex justify-center">
                <img src={selectedRequest.paymentQrCodeBase64} alt="QR Code PIX" className="h-48 w-48 object-contain" />
              </div>
            )}

            {selectedRequest?.paymentQrCodeText && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">PIX copia e cola</p>
                <p className="mt-1 break-all text-xs text-slate-700">{selectedRequest.paymentQrCodeText}</p>
                <button
                  type="button"
                  onClick={() => copyText(String(selectedRequest.paymentQrCodeText || ''), 'Código PIX copiado.')}
                  className="mt-2 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                >
                  Copiar código PIX
                </button>
              </div>
            )}

            {selectedRequest?.paymentLink && (
              <a
                href={selectedRequest.paymentLink}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
              >
                Abrir link de pagamento
              </a>
            )}

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  await refreshSelectedPaymentStatus(false);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Atualizar status
              </button>
              <button
                type="button"
                onClick={closePayment}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
