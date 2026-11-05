// @ts-nocheck
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowSquareOut,
  ArrowUpRight,
  CheckCircle,
  Copy,
  ForkKnife,
  GlobeHemisphereWest,
  MapPin,
  MapPinLine,
  NavigationArrow,
  PhoneCall,
  Sparkle,
  Storefront,
  WhatsappLogo,
  X,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { openActionTarget } from '../../utils/actionLink';
import { AppImagePreviewDialog } from '../common/AppImagePreviewDialog';
import { AirbnbIcon, GoogleMapsIcon, isAirbnbUrlOrLabel } from '../common/BrandActionIcons';

const InstagramIcon = ({ className = 'h-4 w-4' }) => (
  <img src="/insta.avif" alt="Instagram" className={`${className} rounded-full object-cover`} />
);

const normalizeContent = (value?: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const PreStoreCardSkeleton = ({ compact = false }: any) => (
  <div className={`rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-sm ${compact ? '' : 'min-h-[6.5rem]'}`}>
    <div className="flex animate-pulse gap-3.5">
      <div className={`${compact ? 'h-14 w-14' : 'h-18 w-18'} shrink-0 rounded-2xl bg-slate-200`} />
      <div className="min-w-0 flex-1 space-y-2 py-1">
        <div className="h-3.5 w-24 rounded-full bg-slate-200" />
        <div className="h-4.5 w-3/4 rounded-full bg-slate-200" />
        <div className="h-3 w-full rounded-full bg-slate-100" />
      </div>
    </div>
  </div>
);

export function PreStoreDetailSheet({
  open,
  onClose,
  listing,
  destination,
  placeName,
  categoryLabel,
  imageUrl,
  hasImage,
  claimHref,
  primaryAction,
  instagramUrl,
  websiteUrl,
  websiteLabel = 'Site',
  routeAction,
  routeDistanceLabel,
  address,
  onOpenRoute,
}: any) {
  const [routeCopied, setRouteCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);

  useEffect(() => {
    if (!open) {
      setPreviewImage(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !listing) return null;

  const copyRouteLink = async () => {
    if (!routeAction?.href) return;
    const href = String(routeAction.href || '');
    const url = href.startsWith('/') && typeof window !== 'undefined'
      ? `${window.location.origin}${href}`
      : href;
    try {
      await navigator.clipboard.writeText(url);
      setRouteCopied(true);
      window.setTimeout(() => setRouteCopied(false), 2000);
    } catch {
      setRouteCopied(false);
    }
  };

  const handleWhatsappClick = async (event: any) => {
    if (!primaryAction?.href) return;
    event.preventDefault();
    if (primaryAction.native) {
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: primaryAction.href });
      } catch {
        window.open(primaryAction.href, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    window.open(primaryAction.href, '_blank', 'noopener,noreferrer');
  };

  const rawDescription = String(listing.description || '').trim();
  const normalizedDescription = normalizeContent(rawDescription);
  const normalizedAddress = normalizeContent(address);
  const descriptionText =
    rawDescription && normalizedDescription !== normalizedAddress
      ? rawDescription
      : `Atendimento local selecionado para sua estadia em ${destination?.city || destination?.name || 'este destino'}.`;

  const isWhatsapp = primaryAction?.kind === 'whatsapp' || primaryAction?.href?.includes('whatsapp') || primaryAction?.href?.includes('api.whatsapp');

  return (
    <div
      className="fixed inset-0 z-[240] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm transition-opacity sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${listing.title || 'serviço'}`}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fechar detalhes"
        className="absolute inset-0 cursor-default focus:outline-none"
        onClick={onClose}
      />

      {/* Sheet Modal Container */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-[2.2rem] border border-white/60 bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-[2.2rem]">
        {/* Grabber pill (mobile) */}
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-300 sm:hidden" />

        <div className="max-h-[88vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Hero Banner / Cover Section */}
          <div className="relative bg-slate-900">
            <div className="aspect-[16/9] max-h-[16rem] w-full overflow-hidden relative">
              {hasImage && imageUrl ? (
                <div
                  className="relative h-full w-full group cursor-zoom-in"
                  onClick={() => setPreviewImage({ src: imageUrl, title: listing.title })}
                >
                  <img
                    src={imageUrl}
                    alt={listing.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white/90 backdrop-blur-md">
                    <MagnifyingGlass size={13} weight="bold" />
                    Ampliar
                  </span>
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
                  <Storefront size={64} weight="duotone" className="text-white/30" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent" />
                </div>
              )}
            </div>

            {/* Botão Fechar no canto superior */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3.5 top-3.5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/70 text-white shadow-lg backdrop-blur-md hover:bg-slate-900 active:scale-95"
              aria-label="Fechar"
            >
              <X size={18} weight="bold" />
            </button>

            {/* Informações sobre a foto */}
            <div className="absolute bottom-4 left-4 right-4 z-10 text-white">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                  <ForkKnife size={12} weight="duotone" />
                  {categoryLabel || 'Serviço local'}
                </span>
                {routeDistanceLabel ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-black text-white shadow-sm backdrop-blur-md">
                    <NavigationArrow size={12} weight="fill" />
                    {routeDistanceLabel} do chalé
                  </span>
                ) : null}
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                {listing.title}
              </h2>
            </div>
          </div>

          {/* Conteúdo do Modal */}
          <div className="space-y-4 p-5">
            {/* Tag de Atendimento ao Chalé */}
            {placeName ? (
              <div className="flex items-center gap-2 rounded-2xl bg-amber-50/80 px-3.5 py-2.5 text-xs font-bold text-amber-900 border border-amber-200/60">
                <Sparkle size={16} weight="fill" className="shrink-0 text-amber-600" />
                <span>Atende hóspedes de <strong>{placeName}</strong></span>
              </div>
            ) : null}

            {/* Descrição Limpa */}
            <p className="text-sm font-medium leading-relaxed text-slate-600">
              {descriptionText}
            </p>

            {/* Endereço sutil */}
            {address ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <MapPin size={15} weight="duotone" className="shrink-0 text-slate-400" />
                <span className="truncate">{address}</span>
              </div>
            ) : null}

            {/* Rota até o chalé (Design minimalista e sem poluição) */}
            {routeAction?.href ? (
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-[#2563EB]">
                    <GoogleMapsIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">
                      {routeDistanceLabel ? `${routeDistanceLabel} de distância` : 'Rota do mapa'}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      Até seu chalé
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {onOpenRoute ? (
                    <button
                      type="button"
                      onClick={onOpenRoute}
                      className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#2563EB] shadow-2xs border border-slate-200 hover:bg-slate-50"
                    >
                      <NavigationArrow size={13} weight="bold" />
                      Ver rota
                    </button>
                  ) : (
                    <a
                      href={routeAction.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#2563EB] shadow-2xs border border-slate-200 hover:bg-slate-50"
                    >
                      <NavigationArrow size={13} weight="bold" />
                      Ver rota
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={copyRouteLink}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    title="Copiar link da rota"
                  >
                    {routeCopied ? <CheckCircle size={15} weight="fill" className="text-emerald-600" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Ação Primária: WhatsApp Direto */}
            {primaryAction?.href ? (
              <div className="pt-2">
                <a
                  href={primaryAction.href}
                  onClick={handleWhatsappClick}
                  target={primaryAction.native ? undefined : '_blank'}
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/25 transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <WhatsappLogo size={20} weight="fill" />
                  <span>Pedir ou Falar pelo WhatsApp</span>
                </a>
              </div>
            ) : null}

            {/* Outros Canais em linha horizontal limpa */}
            <div className="flex items-center gap-2 pt-1">
              {instagramUrl ? (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <InstagramIcon className="h-4 w-4" />
                  Instagram
                </a>
              ) : null}

              {websiteUrl ? (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  {isAirbnbUrlOrLabel(websiteUrl) || isAirbnbUrlOrLabel(websiteLabel) ? (
                    <AirbnbIcon className="h-4 w-4 rounded-xs" />
                  ) : (
                    <GlobeHemisphereWest size={16} weight="duotone" />
                  )}
                  {websiteLabel}
                </a>
              ) : null}
            </div>

            {/* Rodapé discreto para parceiro/negócio */}
            {claimHref ? (
              <div className="border-t border-slate-100 pt-3 text-center">
                <Link
                  to={claimHref}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition"
                >
                  <span>É dono deste estabelecimento? Ative sua vitrine oficial</span>
                  <ArrowUpRight size={13} weight="bold" />
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <AppImagePreviewDialog
        image={previewImage}
        onClose={() => setPreviewImage(null)}
        label="Imagem do local"
      />
    </div>
  );
}
