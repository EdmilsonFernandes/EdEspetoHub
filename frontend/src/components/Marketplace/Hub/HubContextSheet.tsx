import { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import {
  House,
  Buildings,
  SuitcaseRolling,
  MagnifyingGlass,
  Crosshair,
  Check,
  CaretRight,
  X,
  Sparkle,
  Bed,
  MapPin,
  Mountains,
} from '@phosphor-icons/react';
import { resolveAssetUrl } from '../../../utils/resolveAssetUrl';
import { apiClient } from '../../../config/apiClient';
import { MiniBanner } from './MiniBanner';

export type DeliveryContextType = 'home' | 'condo' | 'chale';

export type DeliveryContext = {
  type: DeliveryContextType;
  title: string;
  subtitle: string;
  tag?: string;
  destinationSlug?: string;
  placeSlug?: string;
  bannerUrl?: string;
};

type DestinationItem = {
  name: string;
  slug: string;
  city?: string;
  state: string;
  placesCount?: number;
  bannerUrl?: string;
};

type HospitalityPlaceItem = {
  id: string;
  name: string;
  slug: string;
  type: string;
  bannerUrl?: string;
  addressLine?: string;
  storesCount?: number;
  listingsCount?: number;
};

type HubContextSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeContext: DeliveryContext;
  onSelectContext: (context: DeliveryContext) => void;
  onManageAddresses?: () => void;
};

const DEFAULT_DESTINATIONS: DestinationItem[] = [
  {
    name: 'São Francisco Xavier',
    slug: 'sao-francisco-xavier',
    state: 'SP',
    placesCount: 7,
    bannerUrl: '/uploads/destinations/destination-banner-sao-francisco-xavier-1778512808488-711203.jpeg',
  },
  {
    name: 'Gonçalves',
    slug: 'goncalves',
    state: 'MG',
    placesCount: 53,
    bannerUrl: '/uploads/destinations/destination-banner-goncalves-mg-1778952196683-973829.jpeg',
  },
  {
    name: 'São Bento do Sapucaí',
    slug: 'sao-bento-do-sapucai',
    state: 'SP',
    placesCount: 22,
    bannerUrl: '/uploads/destinations/destination-banner-sao-bento-do-sapucai-1779043684890-101548.jpeg',
  },
  {
    name: 'Monte Verde',
    slug: 'monte-verde',
    state: 'MG',
    placesCount: 8,
    bannerUrl: '/uploads/destinations/destination-banner-camanducaia-1779486205894-128098.jpeg',
  },
  {
    name: 'Santo Antônio do Pinhal',
    slug: 'santo-antonio-do-pinhal',
    state: 'SP',
    placesCount: 5,
    bannerUrl: '/uploads/destinations/destination-banner-santo-antonio-do-pinhal-1780449868684-584900.jpeg',
  },
  {
    name: 'Campos do Jordão',
    slug: 'campos-do-jordao',
    state: 'SP',
    placesCount: 2,
    bannerUrl: '/uploads/destinations/destination-banner-campos-do-jordao-1780449498554-796133.jpeg',
  },
];

