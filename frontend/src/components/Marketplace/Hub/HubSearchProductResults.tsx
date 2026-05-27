import { memo } from 'react';
import { Link } from 'react-router-dom';
import { getStoreAvatarUrl } from '../../../utils/storeAvatar';

export type HubSearchProductItem = {
  id: string;
  storeSlug: string;
  storeName: string;
  storeLogo: string;
  imageUrl: string;
  name: string;
  price: number;
};

type HubSearchProductResultsProps = {
  items: HubSearchProductItem[];
  selectedCondominiumSlug?: string | null;
  currency: Intl.NumberFormat;
  onStageProduct: (item: HubSearchProductItem) => void;
};

export const HubSearchProductResults = memo(function HubSearchProductResults({
  items,
  selectedCondominiumSlug,
  currency,
  onStageProduct,
}: HubSearchProductResultsProps) {
  if (items.length === 0) return null;

  return (
    <section className="order-10 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[15px] font-black tracking-tight text-slate-950">Itens encontrados que você busca</h2>
        <div className="flex gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#336886]">
            {items.length} itens
          </span>
        </div>
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto no-scrollbar px-1 pb-3">
        {items.map((item) => (
          <Link
            key={`search-res-${item.storeSlug}-${item.id}`}
            to={selectedCondominiumSlug ? `/${item.storeSlug}?condominio=${encodeURIComponent(selectedCondominiumSlug)}` : `/${item.storeSlug}`}
            onClick={() => onStageProduct(item)}
            className="jnc-hub-touch jnc-hub-lift jnc-hub-card group min-w-[160px] snap-start overflow-hidden rounded-[1.45rem]"
          >
            <div className="relative h-[90px] overflow-hidden bg-slate-100">
              <img
                src={item.imageUrl}
                alt={item.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(event) => {
                  (event.target as HTMLImageElement).src = item.storeLogo || getStoreAvatarUrl(item.storeSlug, item.storeName);
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            <div className="bg-white p-2.5">
              <p className="line-clamp-1 text-[11px] font-black tracking-tight text-slate-950">{item.name}</p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <img
                    src={item.storeLogo}
                    alt={item.storeName}
                    className="h-4 w-4 rounded-full border border-slate-100 object-cover"
                    onError={(event) => {
                      (event.target as HTMLImageElement).src = getStoreAvatarUrl(item.storeSlug, item.storeName);
                    }}
                  />
                  <span className="truncate text-[9px] font-bold text-slate-400">{item.storeName}</span>
                </div>
                <span className="shrink-0 text-[10px] font-black text-[#336886]">
                  {currency.format(item.price)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
});
