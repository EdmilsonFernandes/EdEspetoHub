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

const DEFAULT_EDITORIAL_BANNER = '/uploads/destinations/destination-banner-sao-francisco-xavier-1778512808488-711203.jpeg';
const DEFAULT_CHALE_FALLBACK = '/uploads/destinations/hospitality-banner-chaleencantodaserra-1-1778615124850-797047.jpeg';

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
    const rawBanner = activeContext.bannerUrl || DEFAULT_CHALE_FALLBACK;
    const banner = resolveAssetUrl(rawBanner);
    const destinationPath = `/destinos/${destinationSlug}`;
    const chaleDetailHref = activeContext.placeSlug
      ? `${destinationPath}/chales/${activeContext.placeSlug}`
      : destinationPath;

    return (
      <section className="order-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-400">
        {/* Banner Hero do Chalé Ativo com foto cinematográfica e Glassmorphism */}
        <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-slate-950 text-white shadow-xl min-h-[195px] flex flex-col justify-between p-4 sm:p-5">
          <img
            src={banner}
            alt={activeContext.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            onError={(e) => {
              const fallback = resolveAssetUrl(DEFAULT_CHALE_FALLBACK);
              if (fallback && (e.target as HTMLImageElement).src !== fallback) {
                (e.target as HTMLImageElement).src = fallback;
              }
            }}
          />
          {/* Overlay cinematográfico suave */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-slate-950/30" />

          {/* Top Row: Tag + Botões */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-2xs font-black uppercase tracking-wider text-emerald-300 backdrop-blur-md border border-white/20 shadow-xs">
              <Mountains size={13} weight="fill" />
              Hospedado no Chalé
            </span>
            <div className="flex items-center gap-2">
              <Link
                to={chaleDetailHref}
                className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-2xs font-black text-white hover:bg-white/30 active:scale-95 backdrop-blur-md border border-white/20 transition-all"
              >
                Ver chalé
                <CaretRight size={10} weight="bold" />
              </Link>
              <button
                type="button"
                onClick={onOpenContextSheet}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-3 py-1 text-2xs font-black text-white hover:bg-emerald-500 active:scale-95 backdrop-blur-md shadow-sm transition-all"
              >
                Trocar chalé
                <CaretRight size={10} weight="bold" />
              </button>
            </div>
          </div>

          {/* Informações do Chalé */}
          <div className="relative z-10 pt-5">
            <Link to={chaleDetailHref} className="group inline-block">
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md group-hover:text-emerald-300 transition-colors">
                {activeContext.title}
              </h3>
            </Link>
            <p className="mt-0.5 text-xs font-semibold text-slate-200 drop-shadow-sm">
              {activeContext.subtitle || 'Serra da Mantiqueira'} · Lojas entregando na sua porta
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/30 px-3 py-1 text-2xs font-black text-emerald-200 border border-emerald-400/30 backdrop-blur-md shadow-xs">
                <Sparkle size={11} weight="fill" />
                Entrega no chalé ativa
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/18 px-3 py-1 text-2xs font-black text-white border border-white/20 backdrop-blur-md shadow-xs">
                <ForkKnife size={11} weight="fill" />
                Cardápio de montanha
              </span>
            </div>
          </div>
        </div>

        {/* Trilho "Experiências ao redor do seu chalé" */}
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2 px-0.5 mb-3">
            <div>
              <p className="text-2xs font-black uppercase tracking-[0.18em] text-[#0E4B3E]">
                Por aqui · Na montanha
              </p>
              <h4 className="text-sm font-black text-slate-900">
                Experiências ao redor do seu chalé
              </h4>
            </div>
            <Link
              to={chaleDetailHref}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-2xs font-black uppercase tracking-wider text-[#0E4B3E] border border-emerald-200/80 hover:bg-emerald-100 transition-colors active:scale-95"
            >
              Guia do chalé
              <CaretRight size={10} weight="bold" />
            </Link>
          </div>

          <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {listings.map((item) => {
              const cover = item.bannerUrl ? resolveAssetUrl(item.bannerUrl) : null;
              const itemLink = `${destinationPath}#experiencias`;

              return (
                <Link
                  key={item.id}
                  to={itemLink}
                  className="group relative flex w-[175px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2.5 transition-all hover:bg-white hover:border-emerald-300 hover:shadow-md active:scale-[0.98]"
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
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100 text-[#0E4B3E]">
                        <Compass size={24} weight="duotone" />
                      </div>
                    )}
                    <span className="absolute bottom-1 left-1 rounded-md bg-slate-950/80 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                      {item.category}
                    </span>
                  </div>
                  <h5 className="mt-2 line-clamp-1 text-xs font-black text-slate-900 group-hover:text-[#0E4B3E] transition-colors">
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

  // Se NÃO está em chalé: Banner Editorial Fotográfico ReUI Ultimate da Mantiqueira
  const editorialBanner = resolveAssetUrl(DEFAULT_EDITORIAL_BANNER);

  return (
    <section className="order-4 mt-2 overflow-hidden rounded-[2rem] border border-white/20 bg-slate-950 p-4 sm:p-5 text-white shadow-xl relative min-h-[195px] flex flex-col justify-between">
      {/* Imagem Fotográfica Cinematográfica de Montanha */}
      <img
        src={editorialBanner}
        alt="Serra da Mantiqueira"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
      />
      {/* Overlay gradiente suave para leitura perfeita */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-slate-950/30" />

      {/* Conteúdo Topo */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 max-w-[70%]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-2xs font-black uppercase tracking-wider text-emerald-300 backdrop-blur-md border border-white/20 shadow-xs">
            <Mountains size={12} weight="fill" />
            Destinos da Mantiqueira
          </span>
          <h3 className="mt-2 text-base font-black tracking-tight text-white sm:text-xl drop-shadow-sm">
            Fim de semana na serra?
          </h3>
          <p className="mt-0.5 text-xs font-semibold text-slate-200 drop-shadow-sm">
            Chalés charmosos, lareira e gastronomia local entregue na sua montanha.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenContextSheet}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/95 text-slate-950 px-3.5 py-2 text-2xs font-black uppercase tracking-wider shadow-lg hover:bg-white active:scale-95 transition-all"
        >
          <SuitcaseRolling size={14} weight="fill" className="text-[#0E4B3E]" />
          Estou na Serra
        </button>
      </div>

      {/* Chips Rápidos de Destino com Glassmorphism */}
      <div className="relative z-10 mt-4 flex flex-wrap items-center gap-1.5 pt-3 border-t border-white/15">
        <span className="mr-1 text-[11px] font-black uppercase tracking-wider text-emerald-300">
          Explorar cidades:
        </span>
        {[
          { name: 'São Francisco Xavier', slug: 'sao-francisco-xavier' },
          { name: 'Monte Verde', slug: 'monte-verde' },
          { name: 'São Bento do Sapucaí', slug: 'sao-bento-do-sapucai' },
          { name: 'Gonçalves', slug: 'goncalves' },
        ].map((dest) => (
          <Link
            key={dest.slug}
            to={`/destinos/${dest.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-black/40 hover:bg-white/25 px-3 py-1 text-2xs font-bold text-white backdrop-blur-md border border-white/20 active:scale-95 transition-all shadow-xs"
          >
            <MapPinLine size={10} weight="fill" className="text-emerald-400" />
            {dest.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
