import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRinging, CaretRight, Check, Trash, X } from '@phosphor-icons/react';
import { apiClient } from '../config/apiClient';
import { AppGlassHeader } from '../components/common/AppGlassHeader';
import { ClientBottomNav } from '../components/common/ClientBottomNav';
import { resolvePushClickTarget } from '../utils/pushNavigation';

type Notification = { id: string; title: string; body: string; url?: string | null; imageUrl?: string | null; read: boolean; createdAt: string };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

function groupByDate(items: Notification[]) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: { label: string; items: Notification[] }[] = [];
  const map = new Map<string, Notification[]>();
  items.forEach((n) => {
    const d = new Date(n.createdAt).toDateString();
    const label = d === today ? 'Hoje' : d === yesterday ? 'Ontem' : new Date(n.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(n);
  });
  map.forEach((v, k) => groups.push({ label: k, items: v }));
  return groups;
}

function getNotificationActionLabel(url?: string | null) {
  const target = resolvePushClickTarget(url);
  if (target.kind === 'external') return 'Abrir link';
  if (target.kind === 'notifications') return 'Ler mensagem';

  const path = target.value.toLowerCase();
  if (path.startsWith('/cliente/pedidos') || path.startsWith('/pedido/')) return 'Ver pedido';
  if (path.startsWith('/store/') || path.includes('/loja') || path.includes('/vitrine')) return 'Abrir loja';
  if (path.startsWith('/destinos')) return 'Ver destino';
  if (path.startsWith('/hub/destaques')) return 'Ver destaques';
  if (path.startsWith('/cliente/conta')) return 'Abrir conta';
  if (path.startsWith('/cliente/enderecos')) return 'Ver endereços';
  return 'Abrir no app';
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get('/customer/notifications');
      setNotifications(res?.items || []);
      setUnread(res?.unreadCount || 0);
    } catch { /* ignore if not logged */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRead = async (n: Notification) => {
    if (!n.read) {
      await apiClient.patch(`/customer/notifications/${n.id}/read`, {}).catch(() => {});
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
      setUnread((c) => Math.max(0, c - 1));
    }
    const target = resolvePushClickTarget(n.url);
    if (target.kind === 'external') {
      try { const { Browser } = await import('@capacitor/browser'); await Browser.open({ url: target.value }); } catch { window.open(target.value, '_blank', 'noopener'); }
      return;
    }
    if (target.kind === 'internal') {
      navigate(target.value);
      return;
    }
    setSelectedNotification(n);
  };

  const handleMarkAllRead = async () => {
    await apiClient.post('/customer/notifications/read-all', {}).catch(() => {});
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
  };

  const handleClearAll = async () => {
    await apiClient.delete('/customer/notifications').catch(() => {});
    setNotifications([]);
    setUnread(0);
  };

  const groups = groupByDate(notifications);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#EEF4F6_100%)] pb-[calc(env(safe-area-inset-bottom)+6.35rem)] pt-[calc(env(safe-area-inset-top)+4.35rem)]">
      <div className="pointer-events-none fixed top-[-10%] right-[-8%] h-[38%] w-[46%] rounded-full bg-[#153A4C]/13 blur-[120px] -z-10" />
      <div className="pointer-events-none fixed bottom-[8%] left-[-5%] h-[26%] w-[34%] rounded-full bg-[#336886]/7 blur-[100px] -z-10" />

      <div className="mx-auto max-w-2xl">
        <AppGlassHeader
          title="Notificações"
          eyebrow="Central"
          subtitle={unread > 0 ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Todas lidas'}
          backTo="/hub"
        />

        <div className="px-4 pt-4">
          {notifications.length > 0 && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-[1.35rem] border border-white/70 bg-white/80 px-3.5 py-3 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.28)] backdrop-blur-xl">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#336886]">Central do app</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {unread > 0 ? `${unread} aviso${unread > 1 ? 's' : ''} novo${unread > 1 ? 's' : ''}` : 'Nenhum aviso pendente'}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {unread > 0 && (
                  <button onClick={handleMarkAllRead} className="inline-flex items-center gap-1 rounded-full border border-[#336886]/15 bg-[#336886]/8 px-3 py-2 text-[10px] font-black text-[#2d5f7b] transition active:scale-95">
                    <Check size={12} weight="bold" /> Marcar lidas
                  </button>
                )}
                <button onClick={handleClearAll} className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50/80 px-3 py-2 text-[10px] font-black text-rose-600 transition active:scale-95">
                  <Trash size={12} weight="bold" /> Limpar
                </button>
              </div>
            </div>
          )}

          {notifications.length === 0 && (
            <div className="mt-16 flex flex-col items-center rounded-[2rem] border border-white/70 bg-white/70 px-6 py-10 text-center shadow-[0_22px_54px_-42px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#336886]/8">
                <BellRinging size={28} weight="duotone" className="text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-bold text-slate-700">Nenhuma notificação</p>
              <p className="mt-1 text-xs text-slate-500">Quando seus pedidos atualizarem, as notificações aparecem aqui.</p>
            </div>
          )}

          {groups.map((group) => (
            <section key={group.label} className="mb-6">
              <p className="mb-3 px-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{group.label}</p>
              <div className="space-y-1.5 rounded-[1.75rem] border border-white/70 bg-white/55 p-1.5 shadow-[0_22px_54px_-44px_rgba(15,23,42,0.26)] backdrop-blur-xl">
                {group.items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleRead(n)}
                    className={`group relative grid w-full grid-cols-[4.25rem_minmax(0,1fr)_2.35rem] items-start gap-3 rounded-[1.35rem] px-3 py-3 text-left transition-all active:scale-[0.985] ${n.read ? 'bg-transparent hover:bg-white/55' : 'bg-white shadow-[0_18px_36px_-30px_rgba(51,104,134,0.42)] ring-1 ring-[#336886]/10'}`}
                  >
                    <div className="relative shrink-0">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.15rem] bg-[linear-gradient(135deg,#0f3b53,#336886)] shadow-[0_16px_28px_-24px_rgba(15,23,42,0.38)]">
                        <img src={n.imageUrl || '/janocaminho.jpg'} alt="" className="h-full w-full object-cover opacity-90" />
                      </div>
                      {!n.read && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#336886] shadow-[0_0_8px_rgba(51,104,134,0.55)]" />}
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className={`text-[14px] leading-snug ${n.read ? 'font-bold text-slate-700' : 'font-black text-slate-950'}`}>{n.title}</p>
                      <p
                        className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-snug text-slate-600"
                      >
                        {n.body || n.title}
                      </p>
                      <span className="mt-2 block text-[11px] font-black uppercase tracking-[0.13em] text-[#336886]">
                        {getNotificationActionLabel(n.url)}
                      </span>
                    </div>
                    <span className="flex h-full flex-col items-end justify-between gap-3 pt-0.5">
                      <span className="text-[11px] font-black text-slate-400">{timeAgo(n.createdAt)}</span>
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-white/70 text-[#336886] shadow-[0_12px_26px_-24px_rgba(15,23,42,0.42)] ring-1 ring-slate-100 transition group-active:scale-95">
                        <CaretRight size={15} weight="bold" />
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      {selectedNotification ? (
        <div
          className="fixed inset-0 z-[14000] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={`Detalhe da notificação: ${selectedNotification.title}`}
          onClick={() => setSelectedNotification(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_28px_80px_-44px_rgba(15,23,42,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative h-28 bg-[linear-gradient(135deg,#153A4C,#336886)]">
              <img
                src={selectedNotification.imageUrl || '/janocaminho.jpg'}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-30"
              />
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-white/85 text-slate-700 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.4)] backdrop-blur-xl transition active:scale-95"
                aria-label="Fechar detalhe da notificação"
              >
                <X size={18} weight="bold" />
              </button>
              <div className="absolute bottom-4 left-4 right-16">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Mensagem do app</p>
                <p className="mt-1 text-xs font-bold text-white/80">{timeAgo(selectedNotification.createdAt)}</p>
              </div>
            </div>
            <div className="p-5">
              <h2 className="text-lg font-black leading-tight text-slate-950">{selectedNotification.title}</h2>
              <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-6 text-slate-700">
                {selectedNotification.body || selectedNotification.title}
              </p>
              <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Sem direcionamento</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-600">Esta notificação é apenas informativa.</p>
                </div>
                <BellRinging size={20} weight="duotone" className="text-slate-300" />
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <ClientBottomNav active="profile" />
    </main>
  );
}
