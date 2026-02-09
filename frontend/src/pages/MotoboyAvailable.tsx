import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Clock, Storefront } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { motoboyService } from '../services/motoboyService';
import { OrderCard } from '../components/Motoboy/OrderCard';
import { useToast } from '../contexts/ToastContext';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';

export function MotoboyAvailable() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [hasActive, setHasActive] = useState(false);
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
    if (raw === null) return true; // default ON
    return raw === '1';
  };

  const notifyNewOrders = async () => {
    if (!notificationsEnabled()) return;
    try {
      if ('vibrate' in navigator) navigator.vibrate?.(120);
    } catch {}
    // Audio can be blocked until user interacts; fail silently.
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

  const loadOrders = async () => {
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
        setHasActive(Boolean(current?.id && ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(d)));
      } catch {
        setHasActive(false);
      }
      setBlocked(false);
    } catch (error: any) {
      if (error?.status === 403) {
        setBlocked(true);
        setOrders([]);
      } else {
        showToast(error?.message || 'Não foi possível carregar pedidos.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    firstLoadRef.current = false;
  }, []);

  useEffect(() => {
    // Poll queue every 5s (pause when tab is hidden).
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
  }, []);

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
    loadRequests();
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
    loadProfile();
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
    loadDocs();
  }, []);

  const documentsByType = new Map(
    documents.map((doc: any) => [String(doc.docType || '').toUpperCase(), doc])
  );
  const hasAllRequiredDocs = requiredDocs.every((key) => documentsByType.has(key));
  const approvedStores = requests.filter((req) => req.status === 'APPROVED');
  const statusLabel = (() => {
    if (profile?.status === 'SUSPENDED') return 'Cadastro suspenso';
    if (profile?.status === 'REJECTED') return 'Cadastro recusado';
    if (profile?.status === 'PENDING_VERIFICATION') return 'Cadastro em análise';
    if (profile?.status === 'ACTIVE' && approvedStores.length === 0) return 'Sem vínculo aprovado';
    if (profile?.status === 'ACTIVE') return 'Cadastro ativo';
    return 'Cadastro pendente';
  })();

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
        showToast('Pedido já foi aceito por outro motoboy.', 'warning');
      } else {
        showToast(error?.message || 'Não foi possível aceitar o pedido.', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen motoboy-screen space-y-4">
      {newBanner && (
        <div
          className="premium-card-glass p-4 motoboy-fade-up"
          style={{ animationDelay: '40ms' }}
          role="status"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Novo pedido</p>
              <p className="text-sm font-extrabold text-slate-900">
                {newBanner.count} pedido{newBanner.count === 1 ? '' : 's'} acabou{newBanner.count === 1 ? '' : 'ram'} de entrar na fila
              </p>
              <p className="text-[11px] text-slate-600">
                Atualizado agora. Toque em ver para ir direto.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setNewBanner(null)}
                className="btn-press rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-extrabold text-slate-700"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="btn-press rounded-xl bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] px-3 py-2 text-xs font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(239,68,68,0.85)]"
              >
                Ver
              </button>
            </div>
          </div>
        </div>
      )}

      <MotoboyHeader
        title="Pedidos disponíveis"
        subtitle="Aceite e inicie sua rota."
        rightAction={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/motoboy/profile')}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600"
            >
              Perfil
            </button>
            <button
              onClick={loadOrders}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600"
            >
              Atualizar
            </button>
          </div>
        }
      />
      {blocked && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Seu cadastro está em análise. Envie os documentos obrigatórios e aguarde a aprovação.
        </div>
      )}
      {pendingCount > 0 && (
        <button
          type="button"
          onClick={() => navigate('/motoboy/profile')}
          className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700"
        >
          {pendingCount} solicitação{pendingCount === 1 ? '' : 'es'} pendente{pendingCount === 1 ? '' : 's'} de vínculo
        </button>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle size={20} weight="duotone" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Status</p>
            <p className="text-sm font-semibold text-slate-800">{profile?.status || 'Pendente'}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Storefront size={20} weight="duotone" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Lojas aprovadas</p>
            <p className="text-sm font-semibold text-slate-800">{approvedStores.length}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock size={20} weight="duotone" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Pedidos agora</p>
            <p className="text-sm font-semibold text-slate-800">{orders.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-700">Status do entregador</p>
        <p className="text-xs text-slate-500">{statusLabel}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span
            className={`px-2.5 py-1 rounded-full font-semibold ${
              hasAllRequiredDocs ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            Documentos {hasAllRequiredDocs ? 'OK' : 'pendentes'}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">
            Lojas aprovadas: {approvedStores.length}
          </span>
        </div>
        {!hasAllRequiredDocs && (
          <p className="text-[11px] text-amber-600">
            Complete CNH e Selfie para solicitar vínculo e receber pedidos.
          </p>
        )}
        {approvedStores.length === 0 && (
          <p className="text-[11px] text-slate-500">
            Pedidos só aparecem após a loja aprovar seu vínculo.
          </p>
        )}
      </div>

      {loading ? (
        <div className="grid gap-3" ref={listRef}>
          <div className="motoboy-skeleton h-[92px]" />
          <div className="motoboy-skeleton h-[92px]" />
          <div className="motoboy-skeleton h-[92px]" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center text-sm text-slate-500">
          Nenhum pedido disponível. A loja precisa marcar o pedido como “Pronto para entrega” ou “Aguardando entregador”.
        </div>
      ) : (
        <div className="grid gap-4" ref={listRef}>
          {hasActive && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Você já tem uma entrega ativa. Finalize na aba “Entrega” antes de aceitar outra.
            </div>
          )}
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
                    disabled={hasActive}
                    className="btn-press w-full rounded-xl bg-[linear-gradient(120deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_60%,#f59e0b))] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_22px_48px_-32px_rgba(239,68,68,0.85)] disabled:opacity-50"
                  >
                    Aceitar entrega
                  </button>
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
