// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { Package, CurrencyDollar, CheckCircle, CircleDashed, LinkSimple } from "@phosphor-icons/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../../utils/format";
import { exportToCsv } from "../../utils/export";

const COLORS = ["var(--color-primary)", "var(--color-secondary)", "#10b981", "#3b82f6"];

export const DashboardView = ({
  orders = [],
  customers = [],
  setupChecklist = [],
  storeUrl = "",
  storeName = "Chama no Espeto",
  storeLogo = "",
  storeDescription = "",
  linkStats = null,
}) => {
  const [qrCopied, setQrCopied] = useState(false);
  const utmStorageKey = useMemo(() => (storeUrl ? `utm:store:${storeUrl}` : "utm:store"), [storeUrl]);
  const [utmSource, setUtmSource] = useState("instagram");
  const [utmMedium, setUtmMedium] = useState("bio");
  const [utmCampaign, setUtmCampaign] = useState("organico");
  const [periodDays, setPeriodDays] = useState("30");
  const nowDate = new Date();
  const currentMonthKey = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [topSort, setTopSort] = useState("qty");
  const [customerQuery, setCustomerQuery] = useState("");
  const periodLabel = periodDays === "all" ? "Todo período" : `${periodDays} dias`;
  const linkStatsLabel = linkStats?.days ? `${linkStats.days} dias` : "7 dias";
  const linkStatsTotal = linkStats?.total ?? 0;
  const linkStatsSource = linkStats?.topSource || "direto";
  const linkStatsTop = Array.isArray(linkStats?.sources)
    ? linkStats.sources.slice(0, 3)
    : [];
  const utmUrl = useMemo(() => {
    if (!storeUrl) return "";
    const params = new URLSearchParams();
    if (utmSource) params.set("utm_source", utmSource);
    if (utmMedium) params.set("utm_medium", utmMedium);
    if (utmCampaign) params.set("utm_campaign", utmCampaign);
    const query = params.toString();
    return query ? `${storeUrl}?${query}` : storeUrl;
  }, [storeUrl, utmSource, utmMedium, utmCampaign]);

  useEffect(() => {
    if (!storeUrl) return;
    const cached = localStorage.getItem(utmStorageKey);
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached);
      if (parsed?.utmSource) setUtmSource(parsed.utmSource);
      if (parsed?.utmMedium) setUtmMedium(parsed.utmMedium);
      if (parsed?.utmCampaign) setUtmCampaign(parsed.utmCampaign);
    } catch {
      // ignore storage errors
    }
  }, [storeUrl, utmStorageKey]);

  useEffect(() => {
    if (!storeUrl) return;
    const payload = {
      utmSource,
      utmMedium,
      utmCampaign,
    };
    localStorage.setItem(utmStorageKey, JSON.stringify(payload));
  }, [utmSource, utmMedium, utmCampaign, storeUrl, utmStorageKey]);

  const formatMonthLabel = (key) => {
    if (!key) return "";
    const date = new Date(`${key}-01T00:00:00`);
    if (Number.isNaN(date.getTime())) return key;
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

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
    const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" });
    const day = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    return `${weekday} ${day}`;
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

  const availableMonths = useMemo(() => {
    const set = new Set();
    orders.forEach((order) => {
      const ts = resolveTimestamp(order);
      if (!ts) return;
      const key = new Date(ts).toISOString().slice(0, 7);
      set.add(key);
    });
    const sorted = Array.from(set).sort((a, b) => (a > b ? -1 : 1));
    if (!sorted.includes(currentMonthKey)) {
      sorted.unshift(currentMonthKey);
    }
    return sorted;
  }, [orders, currentMonthKey]);

  useEffect(() => {
    if (availableMonths.length === 0) return;
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

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
    const monthKey = selectedMonth || currentMonthKey;

    const ordersWithDate = orders
      .map((order) => ({ order, ts: resolveTimestamp(order) }))
      .filter((entry) => entry.ts !== null);

    const totalSales = ordersWithDate.reduce((acc, curr) => acc + resolveOrderTotal(curr.order), 0);
    const totalOrders = orders.length;
    const firstOrderAt = ordersWithDate.reduce((min, entry) => {
      if (entry.ts === null) return min;
      if (min === null) return entry.ts;
      return entry.ts < min ? entry.ts : min;
    }, null as number | null);
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
      const items =
        order.items ||
        order.products ||
        order.orderItems ||
        order.itens ||
        [];
      if (!Array.isArray(items)) return;
      items.forEach((item) => {
        const productName =
          item.name ||
          item.productName ||
          item.product?.name ||
          item.title ||
          item.label;
        const qty = Number(item.qty ?? item.quantity ?? item.amount ?? 1);
        if (!productName || qty <= 0) return;
        productCount[productName] = (productCount[productName] || 0) + qty;
      });
    });

    const topProducts = Object.entries(productCount)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);

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
    return { totalSales, totalOrders, topProducts, chartData, periodRevenue, monthRevenue, avgTicket, firstOrderAt };
  }, [orders, periodDays, selectedMonth, currentMonthKey]);

  const firstOrderLabel = useMemo(() => {
    if (!stats.firstOrderAt) return "Sem pedidos ainda";
    const date = new Date(stats.firstOrderAt);
    if (Number.isNaN(date.getTime())) return "Sem pedidos ainda";
    return `Desde ${date.toLocaleDateString("pt-BR")}`;
  }, [stats.firstOrderAt]);

  const sortedTopProducts = useMemo(() => {
    const list = [...stats.topProducts];
    if (topSort === "name") {
      return list.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 5);
    }
    return list.sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [stats.topProducts, topSort]);

  const filteredCustomers = useMemo(() => {
    const normalized = customerQuery.trim().toLowerCase();
    if (!normalized) return customers;
    return customers.filter((customer) => {
      const haystack = [customer.name, customer.phone].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
  }, [customers, customerQuery]);

  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), "pt-BR", { sensitivity: "base" })
    );
  }, [filteredCustomers]);

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

  const handlePrintQr = () => {
    if (!storeUrl || typeof window === "undefined") return;
    const printWindow = window.open("", "_blank", "width=700,height=900");
    if (!printWindow) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(storeUrl)}`;
    const safeStoreName = storeName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    printWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>QR do Cardápio - ${safeStoreName}</title>
          <style>
            body { margin: 0; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }
            .page { padding: 40px 24px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
            .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; padding: 32px; text-align: center; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08); }
            .title { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
            .subtitle { font-size: 14px; color: #475569; margin-bottom: 24px; }
            .qr { width: 300px; height: 300px; object-fit: contain; }
            .link { font-size: 12px; color: #64748b; margin-top: 18px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="card">
              <div class="title">Cardápio ${safeStoreName}</div>
              <div class="subtitle">Aponte a câmera para fazer seu pedido</div>
              <img class="qr" src="${qrUrl}" alt="QR Code do cardápio" />
              <div class="link">${storeUrl}</div>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };


  return (
    <div className="space-y-6 animate-in fade-in">
      {setupChecklist.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                {storeLogo ? (
                  <img src={storeLogo} alt={storeName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-black text-slate-500">🍢</span>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Checklist de ativação</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">{storeName}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {storeDescription || "Complete os passos abaixo para ativar a melhor experiência para seus clientes."}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start lg:items-end gap-3">
              <div className="text-xs text-slate-500">
                {setupChecklist.filter((item) => item.done).length} de {setupChecklist.length} completos
              </div>
              {storeUrl && (
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold shadow-sm hover:opacity-90"
                >
                  Ver minha loja
                </a>
              )}
            </div>
          </div>
          <div className="mt-5 h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-brand-primary"
              style={{
                width: `${
                  setupChecklist.length === 0
                    ? 0
                    : Math.round((setupChecklist.filter((item) => item.done).length / setupChecklist.length) * 100)
                }%`,
              }}
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {setupChecklist.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                  item.done ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  {item.done ? (
                    <CheckCircle size={16} weight="duotone" className="text-emerald-600" />
                  ) : (
                    <CircleDashed size={16} weight="duotone" className="text-slate-400" />
                  )}
                  <span>{item.label}</span>
                </div>
                {!item.done && item.onClick && (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-brand-primary border border-brand-primary/40 hover:bg-brand-primary/10"
                  >
                    {item.action || "Completar"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {storeUrl && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="flex-1 space-y-2">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">QR do cardápio</p>
              <h3 className="text-xl font-black text-slate-900">Imprima e coloque nas mesas</h3>
              <p className="text-sm text-slate-500">
                O cliente aponta a câmera, abre o cardápio e faz o pedido em segundos.
              </p>
              <div className="mt-4 text-xs text-slate-500">
                Imprima e coloque nas mesas ou copie o link do cardápio.
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(storeUrl)}`}
                  alt="QR do cardápio"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(storeUrl);
                    setQrCopied(true);
                    setTimeout(() => setQrCopied(false), 1500);
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {qrCopied ? "Link copiado!" : "Copiar link"}
                </button>
                <button
                  type="button"
                  onClick={handlePrintQr}
                  className="px-3 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:opacity-90"
                >
                  Gerar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ---------- CARDS RESUMO ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* Faturamento total */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">
                Receita total
              </p>
              <h3 className="text-3xl font-black text-brand-primary">
                {formatCurrency(stats.totalSales)}
              </h3>
              <p className="text-xs text-gray-500 mt-1">{firstOrderLabel}</p>
            </div>
            <div className="p-3 bg-brand-primary-soft rounded-lg text-brand-primary">
              <CurrencyDollar weight="duotone" />
            </div>
          </div>
        </div>

        {/* Faturamento do mês */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">
                Receita do mês
              </p>
              <h3 className="text-3xl font-black text-brand-primary">
                {formatCurrency(stats.monthRevenue)}
              </h3>
              <div className="mt-2">
                <label className="text-[10px] uppercase tracking-wide text-gray-400">Mês selecionado</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="mt-1 w-full text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white"
                >
                  {availableMonths.map((monthKey) => (
                    <option key={monthKey} value={monthKey}>
                      {formatMonthLabel(monthKey)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-3 bg-brand-primary-soft rounded-lg text-brand-primary">
              <CurrencyDollar weight="duotone" />
            </div>
          </div>
        </div>

        {/* Faturamento do período */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
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
              <CurrencyDollar weight="duotone" />
            </div>
          </div>
        </div>

        {/* Total Pedidos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">
                Pedidos realizados
              </p>
              <h3 className="text-3xl font-black text-brand-secondary">
                {stats.totalOrders}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Valor médio por pedido: {formatCurrency(stats.avgTicket)}
              </p>
            </div>
            <div className="p-3 bg-brand-secondary-soft rounded-lg text-brand-secondary">
              <Package weight="duotone" />
            </div>
          </div>
        </div>

      </div>

      <div className="grid lg:grid-cols-[1.4fr_0.6fr] gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Divulgação</p>
              <h3 className="text-xl font-black text-slate-900 mt-2">Link com UTM pronto</h3>
              <p className="text-sm text-slate-500 mt-1">
                Use para medir Instagram, WhatsApp e anúncios.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs text-slate-500">
              UTM automático
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_220px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="grid gap-3 xl:grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr] items-end">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Campanha</p>
                <input
                  type="text"
                  value={utmCampaign}
                  onChange={(event) => setUtmCampaign(event.target.value)}
                  placeholder="ex: chamanoespeto"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Canal</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['instagram', 'whatsapp', 'google', 'outros'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setUtmSource(option)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                        utmSource === option
                          ? 'bg-brand-primary text-white border-brand-primary'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Formato</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['bio', 'link', 'anuncio', 'promo'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setUtmMedium(option)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                        utmMedium === option
                          ? 'bg-brand-secondary text-white border-brand-secondary'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => copyUtm()}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {qrCopied ? 'Link copiado!' : 'Copiar link'}
                </button>
                <button
                  type="button"
                  onClick={() => window.open(utmUrl || storeUrl, '_blank')}
                  className="px-3 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:opacity-90"
                >
                  Abrir link
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: 'Instagram', utmSource: 'instagram', utmMedium: 'bio' },
                { label: 'WhatsApp', utmSource: 'whatsapp', utmMedium: 'status' },
                { label: 'Facebook', utmSource: 'facebook', utmMedium: 'feed' },
                { label: 'Google Ads', utmSource: 'google', utmMedium: 'cpc' },
                { label: 'TikTok', utmSource: 'tiktok', utmMedium: 'video' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => copyUtm({ utmSource: preset.utmSource, utmMedium: preset.utmMedium })}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Última campanha</p>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Canal</span>
                  <span className="font-semibold text-slate-800">{utmSource || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Formato</span>
                  <span className="font-semibold text-slate-800">{utmMedium || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Campanha</span>
                  <span className="font-semibold text-slate-800">{utmCampaign || '—'}</span>
                </div>
              </div>
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                Compartilhe o link e acompanhe as origens abaixo.
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-start-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-bold uppercase">
                Acessos no link
              </p>
              <h3 className="text-3xl font-black text-brand-primary">
                {linkStatsTotal}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {linkStatsLabel} · Origem: {linkStatsSource}
              </p>
              {linkStatsTop.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {linkStatsTop.map((entry) => (
                    <span
                      key={entry.source}
                      className="px-2 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600"
                    >
                      {entry.source} · {entry.total}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 bg-brand-primary-soft rounded-lg text-brand-primary">
              <LinkSimple weight="duotone" />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- GRÁFICOS ---------- */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Faturamento por dia */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-80 overflow-hidden flex flex-col">
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
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all hover:-translate-y-0.5 active:scale-95 ${
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
              <div className="text-center space-y-2">
                <div className="text-4xl">📊</div>
                <p className="text-sm font-semibold text-slate-600">Sem vendas registradas ainda.</p>
                <p className="text-xs text-slate-400">As vendas do período aparecerão aqui.</p>
              </div>
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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-80 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h4 className="font-bold text-gray-700">
              Top 5 Produtos Mais Vendidos
            </h4>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 uppercase tracking-wide">Ordenar</span>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-full p-1">
                {[
                  { id: "qty", label: "Qtd" },
                  { id: "name", label: "Nome" },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setTopSort(option.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all hover:-translate-y-0.5 active:scale-95 ${
                      topSort === option.id
                        ? "bg-brand-primary text-white"
                        : "text-slate-500 hover:bg-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {sortedTopProducts.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              <div className="text-center space-y-2">
                <div className="text-4xl">🥩</div>
                <p className="text-sm font-semibold text-slate-600">Sem produtos vendidos ainda.</p>
                <p className="text-xs text-slate-400">Quando vender, o ranking aparece aqui.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedTopProducts.map((product, index) => {
                const maxQty = sortedTopProducts[0]?.qty || 1;
                const percent = Math.max(8, Math.round((product.qty / maxQty) * 100));
                return (
                  <div key={`${product.name}-${index}`} className="space-y-1">
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <span className="font-semibold truncate">{product.name}</span>
                      <span className="text-xs text-slate-500">{product.qty}x</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percent}%`,
                          background: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ---------- LISTA DE CLIENTES ---------- */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <h4 className="font-bold text-gray-700">Clientes</h4>
            <span className="text-sm text-gray-500">
              {filteredCustomers.length} cadastrados
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              placeholder="Buscar cliente ou telefone"
              className="w-full sm:w-56 px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-primary"
            />
            <button
              onClick={exportCustomers}
              className="px-3 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:opacity-90 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              Exportar Excel (.csv)
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            {sortedCustomers.map((customer) => {
              const initials = String(customer.name || 'CL')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join('');
              return (
                <div
                  key={customer.id || customer.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                      {initials || 'CL'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{customer.name}</p>
                      <p className="text-xs text-slate-500">{customer.phone ? 'Contato cadastrado' : 'Sem telefone'}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white border border-slate-200 text-slate-600">
                    {customer.phone}
                  </span>
                </div>
              );
            })}
          </div>

          {sortedCustomers.length === 0 && (
            <div className="text-center text-gray-400 py-6 text-sm">
              <div className="mx-auto max-w-sm space-y-2">
                <div className="text-4xl">👥</div>
                <p className="text-sm font-semibold text-slate-600">Nenhum cliente encontrado.</p>
                <p className="text-xs text-slate-400">Assim que houver pedidos, os clientes aparecem aqui.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
  const copyUtm = async (overrides = {}) => {
    if (!storeUrl) return;
    const params = new URLSearchParams();
    const source = overrides.utmSource ?? utmSource;
    const medium = overrides.utmMedium ?? utmMedium;
    const campaign = overrides.utmCampaign ?? utmCampaign;
    if (source) params.set("utm_source", source);
    if (medium) params.set("utm_medium", medium);
    if (campaign) params.set("utm_campaign", campaign);
    const query = params.toString();
    const url = query ? `${storeUrl}?${query}` : storeUrl;
    await navigator.clipboard.writeText(url);
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 1500);
  };
