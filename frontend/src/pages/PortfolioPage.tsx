import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChartBar,
  ChatCircleText,
  CheckCircle,
  CreditCard,
  Lightning,
  MagnifyingGlass,
  Storefront,
  X,
} from "@phosphor-icons/react";
import { LandingPageLayout } from "../layouts/LandingPageLayout";
import { storeService } from "../services/storeService";
import { productService } from "../services/productService";
import { orderService } from "../services/orderService";
import { platformService } from "../services/platformService";
import { planService } from "../services/planService";
import { resolveAssetUrl } from "../utils/resolveAssetUrl";
import { formatCurrency } from "../utils/format";
import { resolveAnnualPromoTotal, resolveMonthlyEquivalent } from "../constants/planCatalog";

/**
 * Type definition for a team member. Adding this type allows TypeScript to
 * enforce that all required properties are present and helps catch missing
 * fields during development.
 */
type TeamMember = {
  name: string;
  role: string;
  years: number;
  description: string;
  experience: string[];
  previousWork: string;
  avatar: string;
  color: string;
  profileUrl: string;
  profileImage?: string;
  link?: string;
};

type PortfolioStore = {
  id?: string;
  name?: string;
  slug?: string;
  reviewSummary?: {
    totalReviews?: number;
    avgStoreRating?: number;
  } | null;
  settings?: {
    logoUrl?: string | null;
    description?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
  } | null;
};

type MenuItem = {
  name: string;
  price: number;
};

type MenuInfo = {
  items: MenuItem[];
  loading: boolean;
};

