import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Storefront } from '@phosphor-icons/react';
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
  } | null;
};

type PortfolioCase = {
  id: string;
  name: string;
  slug: string;
  screenshot: string;
  segment: string;
  city: string;
  cityFilterKey: string;
  searchIndex: string;
  problem: string;
  solution: string;
  result: string;
  technologies: string[];
};

const segmentLabel = (segment?: string | null) => {
  const value = String(segment || '').toLowerCase();
  const map: Record<string, string> = {
    restaurante: 'Restaurante',
    hamburgueria: 'Hamburgueria',
    lanchonete: 'Lanchonete',
    pizzaria: 'Pizzaria',
    adega: 'Adega',
    mercado: 'Mercado',
    hortifruti: 'Hortifruti',
    farmacia: 'Farmácia',
    confeitaria: 'Confeitaria',
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

export function PortfolioPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<PortfolioStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(9);

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
      const city = String(rawCity || '').trim();
      return {
        id: String(store.id || store.slug || store.name || `store-${index}`),
        name: store.name || 'Loja ativa',
        slug: store.slug || '',
        screenshot: logo,
        segment: segmentLabel(store?.settings?.segment),
        city: city || 'Não informado',
        cityFilterKey: city ? city.toLowerCase() : '',
        searchIndex: [
          store?.name,
          store?.slug,
          segmentLabel(store?.settings?.segment),
          city,
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
          .map((item) => item.city)
          .filter((city: string) => city && city !== 'Não informado')
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return options;
  }, [cases]);

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      if (debouncedQuery && !item.searchIndex.includes(debouncedQuery)) return false;
      if (segmentFilter !== 'all' && item.segment !== segmentFilter) return false;
      if (cityFilter !== 'all' && item.city !== cityFilter) return false;
      return true;
    });
  }, [cases, debouncedQuery, segmentFilter, cityFilter]);

  useEffect(() => {
    setVisibleCount(9);
  }, [debouncedQuery, segmentFilter, cityFilter]);

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
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
              <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
                <input
                  value={queryInput}
                  onChange={(event) => setQueryInput(event.target.value)}
                  placeholder="Buscar loja (nome, segmento, cidade, slug...)"
                  className="ds-input ds-focus-ring"
                />
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
                <button
                  type="button"
                  onClick={() => {
                    setQueryInput('');
                    setDebouncedQuery('');
                    setSegmentFilter('all');
                    setCityFilter('all');
                  }}
                  className="ds-btn ds-btn-secondary ds-focus-ring px-4 py-3 text-sm font-bold"
                >
                  Limpar
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {filteredCases.length} resultado(s) encontrado(s)
              </p>
            </div>
          )}

          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Carregando cases...</div>
          )}

          {error && !loading && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div>
          )}

          {!loading && !error && filteredCases.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <Storefront size={30} weight="duotone" className="mx-auto text-slate-500" />
              <p className="text-sm font-semibold text-slate-700 mt-3">Nenhum case disponível por enquanto.</p>
            </div>
          )}

          {!loading && !error && filteredCases.length > 0 && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleCases.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <img src={item.screenshot} alt={`Screenshot - ${item.name}`} className="w-full h-40 object-cover bg-slate-100" />
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-sky-700 font-semibold">{item.segment}</p>
                        <h2 className="text-lg font-black text-slate-900 line-clamp-1">{item.name}</h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.city}</p>
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

                    <div className="grid gap-2.5">
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

                    <div>
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
