import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search, X } from "lucide-react";
import { LandingPageLayout } from "../layouts/LandingPageLayout";
import { storeService } from "../services/storeService";
import { resolveAssetUrl } from "../utils/resolveAssetUrl";

type PortfolioStore = {
  id?: string;
  name?: string;
  slug?: string;
  settings?: {
    logoUrl?: string | null;
    description?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
  } | null;
};

export function PortfolioPage() {
  const teamMembers = [
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
      color: "from-sky-500 to-indigo-500",
      profileUrl: "https://www.linkedin.com/in/gabrielbotega/",
    },
    {
      name: "Juan Felipe Rada",
      role: "Desenvolvedor Frontend",
      years: 4,
      description:
        "Focado em criar interfaces bonitas e eficientes com experiencia em frameworks modernos e design responsivo.",
      experience: [
        "React & TypeScript",
        "Design Responsivo",
        "Arquitetura de Componentes",
        "Implementacao de UI",
        "Otimizacao de Performance",
      ],
      previousWork: "Construiu aplicacoes frontend para plataformas de e-commerce e gerenciamento",
      avatar: "J",
      color: "from-emerald-500 to-teal-500",
      profileUrl: "https://www.linkedin.com/in/radapls/",
    },
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
        if (active) setError(err?.message || "Nao foi possivel carregar as lojas.");
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
                        <ArrowUpRight className="w-5 h-5 text-white/80 transition-transform group-hover:translate-x-1" />
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
                Estrutura enxuta, stack moderna e foco em entrega rapida com qualidade de produto.
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
                <X className="w-4 h-4" />
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
    </LandingPageLayout>
  );
}
