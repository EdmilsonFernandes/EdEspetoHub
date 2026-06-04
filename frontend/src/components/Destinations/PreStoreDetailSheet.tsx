// @ts-nocheck
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CheckCircle,
  ClipboardText,
  CreditCard,
  ForkKnife,
  GlobeHemisphereWest,
  MapPinLine,
  NavigationArrow,
  PhoneCall,
  ShoppingBagOpen,
  Sparkle,
  Storefront,
  WhatsappLogo,
  X,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { openActionTarget } from '../../utils/actionLink';
import { AppImagePreviewDialog } from '../common/AppImagePreviewDialog';

const InstagramIcon = ({ className = 'h-4 w-4' }) => (
  <img src="/insta.avif" alt="" className={`${className} rounded-full object-cover`} />
);

const actionClasses: Record<string, string> = {
  whatsapp: 'border-emerald-500 bg-[linear-gradient(135deg,#16a34a,#22c55e)] text-white shadow-[0_18px_34px_-24px_rgba(22,163,74,0.72)]',
  phone: 'border-[#336886]/12 bg-white text-[#336886]',
  instagram: 'border-pink-100 bg-white text-slate-700',
  site: 'border-slate-200 bg-white text-slate-700',
  route: 'border-[#336886]/12 bg-[#336886] text-white',
};

const actionIcon = (kind?: string) => {
  if (kind === 'whatsapp') return <WhatsappLogo size={16} weight="fill" />;
  if (kind === 'phone') return <PhoneCall size={16} weight="duotone" />;
  if (kind === 'instagram') return <InstagramIcon className="h-4 w-4" />;
  if (kind === 'route') return <NavigationArrow size={18} weight="fill" />;
  return <GlobeHemisphereWest size={16} weight="duotone" />;
};