const DEFAULT_SFX_CHALES: HospitalityPlaceItem[] = [
  {
    id: 'chale-1',
    name: 'Chalé Encanto da Serra',
    slug: 'chaleencantodaserra',
    type: 'CHALE',
    bannerUrl: '/uploads/destinations/hospitality-banner-chaleencantodaserra-1-1778615124850-797047.jpeg',
    addressLine: 'Estrada do Pocinho · SFX',
    storesCount: 4,
    listingsCount: 18,
  },
  {
    id: 'chale-2',
    name: 'Pousada Serra Do Luar',
    slug: 'pousada-serra-do-luar',
    type: 'POUSADA',
    bannerUrl: '/uploads/destinations/hospitality-logo-pousada-serra-do-luar-1781318721342-990740.jpeg',
    addressLine: 'Estrada do Remédio · SFX',
    storesCount: 3,
    listingsCount: 12,
  },
  {
    id: 'chale-3',
    name: 'Chalé Vista para o Vale',
    slug: 'chale-vista-para-o-vale-sfx-e',
    type: 'CHALE',
    bannerUrl: '/uploads/destinations/destination-partner-banner-chale-vista-para-o-vale-sfx-e-1785759151268-892197.jpeg',
    addressLine: 'Alto da Mantiqueira · SFX',
    storesCount: 5,
    listingsCount: 15,
  },
  {
    id: 'chale-4',
    name: 'Pousada Kolibri',
    slug: 'pousada-kolibri',
    type: 'POUSADA',
    bannerUrl: '/uploads/destinations/hospitality-banner-pousada-kolibri-1-1781319557826-543498.jpeg',
    addressLine: 'Estrada de Santa Cruz · SFX',
    storesCount: 3,
    listingsCount: 10,
  },
  {
    id: 'chale-5',
    name: 'Chalés SFX',
    slug: 'chales-sfx',
    type: 'CHALE',
    bannerUrl: '/uploads/destinations/hospitality-banner-chales-sfx-1-1781319478093-320771.jpeg',
    addressLine: 'Centro · SFX',
    storesCount: 4,
    listingsCount: 10,
  },
  {
    id: 'chale-6',
    name: 'Pousada Varandas da Mantiqueira',
    slug: 'pousada-varandas-da-mantiqueira',
    type: 'POUSADA',
    bannerUrl: '/uploads/destinations/hospitality-banner-pousada-varandas-da-mantiqueira-1-1781319518162-415327.jpeg',
    addressLine: 'Estrada Ezequiel Alves Graciano · SFX',
    storesCount: 3,
    listingsCount: 8,
  },
];

