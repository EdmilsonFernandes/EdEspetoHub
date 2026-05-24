import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BeerBottle,
  BowlFood,
  CaretRight,
  ForkKnife,
  Hamburger,
  IceCream,
  MagnifyingGlass,
  PawPrint,
  Pizza,
  ShoppingBagOpen,
  Sparkle,
  Star,
  Storefront,
  X,
} from '@phosphor-icons/react';
import { AppGlassHeader } from '../components/common/AppGlassHeader';
import { ClientBottomNav } from '../components/common/ClientBottomNav';
import { featuredService } from '../services/featuredService';
import { productService } from '../services/productService';
import { storeService } from '../services/storeService';
import { inputAssistProps } from '../utils/inputAssist';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getStoreAvatarUrl } from '../utils/storeAvatar';

type HubHighlightItem = {
  id: string;
  productId?: string;
  storeSlug: string;
  storeName: string;
  storeLogo: string;
  name: string;
  imageUrl: string;
  price: number;
  sponsored?: boolean;
  badge?: string;
};

type HighlightCategoryKey = 'all' | 'lanches' | 'pizza' | 'pratos' | 'bebidas' | 'doces' | 'mercado' | 'pets' | 'outros';

type HighlightCategoryOption = {
  key: HighlightCategoryKey;
  label: string;
  icon: typeof ForkKnife;
  keywords: string[];
  surfaceClassName: string;
  activeSurfaceClassName: string;
  iconClassName: string;
  glowClassName: string;
};

type CategorizedHighlightItem = HubHighlightItem & {
  categoryKey: HighlightCategoryKey;
};

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const normalizeHighlightSearchText = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const HIGHLIGHT_CATEGORY_OPTIONS: HighlightCategoryOption[] = [
  {
    key: 'all',
    label: 'Todos',
    icon: Sparkle,
    keywords: [],
    surfaceClassName: 'bg-[linear-gradient(145deg,#eaf7fb_0%,#ffffff_54%,#e9fff0_100%)] text-[#336886]',
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#153A4C_0%,#336886_60%,#5FD35A_145%)] text-white',
    iconClassName: 'text-[#336886]',
    glowClassName: 'bg-[#5FD35A]/45',
  },
  {
    key: 'lanches',
    label: 'Lanches',
    icon: Hamburger,
    keywords: ['lanche', 'hamburguer', 'burger', 'x-', 'x ', 'hot dog', 'cachorro quente', 'pastel', 'salgado'],
    surfaceClassName: 'bg-[linear-gradient(145deg,#fff4e6_0%,#fffaf3_58%,#ffe6bf_100%)] text-orange-600',
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#fb923c_0%,#f97316_54%,#fed7aa_145%)] text-white',
    iconClassName: 'text-orange-500',
    glowClassName: 'bg-orange-300/55',
  },
  {
    key: 'pizza',
    label: 'Pizza',
    icon: Pizza,
    keywords: ['pizza', 'pizzaria', 'esfiha', 'calzone'],
    surfaceClassName: 'bg-[linear-gradient(145deg,#fff1f2_0%,#fff7ed_58%,#fecdd3_100%)] text-rose-600',
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#fb7185_0%,#e11d48_56%,#fed7aa_145%)] text-white',
    iconClassName: 'text-rose-500',
    glowClassName: 'bg-rose-300/55',
  },
  {
    key: 'pratos',
    label: 'Pratos',
    icon: BowlFood,
    keywords: ['prato', 'marmita', 'almoco', 'janta', 'refeicao', 'frango', 'carne', 'costela', 'espeto', 'espetinho', 'peixe', 'porcao'],
    surfaceClassName: 'bg-[linear-gradient(145deg,#ecfdf5_0%,#ffffff_58%,#bbf7d0_100%)] text-emerald-700',
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#10b981_0%,#047857_58%,#bbf7d0_145%)] text-white',
    iconClassName: 'text-emerald-600',
    glowClassName: 'bg-emerald-300/55',
  },
  {
    key: 'bebidas',
    label: 'Bebidas',
    icon: BeerBottle,
    keywords: ['bebida', 'cerveja', 'refrigerante', 'coca', 'guarana', 'suco', 'agua', 'vinho', 'drink', 'cafe'],
    surfaceClassName: 'bg-[linear-gradient(145deg,#eff6ff_0%,#f8fbff_58%,#bfdbfe_100%)] text-sky-700',
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#38bdf8_0%,#2563eb_58%,#bae6fd_145%)] text-white',
    iconClassName: 'text-sky-600',
    glowClassName: 'bg-sky-300/55',
  },
  {
    key: 'doces',
    label: 'Doces',
    icon: IceCream,
    keywords: ['doce', 'bolo', 'sobremesa', 'chocolate', 'sorvete', 'acai', 'pudim', 'brigadeiro'],
    surfaceClassName: 'bg-[linear-gradient(145deg,#fdf2f8_0%,#fff7fb_58%,#fbcfe8_100%)] text-pink-600',
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#f472b6_0%,#db2777_58%,#fbcfe8_145%)] text-white',
    iconClassName: 'text-pink-500',
    glowClassName: 'bg-pink-300/55',
  },
  {
    key: 'mercado',
    label: 'Mercado',
    icon: ShoppingBagOpen,
    keywords: ['mercado', 'emporio', 'conveniencia', 'limpeza', 'higiene', 'padaria', 'mercearia'],
    surfaceClassName: 'bg-[linear-gradient(145deg,#fffbeb_0%,#ffffff_58%,#fde68a_100%)] text-amber-700',
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#fbbf24_0%,#d97706_58%,#fde68a_145%)] text-white',
    iconClassName: 'text-amber-600',
    glowClassName: 'bg-amber-300/55',
  },
  {
    key: 'pets',
    label: 'Pets',
    icon: PawPrint,
    keywords: ['racao', 'pet', 'gato', 'cachorro', 'cao', 'ração'],
    surfaceClassName: 'bg-[linear-gradient(145deg,#f5f3ff_0%,#ffffff_58%,#ddd6fe_100%)] text-violet-700',
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#a78bfa_0%,#7c3aed_58%,#ddd6fe_145%)] text-white',
    iconClassName: 'text-violet-600',
    glowClassName: 'bg-violet-300/55',
  },
  {
    key: 'outros',
    label: 'Outros',
    icon: Sparkle,
    keywords: [],
    surfaceClassName: 'bg-[linear-gradient(145deg,#f8fafc_0%,#ffffff_58%,#e2e8f0_100%)] text-slate-600',
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#475569_0%,#0f172a_68%,#cbd5e1_150%)] text-white',
    iconClassName: 'text-slate-500',
    glowClassName: 'bg-slate-300/55',
  },
];

