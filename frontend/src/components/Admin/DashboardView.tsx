// @ts-nocheck
import React, { useMemo, useState } from "react";
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
  const [periodDays, setPeriodDays] = useState("30");
  const periodLabel = periodDays === "all" ? "Todo período" : `${periodDays} dias`;
  const monthLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const resolveDateKey = (order) => {
    const raw = order.createdAt || order.created_at;
    if (!raw) return null;
    const date = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  };

  const resolveDateLabel = (key) => {
    if (!key) return "";
    const date = new Date(`${key}T00:00:00`);
    if (Number.isNaN(date.getTime())) return key;
    return date.toLocaleDateString("pt-BR");
  };

  const resolveTimestamp = (order) => {
    const raw = order.createdAt || order.created_at;
    if (!raw) return null;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
    if (raw?.seconds) return raw.seconds * 1000;
    if (raw instanceof Date) {
      const time = raw.getTime();
      return Number.isFinite(time) ? time : null;
    }
    const date = new Date(raw);
    const time = date.getTime();
    return Number.isFinite(time) ? time : null;
  };

  const resolveOrderTotal = (order) => {
    if (typeof order.total === "number") return order.total;
    if (order.total && !Number.isNaN(Number(order.total))) return Number(order.total);
    return (order.items || []).reduce((acc, item) => {
      const qty = Number(item.qty ?? item.quantity ?? 0);
      const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
      return acc + qty * unitPrice;
    }, 0);
  };

  const stats = useMemo(() => {
    const now = Date.now();
    const rangeDays = periodDays === "all" ? null : Number(periodDays);
    const startPeriod = rangeDays ? now - rangeDays * 24 * 60 * 60 * 1000 : null;
    const nowDate = new Date();
    const monthKey = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}`;

    const ordersWithDate = orders
      .map((order) => ({ order, ts: resolveTimestamp(order) }))
      .filter((entry) => entry.ts !== null);

    const totalSales = ordersWithDate.reduce((acc, curr) => acc + resolveOrderTotal(curr.order), 0);
    const totalOrders = orders.length;
    const periodOrders = rangeDays
      ? ordersWithDate.filter((entry) => entry.ts >= startPeriod)
      : ordersWithDate;
    const periodRevenue = periodOrders.reduce((acc, curr) => acc + resolveOrderTotal(curr.order), 0);
    const monthRevenue = ordersWithDate.reduce((acc, curr) => {
      const key = new Date(curr.ts).toISOString().slice(0, 7);
      if (key !== monthKey) return acc;
      return acc + resolveOrderTotal(curr.order);
    }, 0);

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
    periodOrders.forEach(({ order }) => {
      const key = resolveDateKey(order);
      if (!key) return;
      salesByDay[key] = (salesByDay[key] || 0) + resolveOrderTotal(order);
    });

    const chartData = Object.entries(salesByDay)
      .map(([date, total]) => ({
        date,
        label: resolveDateLabel(date),
        total,
      }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
    return { totalSales, totalOrders, topProducts, chartData, periodRevenue, monthRevenue, avgTicket };
  }, [orders, periodDays]);

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento total */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">
                Receita total
              </p>
              <h3 className="text-3xl font-black text-brand-primary">
                {formatCurrency(stats.totalSales)}
              </h3>
              <p className="text-xs text-gray-500 mt-1">Total desde o início</p>
            </div>
            <div className="p-3 bg-brand-primary-soft rounded-lg text-brand-primary">
              <DollarSign />
            </div>
          </div>
        </div>

        {/* Faturamento do mês */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">
                Receita do mês
              </p>
              <h3 className="text-3xl font-black text-brand-primary">
                {formatCurrency(stats.monthRevenue)}
              </h3>
              <p className="text-xs text-gray-500 mt-1">Mês: {monthLabel}</p>
            </div>
            <div className="p-3 bg-brand-primary-soft rounded-lg text-brand-primary">
              <DollarSign />
            </div>
          </div>
        </div>

        {/* Faturamento do período */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">
                Receita do período
              </p>
              <h3 className="text-3xl font-black text-brand-primary">
                {formatCurrency(stats.periodRevenue)}
              </h3>
              <p className="text-xs text-gray-500 mt-1">Período: {periodLabel}</p>
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
              <p className="text-xs text-gray-500 mt-1">
                Ticket médio: {formatCurrency(stats.avgTicket)}
              </p>
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 overflow-hidden flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h4 className="font-bold text-gray-700">Vendas por dia</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "30", label: "30d" },
                { id: "60", label: "60d" },
                { id: "90", label: "90d" },
                { id: "all", label: "Tudo" },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setPeriodDays(option.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                    periodDays === option.id
                      ? "bg-brand-primary text-white border-brand-primary"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {stats.chartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              Sem vendas registradas ainda.
            </div>
          ) : (
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} barSize={24}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" fontSize={11} interval="preserveStartEnd" />
                <YAxis fontSize={11} tickFormatter={(value) => `R$ ${value}`} />
                <RechartsTooltip
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => `Dia ${label}`}
                />
                <Bar dataKey="total" fill="url(#salesGradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
              </ResponsiveContainer>
            </div>
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