export function HubContextSheet({
  isOpen,
  onOpenChange,
  activeContext,
  onSelectContext,
  onManageAddresses,
}: HubContextSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Destinos e chalés
  const [destinations, setDestinations] = useState<DestinationItem[]>(DEFAULT_DESTINATIONS);
  const [selectedDestination, setSelectedDestination] = useState<DestinationItem>(DEFAULT_DESTINATIONS[0]);
  const [chales, setChales] = useState<HospitalityPlaceItem[]>(DEFAULT_SFX_CHALES);
  const [loadingChales, setLoadingChales] = useState(false);

  // Carregar destinos reais da API se aberta a sheet
  useEffect(() => {
    if (!isOpen) return;

    apiClient
      .get<any[]>('/public/destinations')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((d: any) => ({
            name: d.name || d.city,
            slug: d.slug,
            city: d.city,
            state: d.state || 'SP',
            placesCount: d.hospitalityPlacesCount || d.placesCount || 0,
            bannerUrl: d.bannerUrl || (d.banners?.[0]?.imageUrl),
          }));
          setDestinations(mapped);
          if (activeContext.destinationSlug) {
            const matching = mapped.find((m) => m.slug === activeContext.destinationSlug);
            if (matching) {
              setSelectedDestination(matching);
              return;
            }
          }
          if (!selectedDestination || !mapped.some((m) => m.slug === selectedDestination.slug)) {
            setSelectedDestination(mapped[0]);
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Carregar chalés reais do destino selecionado
  useEffect(() => {
    if (!isOpen || !selectedDestination?.slug) return;

    setLoadingChales(true);
    apiClient
      .get<any>(`/public/destinations/${encodeURIComponent(selectedDestination.slug)}`)
      .then((data) => {
        if (data?.hospitalityPlaces && Array.isArray(data.hospitalityPlaces)) {
          const mapped = data.hospitalityPlaces.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            type: p.type || 'CHALE',
            bannerUrl:
              p.bannerUrl ||
              p.bannerUrls?.[0] ||
              p.logoUrl ||
              selectedDestination.bannerUrl ||
              DEFAULT_SFX_CHALES[0].bannerUrl,
            addressLine: p.addressLine || p.address || `${selectedDestination.name}`,
            storesCount: p.storesCount || 3,
            listingsCount: data.listings?.length || 10,
          }));
          setChales(mapped);
        } else if (selectedDestination.slug === 'sao-francisco-xavier') {
          setChales(DEFAULT_SFX_CHALES);
        } else {
          setChales([]);
        }
      })
      .catch(() => {
        if (selectedDestination.slug === 'sao-francisco-xavier') {
          setChales(DEFAULT_SFX_CHALES);
        }
      })
      .finally(() => setLoadingChales(false));
  }, [isOpen, selectedDestination?.slug]);

  const handleSelectHome = () => {
    const ctx: DeliveryContext = {
      type: 'home',
      title: 'Casa',
      subtitle: 'Rua das Acácias, 120 · São José dos Campos',
      tag: 'Padrão',
    };
    try { localStorage.setItem('jnc_delivery_context', JSON.stringify(ctx)); } catch {}
    onSelectContext(ctx);
    onOpenChange(false);
  };

  const handleSelectCondo = () => {
    const ctx: DeliveryContext = {
      type: 'condo',
      title: 'Spazio Campo Azuli',
      subtitle: 'Bloco B · Apto 42 · Feiras e entregas na portaria',
      tag: 'Feira Hoje',
    };
    try { localStorage.setItem('jnc_delivery_context', JSON.stringify(ctx)); } catch {}
    onSelectContext(ctx);
    onOpenChange(false);
  };

  const handleSelectChale = (chale: HospitalityPlaceItem) => {
    const ctx: DeliveryContext = {
      type: 'chale',
      title: chale.name,
      subtitle: `${selectedDestination.name} · Entrega no chalé`,
      tag: 'Turismo',
      destinationSlug: selectedDestination.slug,
      placeSlug: chale.slug,
      bannerUrl: chale.bannerUrl,
    };
    try { localStorage.setItem('jnc_delivery_context', JSON.stringify(ctx)); } catch {}
    onSelectContext(ctx);
    onOpenChange(false);
  };

  // Filtragem por busca
  const filteredChales = chales.filter((c) =>
    searchQuery.trim() === ''
      ? true
      : c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.addressLine?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm transition-opacity" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[101] max-h-[92vh] overflow-hidden rounded-t-[2.2rem] bg-white text-slate-900 shadow-2xl focus:outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" />

          <div className="px-5 pb-6 pt-3 overflow-y-auto max-h-[85vh] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Header com Fechar (conforme mock) */}
            <div className="flex items-center justify-between pb-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0E4B3E]">
                  Local de Entrega
                </p>
                <Drawer.Title className="text-xl font-black tracking-tight text-slate-950">
                  Entregar em…
                </Drawer.Title>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95"
                aria-label="Fechar"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* LISTA DIRETA DE CONTEXTOS DISPONÍVEIS (Conforme Mock Estado 2) */}
            <div className="space-y-2.5">
              {/* Card Casa */}
              <button
                type="button"
                onClick={handleSelectHome}
                className={`jnc-hub-touch group flex w-full items-center gap-3.5 rounded-2xl p-3.5 text-left transition-all active:scale-[0.99] ${
                  activeContext.type === 'home'
                    ? 'border-2 border-[#0E4B3E] bg-[#f0f7f5] shadow-sm'
                    : 'border border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#0E4B3E]">
                  <House size={22} weight="duotone" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-black text-slate-950">Casa</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600">
                      Padrão
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                    Rua das Acácias, 120 · São José dos Campos
                  </p>
                </div>
                {activeContext.type === 'home' ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0E4B3E] text-white">
                    <Check size={14} weight="bold" />
                  </span>
                ) : (
                  <CaretRight size={16} weight="bold" className="shrink-0 text-slate-300" />
                )}
              </button>

              {/* Card Condomínio */}
              <button
                type="button"
                onClick={handleSelectCondo}
                className={`jnc-hub-touch group flex w-full items-center gap-3.5 rounded-2xl p-3.5 text-left transition-all active:scale-[0.99] ${
                  activeContext.type === 'condo'
                    ? 'border-2 border-indigo-600 bg-indigo-50/50 shadow-sm'
                    : 'border border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <Buildings size={22} weight="duotone" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-black text-slate-950">
                      Spazio Campo Azuli
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800">
                      Feira Hoje
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                    Bloco B · Apto 42 · Feiras e entregas na portaria
                  </p>
                </div>
                {activeContext.type === 'condo' ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                    <Check size={14} weight="bold" />
                  </span>
                ) : (
                  <CaretRight size={16} weight="bold" className="shrink-0 text-slate-300" />
                )}
              </button>

              {/* Card Pousada / Chalé Selecionado ou Sugerido */}
              {(() => {
                const isChaleActive = activeContext.type === 'chale';
                const displayChaleTitle = isChaleActive && activeContext.title
                  ? activeContext.title
                  : DEFAULT_SFX_CHALES[0].name;
                const displayChaleSubtitle = isChaleActive && activeContext.subtitle
                  ? activeContext.subtitle
                  : 'São Francisco Xavier · Lojas entregam na hospedagem';

                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isChaleActive) {
                        handleSelectChale(DEFAULT_SFX_CHALES[0]);
                      } else {
                        onOpenChange(false);
                      }
                    }}
                    className={`jnc-hub-touch group flex w-full items-center gap-3.5 rounded-2xl p-3.5 text-left transition-all active:scale-[0.99] ${
                      isChaleActive
                        ? 'border-2 border-emerald-600 bg-emerald-50/50 shadow-sm'
                        : 'border border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <Mountains size={22} weight="duotone" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-black text-slate-950">
                          {displayChaleTitle}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                          Turismo
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                        {displayChaleSubtitle}
                      </p>
                    </div>
                    {isChaleActive ? (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <Check size={14} weight="bold" />
                      </span>
                    ) : (
                      <CaretRight size={16} weight="bold" className="shrink-0 text-slate-300" />
                    )}
                  </button>
                );
              })()}
            </div>

            {/* SEÇÃO ESTOU VIAJANDO / OUTROS DESTINOS & CHALÉS (Conforme Mock Estado 2) */}
            <div className="mt-4 rounded-3xl border border-slate-200/90 bg-slate-50/80 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
                    <SuitcaseRolling size={16} weight="bold" />
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    Estou viajando / Escolher Chalé ou Destino
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  {destinations.length} cidades
                </span>
              </div>

              {/* Input de busca conforme mock */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-2xs">
                <MagnifyingGlass size={16} weight="bold" className="shrink-0 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar chalé, pousada ou destino..."
                  className="w-full bg-transparent text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                    <X size={14} weight="bold" />
                  </button>
                )}
              </div>

              {/* Mini-banners das Cidades Turísticas */}
              <div>
                <p className="text-2xs font-black uppercase tracking-[0.16em] text-emerald-800 mb-1.5">
                  Cidades Turísticas Disponíveis
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {destinations.map((dest) => {
                    const isSelected = selectedDestination?.slug === dest.slug;
                    return (
                      <MiniBanner
                        key={dest.slug}
                        title={dest.name}
                        state={dest.state}
                        count={dest.placesCount}
                        selected={isSelected}
                        bannerUrl={dest.bannerUrl ? resolveAssetUrl(dest.bannerUrl) : undefined}
                        onClick={() => {
                          setSelectedDestination(dest);
                          setSearchQuery('');
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Lista dos Chalés da Cidade Selecionada */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-2xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Chalés em {selectedDestination?.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedDestination) return;
                      onSelectContext({
                        type: 'chale',
                        title: `Hospedagem em ${selectedDestination.name}`,
                        subtitle: `${selectedDestination.name} · Destino turístico`,
                        tag: 'Turismo',
                        destinationSlug: selectedDestination.slug,
                      });
                      onOpenChange(false);
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    Usar cidade inteira
                  </button>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5">
                  {loadingChales ? (
                    <div className="py-4 text-center">
                      <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                      <p className="mt-1 text-2xs font-bold text-slate-400">Buscando chalés em {selectedDestination?.name}...</p>
                    </div>
                  ) : filteredChales.length === 0 ? (
                    <div className="rounded-xl border border-slate-200/80 bg-white p-3 text-center">
                      <p className="text-xs font-bold text-slate-600">Nenhum chalé encontrado.</p>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectContext({
                            type: 'chale',
                            title: `Hospedagem em ${selectedDestination.name}`,
                            subtitle: `${selectedDestination.name} · Destino turístico`,
                            tag: 'Turismo',
                            destinationSlug: selectedDestination.slug,
                          });
                          onOpenChange(false);
                        }}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white"
                      >
                        Selecionar {selectedDestination.name}
                      </button>
                    </div>
                  ) : (
                    filteredChales.map((chale) => {
                      const isCurrentActive =
                        activeContext.placeSlug === chale.slug || activeContext.title === chale.name;
                      const coverUrl = chale.bannerUrl ? resolveAssetUrl(chale.bannerUrl) : null;

                      return (
                        <button
                          key={chale.slug}
                          type="button"
                          onClick={() => handleSelectChale(chale)}
                          className={`jnc-hub-touch group flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition-all active:scale-[0.99] ${
                            isCurrentActive
                              ? 'border-2 border-emerald-600 bg-emerald-50/60 shadow-sm'
                              : 'border-slate-200/80 bg-white hover:border-emerald-300 hover:bg-slate-50/60'
                          }`}
                        >
                          <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            {coverUrl ? (
                                <img
                                  src={coverUrl}
                                  alt={chale.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    const fallback = resolveAssetUrl(selectedDestination?.bannerUrl || DEFAULT_SFX_CHALES[0].bannerUrl);
                                    if (fallback && (e.target as HTMLImageElement).src !== fallback) {
                                      (e.target as HTMLImageElement).src = fallback;
                                    }
                                  }}
                                />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-emerald-100 text-emerald-800">
                                <Bed size={18} weight="duotone" />
                              </div>
                            )}
                            <span className="absolute bottom-0.5 left-0.5 rounded bg-slate-900/80 px-1 text-[8px] font-black uppercase tracking-wider text-white">
                              {chale.type}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-xs font-black text-slate-950">
                              {chale.name}
                            </h4>
                            <p className="truncate text-[10.5px] font-semibold text-slate-500">
                              {chale.addressLine}
                            </p>
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                              <Sparkle size={10} weight="fill" />
                              Lojas entregam aqui
                            </div>
                          </div>

                          {isCurrentActive ? (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                              <Check size={12} weight="bold" />
                            </span>
                          ) : (
                            <CaretRight size={14} weight="bold" className="shrink-0 text-slate-300" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Botão de Localização GPS rápido */}
              <button
                type="button"
                onClick={() => {
                  onSelectContext({
                    type: 'home',
                    title: 'Localização Atual (GPS)',
                    subtitle: 'São José dos Campos - SP',
                    tag: 'GPS',
                  });
                  onOpenChange(false);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white py-2.5 text-xs font-black text-[#0E4B3E] hover:border-[#0E4B3E]/40 hover:bg-emerald-50/40 active:scale-98"
              >
                <Crosshair size={15} weight="bold" />
                Usar minha localização atual (GPS)
              </button>
            </div>

            {/* Footer de Ações Rápidas (conforme mock) */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              {onManageAddresses ? (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onManageAddresses();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-950"
                >
                  <MapPin size={15} weight="bold" />
                  Gerenciar endereços
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full bg-[#5FD35A] px-5 py-2 text-xs font-black text-[#153A4C] shadow-sm hover:brightness-105 active:scale-95"
              >
                Confirmar local
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
