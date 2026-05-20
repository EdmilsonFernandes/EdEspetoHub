// @ts-nocheck
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CreditCard,
  ForkKnife,
  GlobeHemisphereWest,
  MapPinLine,
  PhoneCall,
  ShoppingBagOpen,
  Sparkle,
  Storefront,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react';
import { openActionTarget } from '../../utils/actionLink';

const InstagramIcon = ({ className = 'h-4 w-4' }) => (
  <img src="/insta.avif" alt="" className={`${className} rounded-full object-cover`} />
);

const actionClasses: Record<string, string> = {
  whatsapp: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  phone: 'border-[#153A4C]/12 bg-white text-[#153A4C]',
  instagram: 'border-pink-100 bg-white text-slate-700',
  site: 'border-slate-200 bg-white text-slate-700',
};

const actionIcon = (kind?: string) => {
  if (kind === 'whatsapp') return <WhatsappLogo size={16} weight="fill" />;
  if (kind === 'phone') return <PhoneCall size={16} weight="duotone" />;
  if (kind === 'instagram') return <InstagramIcon className="h-4 w-4" />;
  return <GlobeHemisphereWest size={16} weight="duotone" />;
};

const ContactAction = ({ action }: any) => {
  if (!action?.href) return null;

  const handleClick = (event: any) => {
    if (!action.external) return;
    event.preventDefault();
    void openActionTarget({ href: action.href, external: true });
  };

  return (
    <a
      href={action.href}
      onClick={handleClick}
      target={action.external || (!action.native && action.kind === 'whatsapp') ? '_blank' : undefined}
      rel="noreferrer"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5 ${actionClasses[action.kind] || actionClasses.site}`}
    >
      {actionIcon(action.kind)}
      {action.label}
    </a>
  );
};

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
  address,
}: any) {
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

  const actions = [
    primaryAction,
    instagramUrl ? { href: instagramUrl, label: 'Instagram', kind: 'instagram', external: true } : null,
    websiteUrl ? { href: websiteUrl, label: websiteLabel, kind: 'site', external: true } : null,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-[240] flex items-end bg-slate-950/38 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Detalhes de ${listing.title || 'serviço'}`}>
      <button type="button" aria-label="Fechar detalhes" className="absolute inset-0 cursor-default" onClick={onClose} />
      <section className="relative w-full max-w-2xl overflow-hidden rounded-t-[2rem] bg-[#f7f1e8] shadow-[0_30px_90px_-42px_rgba(15,23,42,0.7)] sm:max-h-[92dvh] sm:rounded-[2rem]">
        <div className="max-h-[92dvh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="relative bg-slate-900">
            <div className="aspect-[16/9] max-h-[19rem] w-full overflow-hidden">
              {hasImage && imageUrl ? (
                <img src={imageUrl} alt={listing.title} className="h-full w-full object-cover" />
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

              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                {listing.description || address || `Contato local em ${destination?.city || destination?.name || 'este destino'}.`}
              </p>

              {address ? (
                <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                  <MapPinLine size={15} weight="duotone" className="shrink-0 text-[#336886]" />
                  <span className="truncate">{address}</span>
                </p>
              ) : null}

              {actions.length > 0 ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {actions.map((action: any) => (
                    <ContactAction key={`${action.kind}-${action.href}`} action={action} />
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">Contato ainda não informado.</p>
              )}
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
    </div>
  );
}
