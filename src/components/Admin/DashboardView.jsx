import React, { useMemo } from 'react';
import { Package, DollarSign, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { formatCurrency } from '../../utils/format';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'];

export const DashboardView = ({ orders, customers = [] }) => {
  const stats = useMemo(() => {
    const totalSales = orders.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const totalOrders = orders.length;

    const productCount = {};
    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        productCount[item.name] = (productCount[item.name] || 0) + item.qty;
      });
    });

    const topProducts = Object.entries(productCount)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const salesByDay = {};
    orders.forEach((order) => {
      if (order.dateString) {
        salesByDay[order.dateString] = (salesByDay[order.dateString] || 0) + order.total;
      }
    });
    const chartData = Object.entries(salesByDay).map(([date, total]) => ({ date, total }));

    return { totalSales, totalOrders, topProducts, chartData };
  }, [orders]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">Faturamento Total</p>
              <h3 className="text-3xl font-black text-green-600">{formatCurrency(stats.totalSales)}</h3>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-green-600">
              <DollarSign />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">Total Pedidos</p>
              <h3 className="text-3xl font-black text-blue-600">{stats.totalOrders}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <Package />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">Ticket Médio</p>
              <h3 className="text-3xl font-black text-purple-600">
                {stats.totalOrders > 0 ? formatCurrency(stats.totalSales / stats.totalOrders) : 'R$ 0,00'}
              </h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
              <TrendingUp />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
          <h4 className="font-bold text-gray-700 mb-4">Vendas por Dia</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <RechartsTooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="total" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
          <h4 className="font-bold text-gray-700 mb-4">Top 5 Produtos Mais Vendidos</h4>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={stats.topProducts} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="qty">
                {stats.topProducts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-gray-700">Clientes</h4>
          <span className="text-sm text-gray-500">{customers.length} cadastrados</span>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y">
          {customers.map((customer) => (
            <div key={customer.id || customer.name} className="py-2 flex justify-between text-sm text-gray-700">
              <span className="font-semibold">{customer.name}</span>
              <span className="text-gray-500">{customer.phone}</span>
            </div>
          ))}
          {customers.length === 0 && (
            <div className="text-center text-gray-400 py-6 text-sm">Nenhum cliente registrado ainda.</div>
          )}
        </div>
      </div>
    </div>
  );
};
