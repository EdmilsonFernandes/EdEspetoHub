const STORAGE_KEY = 'jnk_notifications_v1';
const MAX_NOTIFICATIONS = 50;

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  url?: string;
  read: boolean;
  createdAt: string;
};

function getAll(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(items: AppNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_NOTIFICATIONS)));
  } catch {}
}

// Queue to serialize add operations
let addQueue: Promise<void> = Promise.resolve();

export const notificationStorage = {
  getAll,

  add(notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) {
    // Serialize adds to prevent race conditions
    addQueue = addQueue.then(() => {
      const items = getAll();
      const entry: AppNotification = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        title: notification.title,
        body: notification.body,
        url: notification.url,
        read: false,
        createdAt: new Date().toISOString(),
      };
      items.unshift(entry);
      save(items);
    });
  },

  markRead(id: string) {
    const items = getAll().map((n) => (n.id === id ? { ...n, read: true } : n));
    save(items);
  },

  markAllRead() {
    const items = getAll().map((n) => ({ ...n, read: true }));
    save(items);
  },

  remove(id: string) {
    const items = getAll().filter((n) => n.id !== id);
    save(items);
  },

  clearAll() {
    save([]);
  },

  unreadCount(): number {
    return getAll().filter((n) => !n.read).length;
  },
};
