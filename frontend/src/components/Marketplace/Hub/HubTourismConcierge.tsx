import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mountains,
  Sparkle,
  ForkKnife,
  CaretRight,
  Compass,
  MapPinLine,
  SuitcaseRolling,
} from '@phosphor-icons/react';
import { resolveAssetUrl } from '../../../utils/resolveAssetUrl';
import { apiClient } from '../../../config/apiClient';
import { type DeliveryContext } from './HubContextSheet';

type HubTourismConciergeProps = {
  activeContext: DeliveryContext;
  onOpenContextSheet: () => void;
};

type ListingItem = {
  id: string;
  title: string;
  category: string;
  imageUrl?: string;
  bannerUrl?: string;
  addressLine?: string;
};

const DEFAULT_SFX_LISTINGS: ListingItem[] = [
  {
    id: 'l-1',
    title: 'Dona Xica Café Colonial',
    category: 'Café & Doces',
    bannerUrl: '/uploads/destinations/destination-banner-sao-francisco-xavier-1779043684890-101548.jpeg',
    addressLine: 'Centro · 2,2 km do chalé',
  },
  {
    id: 'l-2',
    title: 'Raiz Burguer & Restaurante',
    category: 'Restaurante',
    bannerUrl: '/uploads/destinations/destination-banner-sao-bento-do-sapucai-1779043684890-101548.jpeg',
    addressLine: 'Estrada do Pocinho · 1,5 km',
  },
  {
    id: 'l-3',
    title: 'Trilha da Pedra Partida',
    category: 'Passeio',
    bannerUrl: '',
    addressLine: 'Mantiqueira · Trilha 2h',
  },
  {
    id: 'l-4',
    title: 'Artesão Forno a Lenha',
    category: 'Pizzaria',
    bannerUrl: '',
    addressLine: 'Entrega quentinho no chalé',
  },
];

