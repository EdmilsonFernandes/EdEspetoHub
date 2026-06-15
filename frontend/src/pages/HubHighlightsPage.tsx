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
import { Button, Chip, EmptyState, SkeletonBlock, SurfaceCard } from '../components/ui';
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

const HIGHLIGHTS_STORE_SCAN_LIMIT = 48;
const HIGHLIGHTS_PRODUCTS_PER_STORE = 24;

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
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#153A4C_0%,#336886_60%,#5FD35A_145%)] text-white shadow-[0_16px_28px_-10px_rgba(21,58,76,0.48),0_4px_10px_-2px_rgba(95,211,90,0.3)]',
    iconClassName: 'text-[#336886]',
    glowClassName: 'bg-[#5FD35A]/45',
  },
  {
    key: 'lanches',
    label: 'Lanches',
    icon: Hamburger,
    keywords: ['lanche', 'hamburguer', 'burger', 'x-', 'x ', 'hot dog', 'cachorro quente', 'pastel', 'salgado'],
    surfaceClassName: 'bg-[linear-gradient(145deg,#fff4e6_0%,#fffaf3_58%,#ffe6bf_100%)] text-orange-600',
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#fb923c_0%,#f97316_54%,#fed7aa_145%)] text-white shadow-[0_16px_28px_-10px_rgba(249,115,22,0.5),0_4px_10px_-2px_rgba(249,115,22,0.3)]',
    iconClassName: 'text-orange-500',
    glowClassName: 'bg-orange-300/55',
  },
  {
    key: 'pizza',
    label: 'Pizza',
    icon: Pizza,
    keywords: ['pizza', 'pizzaria', 'esfiha', 'calzone'],
    surfaceClassName: 'bg-[linear-gradient(145deg,#fff1f2_0%,#fff7ed_58%,#fecdd3_100%)] text-rose-600',
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#fb7185_0%,#e11d48_56%,#fed7aa_145%)] text-white shadow-[0_16px_28px_-10px_rgba(225,29,72,0.5),0_4px_10px_-2px_rgba(244,63,94,0.3)]',
    iconClassName: 'text-rose-500',
    glowClassName: 'bg-rose-300/55',
  },
  {
    key: 'pratos',
    label: 'Pratos',
    icon: BowlFood,
    keywords: ['prato', 'marmita', 'almoco', 'janta', 'refeicao', 'frango', 'carne', 'costela', 'espeto', 'espetinho', 'peixe', 'porcao'],
    surfaceClassName: 'bg-[linear-gradient(145deg,#ecfdf5_0%,#ffffff_58%,#bbf7d0_100%)] text-emerald-700',
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#10b981_0%,#047857_58%,#bbf7d0_145%)] text-white shadow-[0_16px_28px_-10px_rgba(4,120,87,0.5),0_4px_10px_-2px_rgba(16,185,129,0.3)]',
    iconClassName: 'text-emerald-600',
    glowClassName: 'bg-emerald-300/55',
  },
  {
    key: 'bebidas',
    label: 'Bebidas',
    icon: BeerBottle,
    keywords: ['bebida', 'cerveja', 'refrigerante', 'coca', 'guarana', 'suco', 'agua', 'vinho', 'drink', 'cafe'],
    surfaceClassName: 'bg-[linear-gradient(145deg,#eff6ff_0%,#f8fbff_58%,#bfdbfe_100%)] text-sky-700',
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#38bdf8_0%,#2563eb_58%,#bae6fd_145%)] text-white shadow-[0_16px_28px_-10px_rgba(37,99,235,0.5),0_4px_10px_-2px_rgba(56,189,248,0.3)]',
    iconClassName: 'text-sky-600',
    glowClassName: 'bg-sky-300/55',
  },
  {
    key: 'doces',
    label: 'Doces',
    icon: IceCream,
    keywords: ['doce', 'bolo', 'sobremesa', 'chocolate', 'sorvete', 'acai', 'pudim', 'brigadeiro'],
    surfaceClassName: 'bg-[linear-gradient(145deg,#fdf2f8_0%,#fff7fb_58%,#fbcfe8_100%)] text-pink-600',
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#f472b6_0%,#db2777_58%,#fbcfe8_145%)] text-white shadow-[0_16px_28px_-10px_rgba(219,39,119,0.5),0_4px_10px_-2px_rgba(236,72,153,0.3)]',
    iconClassName: 'text-pink-500',
    glowClassName: 'bg-pink-300/55',
  },
  {
    key: 'mercado',
    label: 'Mercado',
    icon: ShoppingBagOpen,
    keywords: ['mercado', 'emporio', 'conveniencia', 'limpeza', 'higiene', 'padaria', 'mercearia'],
    surfaceClassName: 'bg-[linear-gradient(145deg,#fffbeb_0%,#ffffff_58%,#fde68a_100%)] text-amber-700',
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#fbbf24_0%,#d97706_58%,#fde68a_145%)] text-white shadow-[0_16px_28px_-10px_rgba(217,119,6,0.5),0_4px_10px_-2px_rgba(251,191,36,0.3)]',
    iconClassName: 'text-amber-600',
    glowClassName: 'bg-amber-300/55',
  },
  {
    key: 'pets',
    label: 'Pets',
    icon: PawPrint,
    keywords: ['racao', 'pet', 'gato', 'cachorro', 'cao', 'ração'],
    surfaceClassName: 'bg-[linear-gradient(145deg,#f5f3ff_0%,#ffffff_58%,#ddd6fe_100%)] text-violet-700',
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#a78bfa_0%,#7c3aed_58%,#ddd6fe_145%)] text-white shadow-[0_16px_28px_-10px_rgba(124,58,237,0.5),0_4px_10px_-2px_rgba(167,139,250,0.3)]',
    iconClassName: 'text-violet-600',
    glowClassName: 'bg-violet-300/55',
  },
  {
    key: 'outros',
    label: 'Outros',
    icon: Sparkle,
    keywords: [],
    surfaceClassName: 'bg-[linear-gradient(145deg,#f8fafc_0%,#ffffff_58%,#e2e8f0_100%)] text-slate-600',
    activeSurfaceClassName: 'bg-[linear-gradient(145deg,#475569_0%,#0f172a_68%,#cbd5e1_150%)] text-white shadow-[0_16px_28px_-10px_rgba(15,23,42,0.48),0_4px_10px_-2px_rgba(71,85,105,0.3)]',
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

const getHighlightFilterGridClass = (count: number) => {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  if (count === 3) return 'grid-cols-3';
  if (count === 4) return 'grid-cols-4';
  if (count <= 6) return 'grid-cols-3';
  return 'grid-cols-4';
};

const toStoreList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.stores)) return payload.stores;
  return [];
};

