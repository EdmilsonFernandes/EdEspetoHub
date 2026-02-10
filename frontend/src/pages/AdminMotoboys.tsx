import { useEffect, useMemo, useState } from 'react';
import { Car, Camera, CheckCircle, IdentificationCard, WarningCircle, Clock, UsersThree, LinkSimpleHorizontal } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { motoboyAdminService } from '../services/motoboyAdminService';

export function AdminMotoboys() {
  const { auth } = useAuth();
  const { showToast } = useToast();
  const [motoboys, setMotoboys] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [documentsByMotoboy, setDocumentsByMotoboy] = useState<Record<string, any[]>>({});
  const [docsLoadingId, setDocsLoadingId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [docsModalMotoboyId, setDocsModalMotoboyId] = useState<string | null>(null);
  const [docsModalTitle, setDocsModalTitle] = useState<string>('');
  const [docsModalShowHistory, setDocsModalShowHistory] = useState(false);
  const [rejectRequestOpen, setRejectRequestOpen] = useState(false);
  const [rejectRequestTarget, setRejectRequestTarget] = useState<any | null>(null);
  const [rejectRequestReason, setRejectRequestReason] = useState('');
  const [rejectRequestDocs, setRejectRequestDocs] = useState<Record<string, boolean>>({ CRLV: true, CNH: false, SELFIE: false });
  const [rejectDocOpen, setRejectDocOpen] = useState(false);
  const [rejectDocTarget, setRejectDocTarget] = useState<{ motoboyId: string; documentId: string; docType?: string } | null>(null);
  const [rejectDocReason, setRejectDocReason] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const storeId = auth?.store?.id || '';
  const pendingRequests = requests.filter((request) => request.status === 'PENDING');
  const filteredMotoboys = showInactive ? motoboys : motoboys.filter((link) => link.active);

  const normalizeDocType = (value: any) => String(value || '').trim().toUpperCase();

  const latestDocs = (docs: any[]) => {
    // backend already sends DESC by uploadedAt; we keep first per type.
    const seen = new Set<string>();
    const out: any[] = [];
    for (const d of Array.isArray(docs) ? docs : []) {
      const t = normalizeDocType(d?.docType);
      if (!t) continue;
      if (seen.has(t)) continue;
      seen.add(t);
      out.push(d);
    }
    return out;
  };

  const docsPendingCount = (docs: any[]) => {
    const latest = latestDocs(docs);
    return latest.filter((d) => String(d?.status || '').toUpperCase() !== 'APPROVED').length;
  };

  const docStatusForType = (docs: any[], type: 'CNH' | 'SELFIE' | 'CRLV') => {
    const list = Array.isArray(docs) ? docs : [];
    const latest = latestDocs(list);
    const doc = latest.find((d) => normalizeDocType(d?.docType) === type) || null;
    if (!doc) return { status: 'MISSING' as const, doc: null as any };
    const st = String(doc?.status || '').toUpperCase();
    if (st === 'APPROVED') return { status: 'APPROVED' as const, doc };
    if (st === 'REJECTED') return { status: 'REJECTED' as const, doc };
    return { status: 'PENDING' as const, doc };
  };

  const docChip = (docs: any[], type: 'CNH' | 'SELFIE' | 'CRLV') => {
    const { status } = docStatusForType(docs, type);
    const icon =
      type === 'CNH' ? <IdentificationCard size={14} weight="duotone" /> : type === 'SELFIE' ? <Camera size={14} weight="duotone" /> : <Car size={14} weight="duotone" />;
    const cls =
      status === 'APPROVED'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : status === 'REJECTED'
        ? 'border-rose-200 bg-rose-50 text-rose-800'
        : status === 'PENDING'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-slate-200 bg-slate-50 text-slate-700';
    const label = status === 'MISSING' ? 'Faltando' : status === 'PENDING' ? 'Em análise' : status === 'REJECTED' ? 'Rejeitado' : 'OK';
    const statusIcon =
      status === 'APPROVED' ? <CheckCircle size={14} weight="fill" /> : status === 'REJECTED' ? <WarningCircle size={14} weight="fill" /> : status === 'PENDING' ? <Clock size={14} weight="duotone" /> : null;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${cls}`}
        title={`${type}: ${label}`}
      >
        <span className="opacity-90">{icon}</span>
        <span className="whitespace-nowrap">{type}: {label}</span>
        {statusIcon ? <span className="ml-0.5 opacity-90">{statusIcon}</span> : null}
      </span>
    );
  };

  const openDocsModal = async (motoboyId: string, title: string) => {
    if (!motoboyId) return;
    setDocsModalMotoboyId(motoboyId);
    setDocsModalTitle(title);
    setDocsModalShowHistory(false);
    setDocsModalOpen(true);
    await loadDocuments(motoboyId);
  };

  const docsModalLatest = useMemo(() => {
    if (!docsModalMotoboyId) return [];
    return latestDocs(documentsByMotoboy[docsModalMotoboyId] || []);
  }, [docsModalMotoboyId, documentsByMotoboy]);

  const approveAllLatestDocs = async () => {
    if (!storeId || !docsModalMotoboyId) return;
    const latest = docsModalLatest;
    const targets = latest.filter((d: any) => String(d?.status || '').toUpperCase() !== 'APPROVED');
    if (targets.length === 0) return;
    if (reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      for (const d of targets) {
        await motoboyAdminService.approveDocument(storeId, docsModalMotoboyId, d.id);
      }
      showToast('Documentos aprovados.', 'success');
      await loadDocuments(docsModalMotoboyId);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível aprovar os documentos.', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const quickRejectCRLV = async () => {
    if (!docsModalMotoboyId) return;
    const latest = docsModalLatest;
    const crlv = latest.find((d: any) => normalizeDocType(d?.docType) === 'CRLV');
    if (!crlv) return;
    openRejectDocModal(docsModalMotoboyId, crlv.id, 'CRLV');
  };

  const loadMotoboys = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const data = await motoboyAdminService.list(storeId);
      setMotoboys(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível carregar entregadores.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    if (!storeId) return;
    try {
      const data = await motoboyAdminService.listRequests(storeId);
      setRequests(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível carregar solicitações.', 'error');
    }
  };

  const reviewRequest = async (requestId: string, status: 'approve' | 'reject') => {
    if (!storeId) return;
    try {
      if (status === 'approve') {
        await motoboyAdminService.approveRequest(storeId, requestId);
      } else {
        const target = pendingRequests.find((r) => r.id === requestId) || requests.find((r) => r.id === requestId) || null;
        setRejectRequestTarget(target);
        setRejectRequestReason('');
        setRejectRequestDocs({ CRLV: true, CNH: false, SELFIE: false });
        setRejectRequestOpen(true);
        return;
      }
      showToast('Solicitação atualizada.', 'success');
      loadRequests();
      loadMotoboys();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível atualizar solicitação.', 'error');
    }
  };

  const loadDocuments = async (motoboyIdToLoad: string) => {
    if (!storeId || !motoboyIdToLoad) return;
    setDocsLoadingId(motoboyIdToLoad);
    try {
      const data = await motoboyAdminService.listDocuments(storeId, motoboyIdToLoad);
      setDocumentsByMotoboy((prev) => ({
        ...prev,
        [motoboyIdToLoad]: Array.isArray(data) ? data : [],
      }));
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível carregar documentos.', 'error');
    } finally {
      setDocsLoadingId(null);
    }
  };

  const handleReviewDocument = async (
    motoboyIdToReview: string,
    documentId: string,
    status: 'approve' | 'reject',
    reason?: string | null
  ) => {
    if (!storeId) return;
    try {
      if (status === 'approve') {
        await motoboyAdminService.approveDocument(storeId, motoboyIdToReview, documentId);
      } else {
        await motoboyAdminService.rejectDocument(storeId, motoboyIdToReview, documentId, reason || null);
      }
      showToast('Documento atualizado.', 'success');
      loadDocuments(motoboyIdToReview);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível atualizar o documento.', 'error');
    }
  };

  const submitRejectRequest = async () => {
    if (!storeId || !rejectRequestTarget?.id) return;
    if (reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      const reason = String(rejectRequestReason || '').trim() || null;
      const selectedDocs = Object.entries(rejectRequestDocs)
        .filter(([_, v]) => Boolean(v))
        .map(([k]) => String(k).toUpperCase())
        .filter((x) => x === 'CNH' || x === 'SELFIE' || x === 'CRLV');
      await motoboyAdminService.rejectRequest(storeId, rejectRequestTarget.id, reason, selectedDocs.length ? selectedDocs : null);
      showToast('Solicitação atualizada.', 'success');
      setRejectRequestOpen(false);
      setRejectRequestTarget(null);
      loadRequests();
      loadMotoboys();
      if (rejectRequestTarget?.motoboyId) loadDocuments(rejectRequestTarget.motoboyId);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível rejeitar a solicitação.', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const reasonChips = [
    'Foto escura/reflexo',
    'Documento ilegível',
    'Documento não confere',
    'Arquivo errado (não é este documento)',
    'Faltou frente/verso',
  ];

  const openRejectDocModal = (motoboyIdToReview: string, documentId: string, docType?: string) => {
    setRejectDocTarget({ motoboyId: motoboyIdToReview, documentId, docType });
    setRejectDocReason('');
    setRejectDocOpen(true);
  };

  const submitRejectDoc = async () => {
    if (!rejectDocTarget?.motoboyId || !rejectDocTarget?.documentId) return;
    if (reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      const reason = String(rejectDocReason || '').trim() || null;
      await handleReviewDocument(rejectDocTarget.motoboyId, rejectDocTarget.documentId, 'reject', reason);
      setRejectDocOpen(false);
      setRejectDocTarget(null);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleUnlink = async (motoboyIdToUnlink: string) => {
    if (!storeId) return;
    try {
      await motoboyAdminService.unlink(storeId, motoboyIdToUnlink);
      showToast('Vínculo removido.', 'success');
      loadMotoboys();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível remover o vínculo.', 'error');
    }
  };

  const getFaceBadge = (doc: any) => {
    const face = doc?.metadata?.face;
    if (!face) return null;
    const label = String(face.scoreLabel || 'indisponivel').toLowerCase();
    const status = String(face.status || '').toLowerCase();

    const text =
      status === 'processing'
        ? 'Verificação: em análise'
        : label === 'alto'
        ? 'Verificação: alta'
        : label === 'medio'
        ? 'Verificação: média'
        : label === 'baixo'
        ? 'Verificação: baixa'
        : 'Verificação: indisponível';

    const cls =
      status === 'processing'
        ? 'bg-slate-200 text-slate-700'
        : label === 'alto'
        ? 'bg-emerald-200 text-emerald-800'
        : label === 'medio'
        ? 'bg-amber-200 text-amber-800'
        : label === 'baixo'
        ? 'bg-rose-200 text-rose-800'
        : 'bg-slate-200 text-slate-700';

    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`} title={face.reason || ''}>
        {text}
      </span>
    );
  };

  const statusPill = (statusRaw: any) => {
    const status = String(statusRaw || '').toUpperCase();
    const cls =
      status === 'APPROVED'
        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
        : status === 'REJECTED'
        ? 'bg-rose-100 text-rose-800 border-rose-200'
        : 'bg-amber-100 text-amber-800 border-amber-200';
    const label = status === 'APPROVED' ? 'Aprovado' : status === 'REJECTED' ? 'Rejeitado' : 'Pendente';
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${cls}`}>{label}</span>;
  };

  const docThumb = (doc: any, motoboyId: string) => {
    const src = doc?.fileKey;
    const docType = String(doc?.docType || '').toUpperCase();
    const isSelfie = docType === 'SELFIE';
    return (
      <button
        type="button"
        onClick={() => setPreviewDoc({ ...doc, _motoboyId: motoboyId })}
        className="group relative w-full rounded-2xl border border-slate-200 bg-white overflow-hidden text-left shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]"
        title="Clique para ampliar"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ef4444,#f97316,#f59e0b)]" />
        <div className="p-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800">{docType || 'DOC'}</span>
              {isSelfie ? getFaceBadge(doc) : null}
            </div>
            <div className="mt-1">{statusPill(doc?.status)}</div>
          </div>
          <span className="text-[10px] font-bold text-slate-500 border border-slate-200 rounded-full px-2 py-0.5 bg-slate-50">
            Abrir
          </span>
        </div>
        <div className="px-3 pb-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            {src ? (
              <img
                src={src}
                alt={docType}
                className="w-full h-36 object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                loading="lazy"
              />
            ) : (
              <div className="h-36 flex items-center justify-center text-xs text-slate-400">Sem prévia</div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold text-brand-primary underline"
              onClick={(e) => e.stopPropagation()}
            >
              Abrir em nova aba
            </a>
            {String(doc?.status || '').toUpperCase() !== 'APPROVED' ? (
              <span className="text-[11px] text-slate-500">Revise e aprove</span>
            ) : (
              <span className="text-[11px] text-emerald-700 font-semibold">OK</span>
            )}
          </div>
        </div>
      </button>
    );
  };

  const SectionHeader = ({
    eyebrow,
    title,
    subtitle,
    right,
    tone,
    icon,
  }: {
    eyebrow: string;
    title: string;
    subtitle: string;
    right?: React.ReactNode;
    tone: 'amber' | 'emerald';
    icon: React.ReactNode;
  }) => {
    const bar =
      tone === 'amber'
        ? 'from-amber-50 via-white to-white border-amber-200/60'
        : 'from-emerald-50 via-white to-white border-emerald-200/60';
    const eyebrowCls = tone === 'amber' ? 'text-amber-700' : 'text-emerald-700';
    return (
      <div className={`px-4 py-3 border-b bg-gradient-to-r ${bar}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`text-[11px] uppercase tracking-[0.28em] font-extrabold ${eyebrowCls} flex items-center gap-2`}>
              <span className="opacity-90">{icon}</span>
              <span>{eyebrow}</span>
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900">{title}</div>
            <div className="text-xs text-slate-600 mt-0.5">{subtitle}</div>
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </div>
    );
  };

  useEffect(() => {
    loadMotoboys();
    loadRequests();
  }, [storeId]);

  if (!storeId) {
    return <div className="p-6">Carregando loja...</div>;
  }

  return (
    <div className="space-y-6">
      {docsModalOpen && docsModalMotoboyId && (
        <div
          className="fixed inset-0 z-[89] bg-black/60 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setDocsModalOpen(false)}
        >
          <div
            className="w-full max-w-5xl rounded-3xl bg-white p-4 sm:p-5 border border-slate-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Documentos</p>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">{docsModalTitle || 'Entregador'}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {docChip(documentsByMotoboy[docsModalMotoboyId] || [], 'CNH')}
                  {docChip(documentsByMotoboy[docsModalMotoboyId] || [], 'SELFIE')}
                  {docChip(documentsByMotoboy[docsModalMotoboyId] || [], 'CRLV')}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => loadDocuments(docsModalMotoboyId)}
                  className="btn-press rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700"
                >
                  {docsLoadingId === docsModalMotoboyId ? 'Atualizando...' : 'Atualizar'}
                </button>
                <button
                  type="button"
                  onClick={() => setDocsModalOpen(false)}
                  className="btn-press rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                {docsLoadingId === docsModalMotoboyId ? 'Carregando documentos...' : 'Clique para ampliar e revisar.'}
              </div>
              <div className="flex items-center gap-2">
                {docsModalLatest.some((d: any) => String(d?.status || '').toUpperCase() !== 'APPROVED') ? (
                  <button
                    type="button"
                    onClick={approveAllLatestDocs}
                    disabled={reviewSubmitting}
                    className="btn-press rounded-xl bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(16,185,129,0.55)] disabled:opacity-50"
                    title="Aprova todos os últimos documentos que não estão aprovados"
                  >
                    Aprovar pendências
                  </button>
                ) : null}
                {docsModalLatest.some((d: any) => String(d?.docType || '').toUpperCase() === 'CRLV') ? (
                  <button
                    type="button"
                    onClick={quickRejectCRLV}
                    disabled={reviewSubmitting}
                    className="btn-press rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-800 disabled:opacity-50"
                    title="Rejeitar rapidamente o CRLV (com motivo)"
                  >
                    Recusar CRLV
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setDocsModalShowHistory((v) => !v)}
                  className="btn-press rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  {docsModalShowHistory ? 'Ocultar histórico' : 'Mostrar histórico'}
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(docsModalShowHistory
                ? (documentsByMotoboy[docsModalMotoboyId] || [])
                : latestDocs(documentsByMotoboy[docsModalMotoboyId] || [])
              ).map((doc: any) => (
                <div key={doc.id}>{docThumb(doc, docsModalMotoboyId)}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {rejectRequestOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/60 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (reviewSubmitting) return;
            setRejectRequestOpen(false);
          }}
        >
          <div
            className="w-full max-w-xl rounded-3xl bg-white p-5 border border-slate-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Reprovação</p>
                <h2 className="text-lg font-black text-slate-900">Rejeitar solicitação de vínculo</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {rejectRequestTarget?.motoboyUser?.fullName ? (
                    <span className="font-semibold">{rejectRequestTarget.motoboyUser.fullName}</span>
                  ) : (
                    'Entregador'
                  )}{' '}
                  {rejectRequestTarget?.motoboyUser?.email ? (
                    <span className="text-slate-500">({rejectRequestTarget.motoboyUser.email})</span>
                  ) : null}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (reviewSubmitting) return;
                  setRejectRequestOpen(false);
                }}
                className="btn-press rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-extrabold text-slate-700">Motivo (recomendado)</span>
                <div className="flex flex-wrap gap-2">
                  {reasonChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setRejectRequestReason((prev) => (prev ? `${prev}\n${chip}` : chip))}
                      className="btn-press rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-extrabold text-slate-700"
                      title="Adicionar motivo"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <textarea
                  value={rejectRequestReason}
                  onChange={(e) => setRejectRequestReason(e.target.value)}
                  placeholder="Ex: CRLV errada. Envie o documento do veículo com foto legível."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                />
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-extrabold text-slate-800">Recusar documentos junto?</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Se o problema for documento, marque aqui para o entregador poder reenviar.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {['CNH', 'SELFIE', 'CRLV'].map((k) => (
                    <label
                      key={k}
                      className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(rejectRequestDocs[k])}
                        onChange={(e) => setRejectRequestDocs((prev) => ({ ...prev, [k]: e.target.checked }))}
                      />
                      <span className="font-semibold text-slate-800">{k}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (reviewSubmitting) return;
                    setRejectRequestOpen(false);
                  }}
                  className="btn-press rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-800"
                  disabled={reviewSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitRejectRequest}
                  className="btn-press rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(244,63,94,0.8)] disabled:opacity-50"
                  disabled={reviewSubmitting}
                >
                  {reviewSubmitting ? 'Rejeitando...' : 'Rejeitar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rejectDocOpen && (
        <div
          className="fixed inset-0 z-[91] bg-black/60 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (reviewSubmitting) return;
            setRejectDocOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-5 border border-slate-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Reprovação</p>
                <h2 className="text-lg font-black text-slate-900">Rejeitar documento</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {rejectDocTarget?.docType ? <span className="font-semibold">{rejectDocTarget.docType}</span> : 'Documento'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (reviewSubmitting) return;
                  setRejectDocOpen(false);
                }}
                className="btn-press rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-extrabold text-slate-700">Motivo (recomendado)</span>
                <div className="flex flex-wrap gap-2">
                  {reasonChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setRejectDocReason((prev) => (prev ? `${prev}\n${chip}` : chip))}
                      className="btn-press rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-extrabold text-slate-700"
                      title="Adicionar motivo"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <textarea
                  value={rejectDocReason}
                  onChange={(e) => setRejectDocReason(e.target.value)}
                  placeholder="Ex: Foto escura/reflexo. Reenvie em boa iluminação."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                />
              </label>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (reviewSubmitting) return;
                    setRejectDocOpen(false);
                  }}
                  className="btn-press rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-800"
                  disabled={reviewSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitRejectDoc}
                  className="btn-press rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(244,63,94,0.8)] disabled:opacity-50"
                  disabled={reviewSubmitting}
                >
                  {reviewSubmitting ? 'Rejeitando...' : 'Rejeitar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-black text-slate-800">Entregadores</h1>
        <p className="text-sm text-slate-500">Acompanhe solicitações e gerencie entregadores ativos.</p>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        Entregadores fazem o cadastro pelo link <span className="font-semibold">/motoboy/register</span> e solicitam vínculo com sua loja.
      </div>

      <div className="premium-card p-0 overflow-hidden">
        <SectionHeader
          eyebrow="Solicitações"
          title="Solicitações de vínculo"
          subtitle="Motoboys que pediram para entrar na sua loja."
          tone="amber"
          icon={<LinkSimpleHorizontal size={16} weight="duotone" />}
          right={
            <div className="flex items-center gap-2">
              {pendingRequests.length > 0 && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                  {pendingRequests.length} pendente{pendingRequests.length === 1 ? '' : 's'}
                </span>
              )}
              <button
                type="button"
                onClick={loadRequests}
                className="btn-press px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700"
              >
                Atualizar
              </button>
            </div>
          }
        />
        {pendingRequests.length === 0 ? (
          <div className="px-4 py-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Nenhuma solicitação pendente.
            </div>
          </div>
        ) : (
          <div className="p-4 grid gap-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-3 shadow-[0_26px_60px_-48px_rgba(15,23,42,0.35)]"
                style={{ borderLeftWidth: 6, borderLeftColor: 'rgb(245 158 11)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {request.motoboyUser?.fullName || 'Entregador'}
                    </p>
                    <p className="text-xs text-slate-500">{request.motoboyUser?.email || '-'}</p>
                    {request.motoboyUser?.phone && (
                      <p className="text-xs text-slate-500">{request.motoboyUser.phone}</p>
                    )}
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                    {request.status || 'PENDING'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => reviewRequest(request.id, 'approve')}
                    className="btn-press px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold shadow-[0_22px_48px_-34px_rgba(16,185,129,0.6)]"
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewRequest(request.id, 'reject')}
                    className="btn-press px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-extrabold shadow-[0_22px_48px_-34px_rgba(244,63,94,0.65)]"
                  >
                    Rejeitar
                  </button>
                  {!!request.motoboyId && (
                    <button
                      type="button"
                      onClick={() => openDocsModal(request.motoboyId, request.motoboyUser?.fullName || 'Entregador')}
                      className="btn-press px-3 py-2 rounded-xl border border-slate-200 bg-white text-[11px] font-extrabold text-slate-700"
                    >
                      Ver documentos
                    </button>
                  )}
                </div>

                {!!request.motoboyId && Array.isArray(documentsByMotoboy[request.motoboyId]) && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    {docChip(documentsByMotoboy[request.motoboyId] || [], 'CNH')}
                    {docChip(documentsByMotoboy[request.motoboyId] || [], 'SELFIE')}
                    {docChip(documentsByMotoboy[request.motoboyId] || [], 'CRLV')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="premium-card p-0 overflow-hidden">
        <SectionHeader
          eyebrow="Time"
          title="Entregadores vinculados"
          subtitle="Status, documentos e vínculo por loja."
          tone="emerald"
          icon={<UsersThree size={16} weight="duotone" />}
          right={
            <button
              type="button"
              onClick={loadMotoboys}
              className="btn-press px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700"
            >
              Atualizar
            </button>
          }
        />
        {loading ? (
          <div className="px-4 py-4 text-sm text-slate-600">Carregando...</div>
        ) : filteredMotoboys.length === 0 ? (
          <div className="px-4 py-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Nenhum entregador vinculado ainda.
            </div>
          </div>
        ) : (
          <div className="p-4 grid gap-3">
            {filteredMotoboys.map((link) => (
              <div
                key={link.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-3 shadow-[0_26px_60px_-48px_rgba(15,23,42,0.35)]"
                style={{
                  borderLeftWidth: 6,
                  borderLeftColor: link.active ? (link.busy ? 'rgb(245 158 11)' : 'rgb(16 185 129)') : 'rgb(244 63 94)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {link.motoboyUser?.fullName || 'Entregador'}
                    </p>
                    <p className="text-xs text-slate-500">{link.motoboyUser?.email || '-'}</p>
                    {link.motoboyUser?.phone && (
                      <p className="text-xs text-slate-500">{link.motoboyUser.phone}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                      {link.motoboyStatus || 'PENDING'}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                        link.busy ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                      title={link.busy ? 'Entregador com entrega ativa' : 'Entregador livre'}
                    >
                      {link.busy ? 'Ocupado' : 'Livre'}
                    </span>
                    {!link.active && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">
                        Vínculo inativo
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap gap-2">
                  <span>Vínculo: {link.active ? 'Ativo' : 'Inativo'}</span>
                </div>
                {Array.isArray(documentsByMotoboy[link.motoboyId]) && (
                  <div className="text-[11px] text-slate-500">
                    {docsPendingCount(documentsByMotoboy[link.motoboyId]) > 0 ? (
                      <span className="text-amber-700">
                        Documentos pendentes: {docsPendingCount(documentsByMotoboy[link.motoboyId])}
                      </span>
                    ) : (
                      <span className="text-emerald-700">Documentos aprovados.</span>
                    )}
                  </div>
                )}
                {Array.isArray(documentsByMotoboy[link.motoboyId]) && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    {docChip(documentsByMotoboy[link.motoboyId] || [], 'CNH')}
                    {docChip(documentsByMotoboy[link.motoboyId] || [], 'SELFIE')}
                    {docChip(documentsByMotoboy[link.motoboyId] || [], 'CRLV')}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openDocsModal(link.motoboyId, link.motoboyUser?.fullName || 'Entregador')}
                    className="btn-press px-3 py-2 rounded-xl border border-slate-200 bg-white text-[11px] font-extrabold text-slate-700"
                  >
                    Ver documentos
                  </button>
                  {!link.active && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!storeId) return;
                        try {
                          await motoboyAdminService.link(storeId, link.motoboyId);
                          showToast('Vínculo reativado.', 'success');
                          loadMotoboys();
                        } catch (error: any) {
                          showToast(error?.message || 'Não foi possível reativar vínculo.', 'error');
                        }
                      }}
                      className="btn-press px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-extrabold text-emerald-800"
                    >
                      Reativar vínculo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleUnlink(link.motoboyId)}
                    className="btn-press px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-xs font-extrabold text-rose-700"
                  >
                    Remover vínculo
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <span className="font-semibold">Mostrar vínculos inativos</span>
            <button
              type="button"
              onClick={() => setShowInactive((prev) => !prev)}
              className={`btn-press px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                showInactive ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              {showInactive ? 'Visível' : 'Oculto'}
            </button>
          </div>
        </div>
      </div>

      {previewDoc && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setPreviewDoc(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-4xl rounded-2xl bg-white p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-2 pb-2">
              <div className="flex items-center gap-2">
                <div className="text-sm font-extrabold text-slate-900">{previewDoc.docType || 'Documento'}</div>
                {statusPill(previewDoc.status)}
                {String(previewDoc?.docType || '').toUpperCase() === 'SELFIE' ? getFaceBadge(previewDoc) : null}
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Fechar
              </button>
            </div>
            <div className="px-2 pb-2 flex flex-wrap items-center justify-between gap-2">
              <a
                href={previewDoc.fileKey}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-brand-primary underline"
              >
                Abrir em nova aba
              </a>
              {String(previewDoc.status || '').toUpperCase() !== 'APPROVED' && previewDoc?._motoboyId ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleReviewDocument(previewDoc._motoboyId, previewDoc.id, 'approve')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-extrabold"
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => openRejectDocModal(previewDoc._motoboyId, previewDoc.id, previewDoc?.docType)}
                    className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-extrabold"
                  >
                    Rejeitar
                  </button>
                </div>
              ) : (
                <span className="text-xs text-emerald-700 font-semibold">Documento aprovado.</span>
              )}
            </div>
            {previewDoc.fileKey ? (
              <img
                src={previewDoc.fileKey}
                alt={previewDoc.docType}
                className="w-full max-h-[70vh] object-contain rounded-xl border border-slate-200"
              />
            ) : (
              <div className="p-8 text-center text-sm text-slate-500">Sem imagem.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