const ContactAction = ({ action }: any) => {
  if (!action?.href) return null;
  const className = action.kind === 'route'
    ? 'flex min-h-12 w-full items-center justify-center gap-2 rounded-[1.05rem] border border-[#336886]/12 bg-[#336886] px-4 py-3 text-sm font-extrabold text-white shadow-[0_18px_34px_-28px_rgba(51,104,134,0.68)] transition hover:-translate-y-0.5 active:scale-[0.98]'
    : `inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5 active:scale-[0.98] ${actionClasses[action.kind] || actionClasses.site}`;

  const handleClick = async (event: any) => {
    if (action.kind === 'whatsapp') {
      event.preventDefault();
      if (action.native) {
        try {
          const { Browser } = await import('@capacitor/browser');
          await Browser.open({ url: action.href });
        } catch {
          window.open(action.href, '_blank', 'noopener,noreferrer');
        }
        return;
      }
      window.open(action.href, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!action.external) return;
    event.preventDefault();
    void openActionTarget({ href: action.href, external: true });
  };

  if (action.kind === 'route' && String(action.href || '').startsWith('/')) {
    return (
      <Link to={action.href} className={className}>
        {actionIcon(action.kind)}
        {action.label}
      </Link>
    );
  }

  return (
    <a
      href={action.href}
      onClick={handleClick}
      target={action.external || (!action.native && action.kind === 'whatsapp') ? '_blank' : undefined}
      rel="noreferrer"
      className={className}
    >
      {actionIcon(action.kind)}
      {action.label}
    </a>
  );
};

const normalizeContent = (value?: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const PreStoreCardSkeleton = ({ compact = false }: any) => (
  <article className={`overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white p-3 shadow-[0_16px_38px_-34px_rgba(15,23,42,0.42)] ${compact ? '' : 'min-h-[6.5rem]'}`}>
    <div className="flex animate-pulse gap-3">
      <div className={`${compact ? 'h-12 w-12' : 'h-16 w-16'} shrink-0 rounded-[1.1rem] bg-slate-200`} />
      <div className="min-w-0 flex-1 space-y-2 py-1">
        <div className="h-3 w-24 rounded-full bg-slate-200" />
        <div className="h-4 w-3/4 rounded-full bg-slate-200" />
        <div className="h-3 w-full rounded-full bg-slate-100" />
        <div className="h-3 w-2/3 rounded-full bg-slate-100" />
      </div>
    </div>
  </article>
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
  address,
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
      window.setTimeout(() => setRouteCopied(false), 2200);
    } catch {
      setRouteCopied(false);
    }
  };

  const actions = [
    primaryAction,
    instagramUrl ? { href: instagramUrl, label: 'Instagram', kind: 'instagram', external: true } : null,
    websiteUrl ? { href: websiteUrl, label: websiteLabel, kind: 'site', external: true } : null,
  ].filter(Boolean);
  const contactActions = actions.filter((action: any) => ['whatsapp', 'phone'].includes(action.kind));
  const socialActions = actions.filter((action: any) => !['whatsapp', 'phone'].includes(action.kind));
  const rawDescription = String(listing.description || '').trim();
  const normalizedDescription = normalizeContent(rawDescription);
  const normalizedAddress = normalizeContent(address);
  const descriptionText =
    rawDescription && normalizedDescription !== normalizedAddress
      ? rawDescription
      : `Contato local em ${destination?.city || destination?.name || 'este destino'}.`;

  return (
    <div className="fixed inset-0 z-[240] flex items-end bg-slate-950/38 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Detalhes de ${listing.title || 'serviço'}`}>
      <button type="button" aria-label="Fechar detalhes" className="absolute inset-0 cursor-default" onClick={onClose} />
      <section className="relative w-full max-w-2xl overflow-hidden rounded-t-[2rem] bg-[#f7f1e8] shadow-[0_30px_90px_-42px_rgba(15,23,42,0.7)] sm:max-h-[92dvh] sm:rounded-[2rem]">
        <div className="max-h-[92dvh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="relative bg-slate-900">
            <div className="aspect-[16/9] max-h-[19rem] w-full overflow-hidden relative">
              {hasImage && imageUrl ? (
                <div
                  className="relative h-full w-full group cursor-zoom-in overflow-hidden"
                  onClick={() => setPreviewImage({ src: imageUrl, title: listing.title })}
                >
                  <img src={imageUrl} alt={listing.title} className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm shadow-md">
                      <MagnifyingGlass size={14} weight="bold" />
                      Ampliar imagem
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(245,158,11,0.28),transparent_34%),linear-gradient(135deg,#17384c,#0f172a_64%,#403017)]">
                  <Storefront size={74} weight="duotone" className="text-white/42" />
                </div>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950/72 via-slate-950/16 to-transparent" />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/82 text-white shadow-[0_12px_32px_-14px_rgba(0,0,0,0.75)] ring-2 ring-white/80 backdrop-blur-md transition hover:bg-slate-950 active:scale-95"
              aria-label="Fechar"
            >
              <X size={18} weight="bold" />
            </button>
            <div className="absolute bottom-4 left-4 right-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#153A4C] shadow-sm">
                <ForkKnife size={13} weight="duotone" />
                {categoryLabel || 'Serviço local'}
              </span>
              <h2 className="mt-2 text-2xl font-extrabold leading-tight tracking-[-0.04em] text-white sm:text-3xl">{listing.title}</h2>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <div className="rounded-[1.5rem] border border-white/80 bg-white/88 p-4 shadow-[0_14px_38px_-34px_rgba(15,23,42,0.42)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf5fa] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#336886]">
                  <ShoppingBagOpen size={14} weight="duotone" />
                  Contato direto
                </span>
                {placeName ? (
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-800">
                    <Sparkle size={13} weight="duotone" />
                    <span className="truncate">Atende {placeName}</span>
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{descriptionText}</p>

              {address ? (
                <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                  <MapPinLine size={15} weight="duotone" className="shrink-0 text-[#336886]" />
                  <span className="truncate">{address}</span>
                </p>
              ) : null}

              {routeAction?.href ? (
                <div className="mt-4 rounded-[1.4rem] border border-[#336886]/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(238,247,242,0.9))] p-3 text-slate-900 shadow-[0_18px_42px_-34px_rgba(51,104,134,0.42)] ring-1 ring-white/80">
                  <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">
                    <NavigationArrow size={13} weight="fill" />
                    Referência para entrega
                  </p>
                  <div className="mt-3 rounded-[1.15rem] border border-white/80 bg-white/86 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <div className="flex items-center gap-2">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#edf5fa] text-[#336886] ring-1 ring-[#cfe0ea]">
                        <Storefront size={17} weight="duotone" />
                      </span>
                      <span className="h-0.5 flex-1 rounded-full bg-[linear-gradient(90deg,#336886_0%,rgba(51,104,134,0.16)_100%)]" />
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                        <MapPinLine size={17} weight="duotone" />
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-start gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      <span className="truncate">{listing.title || 'Serviço'}</span>
                      <span className="text-[#336886]">rota</span>
                      <span className="truncate text-right">{placeName || 'Chalé'}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                    Mostra a distância entre este serviço e a hospedagem para facilitar a chegada do motoboy.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <ContactAction action={routeAction} />
                    <button
                      type="button"
                      onClick={copyRouteLink}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[1.05rem] border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 shadow-sm transition hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      {routeCopied ? <CheckCircle size={16} weight="fill" /> : <ClipboardText size={16} weight="duotone" />}
                      {routeCopied ? 'Copiado' : 'Copiar rota'}
                    </button>
                  </div>
                </div>
              ) : null}

              {actions.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {contactActions.length > 0 ? (
                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Contato</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {contactActions.map((action: any) => (
                          <ContactAction key={`${action.kind}-${action.href}`} action={action} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {socialActions.length > 0 ? (
                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Canais oficiais</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {socialActions.map((action: any) => (
                          <ContactAction key={`${action.kind}-${action.href}`} action={action} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : !routeAction?.href ? (
                <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">Contato ainda não informado.</p>
              ) : null}
            </div>

            <div className="rounded-[1.5rem] border border-[#153A4C]/10 bg-white p-4 shadow-[0_16px_42px_-36px_rgba(21,58,76,0.45)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#336886]">Como loja oficial</p>
                  <h3 className="mt-1 text-lg font-extrabold tracking-[-0.03em] text-slate-950">Cardápio digital no app</h3>
                </div>
                <Storefront size={25} weight="duotone" className="shrink-0 text-[#153A4C]" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: ForkKnife, title: 'Produtos', text: 'Itens, fotos e preços.' },
                  { icon: CreditCard, title: 'Pagamento', text: 'Pedido e pagamento online.' },
                  { icon: ShoppingBagOpen, title: 'Pedidos', text: 'Hóspede compra no app.' },
                ].map((item: any) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-[1.15rem] bg-[#f6f2e9] p-3">
                      <Icon size={21} weight="duotone" className="text-[#153A4C]" />
                      <p className="mt-2 text-sm font-extrabold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs font-medium leading-snug text-slate-500">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {claimHref ? (
              <Link
                to={claimHref}
                onClick={onClose}
                className="group flex items-center gap-3 rounded-[1.5rem] bg-[#153A4C] p-4 text-white shadow-[0_20px_50px_-34px_rgba(21,58,76,0.9)] transition hover:-translate-y-0.5"
              >
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/18">
                  <Sparkle size={22} weight="duotone" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold">É o seu negócio?</span>
                  <span className="mt-0.5 block text-xs font-medium leading-relaxed text-white/72">
                    Ative seu cardápio digital, aceite pagamentos e receba pedidos online direto dos hóspedes.
                  </span>
                  <span className="mt-3 inline-flex rounded-full bg-white px-3 py-2 text-xs font-extrabold text-[#153A4C] sm:hidden">
                    Quero cadastrar meu negócio
                  </span>
                </span>
                <span className="hidden shrink-0 items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-extrabold text-[#153A4C] sm:inline-flex">
                  Virar loja oficial
                  <ArrowUpRight size={13} weight="bold" />
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <AppImagePreviewDialog image={previewImage} onClose={() => setPreviewImage(null)} label="Imagem ampliada do local" />
    </div>
  );
}
