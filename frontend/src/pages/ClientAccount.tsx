// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, SignOut, MapPinLine } from '@phosphor-icons/react';
import { customerAccountService } from '../services/customerAccountService';
import { formatCurrency, formatOrderDisplayId } from '../utils/format';

export function ClientAccount() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [me, setMe] = useState<any | null>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState('');

  useEffect(() => {
    document.title = 'Minha Conta | Já no Caminho';
  }, []);

  useEffect(() => {
    const sessionRaw = localStorage.getItem('customerSession');
    if (!sessionRaw) {
      navigate('/cliente?next=/cliente/conta', { replace: true });
      return;
    }

    let mounted = true;
    Promise.all([
      customerAccountService.me(),
      customerAccountService.listAddresses(),
      customerAccountService.listOrders(),
    ])
      .then(([meData, addressesData, ordersData]) => {
        if (!mounted) return;
        setMe(meData || null);
        setAddresses(Array.isArray(addressesData) ? addressesData : []);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message || 'Falha ao carregar conta.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const logout = () => {
    const token = String(localStorage.getItem('jnk_mobile_push_token') || '').trim();
    if (token) {
      void customerAccountService.unregisterPushToken({ token });
    } else {
      void customerAccountService.unregisterPushToken({});
    }
    localStorage.removeItem('customerSession');
    navigate('/cliente', { replace: true });
  };

  const handleChangePassword = async () => {
    if (pwdLoading) return;
    setPwdLoading(true);
    setPwdMessage('');
    try {
      await customerAccountService.changePassword({
        currentPassword: String(pwdForm.currentPassword || ''),
        newPassword: String(pwdForm.newPassword || ''),
      });
      setPwdForm({ currentPassword: '', newPassword: '' });
      setPwdMessage('Senha alterada com sucesso.');
    } catch (e: any) {
      setPwdMessage(e?.message || 'Não foi possível alterar a senha.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={14} />
            Voltar
          </button>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
          >
            <SignOut size={14} />
            Sair
          </button>
        </div>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-sm p-4 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.4)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-black">Minha conta</p>
          {loading ? (
            <p className="text-sm text-slate-500 mt-2">Carregando...</p>
          ) : error ? (
            <p className="text-sm text-rose-600 mt-2">{error}</p>
          ) : (
            <>
              <p className="text-lg font-black text-slate-900 mt-2">{me?.fullName || '-'}</p>
              <p className="text-sm text-slate-600">{me?.email || '-'}</p>
              <p className="text-sm text-slate-600">{me?.phone || 'Telefone não informado'}</p>
            </>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-sm p-4 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.4)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-black">Endereços</p>
          {addresses.length === 0 ? (
            <p className="text-sm text-slate-500 mt-2">Nenhum endereço cadastrado ainda.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {addresses.map((address: any) => (
                <div key={address.id} className="rounded-2xl border border-slate-200/90 p-3 bg-slate-50/60">
                  <p className="text-sm font-semibold text-slate-700">{address.label || 'Endereço'} {address.isDefault ? '• Principal' : ''}</p>
                  <p className="text-xs text-slate-500">
                    {address.street}, {address.number || 's/n'} - {address.neighborhood} - {address.city}/{address.state}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-sm p-4 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.4)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-black">Segurança</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              type="password"
              value={pwdForm.currentPassword}
              onChange={(e) => setPwdForm((p) => ({ ...p, currentPassword: e.target.value }))}
              placeholder="Senha atual"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
            <input
              type="password"
              value={pwdForm.newPassword}
              onChange={(e) => setPwdForm((p) => ({ ...p, newPassword: e.target.value }))}
              placeholder="Nova senha"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={pwdLoading}
              className="rounded-xl bg-[linear-gradient(120deg,#0f172a,#1e293b)] px-3 py-2 text-xs font-bold text-white shadow-[0_10px_20px_-14px_rgba(15,23,42,0.8)] active:scale-[0.99] disabled:opacity-60"
            >
              {pwdLoading ? 'Alterando...' : 'Trocar senha'}
            </button>
            {pwdMessage ? <p className="text-xs text-slate-600">{pwdMessage}</p> : null}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-sm p-4 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.4)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-black">Meus pedidos</p>
          {orders.length === 0 ? (
            <p className="text-sm text-slate-500 mt-2">Sem pedidos vinculados.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {orders.slice(0, 20).map((order: any) => (
                <div key={order.id} className="rounded-2xl border border-slate-200/90 p-3 bg-slate-50/60">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-700">
                      #{formatOrderDisplayId(order.id, order?.store?.slug)}
                    </p>
                    <span className="text-xs font-bold text-slate-500 uppercase">{order.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(order.createdAt).toLocaleString('pt-BR')} • {order?.store?.name || 'Loja'}
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{formatCurrency(Number(order.total || 0))}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/pedido/${order.id}`)}
                      className="rounded-lg bg-[linear-gradient(120deg,#0f172a,#1e293b)] px-3 py-1.5 text-[11px] font-bold text-white shadow-[0_10px_20px_-14px_rgba(15,23,42,0.8)]"
                    >
                      Acompanhar
                    </button>
                    {order?.store?.slug ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/${order.store.slug}`)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 inline-flex items-center gap-1"
                      >
                        <MapPinLine size={12} />
                        Ir para loja
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
