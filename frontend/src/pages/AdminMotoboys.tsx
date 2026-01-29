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
  const [loading, setLoading] = useState(false);
  const storeId = auth?.store?.id || '';
  const pendingRequests = requests.filter((request) => request.status === 'PENDING');

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
        await motoboyAdminService.rejectRequest(storeId, requestId);
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
        await motoboyAdminService.rejectDocument(storeId, motoboyIdToReview, documentId);
      }
      showToast('Documento atualizado.', 'success');
      loadDocuments(motoboyIdToReview);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível atualizar o documento.', 'error');
    }
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
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                    {request.status || 'PENDING'}
                  </span>
                </div>
                <div className="flex gap-2">
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
                </div>
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
        ) : motoboys.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum entregador vinculado ainda.</p>
        ) : (
          <div className="grid gap-3">
            {motoboys.map((link) => (
              <div key={link.id} className="rounded-xl border border-slate-100 p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {link.motoboyUser?.fullName || 'Entregador'}
                    </p>
                    <p className="text-xs text-slate-500">{link.motoboyUser?.email || '-'}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                    {link.motoboyStatus || 'PENDING'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap gap-2">
                  <span>ID: {link.motoboyId}</span>
                  <span>Vínculo: {link.active ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => loadDocuments(link.motoboyId)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600"
                  >
                    {docsLoadingId === link.motoboyId ? 'Carregando documentos...' : 'Ver documentos'}
                  </button>
                </div>
                {Array.isArray(documentsByMotoboy[link.motoboyId]) && documentsByMotoboy[link.motoboyId].length > 0 && (
                  <div className="mt-2 space-y-2">
                    {documentsByMotoboy[link.motoboyId].map((doc: any) => (
                      <div key={doc.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                        <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-700">{doc.docType || 'DOC'}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700">
                                {doc.status || 'PENDING'}
                              </span>
                            </div>
                            <a
                              href={doc.fileKey}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-primary underline"
                            >
                              Ver arquivo
                            </a>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleReviewDocument(link.motoboyId, doc.id, 'approve')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-semibold"
                              >
                                Aprovar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewDocument(link.motoboyId, doc.id, 'reject')}
                                className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-semibold"
                              >
                                Rejeitar
                              </button>
                            </div>
                          </div>
                          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-2 flex items-center justify-center">
                            {doc.fileKey ? (
                              <img
                                src={doc.fileKey}
                                alt={doc.docType}
                                className="w-full h-28 object-cover rounded-lg border border-slate-200"
                              />
                            ) : (
                              <span className="text-[11px] text-slate-400">Sem prévia</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
