import { Link } from 'react-router-dom';
import { ArrowRight, Buildings, CheckCircle, Sparkle, Storefront, WhatsappLogo } from '@phosphor-icons/react';
import { prefetchRouteByPath } from '../../utils/clientRoutePrefetch';

type DestinationPartnerCtaProps = {
  cityName?: string;
  className?: string;
};

const BUSINESS_WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '551239334979';

const normalizePhone = (value: string) => String(value || '').replace(/\D/g, '');

const buildPartnerWhatsAppUrl = (cityName?: string) => {
  const city = String(cityName || '').trim();
  const message = city
    ? `Olá! Quero cadastrar meu chalé, pousada, restaurante ou serviço no guia do Já no Caminho em ${city}.`
    : 'Olá! Quero cadastrar meu chalé, pousada, restaurante ou serviço no guia do Já no Caminho.';
  return `https://wa.me/${normalizePhone(BUSINESS_WHATSAPP_NUMBER)}?text=${encodeURIComponent(message)}`;
};

export function DestinationPartnerCta({ cityName, className = '' }: DestinationPartnerCtaProps) {
  const hasCity = Boolean(String(cityName || '').trim());
  const headline = hasCity
    ? `Atende turistas em ${cityName}?`
    : 'Tem chalé, pousada ou serviço turístico?';
  const description = hasCity
    ? 'Cadastre seu negócio e apareça para hóspedes que já estão explorando essa cidade.'
    : 'Entre no guia local e seja encontrado por hóspedes e turistas da região.';
  const whatsappUrl = buildPartnerWhatsAppUrl(cityName);

  return (
    <section
      className={`group relative overflow-hidden rounded-[2rem] border border-[#153A4C]/10 bg-[radial-gradient(circle_at_16%_12%,rgba(95,211,90,0.24),transparent_30%),radial-gradient(circle_at_92%_18%,rgba(255,255,255,0.16),transparent_30%),linear-gradient(145deg,#153A4C_0%,#245a68_56%,#102f3d_100%)] p-4 text-white shadow-[0_24px_64px_-40px_rgba(21,58,76,0.90)] ring-1 ring-white/10 sm:p-5 ${className}`}
    >
      <div className="pointer-events-none absolute -right-10 -top-8 h-32 w-32 rounded-full bg-white/18 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 left-10 h-36 w-36 rounded-full bg-[#5FD35A]/18 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.08)_48%,transparent_58%)] opacity-0 transition duration-500 group-hover:opacity-100" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/90 backdrop-blur-xl">
              <Sparkle size={13} weight="duotone" />
              Cresça no guia local
            </p>
            <h3 className="mt-3 text-xl font-black leading-tight tracking-[-0.04em] sm:text-2xl">
              {headline}
            </h3>
            <p className="mt-2 max-w-[27rem] text-sm font-semibold leading-6 text-white/78">
              {description}
            </p>
          </div>
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] border border-white/18 bg-white/12 text-[#d8ff9f] shadow-[0_18px_34px_-26px_rgba(255,255,255,0.45)] backdrop-blur-xl sm:inline-flex">
            <Storefront size={24} weight="duotone" />
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {[
            { label: 'Apareça no app', icon: Buildings },
            { label: 'Receba contatos', icon: WhatsappLogo },
            { label: 'Conecte com chalés', icon: CheckCircle },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <span
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[11px] font-black text-white/88 backdrop-blur-xl"
              >
                <Icon size={14} weight="duotone" className="text-[#d8ff9f]" />
                {item.label}
              </span>
            );
          })}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
          <Link
            to="/destinos/cadastrar#dados-parceiro"
            onPointerEnter={() => prefetchRouteByPath('/destinos/cadastrar')}
            onFocus={() => prefetchRouteByPath('/destinos/cadastrar')}
            onTouchStart={() => prefetchRouteByPath('/destinos/cadastrar')}
            className="jnc-hub-touch inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#153A4C] shadow-[0_18px_34px_-24px_rgba(255,255,255,0.58)] transition active:scale-[0.98]"
          >
            Cadastrar meu negócio
            <ArrowRight size={14} weight="bold" />
          </Link>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="jnc-hub-touch inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_16px_30px_-24px_rgba(15,23,42,0.62)] backdrop-blur-xl transition active:scale-[0.98]"
          >
            <WhatsappLogo size={15} weight="fill" className="text-[#d8ff9f]" />
            Falar no WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