const resolveHighlightCategoryKey = (item: HubHighlightItem): HighlightCategoryKey => {
  const text = normalizeHighlightSearchText(`${item.name} ${item.storeName}`);
  const match = HIGHLIGHT_CATEGORY_OPTIONS.find((option) =>
    option.key !== 'all' &&
    option.key !== 'outros' &&
    option.keywords.some((keyword) => text.includes(keyword))
  );
  return match?.key || 'outros';
};

const getHighlightCategoryOption = (key: HighlightCategoryKey) =>
  HIGHLIGHT_CATEGORY_OPTIONS.find((option) => option.key === key) || HIGHLIGHT_CATEGORY_OPTIONS[0];

const toStoreList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.stores)) return payload.stores;
  return [];
};

const normalizeStoreLogo = (store: any) => {
  const slug = String(store?.slug || '').trim();
  const name = String(store?.name || 'Loja').trim();
  return (
    resolveAssetUrl(
      store?.settings?.logoUrl ||
        store?.settings?.logo_url ||
        store?.logoUrl ||
        store?.logo_url ||
        store?.logo ||
        undefined
    ) || getStoreAvatarUrl(slug, name)
  );
};

const normalizeFeatured = (item: any): HubHighlightItem | null => {
  const storeSlug = String(item?.storeSlug || '').trim();
  const storeName = String(item?.storeName || 'Loja').trim();
  const price = Number(item?.price || 0);
  if (!storeSlug || !storeName || price <= 0) return null;

  const storeLogo =
    resolveAssetUrl(item?.storeLogoUrl || item?.storeLogo || undefined) ||
    getStoreAvatarUrl(storeSlug, storeName);

  return {
    id: String(item?.id || `${storeSlug}-${item?.productId || item?.productName || item?.name || 'destaque'}`),
    productId: String(item?.productId || '').trim() || undefined,
    storeSlug,
    storeName,
    storeLogo,
    name: String(item?.productName || item?.name || 'Produto em destaque').trim(),
    imageUrl: resolveAssetUrl(item?.imageUrl || undefined) || storeLogo,
    price,
    sponsored: true,
    badge: String(item?.badge || 'Patrocinado').trim(),
  };
};

