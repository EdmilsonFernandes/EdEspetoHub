// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Package, CurrencyDollar, CheckCircle, CircleDashed, LinkSimple, CalendarBlank, TrendUp, CaretDown } from "@phosphor-icons/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatDate, formatPhoneInput } from "../../utils/format";
import { APP_TIMEZONE } from "../../utils/format";
import { exportToCsv } from "../../utils/export";
import { storeService } from "../../services/storeService";

const TOP_PRODUCT_BAR_COLORS = ["#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"];
const toDateInputValue = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
const formatDateKey = (dateKey, options = {}) => {
  if (!dateKey) return "";
  const [year, month, day] = String(dateKey).split("-").map((value) => Number(value));
  if (!year || !month || !day) return String(dateKey);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIMEZONE,
    ...options,
  }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
};
const sanitizeFileSegment = (value, fallback = "relatorio") => {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return normalized || fallback;
};
const isCompactPdfViewport = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(max-width: 760px)").matches
    : false;
const isNativePdfRuntime = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};
const toAbsoluteAssetUrl = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized || typeof window === "undefined") return normalized;
  try {
    return new URL(normalized, window.location.origin).toString();
  } catch {
    return normalized;
  }
};
const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
const blobToBase64 = async (blob) => {
  const dataUrl = await blobToDataUrl(blob);
  const [, base64 = ""] = String(dataUrl || "").split(",", 2);
  return base64;
};
const fetchAssetAsDataUrl = async (value) => {
  const assetUrl = toAbsoluteAssetUrl(value);
  if (!assetUrl || typeof fetch !== "function") return "";
  try {
    const response = await fetch(assetUrl, { credentials: "omit" });
    if (!response.ok) return "";
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return "";
  }
};
const resolveImageFormat = (dataUrl) => {
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "JPEG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "PNG";
};
const openPdfBlob = ({ blob, fileName }) => {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const blobUrl = URL.createObjectURL(blob);
  const cleanup = () => window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  const popup = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (popup) {
    cleanup();
    return true;
  }
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  cleanup();
  return true;
};
const savePdfDocument = async (doc, fileName) => {
  if (!doc || typeof doc.save !== "function") return false;
  try {
    const result = doc.save(fileName, { returnPromise: true });
    if (result && typeof result.then === "function") {
      await result;
    }
    return true;
  } catch {
    return false;
  }
};
const sharePdfBlob = async ({ blob, fileName, title }) => {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function" || typeof File === "undefined") {
    return false;
  }
  const file = new File([blob], fileName, { type: "application/pdf" });
  if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] })) {
    return false;
  }
  await navigator.share({
    title,
    files: [file],
  });
  return true;
};
const sharePdfWithNativeFile = async ({ blob, fileName, title }) => {
  if (!isNativePdfRuntime()) return false;
  const [{ Directory, Filesystem }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const shareCapability = await Share.canShare().catch(() => ({ value: false }));
  if (!shareCapability?.value) return false;
  const normalizedBaseName = sanitizeFileSegment(String(fileName || "").replace(/\.pdf$/i, ""), "relatorio-gerencial");
  const nativePath = `reports/${Date.now()}-${normalizedBaseName}.pdf`;
  const base64Pdf = await blobToBase64(blob);
  const writeResult = await Filesystem.writeFile({
    path: nativePath,
    data: base64Pdf,
    directory: Directory.Cache,
    recursive: true,
  });
  const fileUri =
    writeResult?.uri ||
    (
      await Filesystem.getUri({
        path: nativePath,
        directory: Directory.Cache,
      })
    ).uri;
  if (!fileUri) return false;
  try {
    await Share.share({
      title,
      text: title,
      files: [fileUri],
      dialogTitle: title,
    });
    return true;
  } catch {
    await Share.share({
      title,
      text: title,
      url: fileUri,
      dialogTitle: title,
    });
    return true;
  }
};

export const DashboardView = ({
  storeId = "",
  orders = [],
  customers = [],
  setupChecklist = [],
  storeUrl = "",
  storeName = "Já no Caminho",
  storeLogo = "",
  storeDescription = "",
  linkStats = null,
}) => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });
  const [qrCopied, setQrCopied] = useState(false);
  const [showUtm, setShowUtm] = useState(false);
  const [showChecklistDetails, setShowChecklistDetails] = useState(false);
  const [showChecklistCard, setShowChecklistCard] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(max-width: 767px)").matches;
  });
  const [showQrCard, setShowQrCard] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(max-width: 767px)").matches;
  });
  const todayDateKey = toDateInputValue(new Date());
  const defaultCustomStartDate = toDateInputValue(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
  const utmStorageKey = useMemo(() => (storeUrl ? `utm:store:${storeUrl}` : "utm:store"), [storeUrl]);
  const [utmSource, setUtmSource] = useState("instagram");
  const [utmMedium, setUtmMedium] = useState("bio");
  const [utmCampaign, setUtmCampaign] = useState("organico");
  const [periodDays, setPeriodDays] = useState("30");
  const [customStartDate, setCustomStartDate] = useState(defaultCustomStartDate);
  const [customEndDate, setCustomEndDate] = useState(todayDateKey);
  const nowDate = new Date();
  const currentMonthKey = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [topSort, setTopSort] = useState("qty");
  const [customerQuery, setCustomerQuery] = useState("");
  const [editingCustomerKey, setEditingCustomerKey] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingPhone, setEditingPhone] = useState("");
  const [analyticsReport, setAnalyticsReport] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [reportExporting, setReportExporting] = useState(false);
  const [reportExportError, setReportExportError] = useState("");
  const [hiddenCustomers, setHiddenCustomers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("customer-hidden") || "{}");
    } catch {
      return {};
    }
  });
  const [customerOverrides, setCustomerOverrides] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("customer-overrides") || "{}");
    } catch {
      return {};
    }
  });
  const isCustomPeriod = periodDays === "custom";
  const customRange = useMemo(() => {
    if (!isCustomPeriod || !customStartDate || !customEndDate) return null;
    return customStartDate <= customEndDate
      ? { startDate: customStartDate, endDate: customEndDate }
      : { startDate: customEndDate, endDate: customStartDate };
  }, [customEndDate, customStartDate, isCustomPeriod]);
  const periodLabel = customRange
    ? `${formatDateKey(customRange.startDate)} a ${formatDateKey(customRange.endDate)}`
    : periodDays === "all"
      ? "Todo período"
      : `${periodDays} dias`;
  const checklistDoneCount = setupChecklist.filter((item) => item.done).length;
  const checklistPendingCount = Math.max(0, setupChecklist.length - checklistDoneCount);
  const checklistProgress = setupChecklist.length === 0 ? 0 : Math.round((checklistDoneCount / setupChecklist.length) * 100);
  const linkStatsLabel = linkStats?.days ? `${linkStats.days} dias` : "7 dias";
  const linkStatsTotal = linkStats?.total ?? 0;
  const linkStatsSource = linkStats?.topSource || "direto";
  const linkStatsTop = Array.isArray(linkStats?.sources)
    ? linkStats.sources.slice(0, 3)
    : [];
  const normalizeCustomerKey = (customer) =>
    `${(customer?.name || "").toString().trim().toLowerCase()}|${(customer?.phone || "").toString().trim().toLowerCase()}`;
  const applyOverride = (customer) => {
    const key = normalizeCustomerKey(customer);
    const override = customerOverrides[key];
    return {
      ...customer,
      __key: key,
      name: override?.name ?? customer.name,
      phone: override?.phone ?? customer.phone,
    };
  };
  const utmUrl = useMemo(() => {
    if (!storeUrl) return "";
    const params = new URLSearchParams();
    if (utmSource) params.set("utm_source", utmSource);
    if (utmMedium) params.set("utm_medium", utmMedium);
    if (utmCampaign) params.set("utm_campaign", utmCampaign);
    const query = params.toString();
    return query ? `${storeUrl}?${query}` : storeUrl;
  }, [storeUrl, utmSource, utmMedium, utmCampaign]);

  const copyUtm = async (overrides = {}) => {
    if (!storeUrl || typeof navigator === "undefined" || !navigator.clipboard) return;
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

  useEffect(() => {
    if (!setupChecklist.length) return;
    setShowChecklistDetails(checklistPendingCount > 0);
  }, [setupChecklist.length, checklistPendingCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => {
      const mobile = media.matches;
      setIsMobile(mobile);
      if (!mobile) {
        setShowChecklistCard(true);
        setShowQrCard(true);
      }
    };
    update();
    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

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

  const activateCustomRange = () => {
    if (!customStartDate || !customEndDate) {
      setCustomStartDate(defaultCustomStartDate);
      setCustomEndDate(todayDateKey);
    }
    setPeriodDays("custom");
  };

  const handleCustomStartDateChange = (value) => {
    if (!value) return;
    setCustomStartDate(value);
    if (customEndDate && value > customEndDate) {
      setCustomEndDate(value);
    }
  };

  const handleCustomEndDateChange = (value) => {
    if (!value) return;
    setCustomEndDate(value);
    if (customStartDate && value < customStartDate) {
      setCustomStartDate(value);
    }
  };

  useEffect(() => {
    if (!storeId) {
      setAnalyticsReport(null);
      setAnalyticsError("");
      return;
    }

    let active = true;
    setAnalyticsLoading(true);
    setAnalyticsError("");

    storeService
      .getDashboardAnalytics(storeId, {
        periodDays: customRange ? null : periodDays,
        monthKey: selectedMonth,
        startDate: customRange?.startDate || null,
        endDate: customRange?.endDate || null,
      })
      .then((payload) => {
        if (active) {
          setAnalyticsReport(payload || null);
        }
      })
      .catch((error) => {
        if (!active) return;
        setAnalyticsReport(null);
        setAnalyticsError(error?.message || "Não foi possível atualizar o resumo consolidado agora.");
      })
      .finally(() => {
        if (active) setAnalyticsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [storeId, periodDays, selectedMonth, customRange]);

  const resolveDateKey = (order) => {
    const raw = order.createdAt || order.created_at;
    if (!raw) return null;
    const date = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  const resolveDateLabel = (key) => {
    if (!key) return "";
    const weekday = formatDateKey(key, { weekday: "short" });
    const day = formatDateKey(key, { day: "2-digit", month: "2-digit" });
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
      const key = new Intl.DateTimeFormat('en-CA', {
        timeZone: APP_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
      }).format(new Date(ts));
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
    const rangeDays = !customRange && periodDays !== "all" ? Number(periodDays) : null;
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
    const periodOrders = customRange
      ? ordersWithDate.filter((entry) => {
          const key = resolveDateKey(entry.order);
          return key && key >= customRange.startDate && key <= customRange.endDate;
        })
      : rangeDays
        ? ordersWithDate.filter((entry) => entry.ts >= startPeriod)
        : ordersWithDate;
    const periodRevenue = periodOrders.reduce((acc, curr) => acc + resolveOrderTotal(curr.order), 0);
    const monthRevenue = ordersWithDate.reduce((acc, curr) => {
      const key = new Intl.DateTimeFormat('en-CA', {
        timeZone: APP_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
      }).format(new Date(curr.ts));
      if (key !== monthKey) return acc;
      return acc + resolveOrderTotal(curr.order);
    }, 0);

    const productCount = {};
    periodOrders.forEach(({ order }) => {
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
  }, [orders, periodDays, selectedMonth, currentMonthKey, customRange]);

  const analyticsSummary = analyticsReport?.summary || null;
  const chartSource = useMemo(() => {
    if (Array.isArray(analyticsReport?.salesByDay) && analyticsReport.salesByDay.length > 0) {
      return analyticsReport.salesByDay
        .map((entry) => ({
          date: entry.date,
          label: resolveDateLabel(entry.date),
          total: Number(entry.total || 0),
        }))
        .sort((a, b) => (a.date > b.date ? 1 : -1));
    }
    return stats.chartData;
  }, [analyticsReport, stats.chartData]);

  const topProductsSource = useMemo(() => {
    if (Array.isArray(analyticsReport?.topProducts) && analyticsReport.topProducts.length > 0) {
      return analyticsReport.topProducts.map((product) => ({
        name: product.name,
        qty: Number(product.qty || 0),
        revenue: Number(product.revenue || 0),
      }));
    }
    return stats.topProducts;
  }, [analyticsReport, stats.topProducts]);

  const customerSource = useMemo(() => {
    if (Array.isArray(analyticsReport?.customers)) {
      return analyticsReport.customers;
    }
    return customers;
  }, [analyticsReport, customers]);

  const metrics = useMemo(() => {
    const totalSales = analyticsSummary ? Number(analyticsSummary.totalRevenue || 0) : stats.totalSales;
    const totalOrders = analyticsSummary ? Number(analyticsSummary.totalOrders || 0) : stats.totalOrders;
    const avgTicket = analyticsSummary ? Number(analyticsSummary.avgTicket || 0) : stats.avgTicket;
    return {
      totalSales,
      totalOrders,
      avgTicket,
      monthRevenue: analyticsSummary ? Number(analyticsSummary.monthRevenue || 0) : stats.monthRevenue,
      periodRevenue: analyticsSummary ? Number(analyticsSummary.periodRevenue || 0) : stats.periodRevenue,
      firstOrderAt: analyticsSummary?.firstOrderAt || stats.firstOrderAt || null,
      allTimeCustomerCount: analyticsSummary ? Number(analyticsSummary.allTimeCustomerCount || 0) : customerSource.length,
      periodCustomerCount: analyticsSummary?.periodCustomerCount != null ? Number(analyticsSummary.periodCustomerCount || 0) : null,
      periodLabel: analyticsSummary?.periodLabel || periodLabel,
    };
  }, [analyticsSummary, customerSource.length, periodLabel, stats]);

  const firstOrderLabel = useMemo(() => {
    if (!metrics.firstOrderAt) return "Sem pedidos ainda";
    const date = new Date(metrics.firstOrderAt);
    if (Number.isNaN(date.getTime())) return "Sem pedidos ainda";
    return `Desde ${date.toLocaleDateString("pt-BR")}`;
  }, [metrics.firstOrderAt]);

  const sortedTopProducts = useMemo(() => {
    const list = [...topProductsSource];
    if (topSort === "name") {
      return list.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 5);
    }
    return list.sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [topProductsSource, topSort]);

  const filteredCustomers = useMemo(() => {
    const normalized = customerQuery.trim().toLowerCase();
    const visible = customerSource
      .map(applyOverride)
      .filter((customer) => !hiddenCustomers[customer.__key]);
    if (!normalized) return visible;
    return visible.filter((customer) => {
      const haystack = [customer.name, customer.phone].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
  }, [customerSource, customerQuery, hiddenCustomers, customerOverrides]);

  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), "pt-BR", { sensitivity: "base" })
    );
  }, [filteredCustomers]);

  const exportCustomers = () => {
    const headers = [
      { key: "nome", label: "Nome" },
      { key: "telefone", label: "Telefone" },
      { key: "pedidos", label: "Pedidos" },
      { key: "ticketMedio", label: "Ticket medio" },
      { key: "totalGasto", label: "Total gasto" },
      { key: "ultimoPedido", label: "Ultimo pedido" },
    ];

    const rows = sortedCustomers.map((c) => ({
      nome: c.name,
      telefone: c.phone,
      pedidos: Number(c.ordersCount || 0),
      ticketMedio: formatCurrency(c.avgTicket || 0),
      totalGasto: formatCurrency(c.totalSpent || 0),
      ultimoPedido: formatDate(c.lastOrderAt),
    }));

    exportToCsv("clientes", headers, rows);
  };

  const startEditCustomer = (customer) => {
    const key = customer?.__key || normalizeCustomerKey(customer);
    setEditingCustomerKey(key);
    setEditingName(customer.name || "");
    setEditingPhone(customer.phone || "");
  };

  const saveCustomerEdit = () => {
    if (!editingCustomerKey) return;
    const next = {
      ...customerOverrides,
      [editingCustomerKey]: {
        name: editingName.trim(),
        phone: editingPhone.trim(),
      },
    };
    setCustomerOverrides(next);
    localStorage.setItem("customer-overrides", JSON.stringify(next));
    setEditingCustomerKey(null);
  };

  const hideCustomer = (customer) => {
    const key = customer?.__key || normalizeCustomerKey(customer);
    const next = { ...hiddenCustomers, [key]: true };
    setHiddenCustomers(next);
    localStorage.setItem("customer-hidden", JSON.stringify(next));
  };

  const handlePrintManagementReport = async () => {
    if (typeof window === "undefined") return;
    const reportCustomers =
      Array.isArray(analyticsReport?.periodCustomers) && analyticsReport.periodCustomers.length > 0
        ? analyticsReport.periodCustomers.slice(0, 20)
        : sortedCustomers.slice(0, 20);
    const productRows = sortedTopProducts.slice(0, 10);
    const reportCustomersRows = reportCustomers.length
      ? reportCustomers.map((customer, index) => [
          index + 1,
          customer.name || "Cliente",
          customer.phone || "-",
          Number(customer.ordersCount || 0),
          formatCurrency(customer.avgTicket || 0),
          formatCurrency(customer.totalSpent || 0),
          formatDate(customer.lastOrderAt) || "-",
        ])
      : [["-", "Sem clientes para o período selecionado.", "-", "-", "-", "-", "-"]];
    const reportTopProductsRows = productRows.length
      ? productRows.map((product, index) => [
          index + 1,
          product.name || "Produto",
          Number(product.qty || 0),
          formatCurrency(product.revenue || 0),
        ])
      : [["-", "Sem vendas no período selecionado.", "-", "-"]];

    setReportExporting(true);
    setReportExportError("");
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const logoDataUrl = await fetchAssetAsDataUrl(storeLogo);
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 38;
      const contentWidth = pageWidth - marginX * 2;
      const compactViewport = isCompactPdfViewport();
      const generatedAtLabel = new Date().toLocaleString("pt-BR", {
        timeZone: APP_TIMEZONE,
        dateStyle: "short",
        timeStyle: "short",
      });
      const headerTop = 34;
      const headerHeight = 122;
      const headerX = marginX;
      const metaBoxWidth = 176;
      const metaBoxHeight = 86;
      const gap = 12;
      const metricWidth = (contentWidth - gap) / 2;
      const metricHeight = 78;
      const fileName = `relatorio-gerencial-${sanitizeFileSegment(storeName, "loja")}-${sanitizeFileSegment(
        customRange ? `${customRange.startDate}-${customRange.endDate}` : periodDays === "all" ? "todo-periodo" : metrics.periodLabel,
        "periodo"
      )}.pdf`;

      const drawMetricCard = (x, y, label, value, helper) => {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, metricWidth, metricHeight, 18, 18, "F");
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, metricWidth, metricHeight, 18, 18, "S");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(String(label || "").toUpperCase(), x + 16, y + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42);
        doc.text(String(value || "-"), x + 16, y + 46);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        const helperLines = doc.splitTextToSize(String(helper || ""), metricWidth - 32);
        doc.text(helperLines, x + 16, y + 61);
      };

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(headerX, headerTop, contentWidth, headerHeight, 24, 24, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(headerX, headerTop, contentWidth, headerHeight, 24, 24, "S");

      if (logoDataUrl) {
        doc.addImage(
          logoDataUrl,
          resolveImageFormat(logoDataUrl),
          headerX + 18,
          headerTop + 20,
          56,
          56
        );
      } else {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(headerX + 18, headerTop + 20, 56, 56, 18, 18, "F");
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(headerX + 18, headerTop + 20, 56, 56, 18, 18, "S");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42);
        doc.text(String(storeName || "LO").slice(0, 2).toUpperCase(), headerX + 46, headerTop + 55, { align: "center" });
      }

      const textStartX = headerX + 92;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("RELATÓRIO GERENCIAL", textStartX, headerTop + 24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(15, 23, 42);
      doc.text(String(storeName || "Já no Caminho"), textStartX, headerTop + 50, {
        maxWidth: contentWidth - metaBoxWidth - 126,
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      const subtitleLines = doc.splitTextToSize(
        `Período analisado: ${metrics.periodLabel} · Mês de referência: ${formatMonthLabel(selectedMonth)}`,
        contentWidth - metaBoxWidth - 126
      );
      doc.text(subtitleLines, textStartX, headerTop + 72);

      const metaX = headerX + contentWidth - metaBoxWidth - 18;
      const metaY = headerTop + 18;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(metaX, metaY, metaBoxWidth, metaBoxHeight, 18, 18, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(metaX, metaY, metaBoxWidth, metaBoxHeight, 18, 18, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("Base de clientes", metaX + 14, metaY + 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(
        doc.splitTextToSize(
          `${metrics.allTimeCustomerCount} na base${metrics.periodCustomerCount != null ? ` · ${metrics.periodCustomerCount} ativos no período` : ""}`,
          metaBoxWidth - 28
        ),
        metaX + 14,
        metaY + 36
      );
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("Primeiro pedido", metaX + 14, metaY + 60);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(formatDate(metrics.firstOrderAt) || "Sem pedidos ainda", metaX + 14, metaY + 76);

      const metricTop = headerTop + headerHeight + 16;
      drawMetricCard(headerX, metricTop, "Receita total", formatCurrency(metrics.totalSales), firstOrderLabel);
      drawMetricCard(headerX + metricWidth + gap, metricTop, "Receita do mês", formatCurrency(metrics.monthRevenue), formatMonthLabel(selectedMonth));
      drawMetricCard(headerX, metricTop + metricHeight + gap, "Receita do período", formatCurrency(metrics.periodRevenue), metrics.periodLabel);
      drawMetricCard(
        headerX + metricWidth + gap,
        metricTop + metricHeight + gap,
        "Pedidos realizados",
        String(metrics.totalOrders),
        `Ticket médio: ${formatCurrency(metrics.avgTicket)}`
      );

      let cursorY = metricTop + metricHeight * 2 + gap + 28;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(15, 23, 42);
      doc.text("Itens mais vendidos do período", headerX, cursorY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("Ranking calculado com base no período atualmente selecionado no dashboard.", headerX, cursorY + 16);

      autoTable(doc, {
        startY: cursorY + 28,
        margin: { left: headerX, right: headerX },
        head: [["#", "Produto", "Qtd", "Receita"]],
        body: reportTopProductsRows,
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 10,
          lineColor: [226, 232, 240],
          lineWidth: 1,
          cellPadding: 8,
          textColor: [15, 23, 42],
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
          halign: "left",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 28, halign: "center" },
          2: { cellWidth: 48, halign: "center" },
          3: { cellWidth: 92, halign: "right" },
        },
      });

      cursorY = (doc.lastAutoTable?.finalY || cursorY + 120) + 28;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(15, 23, 42);
      doc.text("Clientes em destaque", headerX, cursorY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("Base capturada automaticamente a partir dos pedidos da loja.", headerX, cursorY + 16);

      autoTable(doc, {
        startY: cursorY + 28,
        margin: { left: headerX, right: headerX },
        head: [["#", "Cliente", "Contato", "Pedidos", "Ticket médio", "Total gasto", "Último pedido"]],
        body: reportCustomersRows,
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 9,
          lineColor: [226, 232, 240],
          lineWidth: 1,
          cellPadding: 7,
          textColor: [15, 23, 42],
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          halign: "left",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 24, halign: "center" },
          3: { cellWidth: 42, halign: "center" },
          4: { cellWidth: 74, halign: "right" },
          5: { cellWidth: 74, halign: "right" },
          6: { cellWidth: 72, halign: "center" },
        },
      });

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(226, 232, 240);
        doc.line(headerX, pageHeight - 28, pageWidth - headerX, pageHeight - 28);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text(`Gerado em ${generatedAtLabel}`, headerX, pageHeight - 14);
        doc.text(`Página ${page} de ${pageCount}`, pageWidth - headerX, pageHeight - 14, { align: "right" });
      }

      const pdfBlob = doc.output("blob");
      if (isNativePdfRuntime()) {
        const shared = await sharePdfWithNativeFile({
          blob: pdfBlob,
          fileName,
          title: `Relatório gerencial - ${storeName}`,
        });
        if (!shared) {
          throw new Error("native-pdf-share-failed");
        }
        return;
      }
      if (compactViewport) {
        try {
          const shared = await sharePdfBlob({
            blob: pdfBlob,
            fileName,
            title: `Relatório gerencial - ${storeName}`,
          });
          if (shared) return;
        } catch (error) {
          if (error?.name === "AbortError") return;
          throw error;
        }
      }
      if (compactViewport) {
        const saved = await savePdfDocument(doc, fileName);
        if (!saved) {
          throw new Error("pdf-save-failed");
        }
        return;
      }
      const opened = openPdfBlob({
        blob: pdfBlob,
        fileName,
      });
      if (opened) return;
      const saved = await savePdfDocument(doc, fileName);
      if (!saved) {
        throw new Error("pdf-open-failed");
      }
    } catch (error) {
      console.error("management report pdf export failed", error);
      setReportExportError("Não foi possível gerar o PDF gerencial agora.");
    } finally {
      setReportExporting(false);
    }
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
          <title>QR da Vitrine - ${safeStoreName}</title>
          <style>
            body { margin: 0; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }
            .screen-toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 14px 18px; border-bottom: 1px solid #e2e8f0; background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); }
            .screen-toolbar__meta strong { display: block; font-size: 13px; }
            .screen-toolbar__meta span { display: block; margin-top: 2px; font-size: 11px; color: #64748b; }
            .screen-toolbar__actions { display: flex; flex-wrap: wrap; gap: 10px; }
            .screen-toolbar button { border: 0; border-radius: 999px; padding: 11px 16px; font-size: 12px; font-weight: 800; cursor: pointer; color: #fff; background: linear-gradient(135deg,#0f172a,#334155); }
            .screen-toolbar button.secondary { color: #334155; background: #f8fafc; box-shadow: inset 0 0 0 1px #cbd5e1; }
            .page { padding: 40px 24px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
            .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; padding: 32px; text-align: center; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08); }
            .title { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
            .subtitle { font-size: 14px; color: #475569; margin-bottom: 24px; }
            .qr { width: 300px; height: 300px; object-fit: contain; }
            .link { font-size: 12px; color: #64748b; margin-top: 18px; word-break: break-all; }
            @media screen and (max-width: 760px) {
              .screen-toolbar { align-items: stretch; flex-direction: column; padding: 12px 14px; }
              .screen-toolbar__actions { width: 100%; }
              .screen-toolbar button { flex: 1 1 0; justify-content: center; }
            }
            @media print {
              .screen-toolbar { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="screen-toolbar">
            <div class="screen-toolbar__meta">
              <strong>QR pronto para impressão</strong>
              <span>Imprima, salve e depois feche ou volte para o painel.</span>
            </div>
            <div class="screen-toolbar__actions">
              <button type="button" class="secondary" onclick="window.handleCloseQr()">Fechar</button>
              <button type="button" onclick="window.handlePrintQr()">Imprimir / salvar PDF</button>
            </div>
          </div>
          <div class="page">
            <div class="card">
              <div class="title">Vitrine ${safeStoreName}</div>
              <div class="subtitle">Aponte a câmera para fazer seu pedido</div>
              <img class="qr" src="${qrUrl}" alt="QR Code da vitrine" />
              <div class="link">${storeUrl}</div>
            </div>
          </div>
          <script>
            window.handlePrintQr = () => {
              window.focus();
              window.print();
            };
            window.handleCloseQr = () => {
              if (window.opener && !window.opener.closed) {
                window.close();
                return;
              }
              if (window.history.length > 1) {
                window.history.back();
                return;
              }
              window.location.replace("${window.location.origin}");
            };
            window.onload = () => {
              window.focus();
              window.setTimeout(() => window.handlePrintQr(), 120);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const metricCards = [
    {
      id: "total",
      label: "Receita total",
      value: formatCurrency(metrics.totalSales),
      helper: firstOrderLabel,
      icon: CurrencyDollar,
      tone: "ds-metric-card-neutral",
      iconTone: "text-slate-700 bg-slate-100 border-slate-200",
    },
    {
      id: "month",
      label: "Receita do mês",
      value: formatCurrency(metrics.monthRevenue),
      helper: formatMonthLabel(selectedMonth),
      icon: CalendarBlank,
      tone: "ds-metric-card-success",
      iconTone: "text-emerald-700 bg-emerald-100 border-emerald-200",
      monthSelector: true,
    },
    {
      id: "period",
      label: "Receita do período",
      value: formatCurrency(metrics.periodRevenue),
      helper: `Período: ${metrics.periodLabel}`,
      icon: TrendUp,
      tone: "ds-metric-card-warning",
      iconTone: "text-amber-700 bg-amber-100 border-amber-200",
    },
    {
      id: "orders",
      label: "Pedidos realizados",
      value: String(metrics.totalOrders),
      helper: `Ticket médio: ${formatCurrency(metrics.avgTicket)}`,
      icon: Package,
      tone: "ds-metric-card-neutral",
      iconTone: "text-brand-primary bg-brand-primary-soft border-brand-primary/20",
    },
  ];
  const periodOptions = [
    { id: "30", label: "30d" },
    { id: "60", label: "60d" },
    { id: "90", label: "90d" },
    { id: "custom", label: "Personalizado" },
    { id: "all", label: "Tudo" },
  ];


  return (
    <div className="space-y-6 animate-in fade-in">
      {setupChecklist.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="md:hidden mb-4 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.25em] font-bold text-slate-500">Checklist</p>
            <button
              type="button"
              onClick={() => setShowChecklistCard((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600"
            >
              {showChecklistCard ? 'Ocultar' : 'Mostrar'}
              <CaretDown size={12} className={`transition-transform ${showChecklistCard ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {(showChecklistCard || !isMobile) && (
          <>
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
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold">
                  {checklistDoneCount} concluído(s)
                </span>
                <span className={`px-2.5 py-1 rounded-full border font-semibold ${checklistPendingCount > 0 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                  {checklistPendingCount} pendente(s)
                </span>
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
              style={{ width: `${checklistProgress}%` }}
            />
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowChecklistDetails((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {showChecklistDetails ? 'Ocultar checklist' : 'Ver checklist'}
              <CaretDown size={14} className={`transition-transform ${showChecklistDetails ? 'rotate-180' : ''}`} />
            </button>
            {showChecklistDetails && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {setupChecklist.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                      item.done ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      {item.done ? (
                        <CheckCircle size={16} weight="duotone" className="text-emerald-600" />
                      ) : (
                        <CircleDashed size={16} weight="duotone" className="text-amber-600" />
                      )}
                      <span>{item.label}</span>
                    </div>
                    {!item.done && item.onClick && (
                      <button
                        type="button"
                        onClick={item.onClick}
                        className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-brand-primary border border-brand-primary/40 hover:bg-brand-primary/10"
                      >
                        {item.action || "Configurar"}
                      </button>
                    )}
                    {item.done && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-200 bg-emerald-100 text-emerald-700">
                        OK
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          </>
          )}
        </div>
      )}
      {storeUrl && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="md:hidden mb-4 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.25em] font-bold text-slate-500">QR Vitrine</p>
            <button
              type="button"
              onClick={() => setShowQrCard((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600"
            >
              {showQrCard ? 'Ocultar' : 'Mostrar'}
              <CaretDown size={12} className={`transition-transform ${showQrCard ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {(showQrCard || !isMobile) && (
          <>
          <div className="flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="flex-1 space-y-2">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">QR da vitrine</p>
              <h3 className="text-xl font-black text-slate-900">Imprima e coloque nas mesas</h3>
              <p className="text-sm text-slate-500">
                O cliente aponta a câmera, abre a vitrine e faz o pedido em segundos.
              </p>
              <div className="mt-4 text-xs text-slate-500">
                Imprima e coloque nas mesas ou copie o link da vitrine.
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(storeUrl)}`}
                  alt="QR da vitrine"
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
          </>
          )}
        </div>
      )}
      <div className="rounded-[28px] border border-amber-100/80 bg-[linear-gradient(135deg,rgba(255,251,235,0.92),rgba(255,255,255,0.98)_42%,rgba(248,250,252,0.96))] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-700 font-black">Gestão</p>
            <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">Relatório gerencial da operação</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Consolida financeiro, itens mais vendidos e leitura da base de clientes sem depender só do cálculo no navegador.
            </p>
            {analyticsError ? (
              <p className="mt-2 text-xs font-semibold text-amber-700">
                {analyticsError} Usando a leitura local como fallback nesta sessão.
              </p>
            ) : analyticsLoading ? (
              <p className="mt-2 text-xs font-semibold text-slate-500">Atualizando visão consolidada do período...</p>
            ) : null}
            <div className="mt-5 overflow-hidden rounded-[26px] border border-amber-200/70 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.97),rgba(255,248,235,0.95))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-amber-700 shadow-sm backdrop-blur">
                    <CalendarBlank size={13} weight="duotone" />
                    Período do relatório e PDF
                  </span>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">{metrics.periodLabel}</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white shadow-sm">
                      <TrendUp size={12} weight="fill" />
                      Aplica no PDF
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Esse período alimenta o PDF gerencial, o gráfico diário, os itens mais vendidos e os clientes do período.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-2xl border border-white/90 bg-white/85 px-4 py-3 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Receita analisada</p>
                      <p className="mt-2 text-base font-black tracking-tight text-slate-900">{formatCurrency(metrics.periodRevenue)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/90 bg-white/85 px-4 py-3 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Clientes ativos</p>
                      <p className="mt-2 text-base font-black tracking-tight text-slate-900">
                        {metrics.periodCustomerCount != null ? metrics.periodCustomerCount : customerSource.length}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/90 bg-white/85 px-4 py-3 shadow-sm sm:col-span-2 xl:col-span-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Mês de referência</p>
                      <p className="mt-2 text-base font-black tracking-tight text-slate-900">{formatMonthLabel(selectedMonth)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 xl:max-w-[320px] xl:justify-end">
                  {periodOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        if (option.id === "custom") {
                          activateCustomRange();
                          return;
                        }
                        setPeriodDays(option.id);
                      }}
                      className={`px-3 py-2 rounded-full text-[11px] font-semibold border transition-all hover:-translate-y-0.5 active:scale-95 shadow-sm ${
                        periodDays === option.id
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white/85 text-slate-600 border-white/80 hover:bg-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              {isCustomPeriod ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block rounded-2xl border border-white/90 bg-white/85 p-3 shadow-sm">
                    <span className="text-[10px] uppercase tracking-[0.22em] text-slate-400 font-bold">Data inicial</span>
                    <input
                      type="date"
                      value={customRange?.startDate || customStartDate}
                      max={customRange?.endDate || customEndDate || todayDateKey}
                      onChange={(event) => handleCustomStartDateChange(event.target.value)}
                      className="ds-focus-ring mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    />
                  </label>
                  <label className="block rounded-2xl border border-white/90 bg-white/85 p-3 shadow-sm">
                    <span className="text-[10px] uppercase tracking-[0.22em] text-slate-400 font-bold">Data final</span>
                    <input
                      type="date"
                      value={customRange?.endDate || customEndDate}
                      min={customRange?.startDate || customStartDate}
                      max={todayDateKey}
                      onChange={(event) => handleCustomEndDateChange(event.target.value)}
                      className="ds-focus-ring mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>
          <div className="w-full shrink-0 lg:w-[250px]">
            <div className="rounded-[24px] border border-slate-200/90 bg-white/90 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)] backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Exportação</p>
              <p className="mt-2 text-sm font-black text-slate-900">Gerar PDF gerencial</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Gera um PDF real para compartilhar, baixar ou imprimir sem abrir uma tela separada no mobile.
              </p>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Período atual</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{metrics.periodLabel}</p>
              </div>
              {reportExportError ? (
                <p className="mt-3 text-xs font-semibold text-rose-600">{reportExportError}</p>
              ) : null}
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintManagementReport}
                  disabled={analyticsLoading || reportExporting}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-extrabold shadow-[0_16px_30px_rgba(15,23,42,0.24)] transition-all hover:-translate-y-0.5 hover:opacity-95 disabled:opacity-60"
                >
                  {reportExporting ? "Gerando PDF..." : analyticsLoading ? "Atualizando..." : "Gerar PDF gerencial"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ---------- CARDS RESUMO ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.id} className={`ds-metric-card ${card.tone} p-5`}>
              <div className="relative">
                <div className="min-w-0 pr-16 lg:pr-14">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 font-bold">{card.label}</p>
                  <h3 className="mt-1 whitespace-nowrap leading-tight font-black tracking-tight text-slate-900 text-[clamp(1.22rem,1.65vw,1.7rem)] lg:text-[clamp(1.15rem,1.25vw,1.52rem)]">
                    {card.value}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{card.helper}</p>
                </div>
                <span className={`absolute top-0.5 right-0.5 h-9 w-9 lg:h-8 lg:w-8 rounded-xl border flex items-center justify-center shrink-0 ${card.iconTone}`}>
                  <Icon size={16} weight="duotone" />
                </span>
              </div>
              {card.monthSelector && (
                <div className="mt-3">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Mês selecionado</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="ds-select ds-focus-ring mt-1 w-full py-1.5 text-xs text-slate-700"
                  >
                    {availableMonths.map((monthKey) => (
                      <option key={monthKey} value={monthKey}>
                        {formatMonthLabel(monthKey)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
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
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">Resumo rápido</p>
              <button
                type="button"
                onClick={() => setShowUtm((prev) => !prev)}
                className="px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {showUtm ? 'Ocultar detalhes' : 'Configurar UTM'}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
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
            {showUtm && (
              <>
                <div className="grid gap-3 xl:grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr] items-end">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Campanha</p>
                    <input
                      type="text"
                      value={utmCampaign}
                      onChange={(event) => setUtmCampaign(event.target.value)}
                      placeholder="janocaminho"
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
                <div className="flex flex-wrap gap-2">
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
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Última campanha</p>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
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
            <button
              type="button"
              onClick={() => copyUtm()}
              className="mt-3 w-full px-3 py-2 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              {qrCopied ? 'Link copiado!' : 'Copiar link UTM'}
            </button>
            <p className="mt-2 text-[10px] text-slate-400 break-all">
              {utmUrl || storeUrl}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
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
      </div>

      {/* ---------- GRÁFICOS ---------- */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Faturamento por dia */}
        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 ${isMobile ? 'h-48' : 'h-80'} overflow-hidden flex flex-col`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h4 className="font-bold text-gray-700">Vendas por dia</h4>
              <p className="mt-1 text-[11px] text-slate-500">Segue o período definido no relatório gerencial.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
              {metrics.periodLabel}
            </span>
          </div>
          {chartSource.length === 0 ? (
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
              <BarChart data={chartSource} barSize={24}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.96} />
                    <stop offset="70%" stopColor="#3b82f6" stopOpacity={0.72} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.14} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 500, fill: "#64748b" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 400, fill: "#64748b" }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <RechartsTooltip
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => `Dia ${label}`}
                  contentStyle={{
                    borderRadius: "14px",
                    border: "1px solid #dbeafe",
                    boxShadow: "0 18px 34px -24px rgba(15,23,42,0.55)",
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                  }}
                  labelStyle={{ color: "#475569", fontWeight: 500, marginBottom: 6 }}
                  itemStyle={{ color: "#1d4ed8", fontWeight: 700 }}
                  cursor={{ fill: "rgba(37,99,235,0.06)" }}
                />
                <Bar dataKey="total" fill="url(#salesGradient)" radius={[8, 8, 0, 0]} />
              </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top produtos */}
        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-indigo-400 ${isMobile ? 'h-48' : 'h-80'} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h4 className="font-bold text-gray-700">
              Top 5 Produtos do Período
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
          ) : isMobile ? (
            <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
              {sortedTopProducts.map((product, index) => {
                const maxQty = sortedTopProducts[0]?.qty || 1;
                const percent = Math.max(8, Math.round((product.qty / maxQty) * 100));
                const barColor = TOP_PRODUCT_BAR_COLORS[index] || TOP_PRODUCT_BAR_COLORS[TOP_PRODUCT_BAR_COLORS.length - 1];
                return (
                  <div
                    key={`${product.name}-${index}`}
                    className="min-w-[210px] rounded-xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white px-3 py-2"
                  >
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: barColor }}
                        />
                        <span className="font-semibold truncate">{product.name}</span>
                      </div>
                      <span className="text-xs text-slate-500">{product.qty}x</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percent}%`,
                          background: barColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedTopProducts.map((product, index) => {
                const maxQty = sortedTopProducts[0]?.qty || 1;
                const percent = Math.max(8, Math.round((product.qty / maxQty) * 100));
                const barColor = TOP_PRODUCT_BAR_COLORS[index] || TOP_PRODUCT_BAR_COLORS[TOP_PRODUCT_BAR_COLORS.length - 1];
                return (
                  <div key={`${product.name}-${index}`} className="space-y-1 rounded-xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white px-3 py-2">
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: barColor }}
                        />
                        <span className="font-semibold truncate">{product.name}</span>
                      </div>
                      <span className="text-xs text-slate-500">{product.qty}x</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percent}%`,
                          background: barColor,
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
              {metrics.allTimeCustomerCount} na base
              {metrics.periodCustomerCount != null ? ` · ${metrics.periodCustomerCount} ativos no período` : ""}
            </span>
            <p className="mt-1 text-xs text-slate-400">Base viva capturada automaticamente a partir dos pedidos.</p>
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

        <div className="max-h-80 overflow-y-auto pr-1 space-y-3">
          {sortedCustomers.map((customer) => {
            const initials = String(customer.name || 'CL')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join('');
            const accentTone = customer.phone
              ? 'border-l-emerald-400 bg-gradient-to-r from-emerald-50/70 to-white'
              : 'border-l-slate-300 bg-gradient-to-r from-slate-50 to-white';
            const customerKey = customer.__key || normalizeCustomerKey(customer);
            const isEditing = editingCustomerKey === customerKey;
            return (
              <div
                key={customer.id || customer.name}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200 border-l-4 px-4 py-3 shadow-sm ${accentTone}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700">
                    {initials || 'CL'}
                  </div>
                  <div className="min-w-0">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          placeholder="Nome do cliente"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:ring-2 focus:ring-brand-primary"
                        />
                        <input
                          value={editingPhone}
                          onChange={(event) => setEditingPhone(formatPhoneInput(event.target.value))}
                          placeholder="Telefone"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:ring-2 focus:ring-brand-primary"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-800 truncate">{customer.name}</p>
                        <p className="text-xs text-slate-500">
                          {customer.phone ? 'Contato cadastrado' : 'Sem telefone'}
                          {customer.ordersCount ? ` · ${customer.ordersCount} pedido(s)` : ''}
                        </p>
                        {(customer.totalSpent || customer.lastOrderAt) ? (
                          <p className="mt-1 text-[11px] text-slate-500">
                            {customer.totalSpent ? `Total ${formatCurrency(customer.totalSpent)}` : 'Sem total consolidado'}
                            {customer.avgTicket ? ` · Ticket ${formatCurrency(customer.avgTicket)}` : ''}
                            {customer.lastOrderAt ? ` · Último ${formatDate(customer.lastOrderAt)}` : ''}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={saveCustomerEdit}
                        className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-brand-primary text-white"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCustomerKey(null)}
                        className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-slate-200 text-slate-500"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${
                          customer.phone
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {customer.phone || 'Sem telefone'}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditCustomer(customer)}
                        className="px-3 py-1 rounded-full text-[11px] font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => hideCustomer(customer)}
                        className="px-3 py-1 rounded-full text-[11px] font-semibold border border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

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

