import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BellRinging,
  Buildings,
  Compass,
  RocketLaunch,
} from '@phosphor-icons/react';
import { WHATSAPP_NUMBER } from '../../../constants';

// Feature flag aditiva: o painel só renderiza se VITE_ENABLE_REGION_CONVERT !== 'false'.
// Default ON (ligado). Para desligar em prod: VITE_ENABLE_REGION_CONVERT=false no build.
const isRegionConvertEnabled = import.meta.env.VITE_ENABLE_REGION_CONVERT !== 'false';

function buildLeadWhatsAppUrl(locationLabel?: string | null) {
  const region = (locationLabel && locationLabel.trim()) || 'minha região';
  const text = `Olá! Quero o Já no Caminho entregando em ${region} 🚀 Me avisa quando a primeira loja abrir por aqui, por favor?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

type Tone = 'emerald' | 'amber' | 'violet';

const TONES: Record<Tone, { chip: string; icon: string; ring: string; cta: string }> = {
  emerald: {
    chip: 'bg-emerald-100',
    icon: 'text-emerald-700',
    ring: 'hover:border-emerald-200',
    cta: 'text-emerald-700',
  },
  amber: {
    chip: 'bg-amber-100',
    icon: 'text-amber-700',
    ring: 'hover:border-amber-200',
    cta: 'text-amber-700',
  },
  violet: {
    chip: 'bg-violet-100',
    icon: 'text-violet-700',
    ring: 'hover:border-violet-200',
    cta: 'text-violet-700',
  },
};

type ConvertAction = {
  key: string;
  tone: Tone;
  Icon: typeof BellRinging;
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
};

/**
 * Painel de conversão para o estado "sem cobertura na região" (no_coverage).
 * Transforma um dead-end ("sem lojas perto") em 3 caminhos:
 *   1. Lead capture via WhatsApp (zero backend) → lista de prospecção.
 *   2. Roteamento para Destinos (produto que pode monetizar — chalés/pousadas/atrações).
 *   3. Roteamento para Condomínio (base cativa, onde se cobra mensalidade/exclusividade).
 *
 * É PURAMENTE ADITIVO: só renderiza dentro do bloco no_coverage do HubStoreEmptyState,
 * atrás de flag. Não altera nenhum fluxo existente.
 */
export const HubRegionConvertPanel = memo(function HubRegionConvertPanel({
  displayLocationLabel,
}: {
  displayLocationLabel?: string | null;
}) {
  const navigate = useNavigate();

  if (!isRegionConvertEnabled) return null;

  const region = (displayLocationLabel && displayLocationLabel.trim()) || 'sua região';

  const actions: ConvertAction[] = [
    {
      key: 'lead',
      tone: 'emerald',
      Icon: BellRinging,
      title: 'Quero ser avisado',
      desc: 'Avisamos você quando a primeira loja abrir por aqui.',
      cta: 'Avise-me no WhatsApp',
      onClick: () =>
        window.open(buildLeadWhatsAppUrl(displayLocationLabel), '_blank', 'noopener,noreferrer'),
    },
    {
      key: 'destinos',
      tone: 'amber',
      Icon: Compass,
      title: 'Explorar destinos',
      desc: 'Chalés, pousadas e atrações perto de você.',
      cta: 'Ver destinos',
      onClick: () => navigate('/destinos'),
    },
    {
      key: 'condominio',
      tone: 'violet',
      Icon: Buildings,
      title: 'Tenho condomínio',
      desc: 'Traga o app pro seu prédio e destrave a operação local.',
      cta: 'Quero pro meu prédio',
      onClick: () => navigate('/condominio/solicitar'),
    },
  ];

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-[#336886]/12 bg-[linear-gradient(135deg,rgba(51,104,134,0.08)_0%,rgba(16,185,129,0.07)_100%)] shadow-[0_18px_40px_-34px_rgba(15,23,42,0.30)]">
      {/* Hero da marca (gradiente teal + foguete) */}
      <div className="flex items-center gap-3 bg-[linear-gradient(135deg,#336886,#0f766e)] px-4 py-3.5 text-white">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15">
          <RocketLaunch size={17} weight="fill" />
        </span>
        <div className="min-w-0">
          <p className="text-2xs font-black uppercase tracking-[0.18em] text-white/75">
            Sem lojas em {region}?
          </p>
          <p className="truncate text-sm font-black leading-tight">Sua região tá no radar do Jano 🚀</p>
        </div>
      </div>

      {/* 3 caminhos de conversão */}
      <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-3">
        {actions.map(({ key, tone, Icon, title, desc, cta, onClick }) => {
          const t = TONES[tone];
          return (
            <button
              key={key}
              type="button"
              onClick={onClick}
              className={`group flex h-full flex-col items-start gap-2 rounded-[1.25rem] border border-white/80 bg-white/90 p-3.5 text-left shadow-[0_14px_30px_-24px_rgba(15,23,42,0.30)] transition-all hover:-translate-y-0.5 active:scale-[0.99] ${t.ring}`}
            >
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-[0.85rem] ${t.chip} ${t.icon}`}>
                <Icon size={18} weight="duotone" />
              </span>
              <p className="text-[13px] font-black leading-tight text-slate-900">{title}</p>
              <p className="text-[11.5px] font-medium leading-snug text-slate-500">{desc}</p>
              <span
                className={`mt-auto inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.12em] ${t.cta}`}
              >
                {cta}
                <ArrowRight
                  size={12}
                  weight="bold"
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
});
