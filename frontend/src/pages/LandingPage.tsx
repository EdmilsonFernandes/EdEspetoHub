// @ts-nocheck
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Storefront,
  ForkKnife,
  Buildings,
  MapPin,
  CaretRight,
  Sparkle,
  Tent,
  ShoppingCart,
  Scooter,
  SealCheck,
  WhatsappLogo,
  PlayCircle,
  QrCode,
} from '@phosphor-icons/react';
import { Image } from '../components/common/Image';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';

/**
 * Landing CONSUMER — edição premium innovation + conteúdo real (22/08).
 *
 * Identidade JNC: light #E2EBF2, teal #336886, verde #5FD35A.
 * Innovation craft: Instrument Serif, scroll reveals, glass, staggered cards.
 * Conteúdo REAL que voltou: QR Play Store, tour em vídeo, logos de lojas
 * reais via API, cidades de destinos, "quem já está na plataforma".
 */

const EASE = [0.23, 1, 0.32, 1] as const;
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.janocaminho.app';
const GOOGLE_PLAY_QR = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(GOOGLE_PLAY_URL)}`;
const TOUR_VIDEO_ID = 'HtU1t1zp43I';
const TOUR_VIDEO_EMBED = `https://www.youtube-nocookie.com/embed/${TOUR_VIDEO_ID}?rel=0`;

const WHAT_YOU_CAN_DO = [
  { icon: ForkKnife, title: 'Restaurantes e lanches', text: 'Escolha, peça e acompanhe até a porta — ou retire na hora.' },
  { icon: ShoppingCart, title: 'Mercados e comércio', text: 'Adega, hortifruti, farmácia e o brechó da vizinha.' },
  { icon: Buildings, title: 'Seu condomínio', text: 'Vendedores moradores, feiras e entrega no bloco.' },
  { icon: MapPin, title: 'Destinos por perto', text: 'Chalés, pousadas e experiências para o fim de semana.' },
];

const STEPS = [
  { icon: MapPin, title: 'Abra e veja perto de você', text: 'Sem cadastro pra explorar: as lojas da sua região aparecem na hora.' },
  { icon: Storefront, title: 'Escolha e peça', text: 'Delivery, retirada, mesa ou feira do condomínio — Pix, cartão ou dinheiro.' },
  { icon: SealCheck, title: 'Acompanhe tudo', text: 'Status em tempo real, Pix que confirma sozinho e ajuda a um toque.' },
];

const DESTINATION_CITIES = [
  { name: 'Santo Antônio do Pinhal', state: 'SP', slug: 'santo-antonio-do-pinhal' },
  { name: 'Campos do Jordão', state: 'SP', slug: 'campos-do-jordao' },
  { name: 'Gonçalves', state: 'MG', slug: 'goncalves' },
  { name: 'Monte Verde', state: 'MG', slug: 'monte-verde' },
];

/* ── Filtra lojas de teste/duplicadas, prioriza quem tem logo ── */
const isRealStore = (store: any) => {
  const name = String(store?.name || '').toLowerCase().trim();
  return !name.includes('teste') && !name.includes('test ') && name !== 'test' && name.length > 2;
};

/* ── Motion ── */
const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.8, delay, ease: EASE },
});
const revealSm = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, delay, ease: EASE },
});
const heroIn = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: EASE },
});

