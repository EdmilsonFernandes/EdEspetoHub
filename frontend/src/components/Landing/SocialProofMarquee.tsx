import { resolveAssetUrl } from '../../utils/resolveAssetUrl';

export interface ClientLogo {
  id: string;
  name: string;
  logoUrl?: string | null;
  slug?: string;
}

const mockClientLogos: ClientLogo[] = [
  { id: 'mock-edsertaneja', name: 'edsertaneja', logoUrl: '/janocaminho.jpg' },
  { id: 'mock-cris', name: 'Espetinho da Cris', logoUrl: '/janocaminho.jpg' },
  { id: 'mock-teus', name: 'teus espetinhos', logoUrl: '/janocaminho.jpg' },
  { id: 'mock-villa', name: 'Villa Grill', logoUrl: '/janocaminho.jpg' },
  { id: 'mock-ranch', name: 'Ranch do Espeto', logoUrl: '/janocaminho.jpg' },
  { id: 'mock-boteco', name: 'Boteco 77', logoUrl: '/janocaminho.jpg' },
];

interface SocialProofMarqueeProps {
  clients?: ClientLogo[];
}

const getInitials = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'JC';

export function SocialProofMarquee({ clients = [] }: SocialProofMarqueeProps) {
  const items = clients.length > 0 ? clients : mockClientLogos;
  const trackItems = [...items, ...items];

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(145deg,#050b16_0%,#0f172a_50%,#111827_100%)] pb-8 sm:pb-10">
      <div className="max-w-7xl mx-auto px-4">
        <p className="text-center text-xs sm:text-sm uppercase tracking-widest text-slate-400">
          Confiado por quem vende todos os dias
        </p>

        <div className="relative mt-5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="client-marquee-track flex w-max items-center gap-3 sm:gap-4 py-1">
            {trackItems.map((client, index) => {
              const content = (
                <>
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-white/10">
                    {client.logoUrl ? (
                      <img
                        src={resolveAssetUrl(client.logoUrl)}
                        alt={client.name}
                        loading="lazy"
                        className="h-full w-full object-cover grayscale opacity-70 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100"
                      />
                    ) : (
                      <span className="text-[11px] font-black text-slate-200">{getInitials(client.name)}</span>
                    )}
                  </span>
                  <span className="max-w-[11rem] truncate text-sm font-medium text-slate-200">
                    {client.name}
                  </span>
                </>
              );

              return client.slug ? (
                <a
                  key={`${client.id}-${index}`}
                  href={`/${client.slug}`}
                  className="group inline-flex h-12 items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3.5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:bg-white/10"
                  aria-label={`Abrir catálogo da loja ${client.name}`}
                >
                  {content}
                </a>
              ) : (
                <div
                  key={`${client.id}-${index}`}
                  className="group inline-flex h-12 items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3.5 backdrop-blur-sm"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