const normalizeOrganicProduct = (product: any, store: any): HubHighlightItem | null => {
  const storeSlug = String(store?.slug || '').trim();
  const storeName = String(store?.name || 'Loja').trim();
  const storeLogo = normalizeStoreLogo(store);
  const price = Number((product?.promoActive && product?.promoPrice != null ? product?.promoPrice : product?.price) || 0);
  const name = String(product?.name || '').trim();
  if (!storeSlug || !name || price <= 0) return null;

  return {
    id: String(product?.id || `${storeSlug}-${name}`),
    productId: String(product?.id || '').trim() || undefined,
    storeSlug,
    storeName,
    storeLogo,
    name,
    imageUrl: resolveAssetUrl(product?.imageUrl || undefined) || storeLogo,
    price,
    sponsored: false,
  };
};

const stageFeaturedProductCheckout = (item: HubHighlightItem) => {
  const storeSlug = String(item?.storeSlug || '').trim();
  const productId = String(item?.productId || item?.id || '').trim();
  if (!storeSlug || !productId) return;

  try {
    localStorage.setItem(
      `reorder:${storeSlug}`,
      JSON.stringify({
        items: [
          {
            productId,
            name: String(item?.name || 'Produto').trim(),
            quantity: 1,
          },
        ],
      })
    );
  } catch (error) {
    console.error('Falha ao preparar item em destaque para a sacola', error);
  }
};

