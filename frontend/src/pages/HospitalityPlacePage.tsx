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

  return (
    <main className="min-h-screen bg-[#f4f1ea] pb-[calc(var(--jnk-native-nav-height,0px)+1.5rem)] text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <div className="absolute inset-0 opacity-60">
          <img src={imageFor(place)} alt={place.name || 'Hospedagem'} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/75 to-slate-950/45" />
        </div>
        <div className="relative mx-auto max-w-6xl">
          <Link to={`/destinos/${destinationSlug}`} className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white ring-1 ring-white/12">
            <ArrowRight size={14} className="rotate-180" weight="bold" />
            Voltar ao destino
          </Link>
          {loading ? <p className="mt-8 text-sm font-bold text-white/72">Carregando hospedagem...</p> : null}
          {error ? <p className="mt-8 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
          {!loading && !error ? (
            <div className="mt-10 max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald-400/16 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100 ring-1 ring-emerald-200/15">
                <Bed size={15} weight="duotone" />
                {destination.name}
              </p>
              <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl">{place.name}</h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-white/76">
                {place.description || place.deliveryInstructions || 'Hospedagem cadastrada no Já no Caminho.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {place.address ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1.5 text-xs font-black text-white">
                    <MapPinLine size={14} weight="duotone" />
                    {place.address}
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
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-black text-white"
                  >
                    <WhatsappLogo size={14} weight="fill" />
                    Falar sobre a hospedagem
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {!loading && !error ? (
        <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Delivery no local</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">Lojas vinculadas</h2>
              </div>
              <ShoppingBagOpen size={28} weight="duotone" className="text-[#336886]" />
            </div>
            {stores.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 p-5">
                <p className="text-sm font-bold text-slate-600">Ainda não há lojas aprovadas para entrega neste local.</p>
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
                        {store.settings?.segment || 'loja'}
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
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">No entorno</p>
                  <h2 className="mt-1 text-xl font-black">Serviços recomendados</h2>
                </div>
                <Sparkle size={25} weight="duotone" className="text-amber-700" />
              </div>
              <div className="mt-4 space-y-3">
                {listings.map((listing: any) => {
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
                {listings.length === 0 ? <p className="text-sm font-bold text-slate-500">Sem serviços aprovados ainda.</p> : null}
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
