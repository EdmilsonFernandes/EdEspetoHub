import { useLocation } from 'react-router-dom';
import { GrillQueue } from '../components/Admin/GrillQueue';
import { AdminLayout } from '../layouts/AdminLayout';
import { useAuth } from '../contexts/AuthContext';

export function AdminQueue() {
  const { auth } = useAuth();
  const location = useLocation();
  const forcedTab = (() => {
    const tab = String((location.state as any)?.activeTab || '').toLowerCase();
    if (tab === 'completed' || tab === 'inroute' || tab === 'queue') return tab;
    return 'queue';
  })();

  if (!auth?.store) {
    return (
      <div className="p-6 space-y-3">
        <div className="ds-skeleton h-16 w-full" />
        <div className="ds-skeleton h-20 w-full" />
        <div className="ds-skeleton h-20 w-full" />
      </div>
    );
  }

  return (
    <AdminLayout contextLabel="Central de Pedidos" fluid withSidebar>
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm overflow-x-hidden relative z-20">
        <GrillQueue forcedTab={forcedTab as 'queue' | 'inroute' | 'completed'} />
      </div>
    </AdminLayout>
  );
}
