// @ts-nocheck
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, ArrowRight, Instagram, Twitter, ArrowUpRight } from 'lucide-react';

/**
 * /parceiros — Landing B2B "innovation" (dark editorial liquid-glass).
 *
 * Port fiel do template innovation (skill pack): preto absoluto, Instrument
 * Serif itálico nos destaques, liquid-glass locked, vídeos com crossfade loop.
 * O consumidor fica no light do hub; aqui é o pitch de parceria com cara de
 * estúdio premium.
 */

const EASE = [0.23, 1, 0.32, 1] as const;

const HERO_VIDEO =
  'https://plugin-assets.open-design.ai/plugins/innovation/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a-6993b9.mp4';
const FEATURED_VIDEO =
  'https://plugin-assets.open-design.ai/plugins/innovation/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8-eee511.mp4';
const PHILOSOPHY_VIDEO =
  'https://plugin-assets.open-design.ai/plugins/liquid-glass-agency/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8-b7258e.mp4';
const SERVICE_1_VIDEO =
  'https://plugin-assets.open-design.ai/plugins/innovation/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31-b2a357.mp4';
const SERVICE_2_VIDEO =
  'https://plugin-assets.open-design.ai/plugins/innovation/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4-c2f128.mp4';

/* ── Hero video crossfade loop (rAF, sem CSS transition — igual ao seed) ── */
function useHeroVideoLoop(ref: React.RefObject<HTMLVideoElement>) {
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let raf: number | null = null;

    const animate = (from: number, to: number, duration = 500) => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        video.style.opacity = String(from + (to - from) * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const onCanPlay = () => {
      video.play().catch(() => {});
      animate(0, 1);
    };
    const onTimeUpdate = () => {
      if (video.duration - video.currentTime <= 0.55) {
        animate(Number(video.style.opacity || 1), 0);
      }
    };
    const onEnded = () => {
      video.style.opacity = '0';
      setTimeout(() => {
        video.currentTime = 0;
        video.play().catch(() => {});
        animate(0, 1);
      }, 100);
    };

    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEnded);
    };
  }, [ref]);
}

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.8, delay, ease: EASE },
});

const revealSm = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.6, delay, ease: EASE },
});

const revealUp = (delay = 0) => ({
  initial: { opacity: 0, y: 60 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.9, delay, ease: EASE },
});

const revealLeft = () => ({
  initial: { opacity: 0, x: -40 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.8, ease: EASE },
});

const revealRight = () => ({
  initial: { opacity: 0, x: 40 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.8, ease: EASE },
});

