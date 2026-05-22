import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CaretRight,
  ForkKnife,
  MagnifyingGlass,
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

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

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
  const navigate = useNavigate();
  const [items, setItems] = useState<HubHighlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

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

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      `${item.name} ${item.storeName}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
        normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      )
    );
  }, [items, query]);

  const sponsoredCount = items.filter((item) => item.sponsored).length;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(51,104,134,0.14),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef4f8_100%)] text-slate-950">
      <AppGlassHeader
        title="Destaques"
        eyebrow="Já no Caminho"
        subtitle="Itens de lojas diferentes"
        backTo="/hub"
        maxWidthClassName="max-w-3xl"
        right={
          <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-[#153A4C] px-3 text-xs font-black text-white shadow-[0_14px_28px_-20px_rgba(21,58,76,0.55)]">
            {items.length}
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
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#336886]">Feed de descobertas</p>
              <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">Escolha por item, sem perder o contexto da loja.</h2>
              <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-600">
                Cada card mostra de qual loja vem o produto. Toque para abrir a loja com o item já preparado.
              </p>
            </div>
          </div>

          <div className="relative mt-4 flex items-center gap-3 rounded-[1.35rem] bg-slate-100/90 px-4 py-3 ring-1 ring-slate-200/80">
            <MagnifyingGlass size={16} weight="bold" className="shrink-0 text-slate-400" />
            <input
              {...inputAssistProps.search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar item ou loja..."
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm active:scale-95"
                aria-label="Limpar busca"
              >
                <X size={12} weight="bold" />
              </button>
            ) : null}
          </div>
        </section>

        <section className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#336886]/12 bg-white/86 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#336886] shadow-[0_12px_24px_-20px_rgba(51,104,134,0.28)]">
            <Star size={12} weight="fill" />
            {sponsoredCount > 0 ? `${sponsoredCount} patrocinado${sponsoredCount === 1 ? '' : 's'}` : 'Seleção do app'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.18)]">
            <Storefront size={12} weight="duotone" />
            Várias lojas
          </span>
        </section>

        {loading ? (
          <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[248px] animate-pulse rounded-[1.65rem] bg-white/80 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.3)] ring-1 ring-slate-200/60" />
            ))}
          </section>
        ) : filteredItems.length === 0 ? (
          <section className="mt-5 rounded-[1.8rem] border border-white/80 bg-white/88 p-8 text-center shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]">
            <ForkKnife size={30} weight="duotone" className="mx-auto text-slate-400" />
            <p className="mt-3 text-sm font-black text-slate-800">Nenhum destaque encontrado.</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Tente limpar a busca ou volte para explorar as lojas próximas.</p>
            <button
              type="button"
              onClick={() => navigate('/hub')}
              className="mt-4 rounded-full bg-[#153A4C] px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white"
            >
              Voltar para a home
            </button>
          </section>
        ) : (
          <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredItems.map((item, index) => {
              const storePath = `/${item.storeSlug}`;
              return (
                <Link
                  key={`${item.storeSlug}-${item.id}-${index}`}
                  to={storePath}
                  onClick={() => stageFeaturedProductCheckout(item)}
                  className="group overflow-hidden rounded-[1.65rem] border border-white bg-white shadow-[0_18px_42px_-26px_rgba(15,23,42,0.18)] ring-1 ring-slate-100/80 transition-all duration-300 active:scale-[0.97] md:hover:-translate-y-1 md:hover:shadow-[0_24px_52px_-24px_rgba(15,23,42,0.22)]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading={index < 4 ? 'eager' : 'lazy'}
                      fetchPriority={index < 4 ? 'high' : 'auto'}
                      decoding="async"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      onError={(event) => {
                        (event.target as HTMLImageElement).src = item.storeLogo || getStoreAvatarUrl(item.storeSlug, item.storeName);
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-black/8" />
                    <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-[0.8rem] border border-white/65 bg-white/88 px-2 py-1 text-[8px] font-black italic uppercase tracking-[0.17em] text-[#153A4C] shadow-[0_8px_18px_-12px_rgba(15,23,42,0.38)] backdrop-blur-md">
                      {item.sponsored ? <Star size={8} weight="fill" className="text-amber-500" /> : <Sparkle size={8} weight="fill" className="text-[#336886]" />}
                      {item.sponsored ? item.badge || 'Patrocinado' : 'Seleção'}
                    </span>
                  </div>
                  <div className="flex min-h-[112px] flex-col p-3">
                    <p className="line-clamp-2 text-[12.5px] font-black leading-[1.15rem] tracking-tight text-slate-950">{item.name}</p>
                    <p className="mt-2 text-[18px] font-black leading-none tracking-[-0.04em] text-[#153A4C]">{currency.format(item.price)}</p>
                    <div className="mt-auto flex min-w-0 items-center gap-1.5 pt-2">
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
                      <span className="truncate text-[10px] font-bold text-slate-400">por {item.storeName}</span>
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
