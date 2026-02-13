import { useEffect, useMemo, useState } from 'react';
import { Car, Camera, CheckCircle, IdentificationCard, WarningCircle, Clock, UsersThree, LinkSimpleHorizontal, MagnifyingGlass, FunnelSimple } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { motoboyAdminService } from '../services/motoboyAdminService';
import { orderService } from '../services/orderService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { AdaptiveAvatar } from '../components/common/AdaptiveAvatar';
import { FormSection } from '../components/common/FormSection';

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
  const [reuploadDocOpen, setReuploadDocOpen] = useState(false);
  const [reuploadDocTarget, setReuploadDocTarget] = useState<{ motoboyId: string; documentId: string; docType?: string } | null>(null);
  const [reuploadDocReason, setReuploadDocReason] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [motoboyQuery, setMotoboyQuery] = useState('');
  const [motoboyFilter, setMotoboyFilter] = useState<'all' | 'free' | 'busy' | 'docs_pending' | 'inactive'>('all');
  const [reviewSummary, setReviewSummary] = useState<any | null>(null);
  const [motoboyReviewMap, setMotoboyReviewMap] = useState<Record<string, any>>({});
  const [tipsOverview, setTipsOverview] = useState({
    paidAmount: 0,
    pendingAmount: 0,
    tipOrders: 0,
    paidTipOrders: 0,
    pendingTipOrders: 0,
    avgTipAmount: 0,
  });
  const [tipPayoutRows, setTipPayoutRows] = useState<any[]>([]);
  const [tipPayoutsLoading, setTipPayoutsLoading] = useState(false);
  const [payoutModal, setPayoutModal] = useState<{
    open: boolean;
    row: any | null;
    notes: string;
    proofFile: File | null;
    submitting: boolean;
  }>({ open: false, row: null, notes: '', proofFile: null, submitting: false });
  const storeId = auth?.store?.id || '';
  const pendingRequests = requests.filter((request) => request.status === 'PENDING');

  const formatMotoboyStatus = (raw: any) => {
    const status = String(raw || '').toUpperCase();
    if (status === 'ACTIVE') return 'ATIVO';
    if (status === 'PENDING_VERIFICATION') return 'EM ANÁLISE';
    if (status === 'SUSPENDED') return 'SUSPENSO';
    if (status === 'REJECTED') return 'REJEITADO';
    return status || 'PENDENTE';
  };

  const formatCurrency = (value: any) =>
    Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDateTime = (value: any) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('pt-BR');
  };

  const normalizeDocType = (value: any) => String(value || '').trim().toUpperCase();
  const isImageFile = (value: any) => {
    const v = String(value || '').toLowerCase();
    return v.startsWith('data:image/') || /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/.test(v);
  };
  const isPdfFile = (value: any) => {
    const v = String(value || '').toLowerCase();
    return v.startsWith('data:application/pdf') || /\.pdf(\?.*)?$/.test(v);
  };

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

  const kycSummary = (docs: any[]) => {
    const latest = latestDocs(docs || []);
    const byType = new Map<string, any>();
    for (const d of latest) byType.set(normalizeDocType(d?.docType), d);
    const cnh = byType.get('CNH');
    const selfie = byType.get('SELFIE');
    const crlv = byType.get('CRLV');
    const st = (d: any) => String(d?.status || '').toUpperCase();
    const hasAny = Boolean(cnh || selfie || crlv);
    if (!hasAny) return { tone: 'slate' as const, label: 'KYC: sem docs', ok: false };
    const rejected = [cnh, selfie, crlv].some((d) => st(d) === 'REJECTED');
    if (rejected) return { tone: 'rose' as const, label: 'KYC: recusado', ok: false };
    const pending = [cnh, selfie, crlv].some((d) => d && st(d) === 'PENDING');
    const coreOk = st(cnh) === 'APPROVED' && st(selfie) === 'APPROVED';
    const crlvOk = !crlv || st(crlv) === 'APPROVED';
    if (coreOk && crlvOk) return { tone: 'emerald' as const, label: 'KYC: OK', ok: true };
    if (pending) return { tone: 'amber' as const, label: 'KYC: em análise', ok: false };
    return { tone: 'amber' as const, label: 'KYC: pendente', ok: false };
  };

  const kycPill = (docs: any[]) => {
    const s = kycSummary(docs || []);
    const cls =
      s.tone === 'emerald'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : s.tone === 'rose'
        ? 'border-rose-200 bg-rose-50 text-rose-800'
        : s.tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-slate-200 bg-slate-50 text-slate-700';
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${cls}`}>
        {s.label}
      </span>
    );
  };

  const filteredMotoboys = useMemo(() => {
    const q = String(motoboyQuery || '').trim().toLowerCase();
    const base = showInactive ? motoboys : motoboys.filter((link) => link.active);

    const withQuery = q
      ? base.filter((link) => {
          const name = String(link?.motoboyUser?.fullName || '').toLowerCase();
          const email = String(link?.motoboyUser?.email || '').toLowerCase();
          const phone = String(link?.motoboyUser?.phone || '').toLowerCase();
          return name.includes(q) || email.includes(q) || phone.includes(q);
        })
      : base;

    const byFilter =
      motoboyFilter === 'all'
        ? withQuery
        : motoboyFilter === 'free'
        ? withQuery.filter((l) => !l.busy && l.active)
        : motoboyFilter === 'busy'
        ? withQuery.filter((l) => Boolean(l.busy) && l.active)
        : motoboyFilter === 'inactive'
        ? withQuery.filter((l) => !l.active)
        : withQuery.filter((l) => docsPendingCount(documentsByMotoboy[l.motoboyId] || []) > 0);

    return byFilter;
  }, [documentsByMotoboy, motoboyFilter, motoboyQuery, motoboys, showInactive]);

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

  const formatVehicleLine = (profile: any) => {
    if (!profile) return '';
    const type = String(profile?.vehicleType || '').trim();
    const plate = String(profile?.vehiclePlate || '').trim();
    const model = String(profile?.vehicleModel || '').trim();
    const color = String(profile?.vehicleColor || '').trim();
    const city = String(profile?.city || '').trim();
    const state = String(profile?.state || '').trim();

    const bits: string[] = [];
    if (type) bits.push(type === 'MOTO' ? 'Moto' : type === 'CARRO' ? 'Carro' : type);
    if (plate) bits.push(plate);
    if (model) bits.push(model);
    if (color) bits.push(color);
    const loc = [city, state].filter(Boolean).join('/');
    if (loc) bits.push(loc);
    return bits.join(' • ');
  };

  const openReuploadDocModal = (motoboyIdToRequest: string, documentId: string, docType?: string) => {
    setReuploadDocTarget({ motoboyId: motoboyIdToRequest, documentId, docType });
    setReuploadDocReason('');
    setReuploadDocOpen(true);
  };

  const submitReuploadDoc = async () => {
    if (!storeId || !reuploadDocTarget?.motoboyId || !reuploadDocTarget?.documentId) return;
    if (reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      const reason = String(reuploadDocReason || '').trim() || null;
      await motoboyAdminService.requestDocumentReupload(storeId, reuploadDocTarget.motoboyId, reuploadDocTarget.documentId, reason);
      showToast('Pedido de reenvio enviado.', 'success');
      setReuploadDocOpen(false);
      setReuploadDocTarget(null);
      await loadDocuments(reuploadDocTarget.motoboyId);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível pedir reenvio.', 'error');
    } finally {
      setReviewSubmitting(false);
    }
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
      const list = Array.isArray(data) ? data : [];
      setRequests(list);

      const ids = Array.from(
        new Set(
          list
            .filter((r: any) => String(r?.status || '').toUpperCase() === 'PENDING')
            .map((r: any) => String(r?.motoboyId || '').trim())
            .filter(Boolean)
        )
      );

      // Prefetch docs for pending requests (small batch) to show KYC status + chips without extra clicks.
      for (const id of ids.slice(0, 6)) {
        if (documentsByMotoboy[id]) continue;
        // eslint-disable-next-line no-await-in-loop
        await loadDocuments(id);
      }
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível carregar solicitações.', 'error');
    }
  };

  const loadReviewSummary = async () => {
    if (!storeId) return;
    try {
      const [data, reviews] = await Promise.all([
        orderService.getReviewSummaryByStore(storeId),
        orderService.listReviewsByStore(storeId, 300),
      ]);
      setReviewSummary(data || null);
      const rows = Array.isArray(data?.motoboy) ? data.motoboy : [];
      const byId: Record<string, any> = {};
      rows.forEach((row: any) => {
        const id = String(row?.motoboyId || '').trim();
        if (!id) return;
        byId[id] = row;
      });
      setMotoboyReviewMap(byId);

      const reviewRows = Array.isArray(reviews) ? reviews : [];
      const tipRows = reviewRows.filter((r: any) => Number(r?.tipAmount ?? r?.tip_amount ?? 0) > 0);
      const paidRows = tipRows.filter((r: any) => String(r?.tipStatus ?? r?.tip_status ?? '').toUpperCase() === 'PAID');
      const pendingRows = tipRows.filter((r: any) => String(r?.tipStatus ?? r?.tip_status ?? '').toUpperCase() === 'PENDING');
      const paidAmount = paidRows.reduce((acc: number, r: any) => acc + Number(r?.tipAmount ?? r?.tip_amount ?? 0), 0);
      const pendingAmount = pendingRows.reduce((acc: number, r: any) => acc + Number(r?.tipAmount ?? r?.tip_amount ?? 0), 0);
      const tipOrders = tipRows.length;
      const avgTipAmount = tipOrders > 0 ? (paidAmount + pendingAmount) / tipOrders : 0;

      setTipsOverview({
        paidAmount,
        pendingAmount,
        tipOrders,
        paidTipOrders: paidRows.length,
        pendingTipOrders: pendingRows.length,
        avgTipAmount,
      });
    } catch {
      setReviewSummary(null);
      setMotoboyReviewMap({});
      setTipsOverview({
        paidAmount: 0,
        pendingAmount: 0,
        tipOrders: 0,
        paidTipOrders: 0,
        pendingTipOrders: 0,
        avgTipAmount: 0,
      });
    }
  };

  const loadTipPayouts = async () => {
    if (!storeId) return;
    setTipPayoutsLoading(true);
    try {
      const rows = await orderService.listTipPayoutsByStore(storeId, 300);
      setTipPayoutRows(Array.isArray(rows) ? rows : []);
    } catch {
      setTipPayoutRows([]);
    } finally {
      setTipPayoutsLoading(false);
    }
  };

  const openPayoutModal = (row: any) => {
    setPayoutModal({
      open: true,
      row,
      notes: String(row?.tipPayoutNotes || ''),
      proofFile: null,
      submitting: false,
    });
  };

  const submitPayout = async () => {
    if (!storeId || !payoutModal?.row?.id || payoutModal.submitting) return;
    setPayoutModal((prev) => ({ ...prev, submitting: true }));
    try {
      let payoutProofFile: string | null = null;
      if (payoutModal.proofFile) {
        payoutProofFile = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error('Falha ao ler comprovante.'));
          reader.onload = () => resolve(String(reader.result || ''));
          reader.readAsDataURL(payoutModal.proofFile as File);
        });
      }
      await orderService.markTipPayoutByStore(storeId, payoutModal.row.id, {
        payoutStatus: 'PAID',
        payoutNotes: payoutModal.notes || null,
        payoutProofFile,
      });
      showToast('Repasse marcado como pago.', 'success');
      setPayoutModal({ open: false, row: null, notes: '', proofFile: null, submitting: false });
      await Promise.all([loadReviewSummary(), loadTipPayouts()]);
    } catch (error: any) {
      setPayoutModal((prev) => ({ ...prev, submitting: false }));
      showToast(error?.message || 'Não foi possível concluir o repasse.', 'error');
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
            {src && isImageFile(src) ? (
              <img
                src={src}
                alt={docType}
                className="w-full h-36 object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                loading="lazy"
              />
            ) : src && isPdfFile(src) ? (
              <div className="h-36 flex items-center justify-center bg-slate-100 text-[11px] font-bold text-slate-700">
                CRLV em PDF
              </div>
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
            {src ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openReuploadDocModal(motoboyId, doc.id, docType);
                }}
                className="btn-press px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-amber-200 bg-amber-50 text-amber-900"
                title="Pedir reenvio (com motivo)"
              >
                Pedir reenvio
              </button>
            ) : null}
            {String(doc?.status || '').toUpperCase() === 'APPROVED' ? (
              <span className="text-[11px] text-emerald-700 font-semibold">OK</span>
            ) : (
              <span className="text-[11px] text-slate-500">Analisar</span>
            )}
          </div>
        </div>
      </button>
    );
  };

  const getMotoboyRegisterUrl = () => {
    try {
      return `${window.location.origin}/motoboy/register`;
    } catch {
      return '/motoboy/register';
    }
  };

  const copyMotoboyRegisterUrl = async () => {
    const url = getMotoboyRegisterUrl();
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copiado.', 'success');
    } catch {
      try {
        // fallback
        const el = document.createElement('textarea');
        el.value = url;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        showToast('Link copiado.', 'success');
      } catch {
        showToast('Não foi possível copiar o link.', 'error');
      }
    }
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
    loadReviewSummary();
    loadTipPayouts();
  }, [storeId]);

  if (!storeId) {
    return <div className="p-6">Carregando loja...</div>;
  }

  return (
    <div className="space-y-6">
      {reviewSummary && (
        <FormSection title="Avaliações" variant="success" contentClassName="space-y-2">
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-[11px] text-slate-500">Nota da loja (média)</div>
              <div className="text-lg font-black text-slate-900">
                {Number(reviewSummary?.summary?.store_avg_rating || 0).toFixed(1)} ★
              </div>
              <div className="text-[11px] text-slate-500">
                {Number(reviewSummary?.summary?.total_reviews || 0)} avaliações
                {Number(reviewSummary?.summary?.total_reviews || 0) < 10 ? ' · amostra baixa' : ''}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-[11px] text-slate-500">Entrega (motoboys)</div>
              <div className="text-lg font-black text-slate-900">
                {Number(reviewSummary?.summary?.delivery_avg_rating || 0).toFixed(1)} ★
              </div>
              <div className="text-[11px] text-slate-500">
                {Number(reviewSummary?.summary?.total_delivery_reviews || 0)} avaliações
                {Number(reviewSummary?.summary?.total_delivery_reviews || 0) < 10 ? ' · amostra baixa' : ''}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <div className="text-[11px] text-emerald-700">Gorjetas pagas (acumulado)</div>
              <div className="text-lg font-black text-emerald-700">
                R$ {Number(tipsOverview.paidAmount || 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-emerald-700/80">{tipsOverview.paidTipOrders} pagamento(s)</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <div className="text-[11px] text-amber-700">Gorjetas pendentes</div>
              <div className="text-lg font-black text-amber-700">
                R$ {Number(tipsOverview.pendingAmount || 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-amber-700/80">{tipsOverview.pendingTipOrders} pendente(s)</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-[11px] text-slate-500">Ticket médio de gorjeta</div>
              <div className="text-lg font-black text-slate-900">
                R$ {Number(tipsOverview.avgTipAmount || 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500">
                {Number(reviewSummary?.summary?.total_delivery_reviews || 0) > 0
                  ? `${((tipsOverview.tipOrders / Number(reviewSummary?.summary?.total_delivery_reviews || 1)) * 100).toFixed(1)}% dos pedidos avaliados`
                  : 'Sem base de comparação'}
              </div>
            </div>
          </div>
        </FormSection>
      )}

      <FormSection
        title="Repasse de gorjetas"
        subtitle="Controle de pendentes e pagos com comprovante."
        variant="warning"
        actions={
          <button
            type="button"
            onClick={loadTipPayouts}
            className="btn-press rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700"
          >
            {tipPayoutsLoading ? 'Atualizando...' : 'Atualizar'}
          </button>
        }
      >
        {tipPayoutsLoading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">Carregando repasses...</div>
        ) : tipPayoutRows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Ainda não há gorjetas pagas para repasse.
          </div>
        ) : (
          <div className="grid gap-2">
            {tipPayoutRows.slice(0, 40).map((row: any, idx: number) => {
              const payoutStatus = String(row?.tipPayoutStatus || '').toUpperCase() === 'PAID' ? 'PAID' : 'PENDING';
              return (
                <div key={String(row?.id || `tip-payout-${idx}`)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 break-words">{row?.motoboyName || 'Entregador'}</div>
                      <div className="text-[11px] text-slate-500">
                        Pedido #{String(row?.orderId || '').slice(0, 8)} · Cliente: {row?.customerName || '-'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Gorjeta paga em: {formatDateTime(row?.tipPaidAt)} · Repasse: {payoutStatus === 'PAID' ? formatDateTime(row?.tipPayoutAt) : 'pendente'}
                      </div>
                      {row?.tipPayoutNotes ? (
                        <div className="mt-1 text-[11px] text-slate-600 break-words">
                          <span className="font-semibold">Observação:</span> {String(row.tipPayoutNotes)}
                        </div>
                      ) : null}
                      {row?.tipPayoutProofUrl ? (
                        <a
                          href={resolveAssetUrl(String(row.tipPayoutProofUrl)) || String(row.tipPayoutProofUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex text-[11px] font-extrabold text-brand-primary underline"
                        >
                          Ver comprovante
                        </a>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      <div className="text-base font-black text-slate-900">{formatCurrency(row?.tipAmount || 0)}</div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                          payoutStatus === 'PAID'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                      >
                        {payoutStatus === 'PAID' ? 'Repassado' : 'Aguardando repasse'}
                      </span>
                      {payoutStatus !== 'PAID' ? (
                        <button
                          type="button"
                          onClick={() => openPayoutModal(row)}
                          className="btn-press rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-extrabold text-emerald-800"
                        >
                          Marcar pago
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FormSection>

      {payoutModal.open && payoutModal.row ? (
        <div
          className="fixed inset-0 z-[96] bg-black/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !payoutModal.submitting && setPayoutModal({ open: false, row: null, notes: '', proofFile: null, submitting: false })}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Repasse da gorjeta</div>
              <div className="text-base font-black text-slate-900">{payoutModal.row?.motoboyName || 'Entregador'}</div>
              <div className="text-xs text-slate-500">
                Pedido #{String(payoutModal.row?.orderId || '').slice(0, 8)} · Valor {formatCurrency(payoutModal.row?.tipAmount || 0)}
              </div>
            </div>
            <textarea
              value={payoutModal.notes}
              onChange={(event) => setPayoutModal((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Observação do repasse (opcional)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[84px]"
              maxLength={240}
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <label className="text-xs font-semibold text-slate-700">
                Comprovante (opcional)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setPayoutModal((prev) => ({ ...prev, proofFile: event.target.files?.[0] || null }))}
                  className="mt-1 block text-[11px] text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-900 file:px-2.5 file:py-1.5 file:text-[11px] file:font-semibold file:text-white"
                />
              </label>
              {payoutModal.proofFile ? (
                <div className="mt-1 text-[11px] text-slate-600 break-all">{payoutModal.proofFile.name}</div>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPayoutModal({ open: false, row: null, notes: '', proofFile: null, submitting: false })}
                disabled={payoutModal.submitting}
                className="btn-press rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitPayout}
                disabled={payoutModal.submitting}
                className="btn-press rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-800 disabled:opacity-60"
              >
                {payoutModal.submitting ? 'Salvando...' : 'Confirmar repasse'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {docsModalOpen && docsModalMotoboyId && (
        <div
          className="fixed inset-0 z-[89] bg-black/60 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setDocsModalOpen(false)}
        >
          <div
            className="w-full max-w-5xl rounded-3xl bg-white border border-slate-200 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 flex items-start justify-between gap-3 border-b border-slate-100">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Documentos</p>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">{docsModalTitle || 'Entregador'}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {docChip(documentsByMotoboy[docsModalMotoboyId] || [], 'CNH')}
                  {docChip(documentsByMotoboy[docsModalMotoboyId] || [], 'SELFIE')}
                  {docChip(documentsByMotoboy[docsModalMotoboyId] || [], 'CRLV')}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 shrink-0">
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

            <div className="p-4 sm:p-5 overflow-auto">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                {docsLoadingId === docsModalMotoboyId
                  ? 'Carregando documentos...'
                  : 'KYC aprovado pela plataforma. Se alguma foto estiver ruim, peça reenvio (com motivo).'}
                </div>
                <div className="flex items-center gap-2">
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

            <div className="sm:hidden border-t border-slate-200 bg-white/85 backdrop-blur px-4 py-3 flex items-center justify-between gap-2">
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
                <p className="text-xs font-extrabold text-slate-800">Pedir reenvio de documentos</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Se o problema for documento (foto escura, ilegível, arquivo errado), marque aqui para o entregador reenviar.
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

      {reuploadDocOpen && (
        <div
          className="fixed inset-0 z-[91] bg-black/60 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (reviewSubmitting) return;
            setReuploadDocOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-5 border border-slate-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Reenvio</p>
                <h2 className="text-lg font-black text-slate-900">Pedir reenvio do documento</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {reuploadDocTarget?.docType ? <span className="font-semibold">{reuploadDocTarget.docType}</span> : 'Documento'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (reviewSubmitting) return;
                  setReuploadDocOpen(false);
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
                      onClick={() => setReuploadDocReason((prev) => (prev ? `${prev}\n${chip}` : chip))}
                      className="btn-press rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-extrabold text-slate-700"
                      title="Adicionar motivo"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reuploadDocReason}
                  onChange={(e) => setReuploadDocReason(e.target.value)}
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
                    setReuploadDocOpen(false);
                  }}
                  className="btn-press rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-800"
                  disabled={reviewSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitReuploadDoc}
                  className="btn-press rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(245,158,11,0.8)] disabled:opacity-50"
                  disabled={reviewSubmitting}
                >
                  {reviewSubmitting ? 'Enviando...' : 'Pedir reenvio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FormSection
        title="Entregadores"
        subtitle="Solicitações, documentos e vínculo por loja."
        variant="neutral"
        className="bg-gradient-to-br from-white via-slate-50 to-white"
      />

      <FormSection
        title="Link de cadastro"
        subtitle="Convide entregadores para sua loja. Copie e envie no WhatsApp."
        variant="primary"
        className="premium-card overflow-hidden"
        contentClassName="space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-black text-slate-900">Convide entregadores para sua loja</div>
            <div className="text-xs text-slate-600 mt-1">O motoboy faz o cadastro e solicita o vínculo.</div>
          </div>
          <div className="shrink-0 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyMotoboyRegisterUrl}
              className="btn-press rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(16,185,129,0.55)]"
            >
              Copiar link
            </button>
            <a
              href={getMotoboyRegisterUrl()}
              target="_blank"
              rel="noreferrer"
              className="btn-press rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-800"
            >
              Abrir
            </a>
          </div>
        </div>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 break-all">
          {getMotoboyRegisterUrl()}
        </div>
      </FormSection>

      <FormSection
        title="Solicitações de vínculo"
        subtitle="Motoboys que pediram para entrar na sua loja."
        variant="warning"
        className="premium-card p-0 overflow-hidden"
        contentClassName="space-y-0"
      >
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
          <div className="p-4 grid gap-3 bg-[linear-gradient(180deg,rgba(248,250,252,0.85),rgba(255,255,255,1))]">
            {pendingRequests.map((request) => {
              const requestDocs = request.motoboyId ? documentsByMotoboy[request.motoboyId] : null;
              const requestKyc = requestDocs ? kycSummary(requestDocs) : null;
              const canApprove = Boolean(requestKyc?.ok);
              return (
                <div
                  key={request.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-3 shadow-[0_26px_60px_-48px_rgba(15,23,42,0.35)]"
                  style={{ borderLeftWidth: 6, borderLeftColor: 'rgb(245 158 11)' }}
                >
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <AdaptiveAvatar
                      src={request.motoboyUser?.profileImageUrl ? resolveAssetUrl(request.motoboyUser.profileImageUrl) : ''}
                      alt={request.motoboyUser?.fullName || 'Entregador'}
                      fallbackText={String(request?.motoboyUser?.fullName || 'E')}
                      sizeClassName="h-16 w-16"
                      imageClassName="object-[center_18%]"
                      containerClassName="text-slate-800 bg-gradient-to-br from-slate-50 to-white shadow-[0_18px_32px_-22px_rgba(15,23,42,0.55)]"
                    />
                    <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900">
                      {request.motoboyUser?.fullName || 'Entregador'}
                    </p>
                    <p className="text-xs text-slate-500">{request.motoboyUser?.email || '-'}</p>
                    {request.motoboyUser?.phone && (
                      <p className="text-xs text-slate-500">{request.motoboyUser.phone}</p>
                    )}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                    {request.status || 'PENDING'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => reviewRequest(request.id, 'approve')}
                    disabled={!canApprove}
                    title={!canApprove ? 'Aguarde o KYC ser aprovado pela plataforma para concluir o vínculo.' : 'Aprovar vínculo'}
                    className={[
                      'btn-press px-3 py-2 rounded-xl text-xs font-extrabold',
                      canApprove
                        ? 'bg-emerald-600 text-white shadow-[0_22px_48px_-34px_rgba(16,185,129,0.6)]'
                        : 'bg-slate-200 text-slate-600 shadow-none cursor-not-allowed',
                    ].join(' ')}
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
                {!canApprove ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    Aguardando aprovação do KYC pela plataforma (SUPER_ADMIN).
                  </div>
                ) : null}

                {!!request.motoboyId && Array.isArray(documentsByMotoboy[request.motoboyId]) && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    {kycPill(documentsByMotoboy[request.motoboyId] || [])}
                    {docChip(documentsByMotoboy[request.motoboyId] || [], 'CNH')}
                    {docChip(documentsByMotoboy[request.motoboyId] || [], 'SELFIE')}
                    {docChip(documentsByMotoboy[request.motoboyId] || [], 'CRLV')}
                  </div>
                )}
                </div>
              );
            })}
          </div>
        )}
      </FormSection>

      <FormSection
        title="Entregadores vinculados"
        subtitle="Status, documentos e vínculo por loja."
        variant="primary"
        className="premium-card p-0 overflow-hidden"
        contentClassName="space-y-0"
      >
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

        <div className="px-4 pt-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative flex-1">
                <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={motoboyQuery}
                  onChange={(e) => setMotoboyQuery(e.target.value)}
                  placeholder="Buscar por nome, email ou telefone..."
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                />
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700">
                  <FunnelSimple size={16} weight="duotone" />
                  Filtros
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMotoboyQuery('');
                    setMotoboyFilter('all');
                    setShowInactive(false);
                  }}
                  className="btn-press px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700"
                >
                  Limpar
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'free', label: 'Livres' },
                { id: 'busy', label: 'Ocupados' },
                { id: 'docs_pending', label: 'Docs pendentes' },
                { id: 'inactive', label: 'Inativos' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setMotoboyFilter(f.id as any)}
                  className={[
                    'btn-press px-3 py-1.5 rounded-full text-[11px] font-extrabold border',
                    motoboyFilter === f.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowInactive((prev) => !prev)}
                className={[
                  'btn-press px-3 py-1.5 rounded-full text-[11px] font-extrabold border flex items-center gap-2',
                  showInactive ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-white text-slate-700 border-slate-200',
                ].join(' ')}
                title="Alterna exibição de vínculos inativos no conjunto base"
              >
                <span>Inativos no base</span>
                <span className="text-[10px] opacity-80">{showInactive ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-4 py-4 text-sm text-slate-600">Carregando...</div>
        ) : filteredMotoboys.length === 0 ? (
          <div className="px-4 py-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Nenhum entregador vinculado ainda.
            </div>
          </div>
        ) : (
          <div className="p-4 grid gap-3 md:grid-cols-2 bg-[linear-gradient(180deg,rgba(236,253,245,0.55),rgba(255,255,255,1))]">
            {filteredMotoboys.map((link) => (
              <div
                key={link.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-3 overflow-hidden shadow-[0_26px_60px_-48px_rgba(15,23,42,0.35)]"
                style={{
                  borderLeftWidth: 6,
                  borderLeftColor: link.active ? (link.busy ? 'rgb(245 158 11)' : 'rgb(16 185 129)') : 'rgb(244 63 94)',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <AdaptiveAvatar
                      src={link.motoboyUser?.profileImageUrl ? resolveAssetUrl(link.motoboyUser.profileImageUrl) : ''}
                      alt={link.motoboyUser?.fullName || 'Entregador'}
                      fallbackText={String(link?.motoboyUser?.fullName || 'E')}
                      sizeClassName="h-16 w-16"
                      imageClassName="object-[center_18%]"
                      containerClassName="text-slate-800 bg-gradient-to-br from-slate-50 to-white shadow-[0_18px_32px_-22px_rgba(15,23,42,0.55)]"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 break-words">
                      {link.motoboyUser?.fullName || 'Entregador'}
                    </p>
                    <p className="text-xs text-slate-500 break-all">{link.motoboyUser?.email || '-'}</p>
                    {link.motoboyUser?.phone && (
                      <p className="text-xs text-slate-500 break-all">{link.motoboyUser.phone}</p>
                    )}
                    {formatVehicleLine(link.motoboyProfile) ? (
                      <p className="text-[11px] text-slate-600 mt-1 break-words">{formatVehicleLine(link.motoboyProfile)}</p>
                    ) : null}
                    {link?.motoboyProfile?.pixKey ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold text-slate-500">PIX (CPF):</span>
                        <code className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 break-all">
                          {String(link.motoboyProfile.pixKey)}
                        </code>
                      </div>
                    ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                      {formatMotoboyStatus(link.motoboyStatus)}
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
                {motoboyReviewMap[link.motoboyId] ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 flex flex-wrap items-center gap-2">
                    <span className="font-extrabold">
                      Nota entrega: {Number(motoboyReviewMap[link.motoboyId]?.avgDeliveryRating || 0).toFixed(1)} ★
                    </span>
                    <span className="text-slate-500">
                      ({Number(motoboyReviewMap[link.motoboyId]?.totalReviews || 0)} avaliações)
                    </span>
                    <span className="ml-auto font-semibold text-emerald-700">
                      Gorjetas: R$ {Number(motoboyReviewMap[link.motoboyId]?.totalTips || 0).toFixed(2)}
                    </span>
                  </div>
                ) : null}
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
                    className="btn-press w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 bg-white text-[11px] font-extrabold text-slate-700"
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
                      className="btn-press w-full sm:w-auto px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-extrabold text-emerald-800"
                    >
                      Reativar vínculo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleUnlink(link.motoboyId)}
                    className="btn-press w-full sm:w-auto px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-xs font-extrabold text-rose-700"
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
      </FormSection>

      {previewDoc && (
        <div
          className="fixed inset-0 z-[95] bg-black/60 flex items-center justify-center p-4"
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
              {previewDoc?._motoboyId ? (
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => openReuploadDocModal(previewDoc._motoboyId, previewDoc.id, previewDoc?.docType)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-extrabold"
                  >
                    Pedir reenvio
                  </button>
                  <span className="text-xs text-slate-500 font-semibold">Validação feita pela plataforma.</span>
                </div>
              ) : null}
            </div>
            {previewDoc.fileKey && isImageFile(previewDoc.fileKey) ? (
              <img
                src={previewDoc.fileKey}
                alt={previewDoc.docType}
                className="w-full max-h-[70vh] object-contain rounded-xl border border-slate-200"
              />
            ) : previewDoc.fileKey && isPdfFile(previewDoc.fileKey) ? (
              <iframe
                src={previewDoc.fileKey}
                title={previewDoc.docType || 'Documento'}
                className="w-full h-[70vh] rounded-xl border border-slate-200 bg-white"
              />
            ) : previewDoc.fileKey ? (
              <div className="p-8 text-center text-sm text-slate-500">Arquivo sem prévia embutida. Use "Abrir em nova aba".</div>
            ) : (
              <div className="p-8 text-center text-sm text-slate-500">Sem imagem.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
