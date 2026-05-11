// @ts-nocheck
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ArrowRight, Bed, Clock, ForkKnife, MapPinLine, ShoppingBagOpen, Sparkle, WhatsappLogo } from '@phosphor-icons/react';
import { destinationService } from '../services/destinationService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { formatCurrency } from '../utils/format';
import { getStoreAvatarUrl } from '../utils/storeAvatar';
import { buildDestinationInquiryMessage, buildWhatsAppUrl } from '../utils/destinationWhatsApp';

const imageFor = (item: any) =>
  resolveAssetUrl(item?.bannerUrl || item?.imageUrl || item?.logoUrl || item?.store?.settings?.bannerUrl || item?.store?.settings?.logoUrl || '') ||
  getStoreAvatarUrl(item?.slug || item?.store?.slug || item?.id, item?.name || item?.title || item?.store?.name);

export function HospitalityPlacePage() {
  const { destinationSlug = '', placeSlug = '' } = useParams();
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    destinationService
      .getHospitalityPlace(destinationSlug, placeSlug)
      .then((data) => {
        if (active) setPayload(data || null);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Não foi possível carregar esta hospedagem.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [destinationSlug, placeSlug]);

  const destination = payload?.destination || {};
  const place = payload?.hospitalityPlace || {};
  const stores = Array.isArray(payload?.stores) ? payload.stores : [];
  const listings = Array.isArray(payload?.listings) ? payload.listings : [];
  const isNativePlatform = Capacitor.isNativePlatform();
  const destinationLocationLabel = [destination.city, destination.state].filter(Boolean).join(', ') || destination.name || 'Destino';
  const placeListings = listings.filter((listing: any) => String(listing.hospitalityPlaceId || '') === String(place.id || ''));
  const destinationListings = listings.filter((listing: any) => !listing.hospitalityPlaceId);
  const hasPlaceDeliveryOptions = stores.length > 0 || placeListings.length > 0;

  return (
    <main className="min-h-screen bg-[#f4f1ea] pb-[calc(var(--jnk-native-nav-height,0px)+1.5rem)] text-slate-950">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_12%_0%,rgba(51,104,134,0.16),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(240,180,72,0.18),transparent_30%),linear-gradient(135deg,#f7f1e4,#eef6f1_58%,#eadfc8)] px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="absolute -right-20 top-12 h-64 w-64 rounded-full bg-[#336886]/14 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-amber-300/18 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <Link to={`/destinos/${destinationSlug}`} className="inline-flex items-center gap-2 rounded-full border border-[#153A4C]/10 bg-white/82 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#153A4C] shadow-sm backdrop-blur">
            <ArrowRight size={14} className="rotate-180" weight="bold" />
            Voltar ao destino
          </Link>
          {loading ? <p className="mt-8 text-sm font-bold text-slate-500">Carregando hospedagem...</p> : null}
          {error ? <p className="mt-8 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
          {!loading && !error ? (
            <div className="mt-7 grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
              <div className="rounded-[2rem] border border-white/80 bg-white/88 p-5 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.42)] backdrop-blur sm:p-6">
                <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#153A4C]/8 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#153A4C] ring-1 ring-[#153A4C]/10">
                  <Bed size={15} weight="duotone" />
                  <span>Hospedagem selecionada</span>
                </p>
                <h1 className="mt-5 text-[2.65rem] font-black leading-[0.94] tracking-[-0.055em] text-slate-950 sm:text-6xl">{place.name}</h1>
                <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">
                  <MapPinLine size={15} weight="duotone" className="shrink-0 text-[#336886]" />
                  <span className="truncate">{destinationLocationLabel}</span>
                </p>
                <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-slate-600">
                  {place.description || place.deliveryInstructions || 'Hospedagem cadastrada no Já no Caminho.'}
                </p>
              </div>
              <div className="overflow-hidden rounded-[2.25rem] border border-white/90 bg-white/88 p-2 shadow-[0_30px_90px_-46px_rgba(15,23,42,0.5)]">
                <div className="relative h-[20rem] overflow-hidden rounded-[1.75rem] bg-slate-100">
                  <img src={imageFor(place)} alt={place.name || 'Hospedagem'} className="h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/48 via-slate-950/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/92 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm">
                      {String(place.type || 'CHALE').replace('_', ' ')}
                    </span>
                    {hasPlaceDeliveryOptions ? (
                      <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-sm">
                        {stores.length + placeListings.length} atendimento(s)
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {!loading && !error ? (
        <section className="relative z-10 mx-auto -mt-7 max-w-6xl px-4">
          <div className="flex flex-col gap-3 rounded-[1.75rem] border border-slate-200 bg-white/95 p-4 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.45)] backdrop-blur md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Local da hospedagem</p>
              <p className="mt-1 line-clamp-2 text-sm font-black text-slate-800">
                {place.address || [place.city, place.state].filter(Boolean).join(' - ') || 'Endereço não informado'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {place.address ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                  <MapPinLine size={14} weight="duotone" />
                  Ver endereço
                </span>
              ) : null}
              {place.whatsapp ? (
                <a
                  href={buildWhatsAppUrl(place.whatsapp, buildDestinationInquiryMessage({
                    destinationName: destination.name,
                    city: destination.city,
                    state: destination.state,
                    itemName: place.name,
                    itemType: 'hospedagem',
                  }), isNativePlatform)}
                  target={isNativePlatform ? undefined : '_blank'}
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-2 text-xs font-black text-white"
                >
                  <WhatsappLogo size={14} weight="fill" />
                  Falar sobre a hospedagem
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {!loading && !error ? (
        <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Atendem este chalé</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">Delivery e contatos confiáveis</h2>
                <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">
                  Lojas online abrem pedido pelo app. Parceiros ainda não cadastrados aparecem com WhatsApp e mensagem pronta para este chalé.
                </p>
              </div>
              <ShoppingBagOpen size={28} weight="duotone" className="text-[#336886]" />
            </div>
            {!hasPlaceDeliveryOptions ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 p-5">
                <p className="text-sm font-bold text-slate-600">Ainda não há lojas ou contatos configurados para atendimento direto neste chalé.</p>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {stores.map((entry: any) => {
                const store = entry.store || {};
                const link = entry || {};
                return (
                  <Link
                    key={`${entry.id}-${store.id}`}
                    to={`/${store.slug}?destino=${encodeURIComponent(destination.slug || destinationSlug)}&destino_nome=${encodeURIComponent(destination.name || destination.city || destinationSlug)}&hospedagem=${encodeURIComponent(place.slug || placeSlug)}&hospedagem_nome=${encodeURIComponent(place.name || placeSlug)}`}
                    className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.45)] transition hover:-translate-y-1"
                  >
                    <div className="relative h-40 overflow-hidden bg-slate-100">
                      <img src={imageFor(store)} alt={store.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-slate-700">
                        Pedido no app
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-black text-slate-950">{store.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">{store.settings?.description || 'Loja cadastrada para atender esta hospedagem.'}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {link.deliveryEnabled ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                            Entrega {link.deliveryFee != null ? formatCurrency(link.deliveryFee) : ''}
                          </span>
                        ) : null}
                        {link.estimatedMinutes ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700">
                            <Clock size={13} weight="duotone" />
                            {link.estimatedMinutes} min
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
              {placeListings.map((listing: any) => {
                const contactTarget = listing.whatsapp || listing.ctaUrl || '';
                const isExternalUrl = String(contactTarget || '').startsWith('http');
                const contactHref = isExternalUrl
                  ? contactTarget
                  : buildWhatsAppUrl(contactTarget, buildDestinationInquiryMessage({
                      destinationName: destination.name,
                      city: destination.city,
                      state: destination.state,
                      itemName: listing.title,
                      itemType: String(listing.category || 'serviço').replace('_', ' '),
                      placeName: place.name,
                    }), isNativePlatform);
                return (
                  <article key={listing.id} className="overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.45)]">
                    <div className="relative h-40 overflow-hidden bg-slate-100">
                      <img src={imageFor(listing)} alt={listing.title} className="h-full w-full object-cover" />
                      <div className="absolute left-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-black text-white">
                        Atende por WhatsApp
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-black text-slate-950">{listing.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">{listing.description || listing.address || `Contato configurado para atender ${place.name}.`}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                          Entrega/atende este chalé
                        </span>
                        {contactHref ? (
                          <a
                            href={contactHref}
                            target={isNativePlatform && !isExternalUrl ? undefined : '_blank'}
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white"
                          >
                            <WhatsappLogo size={13} weight="fill" />
                            Chamar no WhatsApp
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">No entorno</p>
                  <h2 className="mt-1 text-xl font-black">Também na cidade</h2>
                </div>
                <Sparkle size={25} weight="duotone" className="text-amber-700" />
              </div>
              <div className="mt-4 space-y-3">
                {destinationListings.map((listing: any) => {
                  const contactTarget = listing.whatsapp || listing.ctaUrl || '';
                  const isExternalUrl = String(contactTarget || '').startsWith('http');
                  const contactHref = isExternalUrl
                    ? contactTarget
                    : buildWhatsAppUrl(contactTarget, buildDestinationInquiryMessage({
                        destinationName: destination.name,
                        city: destination.city,
                        state: destination.state,
                        itemName: listing.title,
                        itemType: String(listing.category || 'serviço').replace('_', ' '),
                        placeName: place.name,
                      }), isNativePlatform);
                  return (
                  <article key={listing.id} className="rounded-[1.35rem] border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex gap-3">
                      <img src={imageFor(listing)} alt={listing.title} className="h-14 w-14 rounded-2xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#336886]">{String(listing.category || 'SERVICO').replace('_', ' ')}</p>
                        <h3 className="mt-0.5 text-sm font-black text-slate-950">{listing.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{listing.description || listing.address || 'Serviço cadastrado.'}</p>
                      </div>
                    </div>
                    {contactHref ? (
                      <a
                        href={contactHref}
                        target={isNativePlatform && !isExternalUrl ? undefined : '_blank'}
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white"
                      >
                        <WhatsappLogo size={13} weight="fill" />
                        Pedir informações
                      </a>
                    ) : null}
                  </article>
                  );
                })}
                {destinationListings.length === 0 ? <p className="text-sm font-bold text-slate-500">Sem outros serviços aprovados na cidade ainda.</p> : null}
              </div>
            </div>
            {place.deliveryInstructions ? (
              <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Instrução de entrega</p>
                <p className="mt-2 text-sm font-bold leading-relaxed text-slate-700">{place.deliveryInstructions}</p>
              </div>
            ) : null}
            <Link to="/destinos/cadastrar" className="block rounded-[2rem] bg-[#153A4C] p-5 text-white">
              <ForkKnife size={22} weight="duotone" />
              <h3 className="mt-3 text-lg font-black">Sua loja entrega aqui?</h3>
              <p className="mt-1 text-sm font-semibold text-white/72">Entre no painel da loja e solicite vínculo em Destinos.</p>
            </Link>
          </aside>
        </section>
      ) : null}
    </main>
  );
}
