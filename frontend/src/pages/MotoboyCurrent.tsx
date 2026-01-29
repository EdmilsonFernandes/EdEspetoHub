import { useEffect, useMemo, useState } from 'react';
import { motoboyService } from '../services/motoboyService';
import { storeService } from '../services/storeService';
import { OrderCard } from '../components/Motoboy/OrderCard';
import { ConfirmPaymentModal } from '../components/Motoboy/ConfirmPaymentModal';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

export function MotoboyCurrent() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
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
  const { showToast } = useToast();
  const navigate = useNavigate();

  const documentTypes = [
    { key: 'CNH', label: 'CNH', help: 'Foto frente e verso em um único arquivo.' },
    { key: 'SELFIE', label: 'Selfie segurando a CNH', help: 'Foto clara do rosto com o documento.' },
    { key: 'CRLV', label: 'Documento do veículo (CRLV)', help: 'Opcional para moto ou carro.' },
  ];

  const load = async () => {
    try {
      const data = await motoboyService.listAvailableOrders();
      const parsed = Array.isArray(data) ? data : [];
      setBlocked(false);
      const stored = (() => {
        try {
          const raw = localStorage.getItem('motoboy:currentOrder');
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();
      if (stored && !parsed.find((order) => order.id === stored.id)) {
        parsed.unshift(stored);
      }
      setOrders(parsed);
    } catch (error: any) {
      if (error?.status === 403) {
        setBlocked(true);
        setOrders([]);
      } else {
        showToast(error?.message || 'Não foi possível carregar pedidos.', 'error');
      }
    }
  };

  useEffect(() => {
    load();
  }, []);

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

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const data = await motoboyService.listStoreRequests();
        setRequests(Array.isArray(data) ? data : []);
      } catch (error: any) {
        // ignore to not block motoboy screen
      }
    };
    loadRequests();
  }, []);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const data = await motoboyService.listDocuments();
        setDocuments(Array.isArray(data) ? data : []);
      } catch (error: any) {
        // ignore
      }
    };
    loadDocuments();
  }, []);

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
      if (!map.has(key)) {
        map.set(key, doc);
      }
    });
    return map;
  }, [documents]);

  const hasApprovedRequest = useMemo(
    () => requests.some((req) => req.status === 'APPROVED'),
    [requests]
  );
  const statusLabel = useMemo(() => {
    if (profile?.status === 'SUSPENDED') return 'Cadastro suspenso';
    if (profile?.status === 'REJECTED') return 'Cadastro recusado';
    if (profile?.status === 'PENDING_VERIFICATION') return 'Cadastro em análise';
    if (profile?.status === 'ACTIVE' && !hasApprovedRequest) return 'Sem vínculo aprovado';
    return 'Cadastro ativo';
  }, [profile?.status, hasApprovedRequest]);

  const activeOrder = useMemo(() => {
    return (
      orders.find((order) => ['in_delivery', 'ready_for_delivery', 'waiting_for_motoboy'].includes(order.status)) ||
      null
    );
  }, [orders]);

  const canConfirmPayment = (order: any) => {
    const method = (order?.paymentMethod || '').toLowerCase();
    const status = (order?.paymentStatus || '').toLowerCase();
    return status === 'pending' && (method === 'cash' || method === 'dinheiro' || method === 'card' || method === 'credit' || method === 'debit');
  };

  const handleConfirmPayment = async (cashTendered?: number | null) => {
    if (!selected) return;
    try {
      await motoboyService.confirmPayment(selected.id, cashTendered ?? null);
      showToast('Pagamento confirmado.', 'success');
      try {
        localStorage.setItem('motoboy:currentOrder', JSON.stringify({ ...selected, paymentStatus: 'PAID' }));
      } catch {}
      setShowPayment(false);
      load();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível confirmar pagamento.', 'error');
    }
  };

  const handleDelivered = async () => {
    if (!activeOrder) return;
    try {
      await motoboyService.markDelivered(activeOrder.id);
      showToast('Pedido marcado como entregue.', 'success');
      try {
        localStorage.setItem('motoboy:currentOrder', JSON.stringify({ ...activeOrder, status: 'delivered' }));
      } catch {}
      load();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível concluir a entrega.', 'error');
    }
  };

  const handleUploadDocument = async (docType: string) => {
    const file = docFiles[docType];
    if (!file) {
      showToast('Selecione um arquivo para enviar.', 'error');
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      const fileBase64: string = await new Promise((resolve, reject) => {
        reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(file);
      });
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
      const data = await motoboyService.listStoreRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível enviar solicitação.', 'error');
    } finally {
      setRequesting(false);
    }
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

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">Entrega atual</h1>
          <p className="text-sm text-slate-500">Acompanhe pedidos e documentos.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/motoboy/available')}
          className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600"
        >
          Voltar
        </button>
      </div>

      {blocked && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {statusLabel}. Envie os documentos obrigatórios e aguarde aprovação das lojas.
        </div>
      )}
      {!blocked && profile?.status && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Status do entregador: <span className="font-semibold text-slate-800">{statusLabel}</span>
          {profile?.status === 'ACTIVE' && !hasApprovedRequest && (
            <span className="block text-xs text-slate-500 mt-1">Solicite vínculo com lojas para receber pedidos.</span>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">Enviar documentos</p>
          <p className="text-xs text-slate-500">Envie CNH, selfie e documento do veículo para aprovação.</p>
        </div>
        <div className="grid gap-3">
          {documentTypes.map((doc) => {
            const current = documentsByType.get(doc.key);
            return (
              <div key={doc.key} className="rounded-xl border border-slate-100 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{doc.label}</p>
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
                      {current.status === 'APPROVED'
                        ? 'Aprovado'
                        : current.status === 'REJECTED'
                        ? 'Recusado'
                        : 'Pendente'}
                    </span>
                  )}
                </div>
                {current?.uploadedAt && (
                  <p className="text-[11px] text-slate-500">
                    Enviado em {new Date(current.uploadedAt).toLocaleString('pt-BR')}
                  </p>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setDocFiles((prev) => ({ ...prev, [doc.key]: event.target.files?.[0] || null }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleUploadDocument(doc.key)}
                  disabled={uploading}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {uploading ? 'Enviando...' : 'Enviar documento'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {documents.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Seus documentos enviados</p>
            <p className="text-xs text-slate-500">Confira o que já foi enviado e o status de aprovação.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {documents.map((doc) => (
              <div key={doc.id} className="rounded-xl border border-slate-100 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">{doc.docType}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      doc.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : doc.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {doc.status === 'APPROVED' ? 'Aprovado' : doc.status === 'REJECTED' ? 'Recusado' : 'Pendente'}
                  </span>
                </div>
                <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  <img src={doc.fileKey} alt={doc.docType} className="w-full h-32 object-cover" />
                </div>
                <a href={doc.fileKey} target="_blank" rel="noreferrer" className="text-xs text-brand-primary underline">
                  Ver em tela cheia
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">Perfil do entregador</p>
          <p className="text-xs text-slate-500">Dados básicos do veículo e da região atendida.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={profileDraft.vehicleType}
            onChange={(event) => setProfileDraft((prev: any) => ({ ...prev, vehicleType: event.target.value }))}
            placeholder="Tipo de veículo (moto, bike...)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
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
          <p className="text-[11px] text-slate-500">Status do cadastro: {profile.status}</p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">Solicitar vínculo</p>
          <p className="text-xs text-slate-500">Escolha as lojas que deseja atender.</p>
        </div>
        {requests.length > 0 && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 space-y-1">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between gap-2">
                <span>{req.store?.name || 'Loja'}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    req.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : req.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {req.status === 'APPROVED'
                    ? 'Aprovado'
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
                    <span className="text-[10px] font-medium text-slate-500">
                      {store.open ? 'Ativa agora' : 'Loja fechada'}
                    </span>
                  </div>
                  {approved ? 'Aprovado' : alreadyRequested ? 'Pendente' : isSelected ? 'Selecionado' : 'Selecionar'}
                </button>
              );
            })
          )}
        </div>
        <button
          type="button"
          onClick={handleRequestStores}
          disabled={requesting}
          className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {requesting ? 'Enviando...' : 'Enviar solicitação'}
        </button>
      </div>

      {!activeOrder ? (
        <div className="text-center text-sm text-slate-500">Nenhum pedido em rota.</div>
      ) : (
        <OrderCard
          order={activeOrder}
          actions={
            <div className="space-y-2">
              {activeOrder.status === 'waiting_for_motoboy' && (
                <p className="text-xs text-slate-500">Aceite o pedido em “Disponíveis” para iniciar a rota.</p>
              )}
              {canConfirmPayment(activeOrder) && (
                <button
                  onClick={() => {
                    setSelected(activeOrder);
                    setShowPayment(true);
                  }}
                  className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
                >
                  Confirmar pagamento
                </button>
              )}
              <button
                onClick={handleDelivered}
                className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Marcar como entregue
              </button>
            </div>
          }
        />
      )}

      <ConfirmPaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onConfirm={handleConfirmPayment}
        amount={selected?.total || 0}
        paymentMethod={selected?.paymentMethod}
      />
    </div>
  );
}
