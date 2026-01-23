import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MagnifyingGlass, X } from "@phosphor-icons/react";
import { LandingPageLayout } from "../layouts/LandingPageLayout";
import { storeService } from "../services/storeService";
import { productService } from "../services/productService";
import { orderService } from "../services/orderService";
import { resolveAssetUrl } from "../utils/resolveAssetUrl";
import { formatCurrency } from "../utils/format";

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
  const [menuBySlug, setMenuBySlug] = useState<Record<string, { items: { name: string; price: number }[]; loading: boolean }>>({});

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

    slugs.forEach((slug) => {
      if (menuBySlug[slug]) return;
      setMenuBySlug((prev) => ({
        ...prev,
        [slug]: { items: [], loading: true },
      }));
      orderService
        .fetchHighlightsBySlug(slug)
        .then((highlights) => {
          if (!active) return;
          const items = (highlights || []).slice(0, 3).map((item: { name?: string; price?: number }) => ({
            name: item?.name || "Produto",
            price: Number(item?.price) || 0,
          }));
          if (items.length) {
            setMenuBySlug((prev) => ({
              ...prev,
              [slug]: { items, loading: false },
            }));
            return;
          }
          return productService.listPublicBySlug(slug).then((products: any[]) => {
            if (!active) return;
            const fallbackItems = (products || [])
              .slice(0, 3)
              .map((product: { promoPrice?: number; promoActive?: boolean; price?: number; name?: string }) => {
                const promoPrice = product?.promoPrice != null ? Number(product.promoPrice) : null;
                const price = product?.promoActive && promoPrice && promoPrice > 0
                  ? promoPrice
                  : Number(product?.price) || 0;
                return { name: product?.name || "Produto", price };
              });
            setMenuBySlug((prev) => ({
              ...prev,
              [slug]: { items: fallbackItems, loading: false },
            }));
          });
        })
        .catch(() => {
          if (!active) return;
          setMenuBySlug((prev) => ({
            ...prev,
            [slug]: { items: [], loading: false },
          }));
        });
    });

    return () => {
      active = false;
    };
  }, [stores, menuBySlug]);

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
          </div>
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
                            🔥 Mais vendidos
                          </span>
                        </div>
                        <div className="mt-3 space-y-2 text-xs text-slate-600">
                          {menuInfo?.loading && (
                            <div className="text-xs text-slate-400">Carregando produtos...</div>
                          )}
                          {!menuInfo?.loading && menuInfo?.items?.length === 0 && (
                            <div className="text-xs text-slate-400">Sem produtos cadastrados.</div>
                          )}
                          {menuInfo?.items?.map((item) => (
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
    </LandingPageLayout>
  );
}