export function PortfolioPage() {
  const navigate = useNavigate();
  // Used by the mobile sticky CTA (simple anchor without router).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = document.getElementById("top");
    if (!el) {
      const anchor = document.createElement("div");
      anchor.id = "top";
      anchor.style.position = "absolute";
      anchor.style.top = "0";
      anchor.style.left = "0";
      anchor.style.height = "1px";
      anchor.style.width = "1px";
      document.body.prepend(anchor);
    }
  }, []);

  const teamMembers: TeamMember[] = [
    {
      name: "Edmilson Lopes Fernandes",
      role: "Arquiteto de Software & Desenvolvedor Full Stack Senior",
      years: 15,
      description:
        "Atuo ha mais de 15 anos no desenvolvimento e arquitetura de sistemas, liderando solucoes digitais escalaveis e orientadas a negocio.",
      experience: [
        "Node.js & Express",
        "PostgreSQL",
        "Arquitetura de Sistemas",
        "Design de Banco de Dados",
        "Desenvolvimento de APIs",
      ],
      previousWork: "Liderou desenvolvimento backend para multiplas plataformas SaaS e e-commerce",
      avatar: "E",
      color: "from-red-500 to-amber-500",
      profileUrl: "https://www.linkedin.com/in/edmilson-santos-6805a515/",
      profileImage: "/uploads/perfil/edmilson.jpeg",
    },
    {
      name: "Gabriel Botega",
      role: "Desenvolvedor Backend",
      years: 4,
      description:
        "Especialista em construir sistemas backend confiaveis e otimizar performance com foco em eficiencia e escalabilidade.",
      experience: [
        "Node.js & Express",
        "Design de Sistemas",
        "Otimizacao de Banco de Dados",
        "Arquitetura de APIs",
        "Ajuste de Performance",
      ],
      previousWork: "Desenvolveu infraestrutura backend para plataformas fintech e baseadas em assinatura",
      avatar: "G",
      profileImage: "https://media.licdn.com/dms/image/v2/D4D03AQE-iBAfFfRPmQ/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1713894904137?e=1769644800&v=beta&t=dRjzWCu87_bo1eoa6jOW7rC5pfyCLVuNNbl2loNogY0",
      color: "from-sky-500 to-indigo-500",
      profileUrl: "https://www.linkedin.com/in/gabrielbotega/",
    },
    {
      name: "Juan Felipe Rada",
      role: "Desenvolvedor UX/UI",
      years: 4,
      description:
        "Especialista em criar interfaces modernas, eficientes e intuitivas, unindo estética, usabilidade e consistência visual.",
      experience: [
        "React & TypeScript",
        "Design Systems",
        "Atomic Design",
        "Arquitetura de Componentes",
        "Implementação e Evolução de Interfaces"
      ],
      previousWork:
        "Construção, padronização e manutenção de design systems, com foco em reutilização, performance e experiência do usuário.",
      avatar: "J",
      profileImage: "https://media.licdn.com/dms/image/v2/D5603AQHig2NXQu3iIw/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1730128271936?e=1769644800&v=beta&t=9VbtD4hKaF_XYVTqCNEehLbsBWOI7Jc76g3TsUZqZ2A",
      color: "from-purple-500 to-indigo-500",
      profileUrl: "https://www.linkedin.com/in/radapls/",
      link: "https://radapls.github.io",
    }
  ];
  const [stores, setStores] = useState<PortfolioStore[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profilePreview, setProfilePreview] = useState<{ name: string; image: string } | null>(null);
  const [brokenProfileImages, setBrokenProfileImages] = useState<Record<string, boolean>>({});
  const [menuBySlug, setMenuBySlug] = useState<Record<string, MenuInfo>>({});
  const [metrics, setMetrics] = useState<{
    totalStores?: number;
    activeStores?: number;
    totalOrders?: number;
    totalRevenue?: number;
    updatedAt?: string;
  } | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [planCycle, setPlanCycle] = useState<"monthly" | "yearly">("monthly");
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadPortfolio = async () => {
      try {
        setLoading(true);
        const data = await storeService.listPortfolio();
        if (active) {
          const normalized = (Array.isArray(data) ? data : []).map((store) => ({
            ...store,
            name: store?.name || '',
            slug: store?.slug || '',
            settings: store?.settings ?? null,
          }));
          setStores(normalized);
        }
      } catch (err: any) {
        if (active) setError(err?.message || "Não foi possível carregar as lojas agora.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPortfolio();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadPlans = async () => {
      try {
        setPlansLoading(true);
        const data = await planService.list();
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        setPlans(list.filter((plan) => plan?.enabled !== false));
      } catch {
        if (!active) return;
        setPlans([]);
      } finally {
        if (active) setPlansLoading(false);
      }
    };
    loadPlans();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadMetrics = async () => {
      try {
        setMetricsLoading(true);
        const data = await platformService.getPublicMetrics();
        if (!active) return;
        setMetrics({
          totalStores: Number(data?.totalStores) || 0,
          activeStores: Number(data?.activeStores) || 0,
          totalOrders: Number(data?.totalOrders) || 0,
          totalRevenue: Number(data?.totalRevenue) || 0,
          updatedAt: data?.updatedAt,
        });
      } catch {
        if (!active) return;
        setMetrics(null);
      } finally {
        if (active) setMetricsLoading(false);
      }
    };
    loadMetrics();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const slugs = stores
      .map((store) => store.slug)
      .filter((slug): slug is string => Boolean(slug));
    if (!slugs.length) return () => {
      active = false;
    };

    const buildFallbackItems = (products: any[]) =>
      (products || [])
        .slice(0, 3)
        .map((product: { promoPrice?: number; promoActive?: boolean; price?: number; name?: string }) => {
          const promoPrice = product?.promoPrice != null ? Number(product.promoPrice) : null;
          const price = product?.promoActive && promoPrice && promoPrice > 0
            ? promoPrice
            : Number(product?.price) || 0;
          return { name: product?.name || "Produto", price };
        });

    const loadMenu = async (slug: string) => {
      if (!slug) return;
      setMenuBySlug((prev) => ({
        ...prev,
        [slug]: prev[slug] ?? { items: [], loading: true },
      }));

      try {
        const highlights = await orderService.fetchHighlightsBySlug(slug);
        const items = (Array.isArray(highlights) ? highlights : [])
          .slice(0, 3)
          .map((item: { name?: string; price?: number }) => ({
            name: item?.name || "Produto",
            price: Number(item?.price) || 0,
          }));

        if (items.length) {
          if (active) {
            setMenuBySlug((prev) => ({
              ...prev,
              [slug]: { items, loading: false },
            }));
          }
          return;
        }

        const products = await productService.listPublicBySlug(slug);
        const fallbackItems = buildFallbackItems(products);
        if (active) {
          setMenuBySlug((prev) => ({
            ...prev,
            [slug]: { items: fallbackItems, loading: false },
          }));
        }
      } catch (error) {
        if (!active) return;
        try {
          const products = await productService.listPublicBySlug(slug);
          const fallbackItems = buildFallbackItems(products);
          if (active) {
            setMenuBySlug((prev) => ({
              ...prev,
              [slug]: { items: fallbackItems, loading: false },
            }));
          }
        } catch {
          if (!active) return;
          setMenuBySlug((prev) => ({
            ...prev,
            [slug]: { items: [], loading: false },
          }));
        }
      }
    };

    slugs.forEach((slug) => {
      loadMenu(slug);
    });

    return () => {
      active = false;
    };
  }, [stores]);

  const filteredStores = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return stores;
    return stores.filter((store) => {
      const description = store?.settings?.description || "";
      const haystack = [store?.name, store?.slug, description].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query, stores]);

  const getInitials = (name = "") =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const formatCompact = (value: number) => {
    const numeric = Number(value) || 0;
    return new Intl.NumberFormat("pt-BR", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(numeric);
  };

  const resolveImageSrc = (value?: string) => {
    const raw = (value || "").trim();
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    return resolveAssetUrl(raw) || raw;
  };

  const resolveMemberPhoto = (member: TeamMember) => {
    if (!member.profileImage) return "";
    if (brokenProfileImages[member.name]) return "";
    return resolveImageSrc(member.profileImage);
  };

  const resolvePlanMeta = (planName = "") => {
    const normalized = planName.toString().toLowerCase();
    if (normalized.includes("pro")) {
      return { badge: "Mais popular", tone: "bg-red-600 text-white", featured: true };
    }
    return { badge: "Começar", tone: "bg-slate-100 text-slate-700", featured: false };
  };

  const visiblePlans = useMemo(() => {
    const list = plans || [];
    const filtered = planCycle === "yearly"
      ? list.filter((plan) => Number(plan?.durationDays) >= 360)
      : list.filter((plan) => Number(plan?.durationDays) < 360);
    // Prefer the main tiers if present
    const order = planCycle === "yearly"
      ? ["basic_yearly", "pro_yearly"]
      : ["basic_monthly", "pro_monthly"];
    const byName = new Map(filtered.map((plan) => [String(plan?.name || ""), plan]));
    const ordered = order.map((key) => byName.get(key)).filter(Boolean) as any[];
    return ordered.length ? ordered : filtered.slice(0, 2);
  }, [plans, planCycle]);

  useEffect(() => {
    if (!profilePreview) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfilePreview(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [profilePreview]);

  return (
    <LandingPageLayout>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_55%,#fff7ed_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.16),_transparent_64%)]" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-orange-200/35 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-red-200/25 blur-3xl" />

        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-20 relative">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-red-700">
                <Lightning size={14} weight="duotone" />
                Cardapio online + pedidos + produção
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 leading-[1.04]">
                Portfólio real, resultado real.
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">
                  Seu negócio com cara de app profissional.
                </span>
              </h1>
              <p className="text-slate-600 text-sm sm:text-base max-w-2xl">
                Veja lojas reais em operação, compare estilos e entenda como transformar seu cardápio em pedidos todos os dias,
                com um visual limpo, rápido no mobile e focado em conversão.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/create")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-bold text-white shadow-[0_18px_40px_-28px_rgba(239,68,68,0.9)] hover:opacity-95 active:scale-[0.99] transition"
                >
                  Criar minha loja
                  <ArrowRight size={18} weight="bold" />
                </button>
                <a
                  href="/#produto-real"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 active:scale-[0.99] transition"
                >
                  Ver produto real
                  <ArrowUpRight size={18} weight="bold" />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { label: "Experiência mobile premium", icon: CheckCircle },
                  { label: "Personalizacao por loja", icon: Storefront },
                  { label: "Fila e operação em tempo real", icon: ChartBar },
                  { label: "Pagamentos", icon: CreditCard },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-slate-200/90 bg-white/85 backdrop-blur px-4 py-3 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-sm"
                    >
                      <span className="h-8 w-8 rounded-xl bg-slate-900 text-white grid place-items-center">
                        <Icon size={16} weight="duotone" />
                      </span>
                      {item.label}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.6)] overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/60">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500 font-semibold">
                    Resultados (publico)
                  </p>
                  <p className="text-lg font-black text-slate-900">Indicadores da plataforma</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {metrics?.updatedAt ? `Atualizado em ${new Date(metrics.updatedAt).toLocaleString("pt-BR")}` : "Atualizacao periodica"}
                  </p>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                  {[
                    { label: "Lojas cadastradas", value: metrics?.totalStores ?? 0 },
                    { label: "Lojas ativas", value: metrics?.activeStores ?? 0 },
                    { label: "Pedidos", value: metrics?.totalOrders ?? 0 },
                    { label: "Vendas", value: metrics?.totalRevenue ?? 0, currency: true },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400 font-semibold">
                        {item.label}
                      </p>
                      <p className="mt-2 text-2xl font-black text-slate-900">
                        {metricsLoading
                          ? "—"
                          : item.currency
                          ? formatCurrency(Number(item.value) || 0)
                          : formatCompact(Number(item.value) || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6 grid gap-4 lg:grid-cols-3 lg:items-center">
              <div className="lg:col-span-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.3em]">
                  Portfólio de lojas
                </p>
                <p className="text-lg font-black text-slate-900 mt-1">
                  Explore vitrines reais antes de cadastrar.
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  Busque pelo nome/slug e abra a vitrine para ver identidade, produtos e comportamento no mobile.
                </p>
              </div>
              <div className="w-full">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.25em]">
                  Buscar loja
                </label>
                <div className="mt-2 relative">
                  <MagnifyingGlass
                    size={16}
                    weight="bold"
                    className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Digite o nome ou slug"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "1. Personalize",
                description: "Logo, cores, descricoes, Pix e horarios. A vitrine fica com a cara da sua loja.",
                icon: Storefront,
              },
              {
                title: "2. Cadastre produtos",
                description: "Itens, categorias, promocao do dia e disponibilidade por dia da semana.",
                icon: BookOpen,
              },
              {
                title: "3. Venda e organize",
                description: "Pedidos, fila da cozinha, acompanhamento do cliente e historico.",
                icon: ChartBar,
              },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white grid place-items-center shadow-sm">
                    <Icon size={20} weight="duotone" />
                  </div>
                  <h3 className="mt-4 text-lg font-black text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
            <div className="space-y-3 max-w-2xl">
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-red-700">
                Planos
              </p>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900">
                Quanto custa vender com seu próprio site?
              </h2>
              <p className="text-sm text-slate-600">
                Comece sem complicação. Se preferir, você pode testar e ajustar antes de divulgar o link.
              </p>
            </div>
            <div className="flex items-center rounded-full border border-slate-200 bg-white p-1 w-fit">
              <button
                type="button"
                onClick={() => setPlanCycle("monthly")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                  planCycle === "monthly" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setPlanCycle("yearly")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                  planCycle === "yearly" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Anual
              </button>
            </div>
          </div>

          {plansLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Carregando planos...
            </div>
          ) : (
            <div className={`grid gap-6 ${visiblePlans.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
              {visiblePlans.map((plan) => {
                const meta = resolvePlanMeta(plan?.name);
                const price = Number(plan?.price) || 0;
                const promo = plan?.promoPrice != null ? Number(plan.promoPrice) : null;
                const isYearly = planCycle === "yearly";

                const annualFull = isYearly ? price : null;
                const annualPromoCandidate =
                  isYearly && annualFull != null
                    ? promo != null && promo > 0 && promo < annualFull
                      ? promo
                      : resolveAnnualPromoTotal(annualFull)
                    : null;
                const annualPromo =
                  annualPromoCandidate != null &&
                  annualFull != null &&
                  annualPromoCandidate > 0 &&
                  annualPromoCandidate < annualFull
                    ? annualPromoCandidate
                    : null;
                const monthlyFull = isYearly ? (annualFull! / 12) : price;
                const monthlyPromo = isYearly && annualPromo != null ? (annualPromo / 12) : promo;
                const yearlyDisplay = isYearly ? annualPromo ?? annualFull ?? 0 : 0;
                const monthlyEquivalent = isYearly ? resolveMonthlyEquivalent(yearlyDisplay) : null;
                const normalizedName = String(plan?.name || "").toLowerCase();
                const tierName = normalizedName.includes("pro")
                  ? "Pro"
                  : normalizedName.includes("basic")
                  ? "Basic"
                  : plan?.displayName || plan?.name || "Plano";
                const displayTitle = `${tierName} ${planCycle === "yearly" ? "Anual" : "Mensal"}`;

                const showPromo = isYearly
                  ? annualPromo != null && annualFull != null && annualPromo < annualFull
                  : monthlyPromo != null && monthlyPromo > 0 && monthlyPromo < monthlyFull;
                return (
                  <div
                    key={plan?.id || plan?.name}
                    className={`rounded-3xl border p-6 shadow-sm ${
                      meta.featured
                        ? "border-slate-900 bg-slate-900 text-white shadow-[0_28px_80px_-52px_rgba(15,23,42,0.85)]"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-[11px] uppercase tracking-[0.35em] font-semibold ${meta.featured ? "text-white/70" : "text-slate-400"}`}>
                          {planCycle === "yearly" ? "Anual" : "Mensal"}
                        </p>
                        <p className={`mt-2 text-xl font-black ${meta.featured ? "text-white" : "text-slate-900"}`}>
                          {displayTitle}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${meta.tone}`}>
                        {meta.badge}
                      </span>
                    </div>

                    <div className="mt-6">
                      {showPromo ? (
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className={`text-xs ${meta.featured ? "text-white/70" : "text-slate-500"}`}>de</p>
                            <p className={`text-sm font-bold line-through ${meta.featured ? "text-white/60" : "text-slate-400"}`}>
                              {formatCurrency(isYearly ? annualFull! : monthlyFull)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs ${meta.featured ? "text-white/70" : "text-slate-500"}`}>por</p>
                            <p className={`text-3xl font-black ${meta.featured ? "text-white" : "text-slate-900"}`}>
                              {formatCurrency(isYearly ? annualPromo! : monthlyPromo!)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className={`text-3xl font-black ${meta.featured ? "text-white" : "text-slate-900"}`}>
                          {formatCurrency(isYearly ? annualFull! : monthlyFull)}
                        </p>
                      )}
                      <p className={`mt-2 text-xs ${meta.featured ? "text-white/70" : "text-slate-500"}`}>
                        {planCycle === "yearly"
                          ? `/ano (${formatCurrency(Number(monthlyEquivalent || 0))}/mês)`
                          : "cobrado por mês"}
                      </p>
                      <p className={`mt-1 text-xs ${meta.featured ? "text-white/70" : "text-slate-500"}`}>
                        7 dias grátis. Renovação pelo valor do plano.
                      </p>
                    </div>

                    <div className={`mt-6 rounded-2xl border p-4 ${meta.featured ? "border-white/15 bg-white/10" : "border-slate-200 bg-slate-50"}`}>
                      <p className={`text-xs font-semibold ${meta.featured ? "text-white/80" : "text-slate-700"}`}>
                        Ideal para:
                      </p>
                      <p className={`mt-2 text-sm ${meta.featured ? "text-white/90" : "text-slate-600"}`}>
                        {plan?.name?.toString().includes("basic")
                          ? "começar no digital com cardápio e pedidos"
                          : plan?.name?.toString().includes("pro")
                          ? "rotina diária com fila, promoções e relatórios"
                          : "operação completa com foco em performance e crescimento"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate("/create")}
                      className={`mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition active:scale-[0.99] ${
                        meta.featured
                          ? "bg-white text-slate-900 hover:bg-white/95"
                          : "bg-brand-gradient text-white hover:opacity-95"
                      }`}
                    >
                      Começar agora
                      <ArrowRight size={18} weight="bold" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="bg-slate-50 py-12">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Carregando portfólio...
            </div>
          )}

          {error && !loading && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && filteredStores.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <div className="mx-auto h-14 w-14 rounded-3xl bg-slate-900 text-white grid place-items-center shadow-sm">
                <Storefront size={22} weight="duotone" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-700">Nenhuma loja encontrada.</p>
              <p className="text-xs text-slate-500">Tente buscar por outro nome ou slug.</p>
            </div>
          )}

          {!loading && !error && filteredStores.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredStores.map((store) => {
                const logo = resolveAssetUrl(store?.settings?.logoUrl || undefined);
                const description = store?.settings?.description || "Loja ativa no Chama no Espeto.";
                const primary = store?.settings?.primaryColor || "#dc2626";
                const secondary = store?.settings?.secondaryColor || "#111827";
                const slug = store?.slug || "";
                const menuInfo = slug ? menuBySlug[slug] : null;
                return (
                  <Link
                    key={store.id || store.slug}
                    to={`/${store.slug}`}
                    className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-2xl transition-all"
                  >
                    <div
                      className="relative p-6 pb-8"
                      style={{
                        backgroundImage: `linear-gradient(120deg, ${primary}, ${secondary})`,
                      }}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_60%)]" />
                      <div className="relative flex items-center justify-between">
                        <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
                          Loja ativa
                        </span>
                        <ArrowUpRight size={20} weight="bold" className="text-white/80 transition-transform group-hover:translate-x-1" />
                      </div>
                      <div className="relative mt-6 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-white flex items-center justify-center text-lg font-bold text-slate-700">
                          {logo ? (
                            <img src={logo} alt={store.name} className="w-full h-full object-cover" />
                          ) : (
                            getInitials(store?.name)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.35em] text-white/70">Loja</p>
                          <h3 className="text-lg font-bold text-white truncate">{store.name}</h3>
                          <p className="text-xs text-white/80 truncate">/{store.slug}</p>
                          {Number(store?.reviewSummary?.totalReviews || 0) > 0 && (
                            <p className="mt-1 text-[11px] text-white/90 font-semibold">
                              {Number(store?.reviewSummary?.avgStoreRating || 0).toFixed(1)} ★ ({Number(store?.reviewSummary?.totalReviews || 0)} avaliações)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-sm text-slate-600 line-clamp-3">{description}</p>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Top 3 do dia</p>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                            style={{ backgroundColor: primary }}
                          >
                            Mais vendidos
                          </span>
                        </div>
                        <div className="mt-3 space-y-2 text-xs text-slate-600">
                          {menuInfo?.loading && (
                            <div className="text-xs text-slate-400">Carregando produtos...</div>
                          )}
                          {!menuInfo?.loading && menuInfo?.items?.length === 0 && (
                            <div className="text-xs text-slate-400">Sem produtos cadastrados.</div>
                          )}
                          {menuInfo?.items?.map((item: MenuItem) => (
                            <div key={item.name} className="flex items-center justify-between">
                              <span className="font-semibold text-slate-700">{item.name}</span>
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                                style={{ backgroundColor: primary }}
                              >
                                {formatCurrency(item.price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-red-600">
                        Visitar loja
                        <ArrowUpRight size={16} weight="bold" className="transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-7 sm:p-10 overflow-hidden relative">
            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.25),_transparent_60%)]" />
            <div className="relative grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7 space-y-3">
                <p className="text-[11px] uppercase tracking-[0.35em] text-red-700 font-semibold">
                  Pronto para colocar no ar
                </p>
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight">
                  Se sua vitrine parecer boa no celular, ela vende mais.
                </h2>
                <p className="text-sm text-slate-600 max-w-xl">
                  O foco aqui é conversao: produto bem apresentado, carrinho simples, checkout objetivo e acompanhamento do pedido.
                </p>
              </div>
              <div className="lg:col-span-5">
                <div className="grid gap-3">
                  {[
                    "Vitrine com identidade da sua loja (logo/cores)",
                    "Promoções com preço riscado e destaque",
                    "Fila da cozinha e painel interno",
                    "Tracking público do pedido",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <span className="mt-0.5 h-8 w-8 rounded-xl bg-slate-900 text-white grid place-items-center">
                        <CheckCircle size={16} weight="duotone" />
                      </span>
                      <span className="text-sm font-semibold text-slate-800">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-12 pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/create")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 active:scale-[0.99] transition"
                >
                  Criar minha loja agora
                  <ArrowRight size={18} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/admin")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 active:scale-[0.99] transition"
                >
                  Já tenho loja: entrar no admin
                  <ArrowUpRight size={18} weight="bold" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f3f6f8] py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
            <div className="space-y-3 max-w-2xl">
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#0a66c2]">
                Nosso time
              </p>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900">
                Perfis de alto nivel por tras do Chama no Espeto
              </h2>
              <p className="text-sm text-slate-600">
                Estrutura enxuta, stack moderna e foco em entrega rápida com qualidade de produto.
              </p>
            </div>
            <div className="text-sm text-slate-500 bg-white border border-slate-200 px-4 py-2 rounded-full">
              Equipe técnica experiente
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="group rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all overflow-hidden"
              >
                <div className={`h-16 bg-gradient-to-r ${member.color}`} />
                <div className="px-6 pb-6 -mt-8">
                  <div className="flex items-start justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const resolved = resolveMemberPhoto(member);
                        if (resolved) {
                          setProfilePreview({
                            name: member.name,
                            image: resolved,
                          });
                        }
                      }}
                      className="relative h-20 w-20 rounded-[22px] bg-white border-2 border-white shadow-xl flex items-center justify-center text-lg font-bold text-slate-700 overflow-hidden transition hover:scale-[1.02]"
                      aria-label={`Ver foto de ${member.name}`}
                    >
                      {resolveMemberPhoto(member) ? (
                        <img
                          src={resolveMemberPhoto(member)}
                          alt={member.name}
                          className="h-full w-full object-cover rounded-[20px] ring-2 ring-white brightness-105 contrast-110"
                          onError={() =>
                            setBrokenProfileImages((prev) => ({
                              ...prev,
                              [member.name]: true,
                            }))
                          }
                        />
                      ) : (
                        <span className={`h-full w-full rounded-[20px] bg-gradient-to-r ${member.color} text-white grid place-items-center`}>
                          {member.avatar}
                        </span>
                      )}
                    </button>
                    <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                      {member.years} anos
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{member.name}</h3>
                      <p className="text-sm text-[#0a66c2] font-semibold">{member.role}</p>
                    </div>
                    <p className="text-sm text-slate-600">{member.description}</p>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                      {member.previousWork}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {member.experience.map((exp) => (
                        <span
                          key={exp}
                          className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full"
                        >
                          {exp}
                        </span>
                      ))}
                    </div>
                    <div className="pt-3 border-t border-slate-100">
                      <a
                        href={member.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full text-center text-sm font-semibold text-white bg-[#0a66c2] rounded-full py-2.5 shadow-sm hover:bg-[#0a66c2]/90 transition"
                      >
                        Ver perfil no LinkedIn
                      </a>
                    </div>
                    {member.link && (
                      <a
                        href={member.link}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full text-center text-sm font-semibold text-white bg-indigo-600 rounded-full py-2.5 shadow-sm hover:bg-indigo-600/90 transition"
                      >
                        Visitar web personal
                      </a>

                    )}

                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {profilePreview && (
        <div
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setProfilePreview(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Perfil</p>
                <p className="text-base font-semibold text-slate-900">{profilePreview.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setProfilePreview(null)}
                className="h-9 w-9 rounded-full border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center"
                aria-label="Fechar"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
            <div className="p-5">
              <div className="rounded-2xl overflow-hidden bg-slate-100">
                <img
                  src={profilePreview.image}
                  alt={profilePreview.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="sm:hidden fixed inset-x-0 bottom-0 z-50 px-4 pb-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white/90 backdrop-blur-xl shadow-[0_18px_60px_-28px_rgba(15,23,42,0.6)] p-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/create")}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-3 text-sm font-black text-white"
          >
            <Storefront size={18} weight="duotone" />
            Criar loja
          </button>
          <a
            href="https://wa.me/5512997822784"
            target="_blank"
            rel="noreferrer"
            className="h-12 w-12 rounded-2xl bg-emerald-600 text-white grid place-items-center shadow-sm"
            aria-label="Chamar no WhatsApp"
          >
            <ChatCircleText size={18} weight="duotone" />
          </a>
          <a
            href="#top"
            className="h-12 w-12 rounded-2xl border border-slate-200 bg-white text-slate-700 grid place-items-center"
            aria-label="Voltar ao topo"
          >
            <ArrowUpRight size={18} weight="bold" className="-rotate-45" />
          </a>
        </div>
      </div>
    </LandingPageLayout>
  );
}
