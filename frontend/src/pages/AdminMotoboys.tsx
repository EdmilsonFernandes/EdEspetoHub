import { useEffect, useState } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const storeId = auth?.store?.id || '';
  const pendingRequests = requests.filter((request) => request.status === 'PENDING');
  const filteredMotoboys = showInactive ? motoboys : motoboys.filter((link) => link.active);

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

  const askReason = (title: string) => {
    const raw = window.prompt(`${title}\n\nOpcional: informe um motivo para ajudar o entregador a corrigir.`, '');
    if (raw === null) return { cancelled: true as const, reason: null as string | null };
    const reason = String(raw || '').trim();
    return { cancelled: false as const, reason: reason || null };
  };

  const askRejectDocs = () => {
    const raw = window.prompt(
      'Quais documentos deseja RECUSAR junto com a solicitação?\n\nEx: CRLV (ou CNH,SELFIE,CRLV)\nDeixe vazio para não recusar documentos agora.',
      'CRLV'
    );
    if (raw === null) return { cancelled: true as const, rejectDocs: null as string[] | null };
    const list = String(raw || '')
      .split(',')
      .map((x) => String(x || '').trim().toUpperCase())
      .filter(Boolean);
    const normalized = Array.from(new Set(list)).filter((x) => x === 'CNH' || x === 'SELFIE' || x === 'CRLV');
    return { cancelled: false as const, rejectDocs: normalized.length > 0 ? normalized : null };
  };

  const reviewRequest = async (requestId: string, status: 'approve' | 'reject') => {
    if (!storeId) return;
    try {
      if (status === 'approve') {
        await motoboyAdminService.approveRequest(storeId, requestId);
      } else {
        const { cancelled, reason } = askReason('Rejeitar solicitação de vínculo?');
        if (cancelled) return;
        const { cancelled: cancelledDocs, rejectDocs } = askRejectDocs();
        if (cancelledDocs) return;
        await motoboyAdminService.rejectRequest(storeId, requestId, reason, rejectDocs);
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

  const handleReviewDocument = async (motoboyIdToReview: string, documentId: string, status: 'approve' | 'reject') => {
    if (!storeId) return;
    try {
      if (status === 'approve') {
        await motoboyAdminService.approveDocument(storeId, motoboyIdToReview, documentId);
      } else {
        const { cancelled, reason } = askReason('Rejeitar documento?');
        if (cancelled) return;
        await motoboyAdminService.rejectDocument(storeId, motoboyIdToReview, documentId, reason);
      }
      showToast('Documento atualizado.', 'success');
      loadDocuments(motoboyIdToReview);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível atualizar o documento.', 'error');
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

  useEffect(() => {
    loadMotoboys();
    loadRequests();
  }, [storeId]);

  if (!storeId) {
    return <div className="p-6">Carregando loja...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Entregadores</h1>
        <p className="text-sm text-slate-500">Acompanhe solicitações e gerencie entregadores ativos.</p>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        Entregadores fazem o cadastro pelo link <span className="font-semibold">/motoboy/register</span> e solicitam vínculo com sua loja.
      </div>

      <div className="premium-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">Solicitações de vínculo</p>
            <p className="text-xs text-slate-500">Motoboys que pediram para entrar na sua loja.</p>
          </div>
          {pendingRequests.length > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
              {pendingRequests.length} pendente{pendingRequests.length === 1 ? '' : 's'}
            </span>
          )}
          <button
            type="button"
            onClick={loadRequests}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600"
          >
            Atualizar
          </button>
        </div>
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma solicitação pendente.</p>
        ) : (
          <div className="grid gap-3">
            {pendingRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-100 p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
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
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-semibold"
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewRequest(request.id, 'reject')}
                    className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-semibold"
                  >
                    Rejeitar
                  </button>
                  {!!request.motoboyId && (
                    <button
                      type="button"
                      onClick={() => loadDocuments(request.motoboyId)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600"
                    >
                      {docsLoadingId === request.motoboyId ? 'Carregando documentos...' : 'Ver documentos'}
                    </button>
                  )}
                </div>

                {!!request.motoboyId &&
                  Array.isArray(documentsByMotoboy[request.motoboyId]) &&
                  documentsByMotoboy[request.motoboyId].length > 0 && (
                    <div className="mt-3">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {documentsByMotoboy[request.motoboyId].map((doc: any) => (
                          <div key={doc.id}>{docThumb(doc, request.motoboyId)}</div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="premium-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">Entregadores vinculados</p>
            <p className="text-xs text-slate-500">Status e vínculo por loja.</p>
          </div>
          <button
            type="button"
            onClick={loadMotoboys}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600"
          >
            Atualizar
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : filteredMotoboys.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum entregador vinculado ainda.</p>
        ) : (
          <div className="grid gap-3">
            {filteredMotoboys.map((link) => (
              <div key={link.id} className="rounded-xl border border-slate-100 p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
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
                    {documentsByMotoboy[link.motoboyId].filter((doc: any) => doc.status !== 'APPROVED').length > 0 ? (
                      <span className="text-amber-700">
                        Documentos pendentes: {documentsByMotoboy[link.motoboyId].filter((doc: any) => doc.status !== 'APPROVED').length}
                      </span>
                    ) : (
                      <span className="text-emerald-700">Documentos aprovados.</span>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => loadDocuments(link.motoboyId)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600"
                  >
                    {docsLoadingId === link.motoboyId ? 'Carregando documentos...' : 'Ver documentos'}
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
                      className="px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-semibold text-emerald-700"
                    >
                      Reativar vínculo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleUnlink(link.motoboyId)}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600"
                  >
                    Remover vínculo
                  </button>
                </div>
                {Array.isArray(documentsByMotoboy[link.motoboyId]) && documentsByMotoboy[link.motoboyId].length > 0 && (
                  <div className="mt-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {documentsByMotoboy[link.motoboyId].map((doc: any) => (
                        <div key={doc.id}>{docThumb(doc, link.motoboyId)}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span>Mostrar vínculos inativos</span>
          <button
            type="button"
            onClick={() => setShowInactive((prev) => !prev)}
            className={`px-3 py-1 rounded-full text-[10px] font-semibold border ${
              showInactive ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {showInactive ? 'Visível' : 'Oculto'}
          </button>
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
                    onClick={() => handleReviewDocument(previewDoc._motoboyId, previewDoc.id, 'reject')}
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
