import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, Clock, ListChecks, Storefront } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { motoboyService } from '../services/motoboyService';
import { OrderCard } from '../components/Motoboy/OrderCard';
import { useToast } from '../contexts/ToastContext';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';
import { formatMotoboyAccountStatus } from '../utils/motoboyStatus';

const MOTOBOY_AVAILABLE_ORDER_EVENT = 'jnc:motoboy-available-order';

export function MotoboyAvailable() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [hasActive, setHasActive] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [newBanner, setNewBanner] = useState<{ count: number; at: number } | null>(null);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const requiredDocs = ['CNH', 'SELFIE'];
  const orderIdsRef = useRef<string[]>([]);
  const firstLoadRef = useRef(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  const notificationsEnabled = () => {
    const raw = localStorage.getItem('motoboy:notify_orders');
    if (raw === null) return true;
    return raw === '1';
  };

  const notifyNewOrders = async () => {
    if (!notificationsEnabled()) return;
    try {
      if ('vibrate' in navigator) navigator.vibrate?.(120);
    } catch {}
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0.06;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playTone(880, 0.0, 0.08);
      playTone(1175, 0.1, 0.09);
      window.setTimeout(() => {
        try {
          ctx.close();
        } catch {}
      }, 400);
    } catch {}
  };

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await motoboyService.listAvailableOrders();
      const nextOrders = Array.isArray(data) ? data : [];
      const prevIds = new Set(orderIdsRef.current);
      const nextIds = nextOrders.map((o: any) => String(o?.id || '')).filter(Boolean);
      const hasNew = nextIds.some((id) => !prevIds.has(id));
      const newCount = nextIds.filter((id) => !prevIds.has(id)).length;
      orderIdsRef.current = nextIds;
      setOrders(nextOrders);
      if (!firstLoadRef.current && hasNew && nextOrders.length > 0) {
        showToast('Novo pedido na fila.', 'info');
        setNewBanner({ count: Math.max(newCount, 1), at: Date.now() });
        localStorage.setItem('motoboy:queue_badge', '1');
        void notifyNewOrders();
      }
      try {
        const current = await motoboyService.getCurrentOrder();
        const d = String(current?.delivery?.status || '').toUpperCase();
        const active = Boolean(current?.id && ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(d));
        setHasActive(active);
        setCurrentOrder(active ? current : null);
      } catch {
        setHasActive(false);
        setCurrentOrder(null);
      }
      setBlocked(false);
    } catch (error: any) {
      if (error?.status === 403) {
        setBlocked(true);
        setOrders([]);
      } else {
        showToast(error?.message || 'Nao foi possivel carregar pedidos.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadOrders();
    firstLoadRef.current = false;
  }, [loadOrders]);

  useEffect(() => {
    let timer: number | null = null;
    const tick = async () => {
      if (document.visibilityState !== 'visible') return;
      await loadOrders();
    };
    timer = window.setInterval(() => {
      void tick();
    }, 5000);
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [loadOrders]);

  useEffect(() => {
    const onForegroundPush = () => {
      setNewBanner({ count: 1, at: Date.now() });
      showToast('Tem entrega disponivel.', 'info');
      void loadOrders();
    };
    window.addEventListener(MOTOBOY_AVAILABLE_ORDER_EVENT, onForegroundPush as EventListener);
    return () => window.removeEventListener(MOTOBOY_AVAILABLE_ORDER_EVENT, onForegroundPush as EventListener);
  }, [loadOrders, showToast]);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const data = await motoboyService.listStoreRequests();
        const list = Array.isArray(data) ? data : [];
        setRequests(list);
        setPendingCount(list.filter((req) => req.status === 'PENDING').length);
      } catch {
        setPendingCount(0);
      }
    };
    void loadRequests();
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await motoboyService.getProfile();
        setProfile(data || null);
      } catch {
        setProfile(null);
      }
    };
    void loadProfile();
  }, []);

  useEffect(() => {
    const loadDocs = async () => {
      try {
        const data = await motoboyService.listDocuments();
        setDocuments(Array.isArray(data) ? data : []);
      } catch {
        setDocuments([]);
      }
    };
    void loadDocs();
  }, []);

  const documentsByType = new Map(
    documents.map((doc: any) => [String(doc.docType || '').toUpperCase(), doc])
  );
  const hasAllRequiredDocs = requiredDocs.every((key) => documentsByType.has(key));
  const missingRequiredDocs = requiredDocs.filter((key) => !documentsByType.has(key)).length;
  const approvedStores = requests.filter((req) => req.status === 'APPROVED');
  const accountStatus = formatMotoboyAccountStatus(profile?.status);
  const canOperate = !blocked && hasAllRequiredDocs && approvedStores.length > 0;

  const handleAccept = async (orderId: string) => {
    try {
      await motoboyService.acceptOrder(orderId);
      const selected = orders.find((order) => order.id === orderId) || null;
      if (selected) {
        try {
          localStorage.setItem(
            'motoboy:currentOrder',
            JSON.stringify({ ...selected, status: 'in_delivery', acceptedAt: new Date().toISOString() })
          );
        } catch {}
      }
      showToast('Pedido aceito. Boa entrega!', 'success');
      navigate('/motoboy/delivery');
    } catch (error: any) {
      if (error?.status === 409) {
        showToast('Pedido ja foi aceito por outro motoboy.', 'warning');
      } else {
        showToast(error?.message || 'Nao foi possivel aceitar o pedido.', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen motoboy-screen space-y-4 overflow-x-hidden">
      {newBanner && !hasActive ? (
        <div className="premium-card-glass p-4 motoboy-fade-up" role="status">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Novo pedido</p>
              <p className="text-base font-extrabold text-slate-900">
                Entrou {newBanner.count} pedido{newBanner.count === 1 ? '' : 's'} novo{newBanner.count === 1 ? '' : 's'} na fila
              </p>
              <p className="text-xs text-slate-600">Abra a fila e aceite so se puder sair agora.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setNewBanner(null)}
                className="btn-press flex-1 sm:flex-none rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-extrabold text-slate-700"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="btn-press flex-1 sm:flex-none rounded-xl bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] px-3 py-2 text-xs font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(239,68,68,0.85)]"
              >
                Ver fila
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <MotoboyHeader
        title="Fila de entregas"
        subtitle={hasActive ? 'Voce ja esta em rota. Termine a entrega atual primeiro.' : 'Veja o pedido e aceite rapido.'}
        rightAction={
          <button
            onClick={loadOrders}
            className="btn-press px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700"
          >
            Atualizar
          </button>
        }
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)]">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <ListChecks size={20} weight="duotone" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pedidos agora</p>
              <p className="text-sm font-black text-slate-900">{orders.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${canOperate ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              <CheckCircle size={20} weight="duotone" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Conta</p>
              <p className="text-sm font-black text-slate-900">{accountStatus.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Storefront size={20} weight="duotone" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Lojas ativas</p>
              <p className="text-sm font-black text-slate-900">{approvedStores.length}</p>
            </div>
          </div>
        </div>
      </section>

      {blocked || !canOperate || pendingCount > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-extrabold">Antes de aceitar mais pedidos</p>
          <p className="mt-1 text-amber-800">
            {blocked
              ? 'Seu cadastro ainda esta em analise da plataforma.'
              : !hasAllRequiredDocs
                ? `Faltam documentos obrigatorios. Hoje faltam ${missingRequiredDocs}.`
                : approvedStores.length === 0
                  ? 'Voce ainda nao tem loja aprovada para operar.'
                  : `${pendingCount} solicitacao${pendingCount === 1 ? '' : 'oes'} de loja aguardando resposta.`}
          </p>
          <button
            type="button"
            onClick={() => navigate('/motoboy/profile')}
            className="mt-3 btn-press w-full sm:w-auto rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-extrabold text-amber-900"
          >
            Resolver no cadastro
          </button>
        </section>
      ) : null}

      {hasActive && currentOrder ? (
        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 space-y-3" ref={listRef}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-700 font-extrabold">Entrega ativa</p>
              <p className="mt-1 text-lg font-black text-slate-900">
                Pedido #{String(currentOrder?.id || '').slice(0, 8)}
              </p>
              <p className="text-sm text-sky-900 mt-1">
                Finalize sua entrega atual antes de aceitar outro pedido.
              </p>
              <p className="text-xs text-sky-800 mt-1">
                Ainda ha {orders.length} pedido{orders.length === 1 ? '' : 's'} esperando na fila.
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl border border-sky-200 bg-white text-sky-700 inline-flex items-center justify-center shrink-0">
              <Clock size={20} weight="duotone" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/motoboy/delivery')}
            className="btn-press w-full sm:w-auto rounded-xl bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#0ea5e9))] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(14,165,233,0.85)]"
          >
            Abrir entrega atual
          </button>
        </section>
      ) : loading ? (
        <div className="grid gap-3" ref={listRef}>
          <div className="motoboy-skeleton h-[112px]" />
          <div className="motoboy-skeleton h-[112px]" />
          <div className="motoboy-skeleton h-[112px]" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-600" ref={listRef}>
          Nenhum pedido disponivel agora. A fila atualiza automaticamente.
        </div>
      ) : (
        <section className="space-y-3" ref={listRef}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Pedidos na fila</p>
              <p className="text-sm text-slate-600">Veja o valor do frete, o pagamento e aceite so se puder sair agora.</p>
            </div>
          </div>
          <div className="grid gap-4">
            {orders.map((order, idx) => (
              <div
                key={order.id}
                className="motoboy-fade-up"
                style={{ animationDelay: `${Math.min(idx * 70, 420)}ms` }}
              >
                <OrderCard
                  order={order}
                  compact
                  actions={
                    <button
                      onClick={() => handleAccept(order.id)}
                      className="btn-press w-full rounded-xl bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] px-4 py-3 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(239,68,68,0.85)]"
                    >
                      Aceitar entrega
                    </button>
                  }
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