const mergeStoresBySlug = (...groups: any[][]) => {
  const seen = new Set<string>();
  return groups.flat().filter((store) => {
    const slug = String(store?.slug || '').trim().toLowerCase();
    if (!slug || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
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
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    let active = true;

    const loadHighlights = async () => {
      setLoading(true);
      try {
        const sponsoredPayload = await featuredService.listPublicFeatured(60).catch(() => []);
        const sponsored = (Array.isArray(sponsoredPayload) ? sponsoredPayload : [])
          .map(normalizeFeatured)
          .filter(Boolean) as HubHighlightItem[];

        const [portfolioResult, discoveryResult] = await Promise.allSettled([
          storeService.listPortfolio().catch(() => []),
          storeService.discoverPortfolio().catch(() => []),
        ]);
        const portfolioStores = portfolioResult.status === 'fulfilled' ? toStoreList(portfolioResult.value) : [];
        const discoveryStores = discoveryResult.status === 'fulfilled' ? toStoreList(discoveryResult.value) : [];
        const stores = mergeStoresBySlug(portfolioStores, discoveryStores);

        const organicResponses = await Promise.allSettled(
          stores.slice(0, HIGHLIGHTS_STORE_SCAN_LIMIT).map(async (store) => {
            const products = await productService.listPublicBySlug(String(store?.slug || ''), { forceRefresh: true, timeoutMs: 6500 });
            return (Array.isArray(products) ? products : [])
              .filter((product: any) => Boolean(product?.name) && Number(product?.price || product?.promoPrice || 0) > 0)
              .sort((a: any, b: any) => Number(Boolean(b?.isFeatured)) - Number(Boolean(a?.isFeatured)))
              .slice(0, HIGHLIGHTS_PRODUCTS_PER_STORE)
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

  const allCategoryFilter = categoryFilters.find((option) => option.key === 'all') || categoryFilters[0];
  const secondaryCategoryFilters = categoryFilters.filter((option) => option.key !== 'all');
  const secondaryFilterGridClass = getHighlightFilterGridClass(secondaryCategoryFilters.length);

  const filteredItems = useMemo(() => {
    const normalized = normalizeHighlightSearchText(query.trim());
    return categorizedItems.filter((item) => {
      if (selectedCategory !== 'all' && item.categoryKey !== selectedCategory) return false;
      if (!normalized) return true;
      return normalizeHighlightSearchText(`${item.name} ${item.storeName}`).includes(normalized);
    });
  }, [categorizedItems, query, selectedCategory]);
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

      <main className="mx-auto w-full max-w-3xl px-4 pb-[calc(var(--jnk-client-bottom-nav-height,0px)+var(--jnk-native-nav-height,0px)+env(safe-area-inset-bottom)+5.5rem)] pt-[calc(env(safe-area-inset-top)+5.2rem)]">
        {/* Barra de Pesquisa Compacta Premium */}
        <SurfaceCard padding="none" className="relative z-10 mb-3 overflow-hidden rounded-2xl border-slate-200 p-1.5 ring-1 ring-slate-200/5 transition-all duration-300 focus-within:border-[#336886]/45 focus-within:bg-white focus-within:shadow-[0_16px_36px_-20px_rgba(51,104,134,0.25)] focus-within:ring-4 focus-within:ring-[#336886]/10">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-[radial-gradient(circle_at_center,rgba(95,211,90,0.12),transparent_68%)]" />
          <div className="relative flex items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(145deg,#5FD35A_0%,#336886_64%,#153A4C_100%)] text-white shadow-[0_10px_20px_-14px_rgba(51,104,134,0.68)]">
              <MagnifyingGlass size={16} weight="bold" />
            </span>
            <div className="min-w-0 flex-1 py-0.5">
              <span className="block text-[8px] font-black uppercase tracking-[0.18em] text-[#336886]/75 leading-none">Pesquisar destaques</span>
              <input
                {...inputAssistProps.search}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="O que deu vontade agora?"
                className="mt-0.5 min-w-0 w-full bg-transparent text-[14px] font-black tracking-[-0.02em] text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-sm active:scale-95"
                aria-label="Limpar busca"
              >
                <X size={10} weight="bold" />
              </button>
            ) : null}
          </div>
        </SurfaceCard>

        <SurfaceCard
          as="section"
          data-testid="highlight-category-filters"
          padding="sm"
          className="relative z-10 mb-4 rounded-[1.35rem] ring-1 ring-slate-200/30"
        >
          {allCategoryFilter ? (
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`jnc-hub-touch flex w-full items-center gap-3 rounded-[1.05rem] border px-3 py-2.5 text-left transition-all duration-300 ${
                selectedCategory === 'all'
                  ? 'border-[#153A4C] bg-[linear-gradient(135deg,#153A4C_0%,#336886_82%,#5FD35A_170%)] text-white shadow-[0_14px_26px_-18px_rgba(21,58,76,0.58)]'
                  : 'border-slate-200/70 bg-white/82 text-slate-700 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.16)]'
              }`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                selectedCategory === 'all' ? 'bg-white/18 text-white' : 'bg-[#edf5fa] text-[#336886]'
              }`}>
                <Sparkle size={16} weight="fill" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-black uppercase leading-none tracking-[0.12em]">
                  Todos os destaques
                </span>
                <span className={`mt-1 block text-[10px] font-bold leading-none ${
                  selectedCategory === 'all' ? 'text-white/75' : 'text-slate-500'
                }`}>
                  Produtos e ofertas das lojas próximas
                </span>
              </span>
              <span className={`inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-2 text-[10px] font-black ${
                selectedCategory === 'all' ? 'bg-white text-[#153A4C]' : 'bg-[#153A4C] text-white'
              }`}>
                {allCategoryFilter.count > 99 ? '99+' : allCategoryFilter.count}
              </span>
            </button>
          ) : null}

          {secondaryCategoryFilters.length > 0 ? (
            <div className={`mt-2 grid gap-2 ${secondaryFilterGridClass}`}>
              {secondaryCategoryFilters.map((option) => {
              const CategoryIcon = option.icon;
              const active = selectedCategory === option.key;
              return (
                <div key={option.key} className="relative">
                  <Chip
                    onClick={() => setSelectedCategory(option.key)}
                    selected={active}
                    tone="brand"
                    className="group/filter relative flex min-h-[3.45rem] w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-[0.95rem] px-1 py-1.5 text-center"
                  >
                    <span className={`relative grid h-7 w-7 place-items-center rounded-full transition-all duration-300 ${
                      active
                        ? 'bg-white/18 text-white shadow-[0_10px_18px_-12px_rgba(15,23,42,0.28)] ring-1 ring-white/20'
                        : 'bg-[#f3f8fb] text-[#336886] group-hover/filter:bg-[#336886]/10'
                    }`}>
                      <CategoryIcon
                        size={13}
                        weight={active ? 'fill' : 'bold'}
                      />
                    </span>
                    <span className="relative mt-1 max-w-full truncate text-[8.5px] font-black uppercase leading-none tracking-[0.07em]">
                      {option.label}
                    </span>
                  </Chip>
                  {option.count > 0 ? (
                    <span className={`pointer-events-none absolute -right-1 -top-1 z-10 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black leading-none ring-2 ring-white ${
                      active ? 'bg-[#5FD35A] text-[#153A4C]' : 'bg-[#153A4C] text-white'
                    }`}>
                      {option.count > 99 ? '99+' : option.count}
                    </span>
                  ) : null}
                </div>
              );
            })}
            </div>
          ) : null}
        </SurfaceCard>

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
              <SurfaceCard
                key={index}
                padding="sm"
                className="grid h-[132px] grid-cols-[6.35rem_minmax(0,1fr)] items-center gap-3 rounded-[1.65rem] ring-1 ring-slate-100/50"
              >
                <SkeletonBlock rounded="lg" className="relative h-[6.35rem] w-[6.35rem] shrink-0 overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full jnc-animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                </SkeletonBlock>
                <div className="flex-1 flex flex-col justify-center space-y-2 py-1 pr-1">
                  <SkeletonBlock rounded="sm" className="relative h-4.5 w-11/12 overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full jnc-animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  </SkeletonBlock>
                  <SkeletonBlock rounded="sm" className="relative h-3.5 w-6/12 overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full jnc-animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  </SkeletonBlock>
                  <SkeletonBlock rounded="sm" className="relative mt-auto h-5 w-4/12 overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full jnc-animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  </SkeletonBlock>
                </div>
              </SurfaceCard>
            ))}
          </section>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            className="mt-5"
            icon={<ForkKnife size={30} weight="duotone" />}
            title="Nenhum destaque encontrado."
            description="Limpe a busca ou veja todos os tipos de item disponíveis."
            action={<Button size="sm" onClick={resetFilters}>Ver todos</Button>}
          />
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
                  className={`jnc-hub-touch jnc-hub-lift group grid min-h-[132px] grid-cols-[6.35rem_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-[1.65rem] border p-2.5 transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards ${
                    item.sponsored
                      ? 'border-amber-200/70 bg-[linear-gradient(135deg,rgba(254,243,199,0.18)_0%,#ffffff_56%,#ffffff_100%)] shadow-[0_14px_34px_-26px_rgba(245,158,11,0.2)]'
                      : 'border-slate-100 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.06)]'
                  }`}
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
                    
                    {/* Glare sweep diagonal sweep overlay */}
                    <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/36 via-transparent to-black/6" />
                    
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/95 px-2 py-0.5 text-[7.5px] font-black uppercase tracking-[0.15em] text-[#336886] shadow-[0_6px_14px_-4px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                      <CategoryIcon size={8} weight="fill" />
                      {categoryOption.label}
                    </span>
                    
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full border border-white/20 bg-slate-950/65 px-2 py-0.5 text-[7.5px] font-black uppercase tracking-[0.15em] text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] backdrop-blur-md">
                      {item.sponsored ? <Star size={8} weight="fill" className="text-amber-500" /> : <Sparkle size={8} weight="fill" className="text-[#336886]" />}
                      {item.sponsored ? item.badge || 'Destaque' : 'Seleção'}
                    </span>

                    {/* Store Logo floating in picture-in-picture style */}
                    <div className="absolute bottom-1.5 right-1.5 z-20 h-6.5 w-6.5 overflow-hidden rounded-full border border-white shadow-[0_4px_10px_rgba(0,0,0,0.18)] bg-white">
                      <img
                        src={item.storeLogo}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          (event.target as HTMLImageElement).src = getStoreAvatarUrl(item.storeSlug, item.storeName);
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex min-w-0 flex-col py-1 pr-1">
                    <p className="line-clamp-2 text-[14.5px] font-black leading-[1.2rem] tracking-tight text-slate-900 transition-colors duration-200 group-hover:text-[#336886]">{item.name}</p>
                    <div className="mt-2 flex min-w-0 items-center gap-1">
                      <span className="truncate text-[10.5px] font-bold text-slate-400">por {item.storeName}</span>
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                      <p className="text-[20px] font-black leading-none tracking-[-0.05em] text-[#153A4C]">{currency.format(item.price)}</p>
                      
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#edf5fa] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#336886] transition-all duration-300 group-hover:bg-[#336886] group-hover:text-white group-hover:px-3.5 group-hover:shadow-[0_4px_12px_rgba(51,104,134,0.25)]">
                        <span className="max-w-0 scale-0 opacity-0 text-[8.5px] font-black uppercase tracking-wider transition-all duration-300 group-hover:max-w-[65px] group-hover:scale-100 group-hover:opacity-100">Pedir</span>
                        <CaretRight size={9} weight="bold" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        )}

      </main>

      <ClientBottomNav active="home" />
    </div>
  );
}
