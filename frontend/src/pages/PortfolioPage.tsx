<<<<<<< HEAD
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MagnifyingGlass, X } from "@phosphor-icons/react";
import { LandingPageLayout } from "../layouts/LandingPageLayout";
import { storeService } from "../services/storeService";
import { resolveAssetUrl } from "../utils/resolveAssetUrl";

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
=======
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CaretDown, FunnelSimple, MagnifyingGlass, MapPin, Storefront } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { LandingPageLayout } from '../layouts/LandingPageLayout';
import { storeService } from '../services/storeService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
>>>>>>> main

type PortfolioStore = {
  id?: string;
  name?: string;
  slug?: string;
<<<<<<< HEAD
  settings?: {
    logoUrl?: string | null;
    description?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
  } | null;
};

export function PortfolioPage() {
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

  useEffect(() => {
    let active = true;
    const loadPortfolio = async () => {
      try {
        setLoading(true);
        const data = await storeService.listPortfolio();
        if (active) setStores(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (active) setError(err?.message || "Não foi possível carregar as lojas agora.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPortfolio();
=======
  reviewSummary?: {
    totalReviews?: number;
    avgStoreRating?: number;
  } | null;
  settings?: {
    logoUrl?: string | null;
    description?: string | null;
    segment?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
};

type PortfolioCase = {
  id: string;
  name: string;
  slug: string;
  screenshot: string;
  segment: string;
  city: string;
  state: string;
  cityFilterKey: string;
  searchIndex: string;
  problem: string;
  solution: string;
  result: string;
  technologies: string[];
};

const normalizeSegment = (segment?: string | null) =>
  String(segment || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const segmentLabel = (segment?: string | null) => {
  const value = normalizeSegment(segment);
  const map: Record<string, string> = {
    restaurante: 'Restaurante',
    restaurantes: 'Restaurante',
    restaurant: 'Restaurante',
    hamburgueria: 'Hamburgueria',
    hamburguerias: 'Hamburgueria',
    hamburgeria: 'Hamburgueria',
    lanchonete: 'Lanchonete',
    lanchonetes: 'Lanchonete',
    pizzaria: 'Pizzaria',
    pizzarias: 'Pizzaria',
    adega: 'Adega',
    adegas: 'Adega',
    mercado: 'Mercado',
    mercados: 'Mercado',
    hortifruti: 'Hortifruti',
    hortifrutis: 'Hortifruti',
    farmacia: 'Farmácia',
    farmacias: 'Farmácia',
    drogaria: 'Farmácia',
    drogarias: 'Farmácia',
    confeitaria: 'Confeitaria',
    confeitarias: 'Confeitaria',
    outros: 'Comércio local',
  };
  return map[value] || 'Comércio local';
};

const caseProblem = (segment?: string | null) => {
  const value = String(segment || '').toLowerCase();
  if (value === 'mercado' || value === 'farmacia') {
    return 'Operação com muitos itens e necessidade de organizar pedidos por categorias e disponibilidade.';
  }
  if (value === 'adega') {
    return 'Alta demanda em horários de pico e dificuldade para acompanhar pedidos e entrega em tempo real.';
  }
  return 'Processo de pedidos disperso em WhatsApp e sem visibilidade de produção e atendimento.';
};

const caseSolution = (name?: string) => {
  const storeName = String(name || 'a loja');
  return `Implantação do Já no Caminho para ${storeName}, com vitrine digital, painel operacional e fluxo de entrega/retirada com status ao vivo.`;
};

const caseResult = (store: PortfolioStore) => {
  const reviews = Number(store?.reviewSummary?.totalReviews || 0);
  const rating = Number(store?.reviewSummary?.avgStoreRating || 0);
  if (reviews > 0) {
    return `${reviews} avaliação(ões) públicas e nota média ${rating.toFixed(1)}. Operação estabilizada com jornada mobile-first.`;
  }
  return 'Operação digital publicada com experiência mobile profissional e base pronta para escalar vendas.';
};

const caseTags = (store: PortfolioCase) => {
  const tags: string[] = [];
  tags.push(store.segment);
  if (store.result.toLowerCase().includes('nota média') || store.result.toLowerCase().includes('nota media')) {
    tags.push('Sucesso de Vendas');
  }
  if (store.segment.toLowerCase().includes('restaurante') || store.segment.toLowerCase().includes('hamburgueria')) {
    tags.push('Entrega Rápida');
  }
  tags.push('Aberto agora');
  return tags.slice(0, 3);
};

const parseCityStateFromAddress = (address?: string | null) => {
  const raw = String(address || '').trim();
  if (!raw) return { city: '', state: '' };
  const byPipe = raw
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
  const candidates = byPipe.length ? [...byPipe].reverse() : [raw];
  candidates.push(raw);
  const matched = candidates
    .map((target) => target.match(/(.+?)\s*[-/]\s*([A-Za-z]{2})\b/))
    .find(Boolean);
  if (!matched) return { city: '', state: '' };
  return {
    city: String(matched?.[1] || '').trim(),
    state: String(matched?.[2] || '').trim().toUpperCase(),
  };
};

export function PortfolioPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<PortfolioStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name_asc' | 'name_desc'>('recent');
  const [visibleCount, setVisibleCount] = useState(12);
  useEffect(() => {
    document.title = 'Portfólio | Já no Caminho';
  }, []);

  useEffect(() => {
    let active = true;
    storeService
      .listPortfolio()
      .then((data) => {
        if (!active) return;
        setStores(Array.isArray(data) ? data : []);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || 'Não foi possível carregar o portfólio no momento.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
>>>>>>> main

    return () => {
      active = false;
    };
  }, []);

<<<<<<< HEAD
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
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.12),_transparent_60%)]" />
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20 relative">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-red-600">
                Portfolio de lojas
              </span>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900">
                Lojas ativas que ja vendem com o Chama no Espeto
              </h1>
              <p className="text-slate-600 text-sm sm:text-base">
                Explore as vitrines publicas e veja como cada loja personalizou sua experiencia.
              </p>
            </div>
            <div className="w-full lg:w-80">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.25em]">
                Buscar loja
              </label>
              <div className="mt-2 relative">
                <MagnifyingGlass size={16} weight="bold" className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Digite o nome ou slug"
                />
              </div>
            </div>
=======
  const cases = useMemo<PortfolioCase[]>(() => {
    return (stores || []).map((store, index) => {
      const logo = resolveAssetUrl(store?.settings?.logoUrl || undefined) || '/marketing/dashboard.png';
      const rawCity = (store as any)?.city || (store as any)?.addressCity || (store as any)?.settings?.city || '';
      const rawState = (store as any)?.state || (store as any)?.addressState || (store as any)?.settings?.state || '';
      const fallbackLocation = parseCityStateFromAddress((store as any)?.settings?.address || '');
      const city = String(rawCity || fallbackLocation.city || '').trim();
      const state = String(rawState || fallbackLocation.state || '').trim().toUpperCase();
      return {
        id: String(store.id || store.slug || store.name || `store-${index}`),
        name: store.name || 'Loja ativa',
        slug: store.slug || '',
        screenshot: logo,
        segment: segmentLabel(store?.settings?.segment),
        city: city || 'Não informado',
        state: state || '',
        cityFilterKey: city ? city.toLowerCase() : '',
        searchIndex: [
          store?.name,
          store?.slug,
          segmentLabel(store?.settings?.segment),
          city,
          state,
          store?.settings?.description,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
        problem: caseProblem(store?.settings?.segment),
        solution: caseSolution(store?.name),
        result: caseResult(store),
        technologies: ['React', 'Node.js', 'PostgreSQL', 'Mercado Pago', 'Docker'],
      };
    });
  }, [stores]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(queryInput.trim().toLowerCase()), 180);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  const segmentOptions = useMemo(() => {
    const options = Array.from(new Set(cases.map((item) => item.segment))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return options;
  }, [cases]);

  const cityOptions = useMemo(() => {
    const options = Array.from(
      new Set(
        cases
          .filter((item) => (stateFilter === 'all' ? true : item.state === stateFilter))
          .map((item) => item.city)
          .filter((city: string) => city && city !== 'Não informado')
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return options;
  }, [cases, stateFilter]);

  const stateOptions = useMemo(() => {
    return Array.from(
      new Set(
        cases.map((item) => item.state).filter((uf) => uf && uf.length === 2)
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [cases]);

  const filteredCases = useMemo(() => {
    const base = cases.filter((item) => {
      if (debouncedQuery && !item.searchIndex.includes(debouncedQuery)) return false;
      if (segmentFilter !== 'all' && item.segment !== segmentFilter) return false;
      if (stateFilter !== 'all' && item.state !== stateFilter) return false;
      if (cityFilter !== 'all' && item.city !== cityFilter) return false;
      return true;
    });
    if (sortBy === 'name_asc') {
      return [...base].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }
    if (sortBy === 'name_desc') {
      return [...base].sort((a, b) => b.name.localeCompare(a.name, 'pt-BR'));
    }
    return base;
  }, [cases, debouncedQuery, segmentFilter, stateFilter, cityFilter, sortBy]);

  useEffect(() => {
    setVisibleCount(12);
  }, [debouncedQuery, segmentFilter, stateFilter, cityFilter, sortBy]);

  useEffect(() => {
    if (cityFilter === 'all') return;
    if (!cityOptions.includes(cityFilter)) {
      setCityFilter('all');
    }
  }, [stateFilter, cityOptions, cityFilter]);

  const visibleCases = filteredCases.slice(0, visibleCount);
  const canLoadMore = visibleCount < filteredCases.length;

  return (
    <LandingPageLayout>
      <section className="bg-[linear-gradient(180deg,#f0f9ff_0%,#ffffff_55%,#ecfeff_100%)] py-14 sm:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-700 font-semibold">Portfólio</p>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 leading-[1.05] mt-2">
              Cases reais de operação digital com o Já no Caminho
            </h1>
            <p className="text-sm sm:text-lg text-slate-600 mt-4">
              Cada projeto mostra problema, solução aplicada e resultado. Estrutura pensada para negócios que precisam vender mais e operar melhor.
            </p>
>>>>>>> main
          </div>
        </div>
      </section>

<<<<<<< HEAD
      <section className="bg-slate-50 py-12">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Carregando portfólio...
=======
      <section className="bg-slate-50 py-12 sm:py-14">
        <div className="max-w-6xl mx-auto px-4 space-y-5">
          {!loading && !error && (
            <div className="ds-card p-4 sm:p-5 space-y-3">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_170px_130px_170px_150px_auto]">
                <div className="relative">
                  <MagnifyingGlass size={16} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={queryInput}
                    onChange={(event) => setQueryInput(event.target.value)}
                    placeholder="Buscar loja (nome, segmento, cidade, slug...)"
                    className="ds-input ds-focus-ring pl-10"
                  />
                </div>
                <div className="relative">
                  <select
                    value={segmentFilter}
                    onChange={(event) => setSegmentFilter(event.target.value)}
                    className="ds-select ds-focus-ring appearance-none pr-9"
                  >
                    <option value="all">Todos segmentos</option>
                    {segmentOptions.map((segment) => (
                      <option key={segment} value={segment}>
                        {segment}
                      </option>
                    ))}
                  </select>
                  <CaretDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <div className="relative">
                  <select
                    value={stateFilter}
                    onChange={(event) => setStateFilter(event.target.value)}
                    className="ds-select ds-focus-ring appearance-none pr-9"
                  >
                    <option value="all">Todas UFs</option>
                    {stateOptions.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                  <CaretDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <div className="relative">
                  <select
                    value={cityFilter}
                    onChange={(event) => setCityFilter(event.target.value)}
                    className="ds-select ds-focus-ring appearance-none pr-9"
                  >
                    <option value="all">Todas cidades</option>
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  <CaretDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(event) => {
                      const value = String(event.target.value);
                      if (value === 'recent' || value === 'name_asc' || value === 'name_desc') {
                        setSortBy(value);
                      }
                    }}
                    className="ds-select ds-focus-ring appearance-none pr-9"
                  >
                    <option value="recent">Mais recentes</option>
                    <option value="name_asc">Nome A-Z</option>
                    <option value="name_desc">Nome Z-A</option>
                  </select>
                  <CaretDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQueryInput('');
                    setDebouncedQuery('');
                    setSegmentFilter('all');
                    setStateFilter('all');
                    setCityFilter('all');
                    setSortBy('recent');
                  }}
                  className="ds-btn ds-btn-secondary ds-focus-ring px-4 py-3 text-sm font-bold"
                >
                  Limpar filtros
                </button>
              </div>
              {segmentOptions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSegmentFilter('all')}
                    className={`ds-btn px-3 py-1.5 rounded-full text-xs font-bold border ${
                      segmentFilter === 'all'
                        ? 'bg-brand-gradient text-white border-transparent'
                        : 'ds-btn-secondary border-slate-200 text-slate-700'
                    }`}
                  >
                    Todos
                  </button>
                  {segmentOptions.slice(0, 8).map((segment) => (
                    <button
                      key={segment}
                      type="button"
                      onClick={() => setSegmentFilter(segment)}
                      className={`ds-btn px-3 py-1.5 rounded-full text-xs font-bold border ${
                        segmentFilter === segment
                          ? 'bg-brand-gradient text-white border-transparent'
                          : 'ds-btn-secondary border-slate-200 text-slate-700'
                      }`}
                    >
                      {segment}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500">
                {filteredCases.length} resultado(s) encontrado(s)
              </p>
            </div>
          )}

          {loading && (
            <div className="ds-card p-5 space-y-3">
              <div className="ds-skeleton h-5 w-48" />
              <div className="ds-skeleton h-20 w-full" />
              <div className="ds-skeleton h-20 w-full" />
>>>>>>> main
            </div>
          )}

          {error && !loading && (
<<<<<<< HEAD
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && filteredStores.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <div className="text-4xl">🏪</div>
              <p className="mt-3 text-sm font-semibold text-slate-700">Nenhuma loja encontrada.</p>
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
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-sm text-slate-600 line-clamp-3">{description}</p>
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
              Equipe tecnica premium
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
                        if (member.profileImage) {
                          const resolved = resolveAssetUrl(member.profileImage) || member.profileImage;
                          setProfilePreview({
                            name: member.name,
                            image: resolved,
                          });
                        }
                      }}
                      className="relative h-20 w-20 rounded-[22px] bg-white border-2 border-white shadow-xl flex items-center justify-center text-lg font-bold text-slate-700 overflow-hidden transition hover:scale-[1.02]"
                      aria-label={`Ver foto de ${member.name}`}
                    >
                      {member.profileImage ? (
                        <img
                          src={resolveAssetUrl(member.profileImage) || member.profileImage}
                          alt={member.name}
                          className="h-full w-full object-cover rounded-[20px] ring-2 ring-white brightness-105 contrast-110"
                        />
                      ) : (
                        member.avatar
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
=======
            <div className="ds-alert ds-alert-error">{error}</div>
          )}

          {!loading && !error && filteredCases.length === 0 && (
            <div className="ds-empty-state p-10 text-center">
              <Storefront size={30} weight="duotone" className="mx-auto text-slate-500" />
              <p className="text-sm font-semibold text-slate-700 mt-3">Nenhuma loja encontrada com esses filtros.</p>
              <button
                type="button"
                onClick={() => {
                  setQueryInput('');
                  setDebouncedQuery('');
                  setSegmentFilter('all');
                  setStateFilter('all');
                  setCityFilter('all');
                  setSortBy('recent');
                }}
                className="mt-3 ds-btn ds-btn-secondary ds-focus-ring px-4 py-2 text-xs font-bold"
              >
                <FunnelSimple size={14} weight="duotone" className="inline-block mr-1" />
                Limpar filtros
              </button>
            </div>
          )}

          {!loading && !error && filteredCases.length > 0 && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleCases.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.slug) navigate(`/${item.slug}`);
                  }}
                  className="ds-card text-left overflow-hidden h-full flex flex-col transition-all duration-200 hover:scale-[1.02] hover:translate-y-[-4px] hover:shadow-[0_28px_60px_-30px_rgba(15,23,42,0.38)]"
                >
                  <div className="aspect-[16/7] bg-slate-100">
                    <img src={item.screenshot} alt={`Screenshot - ${item.name}`} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3 space-y-2 flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.17em] text-sky-700 font-semibold inline-flex items-center gap-1">
                          <Storefront size={12} weight="duotone" />
                          {item.segment}
                        </p>
                        <h2 className="text-base font-black text-slate-900 line-clamp-1">{item.name}</h2>
                        <p className="text-[11px] text-slate-500 mt-0.5 inline-flex items-center gap-1">
                          <MapPin size={11} weight="duotone" />
                          {item.city}{item.state ? ` • ${item.state}` : ''}
                        </p>
                      </div>
                      <span className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                        <ArrowUpRight size={14} weight="bold" />
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {caseTags(item).map((tag) => (
                        <span
                          key={`${item.id}-${tag}`}
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            tag === 'Aberto agora'
                              ? 'bg-emerald-100 text-emerald-700'
                              : tag === 'Entrega Rápida'
                              ? 'bg-sky-100 text-sky-700'
                              : 'bg-violet-100 text-violet-700'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-slate-600 line-clamp-2">{item.result}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.technologies.slice(0, 3).map((tech) => (
                          <span key={tech} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {tech}
                          </span>
                        ))}
                        {item.technologies.length > 3 && (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            +{item.technologies.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
              {canLoadMore && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 12)}
                    className="ds-btn ds-btn-secondary ds-focus-ring px-5 py-2.5 text-sm font-bold"
                  >
                    Carregar mais
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-2 sm:py-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#f8fafc,#eef2ff)] p-7 sm:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sky-700 font-semibold">Pronto para implantar</p>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-2">Quer implantar essa solução no seu negócio? Fale conosco.</h2>
              <p className="text-sm text-slate-600 mt-2">Estrutura modular, suporte na implantação e operação orientada a crescimento.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://wa.me/5512997822784"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-black text-white"
              >
                Falar no WhatsApp
              </a>
              <button
                type="button"
                onClick={() => navigate('/create')}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800"
              >
                Criar minha loja
              </button>
            </div>
          </div>
        </div>
      </section>
>>>>>>> main
    </LandingPageLayout>
  );
}
