import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BellRinging, Check, Trash } from '@phosphor-icons/react';
import { notificationStorage, type AppNotification } from '../services/notificationStorage';
import { navigateBackOrFallback } from '../utils/navigation';

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

function groupByDate(items: AppNotification[]) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: { label: string; items: AppNotification[] }[] = [];
  const map = new Map<string, AppNotification[]>();
  items.forEach((n) => {
    const d = new Date(n.createdAt).toDateString();
    const label = d === today ? 'Hoje' : d === yesterday ? 'Ontem' : new Date(n.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(n);
  });
  map.forEach((items, label) => groups.push({ label, items }));
  return groups;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    setNotifications(notificationStorage.getAll());
  }, []);

  const handleRead = (n: AppNotification) => {
    notificationStorage.markRead(n.id);
    setNotifications(notificationStorage.getAll());
    if (n.url) {
      const path = n.url.replace(/^https?:\/\/[^/]+/, '');
      navigate(path);
    }
  };

  const handleRemove = (id: string) => {
    notificationStorage.remove(id);
    setNotifications(notificationStorage.getAll());
  };

  const handleMarkAllRead = () => {
    notificationStorage.markAllRead();
    setNotifications(notificationStorage.getAll());
  };

  const handleClearAll = () => {
    notificationStorage.clearAll();
    setNotifications([]);
  };

  const unread = notifications.filter((n) => !n.read).length;
  const groups = groupByDate(notifications);

  return (
    <main className="min-h-screen bg-[#EEF2F7] pb-[calc(env(safe-area-inset-bottom)+5.75rem)] pt-[env(safe-area-inset-top)]">
      <div className="pointer-events-none fixed top-[-10%] right-[-8%] h-[38%] w-[46%] rounded-full bg-[#153A4C]/13 blur-[120px] -z-10" />
      <div className="pointer-events-none fixed bottom-[8%] left-[-5%] h-[26%] w-[34%] rounded-full bg-[#336886]/7 blur-[100px] -z-10" />

      <div className="mx-auto max-w-2xl">
        <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3.5">
            <button
              onClick={() => navigateBackOrFallback(navigate, '/hub')}
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-all active:scale-95"
            >
              <ArrowLeft size={18} weight="bold" />
            </button>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1.5">
                <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-5 w-5 rounded-[0.45rem] object-cover shadow-sm" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Central</p>
              </div>
              <h1 className="text-[15px] font-black text-slate-900">Notificações</h1>
            </div>
            <div className="w-9" />
          </div>
        </header>

        <div className="px-4 pt-4">
          {/* Actions bar */}
          {notifications.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500">
                {unread > 0 ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Todas lidas'}
              </p>
              <div className="flex gap-2">
                {unread > 0 && (
                  <button onClick={handleMarkAllRead} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 active:scale-95">
                    <Check size={12} weight="bold" /> Marcar lidas
                  </button>
                )}
                <button onClick={handleClearAll} className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-600 active:scale-95">
                  <Trash size={12} weight="bold" /> Limpar
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {notifications.length === 0 && (
            <div className="mt-16 flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
                <BellRinging size={28} weight="duotone" className="text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-bold text-slate-700">Nenhuma notificação</p>
              <p className="mt-1 text-xs text-slate-500">Quando seus pedidos atualizarem, as notificações aparecem aqui.</p>
            </div>
          )}

          {/* Notification groups */}
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{group.label}</p>
              <div className="space-y-2">
                {group.items.map((n) => (
                  <div
                    key={n.id}
                    className={`group relative overflow-hidden rounded-2xl border bg-white p-3.5 transition-all active:scale-[0.98] ${
                      n.read ? 'border-slate-100' : 'border-[#336886]/15 shadow-[0_8px_20px_-12px_rgba(51,104,134,0.12)]'
                    }`}
                  >
                    <button onClick={() => handleRead(n)} className="absolute inset-0 z-0" aria-label="Abrir notificação" />
                    <div className="relative z-10 flex items-start gap-3">
                      <div className={`mt-0.5 flex h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-[#336886]'}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] leading-tight ${n.read ? 'font-semibold text-slate-700' : 'font-black text-slate-900'}`}>{n.title}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed line-clamp-2">{n.body}</p>
                        <p className="mt-1.5 text-[10px] font-semibold text-slate-400">{timeAgo(n.createdAt)}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemove(n.id); }}
                        className="relative z-20 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 active:scale-95"
                        aria-label="Remover"
                      >
                        <Trash size={13} weight="bold" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
