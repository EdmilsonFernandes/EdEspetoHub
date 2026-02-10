import { useEffect, useMemo, useState } from 'react';
import { motoboyService } from '../services/motoboyService';
import { storeService } from '../services/storeService';
import { useToast } from '../contexts/ToastContext';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';
import { CameraCaptureModal } from '../components/Motoboy/CameraCaptureModal';
import { DocPreviewModal } from '../components/Motoboy/DocPreviewModal';
import { formatMotoboyAccountStatus } from '../utils/motoboyStatus';

export function MotoboyProfile() {
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [refreshingDocs, setRefreshingDocs] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [profileDraft, setProfileDraft] = useState<any>({
    vehicleType: '',
    vehiclePlate: '',
    vehicleModel: '',
    vehicleColor: '',
    city: '',
    state: '',
    address: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraDocType, setCameraDocType] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ title: string; src: string | null } | null>(null);
  const [notifyOrders, setNotifyOrders] = useState(() => {
    const raw = localStorage.getItem('motoboy:notify_orders');
    if (raw === null) return true;
    return raw === '1';
  });
  const { showToast } = useToast();

  const documentTypes = useMemo(() => {
    const v = String(profileDraft.vehicleType || profile?.vehicleType || '').toUpperCase();
    const crlvHelp =
      v === 'MOTO' || v === 'CARRO' || v === 'OUTRO'
        ? 'Obrigatório para validar o veículo.'
        : 'Opcional.';
    return [
      { key: 'CNH', label: 'CNH', help: 'Foto frente e verso em um único arquivo.' },
      { key: 'SELFIE', label: 'Selfie segurando a CNH', help: 'Foto clara do rosto com o documento.' },
      { key: 'CRLV', label: 'Documento do veículo (CRLV)', help: crlvHelp },
    ];
  }, [profileDraft.vehicleType, profile?.vehicleType]);
  const requiredDocs = useMemo(() => {
    const v = String(profileDraft.vehicleType || profile?.vehicleType || '').toUpperCase();
    const base = [ 'CNH', 'SELFIE' ];
    if (v === 'MOTO' || v === 'CARRO' || v === 'OUTRO') return [ ...base, 'CRLV' ];
    return base;
  }, [profileDraft.vehicleType, profile?.vehicleType]);

  useEffect(() => {
    const loadStores = async () => {
      try {
        const data = await storeService.listPortfolio();
        setStores(Array.isArray(data) ? data : []);
      } catch (error: any) {
        showToast(error?.message || 'Não foi possível carregar lojas.', 'error');
      }
    };
    loadStores();
  }, [showToast]);

  const loadRequests = async () => {
    try {
      const data = await motoboyService.listStoreRequests();
      setRequests(Array.isArray(data) ? data : []);
      setBlocked(false);
    } catch (error: any) {
      if (error?.status === 403) setBlocked(true);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    // initial load
    (async () => {
      try {
        const data = await motoboyService.listDocuments();
        setDocuments(Array.isArray(data) ? data : []);
      } catch {
        // ignore
      }
    })();
  }, []);

  const refreshDocuments = async () => {
    setRefreshingDocs(true);
    try {
      const data = await motoboyService.listDocuments();
      setDocuments(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setRefreshingDocs(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await motoboyService.getProfile();
        setProfile(data || null);
        setProfileDraft({
          vehicleType: data?.vehicleType || '',
          vehiclePlate: data?.vehiclePlate || '',
          vehicleModel: data?.vehicleModel || '',
          vehicleColor: data?.vehicleColor || '',
          city: data?.city || '',
          state: data?.state || '',
          address: data?.address || '',
        });
      } catch {
        // ignore
      }
    };
    loadProfile();
  }, []);

  const documentsByType = useMemo(() => {
    const map = new Map<string, any>();
    documents.forEach((doc) => {
      const key = (doc.docType || '').toUpperCase();
      if (!map.has(key)) map.set(key, doc);
    });
    return map;
  }, [documents]);

  const shouldPollDocs = useMemo(() => {
    if (!Array.isArray(documents) || documents.length === 0) return false;
    const anyPending = documents.some((d) => String(d?.status || '').toUpperCase() === 'PENDING');
    if (anyPending) return true;
    const selfie = documentsByType.get('SELFIE');
    const faceStatus = String(selfie?.metadata?.face?.status || '').toLowerCase();
    return faceStatus === 'pending' || faceStatus === 'processing';
  }, [documents, documentsByType]);

  useEffect(() => {
    if (!shouldPollDocs) return;
    const id = window.setInterval(() => {
      refreshDocuments().catch(() => null);
    }, 10000);
    return () => window.clearInterval(id);
  }, [shouldPollDocs]);

  const requiredDocStatus = useMemo(() => {
    const missing: string[] = [];
    const rejected: string[] = [];
    const pending: string[] = [];
    const approved: string[] = [];
    for (const key of requiredDocs) {
      const doc = documentsByType.get(key);
      if (!doc) {
        missing.push(key);
        continue;
      }
      const st = String(doc?.status || '').toUpperCase();
      if (st === 'REJECTED') rejected.push(key);
      else if (st === 'PENDING') pending.push(key);
      else if (st === 'APPROVED') approved.push(key);
      else pending.push(key);
    }
    return { missing, rejected, pending, approved };
  }, [documentsByType, requiredDocs]);

  const docsProgress = useMemo(() => {
    const total = requiredDocs.length;
    const approved = requiredDocStatus.approved.length;
    const pending = requiredDocStatus.pending.length;
    const rejected = requiredDocStatus.rejected.length;
    const missing = requiredDocStatus.missing.length;
    return { total, approved, pending, rejected, missing };
  }, [requiredDocs.length, requiredDocStatus]);

  const hasAllRequiredDocs = useMemo(() => requiredDocStatus.missing.length === 0, [requiredDocStatus.missing.length]);

  const hasAnyPendingRequiredDocs = useMemo(() => {
    return requiredDocStatus.pending.length > 0;
  }, [requiredDocStatus.pending.length]);

  const hasAnyRejectedRequiredDocs = useMemo(() => requiredDocStatus.rejected.length > 0, [requiredDocStatus.rejected.length]);

  const hasCompleteProfile = useMemo(() => {
    const v = String(profileDraft.vehicleType || profile?.vehicleType || '').toUpperCase();
    const plate = String(profileDraft.vehiclePlate || profile?.vehiclePlate || '').trim();
    const city = String(profileDraft.city || profile?.city || '').trim();
    const state = String(profileDraft.state || profile?.state || '').trim();
    const address = String(profileDraft.address || profile?.address || '').trim();
    if (!v) return false;
    if ((v === 'MOTO' || v === 'CARRO' || v === 'OUTRO') && plate.length < 7) return false;
    if (!city || !state || state.length !== 2 || !address) return false;
    return true;
  }, [profileDraft, profile]);

  const requiredDocsPending = useMemo(() => {
    return requiredDocs.filter((key) => {
      const doc = documentsByType.get(key);
      return !doc || String(doc.status || '').toUpperCase() !== 'APPROVED';
    });
  }, [documentsByType, requiredDocs]);

  const faceBanner = useMemo(() => {
    const selfie = documentsByType.get('SELFIE');
    const face = selfie?.metadata?.face;
    if (!face) return null;
    const status = String(face.status || '').toLowerCase();
    const label = String(face.scoreLabel || '').toLowerCase();
    const reason = face.reason ? String(face.reason) : '';

    const text =
      status === 'processing'
        ? 'Validacao automatica em analise'
        : label === 'alto'
        ? 'Validacao automatica: alta'
        : label === 'medio'
        ? 'Validacao automatica: media'
        : label === 'baixo'
        ? 'Validacao automatica: baixa (revisao manual recomendada)'
        : status
        ? 'Validacao automatica: indisponivel'
        : null;

    if (!text) return null;
    return { text, reason };
  }, [documentsByType]);

  const anyRejectedRequest = useMemo(() => {
    const rejected = (requests || []).filter((r: any) => String(r?.status || '').toUpperCase() === 'REJECTED');
    if (rejected.length === 0) return null;
    const first = rejected[0];
    return {
      storeName: first?.store?.name || 'uma loja',
      reason: first?.reason ? String(first.reason) : null,
    };
  }, [requests]);

  const vehicleIcon = useMemo(() => {
    const type = String(profileDraft.vehicleType || profile?.vehicleType || '').toUpperCase();
    if (type === 'MOTO') return '🛵';
    if (type === 'BIKE') return '🚲';
    if (type === 'CARRO') return '🚗';
    if (type === 'OUTRO') return '🚚';
    return '🧭';
  }, [profileDraft.vehicleType, profile?.vehicleType]);

  const canStartUpload = (docType: string) => {
    const normalized = String(docType || '').toUpperCase();
    const currentDoc = documentsByType.get(normalized);
    const currentStatus = String(currentDoc?.status || '').toUpperCase();
    const cnhDoc = documentsByType.get('CNH');
    const cnhStatus = String(cnhDoc?.status || '').toUpperCase();

    if (normalized === 'SELFIE' && (!cnhDoc || cnhStatus === 'REJECTED')) return false;
    if (currentDoc && (currentStatus === 'APPROVED' || currentStatus === 'PENDING')) return false;
    return true;
  };

  const uploadDocumentBase64 = async (docType: string, fileBase64: string) => {
    setUploading(true);
    try {
      await motoboyService.uploadDocument({ docType, fileBase64 });
      showToast(`${docType} enviado. Aguarde aprovação.`, 'success');
      setDocFiles((prev) => ({ ...prev, [docType]: null }));
      const data = await motoboyService.listDocuments();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível enviar o documento.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadDocument = async (docType: string) => {
    const normalized = String(docType || '').toUpperCase();
    const currentDoc = documentsByType.get(normalized);
    const currentStatus = String(currentDoc?.status || '').toUpperCase();
    const cnhDoc = documentsByType.get('CNH');
    const cnhStatus = String(cnhDoc?.status || '').toUpperCase();

    // Enforce order: CNH first, then SELFIE. Also lock uploads once sent (pending/approved).
    if (normalized === 'SELFIE' && (!cnhDoc || cnhStatus === 'REJECTED')) {
      showToast('Envie a CNH primeiro e depois envie a selfie segurando a CNH.', 'error');
      return;
    }
    if (currentDoc && (currentStatus === 'APPROVED' || currentStatus === 'PENDING')) {
      showToast('Documento já enviado. Aguarde a validação.', 'info');
      return;
    }

    const file = docFiles[docType];
    if (!file) {
      showToast('Selecione um arquivo para enviar.', 'error');
      return;
    }

    const label = documentTypes.find((d) => d.key === normalized)?.label || normalized;
    if (!window.confirm(`Confirma que este arquivo é: ${label}?`)) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      const fileBase64: string = await new Promise((resolve, reject) => {
        reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(file);
      });
      await uploadDocumentBase64(docType, fileBase64);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível enviar o documento.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const openCamera = (docType: string) => {
    if (!canStartUpload(docType)) {
      showToast('Documento já enviado. Aguarde a validação.', 'info');
      return;
    }
    const normalized = String(docType || '').toUpperCase();
    const cnhDoc = documentsByType.get('CNH');
    const cnhStatus = String(cnhDoc?.status || '').toUpperCase();
    if (normalized === 'SELFIE' && (!cnhDoc || cnhStatus === 'REJECTED')) {
      showToast('Envie a CNH primeiro e depois envie a selfie segurando a CNH.', 'error');
      return;
    }
    setCameraDocType(docType);
    setCameraOpen(true);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await motoboyService.updateProfile({
        vehicleType: profileDraft.vehicleType || null,
        vehiclePlate: profileDraft.vehiclePlate || null,
        vehicleModel: profileDraft.vehicleModel || null,
        vehicleColor: profileDraft.vehicleColor || null,
        city: profileDraft.city || null,
        state: profileDraft.state || null,
        address: profileDraft.address || null,
      });
      setProfile(updated || null);
      showToast('Perfil atualizado.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível salvar o perfil.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleStore = (storeId: string) => {
    setSelectedStores((prev) => {
      if (prev.includes(storeId)) return prev.filter((id) => id !== storeId);
      return [ ...prev, storeId ];
    });
  };

  const handleRequestStores = async () => {
    if (!selectedStores.length) {
      showToast('Selecione ao menos uma loja.', 'error');
      return;
    }
    setRequesting(true);
    try {
      await motoboyService.createStoreRequests(selectedStores);
      showToast('Solicitação enviada. Aguarde aprovação.', 'success');
      setSelectedStores([]);
      await loadRequests();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível enviar solicitação.', 'error');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="min-h-screen motoboy-screen space-y-4">
      <MotoboyHeader title="Perfil" subtitle="Documentos, vínculo e dados do entregador." />

      <DocPreviewModal
        open={Boolean(preview)}
        title={preview?.title || 'Documento'}
        src={preview?.src || null}
        onClose={() => setPreview(null)}
      />

      <CameraCaptureModal
        open={cameraOpen}
        title={cameraDocType === 'SELFIE' ? 'Selfie segurando a CNH' : 'Foto da CNH'}
        subtitle={
          cameraDocType === 'SELFIE'
            ? 'Enquadre bem o rosto e o documento. Evite sombra e reflexo.'
            : 'Tire a FRENTE e o VERSO (o sistema junta em uma imagem só).'
        }
        mode={cameraDocType === 'CNH' ? 'cnh' : 'single'}
        initialFacingMode={cameraDocType === 'SELFIE' ? 'user' : 'environment'}
        onClose={() => {
          setCameraOpen(false);
          setCameraDocType(null);
        }}
        onDone={async (dataUrl) => {
          if (!cameraDocType) return;
          const docType = cameraDocType;
          setCameraOpen(false);
          setCameraDocType(null);
          await uploadDocumentBase64(docType, dataUrl);
        }}
      />

      <div className="premium-card-glass p-4 space-y-3 motoboy-fade-up" style={{ animationDelay: '40ms' }}>
        <div>
          <p className="text-sm font-extrabold text-slate-900">Notificações</p>
          <p className="text-xs text-slate-600">Quando entra pedido novo na fila (som e vibração).</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNotifyOrders((prev) => {
              const next = !prev;
              localStorage.setItem('motoboy:notify_orders', next ? '1' : '0');
              return next;
            });
          }}
          className={[
            'btn-press w-full rounded-xl px-4 py-3 text-sm font-extrabold flex items-center justify-between border',
            notifyOrders
              ? 'bg-emerald-50/70 text-emerald-900 border-emerald-200 shadow-[0_18px_40px_-32px_rgba(5,150,105,0.35)]'
              : 'bg-white/70 text-slate-800 border-slate-200 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)]',
          ].join(' ')}
        >
          <span>{notifyOrders ? 'Ativadas' : 'Desativadas'}</span>
          <span
            className={[
              'relative inline-flex h-7 w-12 rounded-full transition',
              notifyOrders ? 'bg-emerald-500' : 'bg-slate-300',
            ].join(' ')}
            aria-hidden="true"
          >
            <span
              className={[
                'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition',
                notifyOrders ? 'left-6' : 'left-1',
              ].join(' ')}
            />
          </span>
        </button>
      </div>

      {blocked && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Seu cadastro está em análise. Envie os documentos obrigatórios e aguarde aprovação das lojas.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Enviar documentos</p>
              <p className="text-xs text-slate-500">
                Para trabalhar, envie os documentos obrigatórios e aguarde aprovação.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-slate-200 bg-slate-50 text-slate-700">
                  {docsProgress.approved}/{docsProgress.total} completos
                </span>
                {docsProgress.rejected > 0 ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-rose-200 bg-rose-50 text-rose-800">
                    {docsProgress.rejected} recusado{docsProgress.rejected === 1 ? '' : 's'}
                  </span>
                ) : null}
                {docsProgress.pending > 0 ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-amber-200 bg-amber-50 text-amber-800">
                    {docsProgress.pending} em análise
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={refreshDocuments}
              disabled={refreshingDocs}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-60"
            >
              {refreshingDocs ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
        {faceBanner && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <span className="font-semibold">{faceBanner.text}</span>
            {faceBanner.reason ? <span className="text-slate-500"> ({faceBanner.reason})</span> : null}
          </div>
        )}
        <div className="grid gap-3">
          {documentTypes.map((doc) => {
            const current = documentsByType.get(doc.key);
            const currentStatus = String(current?.status || '').toUpperCase();
            const isApproved = currentStatus === 'APPROVED';
            const isPending = currentStatus === 'PENDING';
            const isRejected = currentStatus === 'REJECTED';
            const cnhDoc = documentsByType.get('CNH');
            const cnhStatus = String(cnhDoc?.status || '').toUpperCase();
            const blockedByOrder = doc.key === 'SELFIE' && (!cnhDoc || cnhStatus === 'REJECTED');
            const lockUpload = Boolean(current) && (isApproved || isPending);
            const canUpload = !blockedByOrder && (!current || isRejected) && !uploading;
            const stepLabel = doc.key === 'CNH' ? '1/2' : doc.key === 'SELFIE' ? '2/2' : 'Opcional';
            const previewTitle = `${doc.label}`;
            return (
              <div key={doc.key} className="rounded-2xl border border-slate-100 p-3 sm:p-4">
                <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                            {stepLabel}
                          </span>
                          <span>{doc.label}</span>
                        </p>
                        <p className="text-xs text-slate-500">{doc.help}</p>
                      </div>
                      {current && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            current.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : current.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {current.status === 'APPROVED' ? 'Aprovado' : current.status === 'REJECTED' ? 'Recusado' : 'Pendente'}
                        </span>
                      )}
                    </div>
                    {current?.uploadedAt && (
                      <p className="text-[11px] text-slate-500">
                        Enviado em {new Date(current.uploadedAt).toLocaleString('pt-BR')}
                      </p>
                    )}
                    {blockedByOrder && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Envie a CNH primeiro para liberar o envio da selfie.
                      </div>
                    )}
                    {lockUpload ? (
                      <div
                        className={`rounded-xl border px-3 py-2 text-xs ${
                          isApproved
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                      >
                        {isApproved ? 'Documento aprovado. Nenhuma ação necessária.' : 'Documento enviado. Aguardando validação.'}
                      </div>
                    ) : (
                      <>
                        {(doc.key === 'CNH' || doc.key === 'SELFIE') && (
                          <button
                            type="button"
                            onClick={() => openCamera(doc.key)}
                            disabled={!canUpload}
                            className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            Tirar foto (recomendado)
                          </button>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={!canUpload}
                          onChange={(event) =>
                            setDocFiles((prev) => ({ ...prev, [doc.key]: event.target.files?.[0] || null }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-60"
                        />
                        <button
                          type="button"
                          onClick={() => handleUploadDocument(doc.key)}
                          disabled={!canUpload}
                          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {uploading ? 'Enviando...' : isRejected ? 'Reenviar documento' : 'Enviar documento'}
                        </button>
                      </>
                    )}
                    {isRejected && current?.metadata?.review?.reason ? (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                        <span className="font-semibold">Motivo da recusa:</span>{' '}
                        <span>{String(current.metadata.review.reason)}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-600 flex flex-col items-center justify-center">
                    {current?.fileKey ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setPreview({ title: previewTitle, src: String(current.fileKey || '') || null })}
                          className="w-full rounded-xl border border-slate-200 bg-white overflow-hidden"
                          title="Abrir prévia"
                        >
                          <img src={current.fileKey} alt={doc.label} className="w-full h-28 object-cover" loading="lazy" />
                        </button>
                        <a
                          href={current.fileKey}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 text-xs text-brand-primary underline"
                        >
                          Ver arquivo
                        </a>
                      </>
                    ) : (
                      <span>Nenhum arquivo enviado</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {(requiredDocStatus.missing.length > 0 || requiredDocStatus.rejected.length > 0) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {requiredDocStatus.missing.length > 0 ? (
              <div className="font-semibold">Faltando: {requiredDocStatus.missing.join(', ')}.</div>
            ) : null}
            {requiredDocStatus.rejected.length > 0 ? (
              <div className="mt-1 font-semibold text-rose-800">
                Recusado(s): {requiredDocStatus.rejected.join(', ')}. Reenvie o(s) documento(s) corrigido(s).
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">Perfil do entregador</p>
          <p className="text-xs text-slate-500">Dados do veículo e região.</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 flex items-center gap-2">
          <span className="text-base">{vehicleIcon}</span>
          <span>Complete seus dados para ganhar confiança das lojas.</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={profileDraft.vehicleType}
            onChange={(event) => setProfileDraft((prev: any) => ({ ...prev, vehicleType: event.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Tipo de veículo</option>
            <option value="MOTO">Moto</option>
            <option value="BIKE">Bicicleta</option>
            <option value="CARRO">Carro</option>
            <option value="OUTRO">Outro</option>
          </select>
          <input
            value={profileDraft.vehiclePlate}
            onChange={(event) => setProfileDraft((prev: any) => ({ ...prev, vehiclePlate: event.target.value }))}
            placeholder="Placa"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={profileDraft.vehicleModel}
            onChange={(event) => setProfileDraft((prev: any) => ({ ...prev, vehicleModel: event.target.value }))}
            placeholder="Modelo"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={profileDraft.vehicleColor}
            onChange={(event) => setProfileDraft((prev: any) => ({ ...prev, vehicleColor: event.target.value }))}
            placeholder="Cor"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={profileDraft.city}
            onChange={(event) => setProfileDraft((prev: any) => ({ ...prev, city: event.target.value }))}
            placeholder="Cidade"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={profileDraft.state}
            onChange={(event) => setProfileDraft((prev: any) => ({ ...prev, state: event.target.value }))}
            placeholder="UF"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={profileDraft.address}
            onChange={(event) => setProfileDraft((prev: any) => ({ ...prev, address: event.target.value }))}
            placeholder="Endereço"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
          />
        </div>
        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {savingProfile ? 'Salvando...' : 'Salvar perfil'}
        </button>
        {profile?.status && (
          <div className="pt-1">
            {(() => {
              const st = formatMotoboyAccountStatus(profile.status);
              return (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-semibold">Status do cadastro:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${st.tone}`}>
                    {st.label}
                  </span>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">Solicitar vínculo</p>
          <p className="text-xs text-slate-500">Escolha as lojas que deseja atender.</p>
        </div>
        {anyRejectedRequest && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            <span className="font-semibold">Solicitação recusada por {anyRejectedRequest.storeName}.</span>
            {anyRejectedRequest.reason ? (
              <span className="block mt-1 text-rose-700">Motivo: {anyRejectedRequest.reason}</span>
            ) : (
              <span className="block mt-1 text-rose-700">Você pode tentar novamente ou falar com a loja.</span>
            )}
          </div>
        )}
        {!hasCompleteProfile && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Complete seus dados do veículo e endereço para solicitar vínculo com lojas.
          </div>
        )}
        {!hasAllRequiredDocs && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Envie os documentos obrigatórios ({requiredDocs.join(', ')}) antes de solicitar vínculo.
            {requiredDocStatus.missing.length > 0 ? (
              <span className="block mt-1 text-amber-800 font-semibold">Faltando: {requiredDocStatus.missing.join(', ')}.</span>
            ) : null}
            {requiredDocStatus.rejected.length > 0 ? (
              <span className="block mt-1 text-rose-800 font-semibold">
                Recusado(s): {requiredDocStatus.rejected.join(', ')}. Reenvie o(s) documento(s).
              </span>
            ) : null}
            {requiredDocsPending.length > 0 ? (
              <span className="block mt-1 text-amber-800 font-semibold">Pendências: {requiredDocsPending.join(', ')}.</span>
            ) : null}
          </div>
        )}
        {hasAllRequiredDocs && !hasAnyRejectedRequiredDocs && hasAnyPendingRequiredDocs && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            Seus documentos estão em análise. Você já pode solicitar vínculo; a loja fará a revisão e aprovação.
          </div>
        )}
        {requests.length > 0 && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 space-y-1">
            {requests.map((req) => (
              <div key={req.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-700 truncate">{req.store?.name || 'Loja'}</div>
                  {String(req.status || '').toUpperCase() === 'REJECTED' && req.reason ? (
                    <div className="text-[11px] text-rose-700 truncate">Motivo: {String(req.reason)}</div>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    req.status === 'APPROVED'
                      ? req.linkActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                      : req.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {req.status === 'APPROVED'
                    ? req.linkActive
                      ? 'Aprovado'
                      : 'Vínculo inativo'
                    : req.status === 'REJECTED'
                    ? 'Recusado'
                    : 'Pendente'}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-2">
          {stores.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhuma loja disponível.</p>
          ) : (
            stores.map((store) => {
              const isSelected = selectedStores.includes(store.id);
              const alreadyRequested = requests.some((req) => req.storeId === store.id && req.status === 'PENDING');
              const approved = requests.some((req) => req.storeId === store.id && req.status === 'APPROVED');
              const openFlag = store?.open;
              const openNow = store?.openNow;
              const storeStatus =
                openFlag === false
                  ? 'Loja desativada'
                  : openNow === false
                  ? 'Fora do horário'
                  : openFlag === true || openNow === true
                  ? 'Ativa agora'
                  : 'Ativa';
              return (
                <button
                  type="button"
                  key={store.id}
                  onClick={() => toggleStore(store.id)}
                  disabled={alreadyRequested || approved}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold ${
                    approved
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : alreadyRequested
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : isSelected
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span>{store.name}</span>
                    <span className="text-[10px] font-medium text-slate-500">{storeStatus}</span>
                  </div>
                  {approved ? 'Aprovado' : alreadyRequested ? 'Pendente' : isSelected ? 'Selecionado' : 'Selecionar'}
                </button>
              );
            })
          )}
        </div>
        <button
          type="button"
          onClick={loadRequests}
          className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Atualizar status
        </button>
        <button
          type="button"
          onClick={handleRequestStores}
          disabled={requesting || !hasAllRequiredDocs || hasAnyRejectedRequiredDocs || !hasCompleteProfile}
          className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {requesting ? 'Enviando...' : 'Enviar solicitação'}
        </button>
      </div>
    </div>
  );
}