export function LandingPage() {
  const [featuredStores, setFeaturedStores] = useState<any[]>([]);
  const [showVideo, setShowVideo] = useState(false);
  const [destinationPhotos, setDestinationPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = 'Já no Caminho — Peça, retire e descubra perto de você';
  }, []);

  useEffect(() => {
    let mounted = true;
    // Lojas reais: dedup por slug + sem testes + prioriza quem tem logo
    import('../services/storeService')
      .then(({ storeService }) => storeService.listPortfolio())
      .then((data: any) => {
        if (!mounted) return;
        const seen = new Set<string>();
        const normalized = (Array.isArray(data) ? data : [])
          .filter(isRealStore)
          .filter((store: any) => {
            const slug = String(store?.slug || '').trim();
            if (!slug || seen.has(slug)) return false;
            seen.add(slug);
            return true;
          })
          .map((store: any, i: number) => ({
            id: String(store?.id || store?.slug || `store-${i}`),
            name: String(store?.name || 'Loja ativa'),
            slug: String(store?.slug || ''),
            logoUrl: resolveAssetUrl(store?.settings?.logoUrl || '') || '',
            bannerUrl: resolveAssetUrl(store?.settings?.bannerUrl || '') || '',
          }))
          .filter((s: any) => Boolean(s.slug));
        // Prioriza quem tem logo; quem não tem, usa banner; último recurso: avatar
        const withMedia = normalized.filter((s: any) => s.logoUrl || s.bannerUrl);
        const withoutMedia = normalized.filter((s: any) => !s.logoUrl && !s.bannerUrl);
        setFeaturedStores([...withMedia, ...withoutMedia].slice(0, 14));
      })
      .catch(() => { if (mounted) setFeaturedStores([]); });
    return () => { mounted = false; };
  }, []);

  // Banners reais dos destinos (fotos das cidades)
  useEffect(() => {
    let mounted = true;
    import('../services/destinationService')
      .then(({ destinationService }) => destinationService.listPublic())
      .then((data: any) => {
        if (!mounted || !Array.isArray(data)) return;
        const photos: Record<string, string> = {};
        for (const dest of data) {
          const slug = String(dest?.slug || '');
          const banners = Array.isArray(dest?.banners) ? dest.banners : [];
          const first = banners.find((b: any) => b?.imageUrl);
          if (slug && first?.imageUrl) photos[slug] = resolveAssetUrl(first.imageUrl);
        }
        setDestinationPhotos(photos);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-[#E2EBF2] text-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
        .jnc-serif-i { font-family: 'Instrument Serif', serif; font-style: italic; letter-spacing: -0.01em; }
        .jnc-glass {
          background: rgba(255,255,255,0.45);
          backdrop-filter: blur(12px) saturate(1.3);
          -webkit-backdrop-filter: blur(12px) saturate(1.3);
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 8px 24px -12px rgba(51,104,134,0.15);
        }
      `}</style>

      {/* ── Navbar ── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="sticky top-0 z-40 border-b border-white/30 bg-white/60 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/hub" className="flex items-center gap-2.5">
            <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-9 w-9 rounded-xl object-cover ring-1 ring-white" />
            <span className="text-[15px] font-black tracking-[-0.02em] text-slate-950">Já no Caminho</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 sm:flex">
            <a href="#descobrir" className="transition-colors hover:text-[#336886]">Descobrir</a>
            <a href="#seu-bairro" className="transition-colors hover:text-[#336886]">Seu bairro</a>
            <a href="#app" className="transition-colors hover:text-[#336886]">Baixar o app</a>
          </nav>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link to="/hub" className="jnc-glass inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl px-4 text-sm font-black text-[#153A4C]">
              Entrar no app
              <CaretRight size={13} weight="bold" />
            </Link>
          </motion.div>
        </div>
      </motion.header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:pt-20">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#336886]/10 blur-[110px]" />
        <div className="pointer-events-none absolute -left-20 top-40 h-64 w-64 rounded-full bg-[#5fd35a]/8 blur-[100px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <motion.div {...heroIn(0)}>
              <span className="jnc-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-[#336886]">
                <Sparkle size={12} weight="fill" className="text-[#5fd35a]" />
                O app do que está perto de você
              </span>
            </motion.div>
            <motion.h1 {...heroIn(0.1)} className="mt-5 text-4xl font-black leading-[1.05] tracking-[-0.035em] text-slate-950 sm:text-5xl lg:text-6xl">
              O seu bairro tem mais <em className="jnc-serif-i text-[#336886]">sabor</em> do que você imagina.
            </motion.h1>
            <motion.p {...heroIn(0.2)} className="mt-5 max-w-md text-base font-semibold leading-relaxed text-slate-600 sm:text-lg">
              Restaurantes, mercados e vendedores do seu condomínio — entrega, retirada e feiras num só app.
            </motion.p>
            <motion.div {...heroIn(0.3)} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link to="/hub" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#336886] px-6 py-3.5 text-base font-black text-white shadow-[0_16px_32px_-16px_rgba(51,104,134,0.65)] transition-all hover:brightness-105">
                  Ver o que tem perto
                  <CaretRight size={16} weight="bold" />
                </Link>
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowVideo(true)}
                className="jnc-glass inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-bold text-[#336886]"
              >
                <PlayCircle size={20} weight="fill" />
                Ver o tour
              </motion.button>
            </motion.div>
            <motion.p {...heroIn(0.4)} className="mt-4 text-xs font-semibold text-slate-500">
              Grátis pra pedir · Sem cadastro pra explorar · Pix, cartão ou dinheiro
            </motion.p>
          </div>

          {/* Cards do produto */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
            className="relative mx-auto w-full max-w-sm lg:max-w-none"
          >
            <div className="jnc-glass rounded-3xl p-4">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.4, ease: EASE }} className="jnc-glass flex items-center gap-2 rounded-2xl px-3.5 py-3">
                {featuredStores[0]?.logoUrl || featuredStores[0]?.bannerUrl ? (
                  <span className="h-9 w-9 shrink-0 overflow-hidden rounded-xl">
                    <img src={featuredStores[0].logoUrl || featuredStores[0].bannerUrl} alt={featuredStores[0].name} className="h-full w-full object-cover" />
                  </span>
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#edf5fa] text-[#336886]"><Storefront size={17} weight="duotone" /></span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-950">{featuredStores[0]?.name || 'Sua loja favorita'}</p>
                  <p className="text-xs font-semibold text-emerald-600">Aberto agora · entrega e retirada</p>
                </div>
                <span className="rounded-full bg-[#336886] px-3 py-1.5 text-xs font-black text-white">Pedir</span>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.55, ease: EASE }} className="mt-3">
                <div className="jnc-glass flex items-center gap-3 rounded-2xl p-3">
                  <img src="/janocaminho.jpg" alt="" className="h-14 w-14 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.08em] text-[#336886]"><Tent size={12} weight="fill" className="text-[#5fd35a]" /> Feira do condomínio</p>
                    <p className="mt-0.5 text-sm font-black text-slate-950">Quinta, no salão de festas</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#5fd35a] px-2.5 py-1 text-xs font-black text-[#153a4c]"><span className="h-1.5 w-1.5 rounded-full bg-[#153a4c]" /> ao vivo</span>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.7, ease: EASE }} className="mt-3 flex items-center gap-3 rounded-2xl border border-white/50 bg-white/80 p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf5fa] text-[#336886]"><Scooter size={18} weight="duotone" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-950">Seu pedido saiu pra entrega</p>
                  <p className="text-xs font-semibold text-slate-500">Chega em ~15 min · Pix confirmado</p>
                </div>
                <SealCheck size={18} weight="fill" className="shrink-0 text-[#5fd35a]" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Quem já está na plataforma (marquee dentro do container) ── */}
      {featuredStores.length > 0 && (
        <motion.section {...revealSm()} className="px-4 py-8">
          <div className="mx-auto max-w-6xl">
            <p className="mb-4 text-center text-xs font-black uppercase tracking-[0.18em] text-[#336886]">
              Quem já está na plataforma
            </p>
            <div
              className="relative rounded-[1.75rem] border border-white/50 bg-white/55 py-4 shadow-[0_14px_36px_-24px_rgba(15,23,42,0.12)] backdrop-blur-sm"
            >
              <div
                className="overflow-hidden rounded-[1.5rem]"
                style={{
                  maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
                }}
              >
                <div
                  className="flex w-max items-center gap-5 px-4 [animation:marquee_30s_linear_infinite] hover:[animation-play-state:paused]"
                >
                  <style>{`
                    @keyframes marquee {
                      from { transform: translateX(0); }
                      to { transform: translateX(calc(-50% - 20px)); }
                    }
                  `}</style>
                  {[...featuredStores, ...featuredStores].map((store, i) => (
                    <Link key={`${store.id}-${i}`} to={`/${store.slug}`} className="group flex shrink-0 flex-col items-center gap-1.5">
                      <span className="grid h-[4.5rem] w-[4.5rem] place-items-center overflow-hidden rounded-2xl border border-white/60 bg-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:ring-2 group-hover:ring-[#336886]/25">
                        {store.logoUrl || store.bannerUrl ? (
                          <img src={store.logoUrl || store.bannerUrl} alt={store.name} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <Storefront size={24} weight="duotone" className="text-[#336886]/40" />
                        )}
                      </span>
                      <span className="max-w-[76px] truncate text-[10px] font-bold text-slate-500 group-hover:text-[#33688886]">{store.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* ── O que dá pra fazer ── */}
      <section id="descobrir" className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <motion.div {...revealSm()}>
            <p className="text-center text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Descubra perto de você</p>
            <h2 className="mx-auto mt-2 max-w-lg text-center text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">
              Um app, tudo que existe na sua <em className="jnc-serif-i text-[#153A4C]/60">região</em>
            </h2>
          </motion.div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHAT_YOU_CAN_DO.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.title} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.8, delay: index * 0.12, ease: EASE }} whileHover={{ scale: 1.02, y: -4 }} className="jnc-glass group rounded-3xl p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#edf5fa] text-[#336886] transition-transform duration-300 group-hover:scale-110"><Icon size={20} weight="duotone" /></span>
                  <h3 className="mt-3.5 text-[15px] font-black tracking-[-0.02em] text-slate-950">{item.title}</h3>
                  <p className="mt-1.5 text-sm font-semibold leading-relaxed text-slate-500">{item.text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Seu bairro ── */}
      <section id="seu-bairro" className="px-4 py-14">
        <motion.div initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.9, ease: EASE }} className="mx-auto grid max-w-6xl items-center gap-8 rounded-[2rem] border border-white/50 bg-[linear-gradient(135deg,#ffffff_0%,#f0f7fa_100%)] p-6 shadow-[0_24px_64px_-32px_rgba(15,23,42,0.18)] sm:p-10 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#336886]"><Buildings size={13} weight="duotone" /> Seu bairro</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">A feira chegou no seu <em className="jnc-serif-i text-[#153A4C]/60">condomínio</em>.</h2>
            <p className="mt-3 max-w-md text-base font-semibold leading-relaxed text-slate-600">Vizinhos que vendem, pequenos mercados internos e feiras no salão de festas — com entrega no bloco ou retirada na portaria. Só o Já no Caminho faz isso.</p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="mt-7 inline-block">
              <Link to="/hub" className="inline-flex items-center gap-2 rounded-2xl bg-[#336886] px-5 py-3 text-sm font-black text-white shadow-[0_12px_26px_-14px_rgba(51,104,134,0.6)] transition-all">
                Ver o meu condomínio
                <CaretRight size={13} weight="bold" />
              </Link>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.8, delay: 0.2, ease: EASE }} className="jnc-glass overflow-hidden rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-slate-950">Feira de quinta</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5fd35a] px-2.5 py-1 text-xs font-black text-[#153a4c]">
                <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#153a4c] opacity-60" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#153a4c]" /></span>
                Ao vivo
              </span>
            </div>
            <div className="mt-4 space-y-2.5">
              {['Espetinho da Dona Marta', 'Geleia artesanal', 'Pão de queijo do 12º andar'].map((item, i) => (
                <motion.div key={item} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 + i * 0.12, ease: EASE }} className="jnc-glass flex items-center justify-between rounded-xl px-3.5 py-2.5">
                  <span className="text-sm font-bold text-slate-800">{item}</span>
                  <span className="jnc-glass rounded-full px-2.5 py-1 text-xs font-black text-[#336886]">Pedir</span>
                </motion.div>
              ))}
            </div>
            <p className="mt-4 text-xs font-semibold text-slate-500">Retirada no salão · ou entrega no seu bloco</p>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Destinos (cidades reais) ── */}
      <section className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <motion.div {...revealSm()} className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#336886]"><MapPin size={13} weight="duotone" /> Seu bairro · explorar</p>
              <h2 className="mt-2 max-w-md text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">
                E quando a fome bate <em className="jnc-serif-i text-[#153A4C]/60">longe de casa?</em>
              </h2>
              <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600">
                Viajou, achou o destino, descobriu onde comer — e pediu por lá mesmo.
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/destinos" className="jnc-glass inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-black text-[#336886]">
                Ver todos os destinos
                <CaretRight size={12} weight="bold" />
              </Link>
            </motion.div>
          </motion.div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DESTINATION_CITIES.map((city, i) => {
              const photo = destinationPhotos[city.slug];
              return (
                <motion.div key={city.slug} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }} whileHover={{ scale: 1.03 }}>
                  <Link to={`/destinos/${city.slug}`} className="group relative block aspect-[4/3] overflow-hidden rounded-2xl border border-white/50 shadow-sm">
                    {photo ? (
                      <img src={photo} alt={city.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#edf5fa,#d7e7ef)]">
                        <MapPin size={24} weight="duotone" className="text-[#336886]/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(21,58,76,0.75)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 p-2.5">
                      <p className="truncate text-[12px] font-black text-white">{city.name}</p>
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/60">{city.state}</p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Como funciona (com vídeo) ── */}
      <section className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <motion.h2 {...revealSm()} className="text-center text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">
            Como <em className="jnc-serif-i text-[#153A4C]/60">funciona</em>
          </motion.h2>
          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.title} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.8, delay: index * 0.15, ease: EASE }} whileHover={{ scale: 1.02 }} className="jnc-glass relative rounded-3xl p-6">
                  <span className="absolute right-5 top-5 font-serif text-2xl font-black text-[#d7e7ef]">{index + 1}</span>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#edf5fa] text-[#336886]"><Icon size={20} weight="duotone" /></span>
                  <h3 className="mt-3.5 text-[15px] font-black tracking-[-0.02em] text-slate-950">{step.title}</h3>
                  <p className="mt-1.5 text-sm font-semibold leading-relaxed text-slate-500">{step.text}</p>
                </motion.div>
              );
            })}
          </div>
          {/* Tour em vídeo — thumbnail REAL do YouTube */}
          <motion.div initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.9, ease: EASE }} className="mx-auto mt-10 max-w-3xl">
            <button type="button" onClick={() => setShowVideo(true)} className="group relative aspect-video w-full overflow-hidden rounded-3xl border border-white/50 shadow-[0_24px_56px_-28px_rgba(15,23,42,0.35)]">
              <img
                src={`https://img.youtube.com/vi/${TOUR_VIDEO_ID}/maxresdefault.jpg`}
                alt="Tour do Já no Caminho"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${TOUR_VIDEO_ID}/hqdefault.jpg`; }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(21,58,76,0.1)_0%,rgba(21,58,76,0.5)_100%)]" />
              <div className="absolute inset-0 grid place-items-center">
                <motion.div whileHover={{ scale: 1.12 }} className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-white/90 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.4)] ring-4 ring-white/30 transition-transform">
                  <PlayCircle size={32} weight="fill" className="text-[#336886]" />
                </motion.div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Tour completo</p>
                  <p className="text-sm font-black text-white">Veja o Já no Caminho em ação</p>
                </div>
                <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-black text-[#153A4C] shadow-sm">▶ Assistir</span>
              </div>
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Baixar o app + integrações ── */}
      <section id="app" className="px-4 py-14">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.8, ease: EASE }} className="mx-auto max-w-4xl">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            {/* QR + Download */}
            <div className="jnc-glass flex flex-col items-center gap-5 rounded-[2rem] p-6 text-center sm:flex-row sm:text-left">
              <div className="shrink-0 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-slate-200">
                <img src={GOOGLE_PLAY_QR} alt="QR Code Google Play" className="h-28 w-28 sm:h-32 sm:w-32" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Google Play Store</p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">Baixe o app no seu Android</h3>
                <p className="mt-1.5 text-sm font-semibold leading-relaxed text-slate-500">
                  Escaneie o QR Code ou toque no badge oficial.
                </p>
                <motion.a
                  href={GOOGLE_PLAY_URL}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="mt-3 inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm transition-all hover:shadow"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                    <path fill="#EA4335" d="M3.6 1.8l10.4 10.2L3.6 22.2c-.4-.2-.6-.7-.6-1.3V3.1c0-.6.2-1.1.6-1.3z"/>
                    <path fill="#FBBC04" d="M17.3 8.3l-3.3 3.7-10-9.9c.2-.1.5-.2.8-.1l12.5 6.3z"/>
                    <path fill="#4285F4" d="M21.8 12c0 .5-.3 1-.7 1.2l-3.8 2.1-3.4-3.3 3.4-3.4 3.8 2.1c.4.3.7.7.7 1.3z"/>
                    <path fill="#34A853" d="M17.3 15.7L4.8 22c-.3.1-.6 0-.8-.1l10-9.9 3.3 3.7z"/>
                  </svg>
                  <span className="flex flex-col leading-none">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Get it on</span>
                    <span className="text-sm font-black text-slate-900">Google Play</span>
                  </span>
                </motion.a>
              </div>
            </div>
            {/* Mercado Pago */}
            <div className="jnc-glass flex flex-col items-center justify-center gap-2 rounded-[2rem] px-6 py-5 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Pagamentos por</p>
              <img src="/mercado-pago-horizontal.png" alt="Mercado Pago" className="h-7 w-auto object-contain" />
              <p className="text-[11px] font-semibold text-slate-500">Pix, crédito e débito com confirmação automática</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-4 pb-16 pt-6">
        <motion.div initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.9, ease: EASE }} className="relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#153a4c_0%,#336886_100%)] px-6 py-12 text-center shadow-[0_32px_72px_-32px_rgba(21,58,76,0.5)] sm:px-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#5fd35a]/15 blur-[90px]" />
          <h2 className="relative text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">
            O que está perto de você está <em className="jnc-serif-i text-[#5fd35a]">esperando</em>.
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed text-white/85 sm:text-base">
            Abra o app, veja as lojas da sua região e faça seu primeiro pedido hoje.
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative mt-7 inline-block">
            <Link to="/hub" className="inline-flex items-center gap-2 rounded-2xl bg-[#5fd35a] px-7 py-3.5 text-base font-black text-[#153a4c] shadow-[0_16px_32px_-14px_rgba(95,211,90,0.7)]">
              Ver o que tem perto
              <CaretRight size={16} weight="bold" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer completo ── */}
      <footer className="border-t border-white/30 bg-[#153A4C] px-4 pb-6 pt-10 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 sm:grid-cols-3">
            {/* Marca */}
            <div>
              <div className="flex items-center gap-2.5">
                <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-9 w-9 rounded-xl object-cover ring-1 ring-white/20" />
                <div>
                  <p className="text-sm font-black text-white">Já no Caminho</p>
                  <p className="text-[10px] font-bold text-white/50">Peça, retire e descubra perto de você</p>
                </div>
              </div>
              <p className="mt-3 text-xs font-semibold leading-relaxed text-white/50">
                Feito no interior, para o interior. Comida, comércio local, feiras de condomínio
                e destinos turísticos da sua região num só app.
              </p>
            </div>
            {/* Links */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Plataforma</p>
              <Link to="/hub" className="text-sm font-bold text-white/70 transition-colors hover:text-white">Explorar lojas</Link>
              <Link to="/destinos" className="text-sm font-bold text-white/70 transition-colors hover:text-white">Destinos</Link>
              <Link to="/parceiros" className="text-sm font-bold text-white/70 transition-colors hover:text-white">Quero vender</Link>
              <Link to="/cliente?mode=login" className="text-sm font-bold text-white/70 transition-colors hover:text-white">Minha conta</Link>
            </div>
            {/* Integrações + confiança */}
            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Integrações</p>
              <div className="flex items-center gap-3">
                <img src="/mercado-pago-horizontal.png" alt="Mercado Pago" className="h-5 w-auto object-contain brightness-0 invert" />
              </div>
              <p className="text-[11px] font-semibold text-white/40">
                Pagamentos processados com confirmação automática via Mercado Pago.
              </p>
              <a href={GOOGLE_PLAY_URL} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 transition hover:bg-white/10">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path fill="#EA4335" d="M3.6 1.8l10.4 10.2L3.6 22.2c-.4-.2-.6-.7-.6-1.3V3.1c0-.6.2-1.1.6-1.3z"/><path fill="#FBBC04" d="M17.3 8.3l-3.3 3.7-10-9.9c.2-.1.5-.2.8-.1l12.5 6.3z"/><path fill="#4285F4" d="M21.8 12c0 .5-.3 1-.7 1.2l-3.8 2.1-3.4-3.3 3.4-3.4 3.8 2.1c.4.3.7.7.7 1.3z"/><path fill="#34A853" d="M17.3 15.7L4.8 22c-.3.1-.6 0-.8-.1l10-9.9 3.3 3.7z"/></svg>
                <span className="text-[11px] font-bold text-white/70">Google Play</span>
              </a>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row">
            <p className="text-[11px] font-semibold text-white/40">
              © {new Date().getFullYear()} Já no Caminho · Todos os direitos reservados
            </p>
            <div className="flex items-center gap-4 text-[11px] font-bold text-white/40">
              <a href="/terms" className="transition-colors hover:text-white/70">Termos de Uso</a>
              <a href="/privacidade" className="transition-colors hover:text-white/70">Privacidade</a>
              <a href="/lgpd" className="transition-colors hover:text-white/70">LGPD</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Modal do vídeo ── */}
      {showVideo && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={() => setShowVideo(false)}>
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setShowVideo(false)} className="absolute -top-10 right-0 text-sm font-black text-white/80 hover:text-white">
              Fechar ✕
            </button>
            <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl">
              <iframe
                src={TOUR_VIDEO_EMBED}
                title="Tour Já no Caminho"
                className="h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
