// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Package, 
  CaretRight,
  Clock,
  CheckCircle,
  Truck,
  CookingPot
} from '@phosphor-icons/react';
import { customerAccountService } from '../services/customerAccountService';
import { formatCurrency, formatOrderDisplayId } from '../utils/format';

export function ClientOrders() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    document.title = 'Meus Pedidos | Já no Caminho';
  }, []);

  useEffect(() => {
    const sessionRaw = localStorage.getItem('customerSession');
    if (!sessionRaw) {
      navigate('/cliente?next=/cliente/pedidos&hub=1', { replace: true });
      return;
    }

    let mounted = true;
    customerAccountService.listOrders()
      .then((ordersData) => {
        if (!mounted) return;
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message || 'Falha ao carregar pedidos.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  const activeOrders = orders.filter(o => !['DELIVERED', 'CANCELLED', 'FINISHED', 'REJECTED'].includes(o.status));
  const pastOrders = orders.filter(o => ['DELIVERED', 'CANCELLED', 'FINISHED', 'REJECTED'].includes(o.status));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock size={20} weight="duotone" className="text-amber-500" />;
      case 'ACCEPTED': return <CookingPot size={20} weight="duotone" className="text-blue-500" />;
      case 'PREPARING': return <CookingPot size={20} weight="duotone" className="text-blue-600" />;
      case 'READY': return <Package size={20} weight="duotone" className="text-emerald-500" />;
      case 'DELIVERING': return <Truck size={20} weight="duotone" className="text-indigo-500" />;
      case 'DELIVERED': return <CheckCircle size={20} weight="duotone" className="text-emerald-600" />;
      default: return <Package size={20} weight="duotone" className="text-slate-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Aguardando';
      case 'ACCEPTED': return 'Aceito';
      case 'PREPARING': return 'Em preparo';
      case 'READY': return 'Pronto';
      case 'DELIVERING': return 'Em entrega';
      case 'DELIVERED': return 'Entregue';
      case 'CANCELLED': return 'Cancelado';
      case 'REJECTED': return 'Recusado';
      case 'FINISHED': return 'Finalizado';
      default: return status;
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-12 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-2xl">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur-md">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-all active:scale-90"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
          <h1 className="text-base font-black text-slate-900 uppercase tracking-widest">Meus Pedidos</h1>
          <div className="w-10" />
        </header>

        <div className="px-4 py-6 space-y-8">
          {activeOrders.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-sky-600 flex items-center gap-2 px-1">
                <Clock size={16} weight="duotone" />
                Em Andamento
              </h2>
              <div className="grid gap-3">
                {activeOrders.map(order => (
                  <button
                    key={order.id}
                    onClick={() => navigate(`/pedido/${order.id}`)}
                    className="flex w-full items-center justify-between rounded-[2rem] bg-white p-5 border border-sky-100 shadow-[0_12px_24px_-18px_rgba(14,165,233,0.3)] active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50">
                        {getStatusIcon(order.status)}
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{order.store?.name || 'Loja'}</p>
                        <p className="text-base font-black text-slate-900">#{formatOrderDisplayId(order.id, order.store?.slug)}</p>
                        <p className="text-[11px] font-bold text-sky-600 uppercase tracking-widest mt-0.5">{getStatusLabel(order.status)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-slate-900">{formatCurrency(order.total || 0)}</p>
                      <CaretRight size={18} className="text-slate-300 ml-auto mt-2" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-1">
              <Package size={16} weight="duotone" />
              Histórico
            </h2>
            {pastOrders.length === 0 && activeOrders.length === 0 ? (
              <div className="rounded-[2.5rem] bg-white p-12 text-center border border-slate-100 shadow-sm">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-slate-50 text-slate-300">
                  <Package size={32} weight="duotone" />
                </div>
                <p className="text-sm font-bold text-slate-400">Você ainda não realizou pedidos</p>
                <button
                  onClick={() => navigate('/hub')}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95"
                >
                  Explorar Lojas
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {pastOrders.map(order => (
                  <button
                    key={order.id}
                    onClick={() => navigate(`/pedido/${order.id}`)}
                    className="flex w-full items-center justify-between rounded-[2rem] bg-white p-5 border border-slate-100 shadow-sm active:scale-[0.98] transition-all opacity-85 hover:opacity-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400">
                        {getStatusIcon(order.status)}
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{order.store?.name || 'Loja'}</p>
                        <p className="text-sm font-black text-slate-900">#{formatOrderDisplayId(order.id, order.store?.slug)}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{getStatusLabel(order.status)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{formatCurrency(order.total || 0)}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
