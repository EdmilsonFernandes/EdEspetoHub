import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search } from "lucide-react";
import { LandingPageLayout } from "../layouts/LandingPageLayout";
import { storeService } from "../services/storeService";
import { resolveAssetUrl } from "../utils/resolveAssetUrl";

export function PortfolioPage() {
  const [stores, setStores] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadPortfolio = async () => {
      try {
        setLoading(true);
        const data = await storeService.listPortfolio();
        if (active) setStores(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) setError(err.message || "Nao foi possivel carregar as lojas.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPortfolio();

    return () => {
      active = false;
    };
  }, []);

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
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Digite o nome ou slug"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Carregando portfolio...
            </div>
          )}

          {error && !loading && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && filteredStores.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Nenhuma loja encontrada.
            </div>
          )}

          {!loading && !error && filteredStores.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredStores.map((store) => {
                const logo = resolveAssetUrl(store?.settings?.logoUrl);
                const description = store?.settings?.description || "Loja ativa no Chama no Espeto.";
                const primary = store?.settings?.primaryColor || "#dc2626";
                const secondary = store?.settings?.secondaryColor || "#111827";
                return (
                  <Link
                    key={store.id || store.slug}
                    to={`/${store.slug}`}
                    className="group rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all overflow-hidden"
                  >
                    <div
                      className="h-20"
                      style={{
                        backgroundImage: `linear-gradient(120deg, ${primary}, ${secondary})`,
                      }}
                    />
                    <div className="p-6 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white shadow bg-white flex items-center justify-center text-lg font-bold text-slate-700">
                          {logo ? (
                            <img src={logo} alt={store.name} className="w-full h-full object-cover" />
                          ) : (
                            getInitials(store?.name)
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Loja</p>
                          <h3 className="text-lg font-bold text-slate-900">{store.name}</h3>
                          <p className="text-xs text-slate-500">/{store.slug}</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-3">{description}</p>
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-red-600">
                        Visitar loja
                        <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </LandingPageLayout>
  );
}
