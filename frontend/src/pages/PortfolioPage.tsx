import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, FunnelSimple, LinkedinLogo, MagnifyingGlass, MapPin, Storefront } from '@phosphor-icons/react';
import { Link, useNavigate } from 'react-router-dom';
import { LandingPageLayout } from '../layouts/LandingPageLayout';
import { storeService } from '../services/storeService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

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
  return `Implantação do Jano Caminho para ${storeName}, com cardápio digital, painel operacional e fluxo de entrega/retirada com status ao vivo.`;
};

const caseResult = (store: PortfolioStore) => {
  const reviews = Number(store?.reviewSummary?.totalReviews || 0);
  const rating = Number(store?.reviewSummary?.avgStoreRating || 0);
  if (reviews > 0) {
    return `${reviews} avaliação(ões) públicas e nota média ${rating.toFixed(1)}. Operação estabilizada com jornada mobile-first.`;
  }
  return 'Operação digital publicada com experiência mobile profissional e base pronta para escalar vendas.';
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
  const [visibleCount, setVisibleCount] = useState(9);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const teamMembers = [
    {
      name: 'Edmilson Lopes Fernandes',
      role: 'Arquiteto de Software e Desenvolvedor Full Stack Sênior',
      badge: 'Principal',
      years: 15,
      profileUrl: 'https://www.linkedin.com/in/edmilson-santos-6805a515/',
      profileImage: '/team/edmilson.png',
      color: 'from-red-500 to-amber-500',
    },
    {
      name: 'Gabriel Botega',
      role: 'Desenvolvedor Backend',
      badge: 'Backend',
      years: 4,
      profileUrl: 'https://www.linkedin.com/in/gabrielbotega/',
      profileImage: '/uploads/perfil/gabriel.jpeg',
      color: 'from-sky-500 to-indigo-500',
    },
    {
      name: 'Juan Felipe Rada',
      role: 'Desenvolvedor Frontend',
      badge: 'Frontend',
      years: 4,
      profileUrl: 'https://www.linkedin.com/in/radapls/',
      profileImage: '/uploads/perfil/juan.jpeg',
      color: 'from-emerald-500 to-teal-500',
    },
  ];

  useEffect(() => {
    document.title = 'Portfólio | Jano Caminho';
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

    return () => {
      active = false;
    };
  }, []);

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
    setVisibleCount(9);
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
              Cases reais de operação digital com o Jano Caminho
            </h1>
            <p className="text-sm sm:text-lg text-slate-600 mt-4">
              Cada projeto mostra problema, solução aplicada e resultado. Estrutura pensada para negócios que precisam vender mais e operar melhor.
            </p>
          </div>
        </div>
      </section>

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
                <select
                  value={segmentFilter}
                  onChange={(event) => setSegmentFilter(event.target.value)}
                  className="ds-select ds-focus-ring"
                >
                  <option value="all">Todos segmentos</option>
                  {segmentOptions.map((segment) => (
                    <option key={segment} value={segment}>
                      {segment}
                    </option>
                  ))}
                </select>
                <select
                  value={stateFilter}
                  onChange={(event) => setStateFilter(event.target.value)}
                  className="ds-select ds-focus-ring"
                >
                  <option value="all">Todas UFs</option>
                  {stateOptions.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
                <select
                  value={cityFilter}
                  onChange={(event) => setCityFilter(event.target.value)}
                  className="ds-select ds-focus-ring"
                >
                  <option value="all">Todas cidades</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(event) => {
                    const value = String(event.target.value);
                    if (value === 'recent' || value === 'name_asc' || value === 'name_desc') {
                      setSortBy(value);
                    }
                  }}
                  className="ds-select ds-focus-ring"
                >
                  <option value="recent">Mais recentes</option>
                  <option value="name_asc">Nome A-Z</option>
                  <option value="name_desc">Nome Z-A</option>
                </select>
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
            <div className="ds-card p-5 text-sm text-slate-500">Carregando cases...</div>
          )}

          {error && !loading && (
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
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleCases.map((item) => (
                <article key={item.id} className="ds-card overflow-hidden h-full flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-30px_rgba(15,23,42,0.45)]">
                  <div className="aspect-[16/8] bg-slate-100">
                    <img src={item.screenshot} alt={`Screenshot - ${item.name}`} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3.5 space-y-2.5 flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-sky-700 font-semibold inline-flex items-center gap-1">
                          <Storefront size={12} weight="duotone" />
                          {item.segment}
                        </p>
                        <h2 className="text-lg font-black text-slate-900 line-clamp-1">{item.name}</h2>
                        <p className="text-[11px] text-slate-500 mt-0.5 inline-flex items-center gap-1">
                          <MapPin size={11} weight="duotone" />
                          {item.city}{item.state ? ` • ${item.state}` : ''}
                        </p>
                      </div>
                      {item.slug ? (
                        <Link
                          to={`/${item.slug}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          Ver loja
                          <ArrowUpRight size={14} weight="bold" />
                        </Link>
                      ) : null}
                    </div>

                    <div className="grid gap-2.5 flex-1">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Problema resolvido</p>
                        <p className="text-xs text-slate-700 mt-1 line-clamp-2">{item.problem}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Solução aplicada</p>
                        <p className="text-xs text-slate-700 mt-1 line-clamp-2">{item.solution}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-700">Resultado obtido</p>
                        <p className="text-xs text-emerald-800 mt-1 line-clamp-2">{item.result}</p>
                      </div>
                    </div>

                    <div className="pt-0.5">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500 mb-2">Tecnologias utilizadas</p>
                      <div className="flex flex-wrap gap-2">
                        {item.technologies.map((tech) => (
                          <span key={tech} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
              {canLoadMore && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 9)}
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

      <section className="bg-white py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-10 rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#f8fafc,#f1f5f9)] p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-sky-700 font-semibold">Time de desenvolvimento</p>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">Especialistas por trás da plataforma</h2>
                <p className="text-sm text-slate-600 mt-2">Engenharia de produto focada em performance, escala e experiência premium.</p>
              </div>
              <span className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
                Equipe técnica
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {teamMembers.map((member) => {
                const initials = member.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                const canShowImage = Boolean(member.profileImage) && !imageErrors[member.name];
                return (
                  <article key={member.name} className="ds-card overflow-hidden">
                    <div className={`h-16 bg-gradient-to-r ${member.color}`} />
                    <div className="p-4 -mt-7">
                      <div className="flex items-start justify-between gap-3">
                        <div className="h-14 w-14 rounded-2xl overflow-hidden border-2 border-white shadow-sm bg-white">
                          {canShowImage ? (
                            <img
                              src={resolveAssetUrl(member.profileImage)}
                              alt={member.name}
                              className="h-full w-full object-cover"
                              onError={() => setImageErrors((prev) => ({ ...prev, [member.name]: true }))}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-sm font-black text-slate-600 bg-slate-100">
                              {initials}
                            </div>
                          )}
                        </div>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {member.badge} • {member.years} anos
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-base font-black text-slate-900">{member.name}</h3>
                        <p className="text-sm font-semibold text-sky-700 mt-0.5">{member.role}</p>
                      </div>
                      <a
                        href={member.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a66c2] px-3 py-2.5 text-sm font-bold text-white hover:opacity-95"
                      >
                        <LinkedinLogo size={16} weight="fill" />
                        Ver LinkedIn
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
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
    </LandingPageLayout>
  );
}
