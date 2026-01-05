// @ts-nocheck
import React, { useMemo } from "react";
import { Package, DollarSign } from "lucide-react";
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
  Cell,
} from "recharts";
import { formatCurrency } from "../../utils/format";
import { exportToCsv } from "../../utils/export";

const COLORS = ["var(--color-primary)", "var(--color-secondary)", "#10b981", "#3b82f6"];

export const DashboardView = ({ orders = [], customers = [] }) => {
  const resolveDateKey = (order) => {
    if (order.dateString) return order.dateString;
    const raw = order.createdAt || order.created_at;
    if (!raw) return null;
    const date = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("pt-BR");
  };

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
      const key = resolveDateKey(order);
      if (!key) return;
      salesByDay[key] = (salesByDay[key] || 0) + (order.total || 0);
    });

    const chartData = Object.entries(salesByDay).map(([date, total]) => ({
      date,
      total,
    }));

    return { totalSales, totalOrders, topProducts, chartData };
  }, [orders]);

  const exportCustomers = () => {
    const headers = [
      { key: "nome", label: "Nome" },
      { key: "telefone", label: "Telefone" },
    ];

    const rows = customers.map((c) => ({
      nome: c.name,
      telefone: c.phone,
    }));

    exportToCsv("clientes", headers, rows);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* ---------- CARDS RESUMO ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Faturamento total */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">
                Faturamento Total
              </p>
              <h3 className="text-3xl font-black text-brand-primary">
                {formatCurrency(stats.totalSales)}
              </h3>
            </div>
            <div className="p-3 bg-brand-primary-soft rounded-lg text-brand-primary">
              <DollarSign />
            </div>
          </div>
        </div>

        {/* Total Pedidos */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">
                Total Pedidos
              </p>
              <h3 className="text-3xl font-black text-brand-secondary">
                {stats.totalOrders}
              </h3>
            </div>
            <div className="p-3 bg-brand-secondary-soft rounded-lg text-brand-secondary">
              <Package />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- GRÁFICOS ---------- */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Faturamento por dia */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 overflow-hidden">
          <h4 className="font-bold text-gray-700 mb-4">Vendas por Dia</h4>
          {stats.chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              Sem vendas registradas ainda.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <RechartsTooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top produtos */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 overflow-hidden">
          <h4 className="font-bold text-gray-700 mb-4">
            Top 5 Produtos Mais Vendidos
          </h4>
          {stats.topProducts.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              Sem produtos vendidos ainda.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.topProducts}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="qty"
                >
                  {stats.topProducts.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) =>
                    value.length > 16 ? `${value.slice(0, 16)}...` : value
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ---------- LISTA DE CLIENTES ---------- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <h4 className="font-bold text-gray-700">Clientes</h4>
            <span className="text-sm text-gray-500">
              {customers.length} cadastrados
            </span>
          </div>

          <button
            onClick={exportCustomers}
            className="px-3 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:opacity-90"
          >
            Exportar Excel (.csv)
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-lg">
          <div className="grid grid-cols-2 text-xs font-bold uppercase text-gray-500 bg-gray-50 px-3 py-2">
            <span>Cliente</span>
            <span>Telefone</span>
          </div>

          <div className="divide-y">
            {customers.map((customer) => (
              <div
                key={customer.id || customer.name}
                className="py-2 px-3 grid grid-cols-2 text-sm text-gray-700 items-center"
              >
                <span className="font-semibold truncate">{customer.name}</span>
                <span className="text-gray-600">{customer.phone}</span>
              </div>
            ))}

            {customers.length === 0 && (
              <div className="text-center text-gray-400 py-6 text-sm">
                Nenhum cliente registrado ainda.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
