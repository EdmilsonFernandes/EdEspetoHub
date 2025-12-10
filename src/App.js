import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart,
  Send,
  UtensilsCrossed,
  User,
  ChefHat,
  LayoutDashboard,
  Package,
  FileText,
  LogOut
} from 'lucide-react';
import { productService } from './services/productService';
import { orderService } from './services/orderService';
import { authService } from './services/authService';
import { MenuView } from './components/Client/MenuView';
import { CartView } from './components/Client/CartView';
import { SuccessView } from './components/Client/SuccessView';
import { DashboardView } from './components/Admin/DashboardView';
import { ProductManager } from './components/Admin/ProductManager';
import { GrillQueue } from './components/Admin/GrillQueue';
import { formatCurrency } from './utils/format';
import './index.css';

const initialCustomer = { name: '', phone: '', address: '', table: '', type: 'delivery' };
const WHATSAPP_NUMBER = process.env.REACT_APP_WHATSAPP_NUMBER || '5512999999999';
const PIX_KEY = process.env.REACT_APP_PIX_KEY || '';

function App() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState('menu');
  const [adminTab, setAdminTab] = useState('dashboard');
  const [cart, setCart] = useState({});
  const [customer, setCustomer] = useState(initialCustomer);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const savedSession = localStorage.getItem('adminSession');
    if (savedSession) {
      const parsedSession = JSON.parse(savedSession);
      setUser(parsedSession);
      setView('admin');
    }

    const unsubProd = productService.subscribe(setProducts);
    const unsubOrders = orderService.subscribeAll(setOrders);
    return () => {
      unsubProd();
      unsubOrders();
    };
  }, []);

  const cartTotal = useMemo(() => Object.values(cart).reduce((acc, item) => acc + item.price * item.qty, 0), [cart]);

  const updateCart = (item, qty) => {
    setCart((previous) => {
      const currentQty = previous[item.id]?.qty || 0;
      const nextQty = currentQty + qty;
      if (nextQty <= 0) {
        const copy = { ...previous };
        delete copy[item.id];
        return copy;
      }
      return { ...previous, [item.id]: { ...item, qty: nextQty } };
    });
  };

  const checkout = async () => {
    if (!customer.name || !customer.phone) {
      alert('Preencha Nome e Telefone');
      return;
    }

    if (customer.type === 'delivery' && !customer.address) {
      alert('Informe o endereço completo para entrega.');
      return;
    }

    const isPickup = customer.type === 'pickup';
    const payment = isPickup ? 'pix' : 'offline';

    const order = {
      ...customer,
      items: Object.values(cart),
      total: cartTotal,
      status: 'pending',
      payment
    };

    await orderService.save(order);

    if (isPickup) {
      const itemsList = Object.values(cart)
        .map((item) => `▪ ${item.qty}x ${item.name}`)
        .join('\n');

      const messageLines = [
        '*NOVO PEDIDO - DATONY*',
        '------------------',
        `👤 *${customer.name}* (${customer.phone})`,
        `🛒 *Tipo:* ${customer.type}`,
        customer.address ? `📍 End: ${customer.address}` : '',
        '------------------',
        itemsList,
        '------------------',
        `💰 *TOTAL: ${formatCurrency(cartTotal)}*`,
        PIX_KEY ? `💳 Pagamento via PIX: ${PIX_KEY}` : '💳 Gerar Pix para retirada na loja'
      ].filter(Boolean);

      const encodedMessage = encodeURIComponent(messageLines.join('\n'));
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank');
    }

    setCart({});
    setCustomer(initialCustomer);
    setView('success');
  };

  const handleLogin = async (event) => {
    event?.preventDefault();
    setLoginError('');

    try {
      const session = await authService.login(loginForm.username, loginForm.password);
      const sessionData = { ...session, username: loginForm.username };
      localStorage.setItem('adminSession', JSON.stringify(sessionData));
      setUser(sessionData);
      setView('admin');
    } catch (error) {
      setLoginError(error.message || 'Falha ao autenticar');
    }
  };

  const logout = () => {
    localStorage.removeItem('adminSession');
    setUser(null);
    setLoginForm({ username: '', password: '' });
    setView('menu');
  };

  if (view === 'admin' && user) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <aside className="w-64 bg-gray-900 text-white hidden md:flex flex-col">
          <div className="p-6">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ChefHat className="text-red-500" /> Datony Admin
            </h1>
            <p className="text-xs text-gray-400 mt-1">Gerenciamento Profissional</p>
          </div>
          <nav className="flex-1 px-4 space-y-2">
            <button
              onClick={() => setAdminTab('dashboard')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm ${
                adminTab === 'dashboard' ? 'bg-red-600 font-bold' : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button
              onClick={() => setAdminTab('products')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm ${
                adminTab === 'products' ? 'bg-red-600 font-bold' : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <Package size={18} /> Produtos
            </button>
            <button
              onClick={() => setAdminTab('queue')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm ${
                adminTab === 'queue' ? 'bg-red-600 font-bold' : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <UtensilsCrossed size={18} /> Fila do Churrasqueiro
            </button>
            <button
              onClick={() => setAdminTab('reports')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm ${
                adminTab === 'reports' ? 'bg-red-600 font-bold' : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <FileText size={18} /> Relatório Vendas
            </button>
          </nav>
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">
                {user.name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{user.name || 'Administrador'}</p>
                <p className="text-xs text-gray-500 truncate">{user.username || 'admin'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full border border-gray-600 text-gray-300 py-2 rounded text-sm hover:bg-gray-800 flex items-center justify-center gap-2"
            >
              <LogOut size={16} /> Sair
            </button>
            <button onClick={() => setView('menu')} className="w-full mt-2 text-center text-xs text-red-400 hover:underline">
              Ver Loja
            </button>
          </div>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto">
          <header className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 capitalize">{adminTab}</h2>
            <div className="md:hidden">
              <button onClick={() => setView('menu')} className="text-sm bg-gray-200 px-3 py-1 rounded">
                Ir para Loja
              </button>
            </div>
          </header>

          {adminTab === 'dashboard' && <DashboardView orders={orders} />}
          {adminTab === 'products' && <ProductManager products={products} />}
          {adminTab === 'queue' && <GrillQueue />}
          {adminTab === 'reports' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex justify-between">
                <h3 className="font-bold text-gray-700">Histórico Completo</h3>
                <span className="text-sm text-gray-500">{orders.length} pedidos</span>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 sticky top-0">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((order) => (
                    <tr key={order.id}>
                        <td className="p-3 text-gray-500">
                          {
                            order.createdAt?.seconds
                              ? new Date(order.createdAt.seconds * 1000).toLocaleString()
                              : order.createdAt
                                ? new Date(order.createdAt).toLocaleString()
                                : order.timestamp
                                  ? new Date(order.timestamp).toLocaleString()
                                  : order.dateString
                          }
                        </td>
                        <td className="p-3 font-medium">{order.name}</td>
                        <td className="p-3 uppercase text-xs font-bold">{order.type}</td>
                        <td className="p-3 font-bold text-green-600">{formatCurrency(order.total || 0)}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {order.status?.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-24">
      <header className="bg-white sticky top-0 z-30 shadow-sm">
        <div className="bg-red-900 text-white p-1 text-center text-[10px] md:text-xs font-medium uppercase tracking-wider">
          O melhor churrasco da região • Peça agora
        </div>
        <div className="p-4 flex justify-between items-center max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center text-red-900 font-black text-xl shadow-sm">
              ED
            </div>
            <div>
              <h1 className="font-bold text-gray-800 leading-none">Datony</h1>
              <span className="text-xs text-gray-500">Espetinhos Premium</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <button
              onClick={() => {
                setView('login');
                setLoginError('');
              }}
              className="hover:text-red-600 transition-colors"
            >
              <User size={20} />
            </button>
            <button onClick={() => setView('grill')} className="hover:text-red-600 transition-colors">
              <ChefHat size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        {view === 'login' && (
          <form onSubmit={handleLogin} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Acesso do administrador</h2>
              <p className="text-sm text-gray-500">Use usuário e senha definidos no banco (PGUSER/PGPASSWORD).</p>
            </div>

            {loginError && <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg">{loginError}</div>}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700" htmlFor="username">
                Usuário
              </label>
              <input
                id="username"
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none"
                placeholder="postgres"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none"
                placeholder="senha do banco"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setView('menu')}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
        {view === 'menu' && <MenuView products={products} cart={cart} onUpdateCart={updateCart} onProceed={() => setView('cart')} />}
        {view === 'cart' && (
          <CartView
            cart={cart}
            customer={customer}
            onChangeCustomer={setCustomer}
            onCheckout={checkout}
            onBack={() => setView('menu')}
          />
        )}
        {view === 'success' && <SuccessView onNewOrder={() => setView('menu')} />}
        {view === 'grill' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-gray-700 font-semibold">
              <ChefHat className="text-red-500" /> Visão do Churrasqueiro
            </div>
            <GrillQueue />
            <button
              onClick={() => setView('menu')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white rounded-lg border"
            >
              <ShoppingCart size={16} /> Voltar para pedidos
            </button>
          </div>
        )}
      </main>

      {view === 'menu' && Object.keys(cart).length > 0 && (
        <div className="fixed bottom-6 left-6 right-6 z-40 max-w-lg mx-auto">
          <button
            onClick={() => setView('cart')}
            className="w-full bg-gray-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center transform hover:scale-[1.02] transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="bg-red-600 px-3 py-1 rounded-lg text-sm font-bold">
                {Object.values(cart).reduce((acc, item) => acc + item.qty, 0)}
              </span>
              <span className="font-bold">Ver sacola</span>
            </div>
            <span className="font-bold text-lg">{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}

      {view === 'cart' && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white rounded-full p-3 shadow-lg md:hidden" onClick={checkout}>
          <Send size={20} />
        </div>
      )}
    </div>
  );
}

export default App;
