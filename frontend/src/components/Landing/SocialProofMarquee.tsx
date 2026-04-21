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
    <section className="relative overflow-hidden bg-[linear-gradient(160deg,#050b16_0%,#0f172a_55%,#111827_100%)] py-12 sm:py-14 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center space-y-2 mb-6">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] text-slate-400 font-bold">
            Portfólio ativo
          </p>
          <h3 className="text-lg sm:text-2xl font-black text-white">Lojas que já operam com a plataforma</h3>
        </div>

        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="client-marquee-track flex w-max items-stretch gap-4 sm:gap-5 py-1">
            {trackItems.map((client, index) => {
              const content = (
                <>
                  <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-inner">
                    {client.logoUrl ? (
                      <img
                        src={resolveAssetUrl(client.logoUrl)}
                        alt={client.name}
                        loading="lazy"
                        className="h-full w-full object-cover opacity-90 transition-all duration-300 group-hover:opacity-100 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <span className="text-[11px] font-black text-slate-200">{getInitials(client.name)}</span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="max-w-[10rem] truncate text-sm font-bold text-white">{client.name}</span>
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    </span>
                    <span className="mt-0.5 block text-[10px] uppercase tracking-[0.16em] text-slate-400">Loja online</span>
                  </span>
                  <span className="ml-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-200 group-hover:bg-white/10">
                    Ver loja
                  </span>
                </>
              );

              return client.slug ? (
                <a
                  key={`${client.id}-${index}`}
                  href={`/${client.slug}`}
                  className="group inline-flex min-h-[72px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm transition-all duration-300 hover:scale-[1.015] hover:border-white/20 hover:bg-white/[0.08] hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.9)]"
                  aria-label={`Abrir catálogo da loja ${client.name}`}
                >
                  {content}
                </a>
              ) : (
                <div
                  key={`${client.id}-${index}`}
                  className="group inline-flex min-h-[72px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm"
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

