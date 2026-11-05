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

    return (
      <section className="order-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-400">
        {/* Banner do Chalé Ativo */}
        <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-200/90 bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-950 p-4 text-white shadow-md">
          {banner ? (
            <img
              src={banner}
              alt={activeContext.title}
              className="absolute inset-0 h-full w-full object-cover opacity-25"
            />
          ) : null}
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/25 px-2.5 py-0.5 text-2xs font-black uppercase tracking-wider text-emerald-300 backdrop-blur-md">
                <Mountains size={12} weight="fill" />
                Hospedado no Chalé
              </span>
              <button
                type="button"
                onClick={onOpenContextSheet}
                className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-2xs font-black text-white hover:bg-white/30 active:scale-95"
              >
                Trocar chalé
                <CaretRight size={10} weight="bold" />
              </button>
            </div>

            <h3 className="mt-2 text-lg font-black tracking-tight text-white drop-shadow-sm">
              {activeContext.title}
            </h3>
            <p className="mt-0.5 text-xs font-semibold text-emerald-100/90">
              {activeContext.subtitle || 'Serra da Mantiqueira'} · Lojas entregando na sua porta
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/30 px-2 py-1 text-2xs font-extrabold text-emerald-200">
                <Sparkle size={11} weight="fill" />
                Entrega no chalé ativa
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-2xs font-extrabold text-white/80">
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
              <p className="text-2xs font-black uppercase tracking-[0.18em] text-emerald-700">
                Por aqui · Na montanha
              </p>
              <h4 className="text-sm font-black text-slate-900">
                Experiências ao redor do seu chalé
              </h4>
            </div>
            <Link
              to={`/destinos/${destinationSlug}`}
              className="inline-flex items-center gap-1 text-2xs font-black uppercase tracking-wider text-emerald-700 hover:underline"
            >
              Ver guia
              <CaretRight size={10} weight="bold" />
            </Link>
          </div>

          <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {listings.map((item) => {
              const cover = item.bannerUrl ? resolveAssetUrl(item.bannerUrl) : null;
              return (
                <div
                  key={item.id}
                  className="group relative flex w-[170px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/70 p-2 transition-all hover:bg-white hover:shadow-sm"
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
                  <h5 className="mt-2 line-clamp-1 text-xs font-black text-slate-900">
                    {item.title}
                  </h5>
                  <p className="line-clamp-1 text-2xs font-semibold text-slate-500">
                    {item.addressLine}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // Se NÃO está em chalé: Banner Editorial ReUI de Destinos da Mantiqueira
  return (
    <section className="order-4 mt-2 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-900 to-[#153A4C] p-4 text-white shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-2xs font-black uppercase tracking-wider text-emerald-400">
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
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#5FD35A] px-3.5 py-2 text-2xs font-black uppercase tracking-wider text-[#153A4C] shadow-sm hover:bg-[#53c44e] active:scale-95"
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
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-2xs font-bold text-slate-200 hover:bg-white/20 active:scale-95"
          >
            <MapPinLine size={10} weight="fill" className="text-emerald-400" />
            {dest.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

