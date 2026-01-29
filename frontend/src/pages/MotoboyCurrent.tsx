import { useEffect, useMemo, useState } from 'react';
import { motoboyService } from '../services/motoboyService';
import { storeService } from '../services/storeService';
import { OrderCard } from '../components/Motoboy/OrderCard';
import { ConfirmPaymentModal } from '../components/Motoboy/ConfirmPaymentModal';
import { useToast } from '../contexts/ToastContext';

export function MotoboyCurrent() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [docType, setDocType] = useState('CNH');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [requesting, setRequesting] = useState(false);
  const { showToast } = useToast();

  const load = async () => {
    try {
      const data = await motoboyService.listAvailableOrders();
      const parsed = Array.isArray(data) ? data : [];
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
      showToast(error?.message || 'Não foi possível carregar pedidos.', 'error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const loadStores = async () => {
      try {
        const data = await storeService.listPortfolio();
        const list = Array.isArray(data) ? data.filter((store) => store.open) : [];
        setStores(list);
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

  const handleUploadDocument = async () => {
    if (!docFile) {
      showToast('Selecione um arquivo para enviar.', 'error');
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      const fileBase64: string = await new Promise((resolve, reject) => {
        reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(docFile);
      });
      await motoboyService.uploadDocument({ docType, fileBase64 });
      showToast('Documento enviado. Aguarde aprovação.', 'success');
      setDocFile(null);
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

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-black text-slate-800">Entrega atual</h1>
        <p className="text-sm text-slate-500">Acompanhe o pedido em rota.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">Enviar documentos</p>
          <p className="text-xs text-slate-500">Envie CNH e selfie para liberar seu acesso.</p>
        </div>
        <div className="grid gap-2">
          <select
            value={docType}
            onChange={(event) => setDocType(event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="CNH">CNH</option>
            <option value="SELFIE">SELFIE</option>
            <option value="CRLV">Documento da moto (CRLV)</option>
            <option value="OTHER">Outro</option>
          </select>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setDocFile(event.target.files?.[0] || null)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleUploadDocument}
            disabled={uploading}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {uploading ? 'Enviando...' : 'Enviar documento'}
          </button>
        </div>
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
                  <span>{store.name}</span>
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