export function HubHighlightsPage() {
  const [items, setItems] = useState<HubHighlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HighlightCategoryKey>('all');

  useEffect(() => {
    let active = true;

    const loadHighlights = async () => {
      setLoading(true);
      try {
        const sponsoredPayload = await featuredService.listPublicFeatured(60).catch(() => []);
        const sponsored = (Array.isArray(sponsoredPayload) ? sponsoredPayload : [])
          .map(normalizeFeatured)
          .filter(Boolean) as HubHighlightItem[];

        let storePayload = await storeService.discoverPortfolio().catch(() => null);
        let stores = toStoreList(storePayload);
        if (stores.length === 0) {
          storePayload = await storeService.listPortfolio().catch(() => []);
          stores = toStoreList(storePayload);
        }

        const organicResponses = await Promise.allSettled(
          stores.slice(0, 12).map(async (store) => {
            const products = await productService.listPublicBySlug(String(store?.slug || ''));
            return (Array.isArray(products) ? products : [])
              .filter((product: any) => Boolean(product?.name) && Number(product?.price || product?.promoPrice || 0) > 0)
              .sort((a: any, b: any) => Number(Boolean(b?.isFeatured)) - Number(Boolean(a?.isFeatured)))
              .slice(0, 4)
              .map((product: any) => normalizeOrganicProduct(product, store))
              .filter(Boolean) as HubHighlightItem[];
          })
        );

        const organic = organicResponses.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
        const seen = new Set<string>();
        const merged = [...sponsored, ...organic].filter((entry) => {
          const key = `${entry.storeSlug}::${entry.productId || entry.id || entry.name}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (active) setItems(merged);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadHighlights();
    return () => {
      active = false;
    };
  }, []);

  const categorizedItems = useMemo<CategorizedHighlightItem[]>(
    () => items.map((item) => ({ ...item, categoryKey: resolveHighlightCategoryKey(item) })),
    [items]
  );

  const categoryFilters = useMemo(() => {
    const counts = new Map<HighlightCategoryKey, number>();
    categorizedItems.forEach((item) => {
      counts.set(item.categoryKey, (counts.get(item.categoryKey) || 0) + 1);
    });
    return HIGHLIGHT_CATEGORY_OPTIONS
      .map((option) => ({
        ...option,
        count: option.key === 'all' ? categorizedItems.length : counts.get(option.key) || 0,
      }))
      .filter((option) => option.key === 'all' || option.count > 0);
  }, [categorizedItems]);

  const filteredItems = useMemo(() => {
    const normalized = normalizeHighlightSearchText(query.trim());
    return categorizedItems.filter((item) => {
      if (selectedCategory !== 'all' && item.categoryKey !== selectedCategory) return false;
      if (!normalized) return true;
      return normalizeHighlightSearchText(`${item.name} ${item.storeName}`).includes(normalized);
    });
  }, [categorizedItems, query, selectedCategory]);

  const selectedCategoryLabel = getHighlightCategoryOption(selectedCategory).label;
  const heroSubtitle = selectedCategory === 'all'
    ? 'Veja pratos, bebidas, mercado e achados das lojas em uma lista simples.'
    : `Mostrando ${selectedCategoryLabel.toLowerCase()} das lojas disponíveis.`;
  const resetFilters = () => {
    setQuery('');
    setSelectedCategory('all');
  };

  const sponsoredCount = items.filter((item) => item.sponsored).length;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(51,104,134,0.14),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef4f8_100%)] text-slate-950">
      <AppGlassHeader
        title="Destaques de hoje"
        eyebrow="Já no Caminho"
        subtitle="Escolha pelo que deu vontade"
        backTo="/hub"
        maxWidthClassName="max-w-3xl"
        right={
          <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-[#153A4C] px-3 text-xs font-black text-white shadow-[0_14px_28px_-20px_rgba(21,58,76,0.55)]">
            {filteredItems.length}
          </span>
        }
      />

      <main className="mx-auto w-full max-w-3xl px-4 pb-[calc(var(--jnk-client-bottom-nav-height,0px)+2rem)] pt-[calc(env(safe-area-inset-top)+5.2rem)]">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-4 shadow-[0_24px_54px_-38px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/60 backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-[#336886]/12 blur-3xl" />
          <div className="relative flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.2rem] bg-[#153A4C] text-white shadow-[0_16px_30px_-22px_rgba(21,58,76,0.6)]">
              <Sparkle size={20} weight="fill" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#336886]">Para pedir agora</p>
              <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">Escolha o item. A loja certa abre para você.</h2>
              <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-600">
                {heroSubtitle}
              </p>
            </div>
          </div>

          <div className="relative mt-4 overflow-hidden rounded-[1.65rem] border border-white/90 bg-white/92 p-1.5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.32)] ring-1 ring-slate-200/55">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-[radial-gradient(circle_at_center,rgba(95,211,90,0.18),transparent_68%)]" />
            <div className="relative flex items-center gap-2.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[1.15rem] bg-[linear-gradient(145deg,#5FD35A_0%,#336886_64%,#153A4C_100%)] text-white shadow-[0_14px_26px_-18px_rgba(51,104,134,0.68)]">
                <MagnifyingGlass size={18} weight="bold" />
              </span>
              <div className="min-w-0 flex-1 py-1">
                <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-[#336886]/75">Pesquisar</span>
                <input
                  {...inputAssistProps.search}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="O que deu vontade agora?"
                  className="mt-0.5 min-w-0 w-full bg-transparent text-[15px] font-black tracking-[-0.02em] text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-sm active:scale-95"
                  aria-label="Limpar busca"
                >
                  <X size={12} weight="bold" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categoryFilters.map((option) => {
              const CategoryIcon = option.icon;
              const active = selectedCategory === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedCategory(option.key)}
                  className="group flex w-[4.45rem] shrink-0 snap-start flex-col items-center gap-1.5 text-center transition active:scale-[0.95]"
                >
                  <span
                    className={`relative grid h-[3.65rem] w-[3.65rem] place-items-center overflow-hidden rounded-[1.35rem] border transition-all duration-300 ${
                      active
                        ? `${option.activeSurfaceClassName} border-white/70 shadow-[0_20px_34px_-22px_rgba(15,23,42,0.44)]`
                        : `${option.surfaceClassName} border-white/90 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/60 group-hover:-translate-y-0.5`
                    }`}
                  >
                    <span className={`absolute -right-3 -top-3 h-9 w-9 rounded-full blur-xl ${option.glowClassName}`} />
                    <span className="absolute inset-x-2 top-1 h-4 rounded-full bg-white/35 blur-[10px]" />
                    <CategoryIcon
                      size={27}
                      weight={active ? 'fill' : 'duotone'}
                      className={`relative z-10 drop-shadow-[0_8px_14px_rgba(15,23,42,0.12)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105 ${
                        active ? 'text-white' : option.iconClassName
                      }`}
                    />
                    {option.count > 0 ? (
                      <span className={`absolute right-1.5 top-1.5 z-20 rounded-full px-1.5 py-0.5 text-[8px] font-black leading-none ${
                        active ? 'bg-white/20 text-white' : 'bg-white/90 text-slate-500 shadow-sm'
                      }`}>
                        {option.count}
                      </span>
                    ) : null}
                  </span>
                  <span className={`max-w-full truncate text-[10px] font-black tracking-[-0.01em] ${active ? 'text-[#153A4C]' : 'text-slate-600'}`}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#336886]/12 bg-white/86 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#336886] shadow-[0_12px_24px_-20px_rgba(51,104,134,0.28)]">
            <ForkKnife size={12} weight="fill" />
            {filteredItems.length === 1 ? '1 opção' : `${filteredItems.length} opções`}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.18)]">
            <Storefront size={12} weight="duotone" />
            Várias lojas
          </span>
          {sponsoredCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50/80 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700 shadow-[0_12px_24px_-22px_rgba(245,158,11,0.18)]">
              <Star size={12} weight="fill" />
              Seleção em destaque
            </span>
          ) : null}
        </section>

        {loading ? (
          <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="grid h-[132px] grid-cols-[6.35rem_minmax(0,1fr)] items-center gap-3 rounded-[1.65rem] bg-white/80 p-2.5 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.3)] ring-1 ring-slate-200/60"
              >
                <div className="h-[6.35rem] w-[6.35rem] shrink-0 rounded-[1.25rem] ds-skeleton" />
                <div className="flex flex-col justify-center space-y-2.5">
                  <div className="h-3 w-5/12 rounded-full ds-skeleton" />
                  <div className="h-4 w-9/12 rounded-full ds-skeleton" />
                  <div className="h-3 w-6/12 rounded-full ds-skeleton" />
                  <div className="h-5 w-4/12 rounded-full ds-skeleton" />
                </div>
              </div>
            ))}
          </section>
        ) : filteredItems.length === 0 ? (
          <section className="mt-5 rounded-[1.8rem] border border-white/80 bg-white/88 p-8 text-center shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]">
            <ForkKnife size={30} weight="duotone" className="mx-auto text-slate-400" />
            <p className="mt-3 text-sm font-black text-slate-800">Nenhum destaque encontrado.</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Limpe a busca ou veja todos os tipos de item disponíveis.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 rounded-full bg-[#153A4C] px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white"
            >
              Ver todos
            </button>
          </section>
        ) : (
          <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredItems.map((item, index) => {
              const storePath = `/${item.storeSlug}`;
              const categoryOption = getHighlightCategoryOption(item.categoryKey);
              const CategoryIcon = categoryOption.icon;
              return (
                <Link
                  key={`${item.storeSlug}-${item.id}-${index}`}
                  to={storePath}
                  onClick={() => stageFeaturedProductCheckout(item)}
                  style={{ animationDelay: `${Math.min(index, 10) * 34}ms` }}
                  className="group grid min-h-[132px] grid-cols-[6.35rem_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-[1.65rem] border border-white bg-white p-2.5 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.2)] ring-1 ring-slate-100/80 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards active:scale-[0.985] md:hover:-translate-y-0.5 md:hover:shadow-[0_24px_52px_-34px_rgba(15,23,42,0.24)]"
                >
                  <div className="relative h-[6.35rem] w-[6.35rem] shrink-0 overflow-hidden rounded-[1.25rem] bg-slate-100">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading={index < 3 ? 'eager' : 'lazy'}
                      fetchPriority={index < 3 ? 'high' : 'auto'}
                      decoding="async"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      onError={(event) => {
                        (event.target as HTMLImageElement).src = item.storeLogo || getStoreAvatarUrl(item.storeSlug, item.storeName);
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/36 via-transparent to-black/6" />
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/88 px-2 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-[#153A4C] shadow-[0_8px_18px_-12px_rgba(15,23,42,0.38)] backdrop-blur-md">
                      <CategoryIcon size={8} weight="fill" />
                      {categoryOption.label}
                    </span>
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-[0.8rem] border border-white/32 bg-black/26 px-2 py-1 text-[8px] font-black italic uppercase tracking-[0.16em] text-white shadow-[0_8px_18px_-12px_rgba(15,23,42,0.38)] backdrop-blur-md">
                      {item.sponsored ? <Star size={8} weight="fill" className="text-amber-500" /> : <Sparkle size={8} weight="fill" className="text-[#336886]" />}
                      {item.sponsored ? item.badge || 'Destaque' : 'Seleção'}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-col py-1 pr-1">
                    <p className="line-clamp-2 text-[14px] font-black leading-[1.15rem] tracking-tight text-slate-950">{item.name}</p>
                    <div className="mt-2 flex min-w-0 items-center gap-1.5">
                      <img
                        src={item.storeLogo}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-[18px] w-[18px] shrink-0 rounded-full border border-slate-100 bg-white object-cover"
                        onError={(event) => {
                          (event.target as HTMLImageElement).src = getStoreAvatarUrl(item.storeSlug, item.storeName);
                        }}
                      />
                      <span className="truncate text-[10.5px] font-bold text-slate-400">por {item.storeName}</span>
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                      <p className="text-[20px] font-black leading-none tracking-[-0.05em] text-[#153A4C]">{currency.format(item.price)}</p>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#edf5fa] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#336886] transition group-hover:translate-x-0.5">
                        Abrir
                        <CaretRight size={9} weight="bold" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        <div className="mt-5 flex justify-center">
          <Link to="/hub" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/86 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-slate-600 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.25)]">
            Voltar para a home
            <CaretRight size={12} weight="bold" />
          </Link>
        </div>
      </main>

      <ClientBottomNav active="home" />
    </div>
  );
}