export function HubTourismConcierge({
  activeContext,
  onOpenContextSheet,
}: HubTourismConciergeProps) {
  const isChale = activeContext.type === 'chale';
  const destinationSlug = activeContext.destinationSlug || 'sao-francisco-xavier';
  const [listings, setListings] = useState<ListingItem[]>(DEFAULT_SFX_LISTINGS);
  const [_loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isChale) return;

    setLoading(true);
    apiClient
      .get<any>(`/public/destinations/${encodeURIComponent(destinationSlug)}`)
      .then((data) => {
        if (data?.listings && Array.isArray(data.listings) && data.listings.length > 0) {
          const mapped = data.listings.slice(0, 6).map((l: any) => ({
            id: l.id,
            title: l.title || l.name,
            category: l.category === 'RESTAURANTE_VISITAR' ? 'Restaurante' : l.category === 'PASSEIO' ? 'Passeio' : 'Experiência',
            bannerUrl: l.bannerUrl || l.imageUrl,
            addressLine: l.addressLine || `${data.name || 'SFX'} · Próximo ao chalé`,
          }));
          setListings(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isChale, destinationSlug]);

  // Se o modo chalé está ativo: Concierge do Chalé
  if (isChale) {
    const banner = activeContext.bannerUrl ? resolveAssetUrl(activeContext.bannerUrl) : null;
    const chaleDetailHref = activeContext.placeSlug
      ? `/destinos/${destinationSlug}/chales/${activeContext.placeSlug}`
      : `/destinos/${destinationSlug}`;

    return (
      <section className="order-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-400">
        {/* Banner Hero do Chalé Ativo com foto vibrante e cinematográfica */}
        <div className="relative overflow-hidden rounded-[1.85rem] border border-emerald-950/20 bg-slate-950 text-white shadow-xl min-h-[175px] flex flex-col justify-between p-4 sm:p-5">
          {banner ? (
            <img
              src={banner}
              alt={activeContext.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            />
          ) : null}
          {/* Gradiente escuro para legibilidade sem lavar a foto */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-slate-950/30" />

          <div className="relative z-10 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-2xs font-black uppercase tracking-wider text-emerald-300 backdrop-blur-md border border-white/20">
              <Mountains size={13} weight="fill" />
              Hospedado no Chalé
            </span>
            <div className="flex items-center gap-1.5">
              <Link
                to={chaleDetailHref}
                className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-2xs font-black text-white hover:bg-white/25 active:scale-95 backdrop-blur-md border border-white/10"
              >
                Ver chalé
                <CaretRight size={10} weight="bold" />
              </Link>
              <button
                type="button"
                onClick={onOpenContextSheet}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-3 py-1 text-2xs font-black text-white hover:bg-emerald-500 active:scale-95 backdrop-blur-md shadow-sm"
              >
                Trocar chalé
                <CaretRight size={10} weight="bold" />
              </button>
            </div>
          </div>

          <div className="relative z-10 pt-6">
            <Link to={chaleDetailHref} className="group inline-block">
              <h3 className="text-xl font-black tracking-tight text-white drop-shadow-md group-hover:text-emerald-300 transition-colors">
                {activeContext.title}
              </h3>
            </Link>
            <p className="mt-0.5 text-xs font-semibold text-slate-200 drop-shadow-sm">
              {activeContext.subtitle || 'Serra da Mantiqueira'} · Lojas entregando na sua porta
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/30 px-2.5 py-1 text-2xs font-extrabold text-emerald-200 border border-emerald-400/30 backdrop-blur-sm">
                <Sparkle size={11} weight="fill" />
                Entrega no chalé ativa
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 text-2xs font-extrabold text-white/90 border border-white/10 backdrop-blur-sm">
                <ForkKnife size={11} weight="fill" />
                Cardápio de montanha
              </span>
            </div>
          </div>
        </div>

        {/* Trilho "Por aqui no seu chalé · Experiências & Gastronomia" */}
        <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2 px-0.5 mb-2.5">
            <div>
              <p className="text-2xs font-black uppercase tracking-[0.18em] text-emerald-800">
                Por aqui · Na montanha
              </p>
              <h4 className="text-sm font-black text-slate-900">
                Experiências ao redor do seu chalé
              </h4>
            </div>
            <Link
              to={chaleDetailHref}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-2xs font-black uppercase tracking-wider text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 transition-colors active:scale-95"
            >
              Ver guia completo
              <CaretRight size={10} weight="bold" />
            </Link>
          </div>

          <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {listings.map((item) => {
              const cover = item.bannerUrl ? resolveAssetUrl(item.bannerUrl) : null;
              const itemLink = chaleDetailHref;

              return (
                <Link
                  key={item.id}
                  to={itemLink}
                  className="group relative flex w-[170px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2 transition-all hover:bg-white hover:border-emerald-300 hover:shadow-md active:scale-[0.98]"
                >
                  <div className="relative h-20 w-full overflow-hidden rounded-xl bg-slate-200">
                    {cover ? (
                      <img
                        src={cover}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700">
                        <Compass size={24} weight="duotone" />
                      </div>
                    )}
                    <span className="absolute bottom-1 left-1 rounded-md bg-slate-950/80 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                      {item.category}
                    </span>
                  </div>
                  <h5 className="mt-2 line-clamp-1 text-xs font-black text-slate-900 group-hover:text-emerald-800 transition-colors">
                    {item.title}
                  </h5>
                  <p className="line-clamp-1 text-2xs font-semibold text-slate-500">
                    {item.addressLine}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // Se NÃO está em chalé: Banner Editorial ReUI de Destinos da Mantiqueira
  return (
    <section className="order-4 mt-2 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-[#0E4B3E] p-4 text-white shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-2xs font-black uppercase tracking-wider text-emerald-400 border border-emerald-400/20">
            <Mountains size={12} weight="fill" />
            Destinos da Mantiqueira
          </span>
          <h3 className="mt-1.5 text-base font-black tracking-tight text-white sm:text-lg">
            Fim de semana na serra?
          </h3>
          <p className="mt-0.5 text-xs font-semibold text-slate-300">
            Chalés, lareira e gastronomia local entregue na montanha.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenContextSheet}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-2xs font-black uppercase tracking-wider text-white shadow-md hover:bg-emerald-500 active:scale-95 transition-all"
        >
          <SuitcaseRolling size={14} weight="fill" />
          Estou na Serra
        </button>
      </div>

      {/* Chips Rápidos de Destino */}
      <div className="mt-3.5 flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
        {[
          { name: 'São Francisco Xavier', slug: 'sao-francisco-xavier' },
          { name: 'Gonçalves', slug: 'goncalves' },
          { name: 'São Bento do Sapucaí', slug: 'sao-bento-do-sapucai' },
          { name: 'Monte Verde', slug: 'monte-verde' },
        ].map((dest) => (
          <Link
            key={dest.slug}
            to={`/destinos/${dest.slug}`}
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-2xs font-bold text-slate-200 hover:bg-white/20 active:scale-95 transition-colors"
          >
            <MapPinLine size={10} weight="fill" className="text-emerald-400" />
            {dest.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

