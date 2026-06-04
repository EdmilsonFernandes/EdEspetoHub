import { Link } from 'react-router-dom';
import { ArrowRight, Buildings, CheckCircle, Sparkle, WhatsappLogo } from '@phosphor-icons/react';
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
      className={`group relative overflow-hidden rounded-[2.2rem] border border-white/10 p-5 text-white shadow-[0_24px_54px_-30px_rgba(21,58,76,0.85)] bg-[radial-gradient(circle_at_14%_12%,rgba(95,211,90,0.15),transparent_40%),linear-gradient(135deg,#153A4C_0%,#1b465c_58%,#0b1e27_100%)] transition-all duration-300 hover:border-white/15 hover:shadow-[0_28px_64px_-24px_rgba(21,58,76,0.95)] active:scale-[0.99] ${className}`}
    >
      {/* Glare Sweep Line */}
      <div className="jnc-glare-sweep pointer-events-none absolute inset-y-0 -left-[120%] w-[50%] bg-gradient-to-r from-transparent via-white/12 to-transparent -skew-x-20 z-20" />

      <div className="relative flex items-center justify-between gap-5">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/90 backdrop-blur-xl">
            <Sparkle size={13} weight="duotone" />
            Cresça no guia local
          </p>
          <h3 className="mt-3 text-xl font-black leading-tight tracking-[-0.04em] sm:text-2xl">
            {headline}
          </h3>
          <p className="mt-2 max-w-[27rem] text-sm font-semibold leading-relaxed text-slate-300">
            {description} Sem taxas ou comissões sobre suas vendas, apenas uma mensalidade justa!
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              { label: 'Apareça no app', icon: Buildings },
              { label: 'Fale por WhatsApp', icon: WhatsappLogo },
              { label: 'Zero comissões', icon: CheckCircle },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/8 px-3 py-2 text-[11px] font-black text-white/80 backdrop-blur-xl"
                >
                  <Icon size={14} weight="duotone" className="text-[#5FD35A]" />
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
              className="jnc-hub-touch inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#153A4C] shadow-[0_12px_24px_-16px_rgba(255,255,255,0.45)] transition active:scale-[0.98]"
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
              <WhatsappLogo size={15} weight="fill" className="text-[#5FD35A]" />
              Falar no WhatsApp
            </a>
          </div>
        </div>

        {/* Animated CSS Mascot */}
        <div className="hidden sm:flex jnc-partner-mascot relative h-[5.2rem] w-[5.2rem] shrink-0 items-center justify-center select-none z-10 mr-2">
          <div className="absolute inset-[-6px] rounded-full border border-dashed border-[#5FD35A]/30 animate-[spin_16s_linear_infinite]" />
          <div className="jnc-mascot-head relative h-full w-full rounded-[1.45rem] border border-white/20 bg-gradient-to-br from-[#1c4b62] via-[#153A4C] to-[#0f2a37] shadow-[0_16px_36px_rgba(21,58,76,0.6)] flex items-center justify-center">
            <span className="absolute left-1/2 -top-2 h-3 w-[2px] -translate-x-1/2 rounded-full bg-[#5FD35A] shadow-[0_0_8px_rgba(95,211,90,0.8)]" />
            <span className="absolute left-1/2 -top-3 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#5FD35A] shadow-[0_0_12px_rgba(95,211,90,1)]" />
            <span className="jnc-mascot-eye absolute left-[1.3rem] top-[1.45rem] h-2 w-2 rounded-full bg-[#5FD35A] shadow-[0_0_10px_rgba(95,211,90,0.95)]" />
            <span className="jnc-mascot-eye absolute right-[1.3rem] top-[1.45rem] h-2 w-2 rounded-full bg-[#5FD35A] shadow-[0_0_10px_rgba(95,211,90,0.95)]" />
            <span className="absolute bottom-[1.1rem] h-1.5 w-6 rounded-full border-b-2 border-white/60" />
          </div>
        </div>
      </div>
    </section>
  );
}