export function PartnersPage() {
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  useHeroVideoLoop(heroVideoRef);

  useEffect(() => {
    document.title = 'Já no Caminho para Parceiros | Venda no seu bairro';
  }, []);

  return (
    <div className="partners-innovation min-h-screen overflow-x-hidden bg-black text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
        .partners-innovation .serif { font-family: 'Instrument Serif', serif; }
        .partners-innovation .serif-i { font-family: 'Instrument Serif', serif; font-style: italic; }
        .partners-innovation .liquid-glass {
          background: rgba(255, 255, 255, 0.01);
          background-blend-mode: luminosity;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          border: none;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
          position: relative;
          overflow: hidden;
        }
        .partners-innovation .liquid-glass::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1.4px;
          background: linear-gradient(180deg,
            rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
            rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
            rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .partners-innovation video { display: block; }
        .partners-innovation img { display: block; }
      `}</style>

      {/* ══════ SECTION 1 — HERO ══════ */}
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        <video
          ref={heroVideoRef}
          src={HERO_VIDEO}
          muted
          autoPlay
          playsInline
          preload="auto"
          className="absolute inset-0 z-0 h-full w-full object-cover object-bottom"
          style={{ opacity: 0 }}
        />

        {/* Navbar */}
        <nav className="relative z-20 px-6 py-6">
          <div className="liquid-glass mx-auto flex max-w-5xl items-center justify-between rounded-full px-6 py-3">
            <div className="flex items-center gap-3">
              <Globe className="h-6 w-6 text-white" />
              <span className="text-lg font-semibold text-white">Já no Caminho</span>
              <div className="ml-8 hidden items-center gap-8 md:flex">
                <a href="#como-funciona" className="text-sm font-medium text-white/80 transition-colors hover:text-white">Como funciona</a>
                <a href="#parceria" className="text-sm font-medium text-white/80 transition-colors hover:text-white">Parceria</a>
                <a href="#servicos" className="text-sm font-medium text-white/80 transition-colors hover:text-white">Serviços</a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/hub" className="hidden text-sm text-white sm:block">Explorar o app</Link>
              <Link to="/create" className="liquid-glass rounded-full px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-white/5">
                Criar minha loja
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex flex-1 -translate-y-[20%] flex-col items-center justify-center px-6 py-12 text-center">
          <h1 className="serif whitespace-nowrap text-7xl tracking-tight text-white md:text-8xl lg:text-9xl">
            Venda onde o <em className="serif-i">bairro</em> compra.
          </h1>

          <div className="mt-8 w-full max-w-xl">
            <form className="liquid-glass flex items-center gap-3 rounded-full py-2 pl-6 pr-2" onSubmit={(e) => { e.preventDefault(); window.location.href = '/create?plan=trial'; }}>
              <input
                type="email"
                required
                placeholder="Seu e-mail comercial"
                className="w-full bg-transparent text-white placeholder:text-white/40"
              />
              <button type="submit" aria-label="Quero vender" className="shrink-0 rounded-full bg-white p-3 text-black transition-transform hover:scale-105 active:scale-95">
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          </div>

          <p className="mt-6 px-4 text-sm leading-relaxed text-white">
            Cadastre sua loja e receba pedidos de entrega, retirada e mesa no mesmo app
            que o seu bairro já usa. Sem comissão por pedido — só a mensalidade do plano.
          </p>

          <a href="#como-funciona" className="liquid-glass mt-6 rounded-full px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5">
            Ver como funciona
          </a>
        </div>

        {/* Social */}
        <div className="relative z-10 flex justify-center gap-4 pb-12">
          <a href="https://instagram.com/janocaminho" target="_blank" rel="noreferrer" className="liquid-glass rounded-full p-4 text-white/80 transition-colors hover:bg-white/5 hover:text-white">
            <Instagram className="h-5 w-5" />
          </a>
          <a href="https://x.com/janocaminho" target="_blank" rel="noreferrer" className="liquid-glass rounded-full p-4 text-white/80 transition-colors hover:bg-white/5 hover:text-white">
            <Twitter className="h-5 w-5" />
          </a>
          <Link to="/hub" className="liquid-glass rounded-full p-4 text-white/80 transition-colors hover:bg-white/5 hover:text-white">
            <Globe className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* ══════ SECTION 2 — ABOUT ══════ */}
      <section id="como-funciona" className="overflow-hidden bg-black px-6 pb-10 pt-32 md:pb-14 md:pt-44">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[500px]"
          style={{ background: 'radial-gradient(ellipse at top, rgba(255,255,255,0.03) 0%, transparent 70%)' }}
        />
        <div className="mx-auto max-w-6xl">
          <motion.p {...revealSm()} className="text-sm uppercase tracking-widest text-white/40">
            Sobre a plataforma
          </motion.p>
          <motion.h2
            {...reveal(0.1)}
            className="mt-6 text-4xl leading-[1.1] tracking-tight text-white md:text-6xl lg:text-7xl"
          >
            Ferramentas de varejo para lojas que{' '}
            <em className="serif-i text-white/60">vivem do bairro</em>
            <br className="hidden md:block" />{' '}
            <em className="serif-i text-white/60">e crescem com ele.</em>
          </motion.h2>
        </div>
      </section>

      {/* ══════ SECTION 3 — FEATURED VIDEO ══════ */}
      <section className="overflow-hidden bg-black px-6 pb-20 pt-6 md:pb-32 md:pt-10">
        <div className="mx-auto max-w-6xl">
          <motion.div {...revealUp()} className="relative aspect-video overflow-hidden rounded-3xl">
            <video src={FEATURED_VIDEO} muted autoPlay loop playsInline preload="auto" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between md:p-10">
              <div className="liquid-glass max-w-md rounded-2xl p-6 md:p-8">
                <p className="mb-3 text-xs uppercase tracking-widest text-white/50">Como funciona</p>
                <p className="text-sm leading-relaxed text-white md:text-base">
                  Você cadastra a loja, sobe o cardápio com fotos e define horários e formas
                  de entrega. O pedido chega no seu celular com auto-impressão e payment
                  tracking — do Pix confirmado ao entregue na porta.
                </p>
              </div>
              <motion.a
                href="/create"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="liquid-glass shrink-0 rounded-full px-8 py-3 text-sm font-medium text-white"
              >
                Começar agora
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════ SECTION 4 — PHILOSOPHY ══════ */}
      <section id="parceria" className="overflow-hidden bg-black px-6 py-28 md:py-40">
        <div className="mx-auto max-w-6xl">
          <motion.h2 {...reveal()} className="serif mb-16 text-5xl tracking-tight text-white md:mb-24 md:text-7xl lg:text-8xl">
            Parceria <em className="serif-i text-white/40">×</em> Comissão Zero
          </motion.h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
            <motion.div {...revealLeft()} className="relative aspect-[4/3] overflow-hidden rounded-3xl">
              <video src={PHILOSOPHY_VIDEO} muted autoPlay loop playsInline preload="auto" className="h-full w-full object-cover" />
            </motion.div>
            <motion.div {...revealRight()} className="flex flex-col justify-center gap-8">
              <div>
                <p className="mb-4 text-xs uppercase tracking-widest text-white/40">Escolha o seu plano</p>
                <p className="text-base leading-relaxed text-white/70 md:text-lg">
                  Todos os planos incluem catálogo, pedidos, auto-impressão e tracking.
                  Comece no trial gratuito e faça upgrade quando o volume crescer —
                  nunca pagando comissão por pedido vendido.
                </p>
              </div>
              <div className="h-px w-full bg-white/10" />
              <div>
                <p className="mb-4 text-xs uppercase tracking-widest text-white/40">Cresça com o bairro</p>
                <p className="text-base leading-relaxed text-white/70 md:text-lg">
                  Feiras de condomínio, destinos regionais, mercados internos — a
                  plataforma conecta o seu negócio a contextos que nenhum delivery
                  tradicional alcança. Seu cliente já está aqui.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════ SECTION 5 — SERVICES ══════ */}
      <section id="servicos" className="overflow-hidden bg-black px-6 py-28 md:py-40">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.02) 0%, transparent 60%)' }}
        />
        <div className="mx-auto max-w-6xl">
          <motion.div {...revealSm(0)} className="mb-12 flex items-center justify-between">
            <h3 className="text-3xl tracking-tight text-white md:text-5xl">O que fazemos</h3>
            <span className="hidden text-sm text-white/40 sm:block">Nossos serviços</span>
          </motion.div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            {[
              {
                tag: 'Digital',
                title: 'Vitrine & Pedidos',
                desc: 'Catálogo com fotos, variações e adicionais. Pedidos de entrega, retirada, mesa e feira — tudo num painel que cabe no seu bolso.',
                video: SERVICE_1_VIDEO,
              },
              {
                tag: 'Operação',
                title: 'Pagamentos & Entregas',
                desc: 'Pix Mercado Pago que confirma sozinho, auto-impressão térmica, tracking em tempo real e integração com motoboys da região.',
                video: SERVICE_2_VIDEO,
              },
            ].map((card, index) => (
              <motion.a
                key={card.title}
                href="/create"
                {...revealUp(0.15 * index)}
                whileHover={{ scale: 1.01 }}
                className="liquid-glass group overflow-hidden rounded-3xl"
              >
                <div className="relative aspect-video overflow-hidden">
                  <video
                    src={card.video}
                    muted
                    autoPlay
                    loop
                    playsInline
                    preload="auto"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
                <div className="p-6 md:p-8">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-white/40">{card.tag}</span>
                    <span className="liquid-glass rounded-full p-2 text-white/70">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                  <h4 className="serif mb-3 text-xl tracking-tight text-white md:text-2xl">{card.title}</h4>
                  <p className="text-sm leading-relaxed text-white/50">{card.desc}</p>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Globe className="h-5 w-5 text-white/40" />
            <span className="text-sm font-semibold text-white/60">Já no Caminho</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <Link to="/" className="transition-colors hover:text-white">Landing</Link>
            <Link to="/hub" className="transition-colors hover:text-white">Explorar</Link>
            <Link to="/create" className="transition-colors hover:text-white">Quero vender</Link>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-white/20">
          Feito no interior, para o interior · Sem comissão por pedido
        </p>
      </footer>
    </div>
  );
}
