// @ts-nocheck
import { useEffect } from 'react';
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
} from '@phosphor-icons/react';

/**
 * Landing CONSUMER — edição premium (innovation, 22/08).
 *
 * Identidade JNC intacta: light #E2EBF2, teal #336886, verde #5FD35A,
 * navy #153A4C. O que vem do innovation: Instrument Serif itálico nos
 * destaques, scroll reveals com ease cinematográfico (0.23,1,0.32,1),
 * glass pills adaptados pra claro, staggered cards, hover scale nos CTAs.
 */

const EASE = [0.23, 1, 0.32, 1] as const;

const WHAT_YOU_CAN_DO = [
  {
    icon: ForkKnife,
    title: 'Restaurantes e lanches',
    text: 'Escolha, peça e acompanhe até a porta — ou retire na hora.',
  },
  {
    icon: ShoppingCart,
    title: 'Mercados e comércio',
    text: 'Adega, hortifruti, farmácia e o brechó da vizinha.',
  },
  {
    icon: Buildings,
    title: 'Seu condomínio',
    text: 'Vendedores moradores, feiras e entrega no bloco.',
  },
  {
    icon: MapPin,
    title: 'Destinos por perto',
    text: 'Chalés, pousadas e experiências para o fim de semana.',
  },
];

const STEPS = [
  { icon: MapPin, title: 'Abra e veja perto de você', text: 'Sem cadastro pra explorar: as lojas da sua região aparecem na hora.' },
  { icon: Storefront, title: 'Escolha e peça', text: 'Delivery, retirada, mesa ou feira do condomínio — Pix, cartão ou dinheiro.' },
  { icon: SealCheck, title: 'Acompanhe tudo', text: 'Status em tempo real, Pix que confirma sozinho e ajuda a um toque.' },
];

/* ── Motion variants ── */
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

const heroEntrance = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: EASE },
});

export function LandingPage() {
  useEffect(() => {
    document.title = 'Já no Caminho — Peça, retire e descubra perto de você';
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-[#E2EBF2] text-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
        .jnc-serif-i { font-family: 'Instrument Serif', serif; font-style: italic; letter-spacing: -0.01em; }
        .jnc-glass {
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(12px) saturate(1.3);
          -webkit-backdrop-filter: blur(12px) saturate(1.3);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 8px 24px -12px rgba(51,104,134,0.15);
        }
      `}</style>

      {/* ── Navbar glass ── */}
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
            <a href="#como-funciona" className="transition-colors hover:text-[#336886]">Como funciona</a>
          </nav>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="/hub"
              className="jnc-glass inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl px-4 text-sm font-black text-[#153A4C]"
            >
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
            <motion.div {...heroEntrance(0)}>
              <span className="jnc-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-[#336886]">
                <Sparkle size={12} weight="fill" className="text-[#5fd35a]" />
                O app do que está perto de você
              </span>
            </motion.div>
            <motion.h1
              {...heroEntrance(0.1)}
              className="mt-5 text-4xl font-black leading-[1.05] tracking-[-0.035em] text-slate-950 sm:text-5xl lg:text-6xl"
            >
              O seu bairro tem mais{' '}
              <em className="jnc-serif-i text-[#336886]">sabor</em> do que você imagina.
            </motion.h1>
            <motion.p
              {...heroEntrance(0.2)}
              className="mt-5 max-w-md text-base font-semibold leading-relaxed text-slate-600 sm:text-lg"
            >
              Restaurantes, mercados e vendedores do seu condomínio — entrega, retirada e feiras num só app.
            </motion.p>
            <motion.div {...heroEntrance(0.3)} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/hub"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#336886] px-6 py-3.5 text-base font-black text-white shadow-[0_16px_32px_-16px_rgba(51,104,134,0.65)] transition-all hover:brightness-105 active:scale-[0.98]"
                >
                  Ver o que tem perto
                  <CaretRight size={16} weight="bold" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/cliente?mode=login"
                  className="jnc-glass inline-flex items-center justify-center rounded-2xl px-6 py-3.5 text-base font-bold text-[#336886]"
                >
                  Já tenho conta
                </Link>
              </motion.div>
            </motion.div>
            <motion.p {...heroEntrance(0.4)} className="mt-4 text-xs font-semibold text-slate-500">
              Grátis pra pedir · Sem cadastro pra explorar · Pix, cartão ou dinheiro
            </motion.p>
          </div>

          {/* Composição de produto: cards reais do hub */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
            className="relative mx-auto w-full max-w-sm lg:max-w-none"
          >
            <div className="jnc-glass rounded-3xl p-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
                className="jnc-glass flex items-center gap-2 rounded-2xl px-3.5 py-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#edf5fa] text-[#336886]">
                  <Storefront size={17} weight="duotone" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-950">Gustavão Espetos</p>
                  <p className="text-xs font-semibold text-emerald-600">Aberto agora · entrega e retirada</p>
                </div>
                <span className="rounded-full bg-[#336886] px-3 py-1.5 text-xs font-black text-white">Pedir</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.55, ease: EASE }}
                className="mt-3 overflow-hidden rounded-2xl"
              >
                <div className="jnc-glass flex items-center gap-3 p-3">
                  <img src="/janocaminho.jpg" alt="" className="h-14 w-14 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.08em] text-[#336886]">
                      <Tent size={12} weight="fill" className="text-[#5fd35a]" /> Feira do condomínio
                    </p>
                    <p className="mt-0.5 text-sm font-black text-slate-950">Quinta, no salão de festas</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#5fd35a] px-2.5 py-1 text-xs font-black text-[#153a4c]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#153a4c]" /> ao vivo
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.7, ease: EASE }}
                className="mt-3 flex items-center gap-3 rounded-2xl border border-white/50 bg-white/80 p-3"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf5fa] text-[#336886]">
                  <Scooter size={18} weight="duotone" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-950">Seu pedido saiu pra entrega</p>
                  <p className="text-xs font-semibold text-slate-500">Chega em ~15 min · Pix confirmado</p>
                </div>
                <SealCheck size={18} weight="fill" className="shrink-0 text-[#5fd35a]" />
              </motion.div>
            </div>
            <motion.div
              initial={{ opacity: 0, rotate: 2, y: 20 }}
              animate={{ opacity: 1, rotate: 2, y: 0 }}
              transition={{ duration: 0.7, delay: 0.85, ease: EASE }}
              className="jnc-glass absolute -bottom-5 -right-3 hidden rounded-2xl px-4 py-2.5 sm:block"
            >
              <p className="text-xs font-black text-[#336886]">Do lanche de quinta…</p>
              <p className="text-xs font-bold text-slate-500">à escapada no chalé ✦</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

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
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.8, delay: index * 0.12, ease: EASE }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className="jnc-glass group rounded-3xl p-5"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#edf5fa] text-[#336886] transition-transform duration-300 group-hover:scale-110">
                    <Icon size={20} weight="duotone" />
                  </span>
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
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: EASE }}
          className="mx-auto grid max-w-6xl items-center gap-8 rounded-[2rem] border border-white/50 bg-[linear-gradient(135deg,#ffffff_0%,#f0f7fa_100%)] p-6 shadow-[0_24px_64px_-32px_rgba(15,23,42,0.18)] sm:p-10 lg:grid-cols-2"
        >
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#336886]">
              <Buildings size={13} weight="duotone" /> Seu bairro
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">
              A feira chegou no seu <em className="jnc-serif-i text-[#153A4C]/60">condomínio</em>.
            </h2>
            <p className="mt-3 max-w-md text-base font-semibold leading-relaxed text-slate-600">
              Vizinhos que vendem, pequenos mercados internos e feiras no salão de festas — com entrega no bloco ou retirada na portaria. Só o Já no Caminho faz isso.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                'Vendedores moradores com entrega dentro do condomínio',
                'Feiras com data, horário e pedidos antecipados',
                'Retirada combinada (bloco B, portaria 2…)',
              ].map((line, i) => (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.1, ease: EASE }}
                  className="flex items-start gap-2.5 text-sm font-bold text-slate-700"
                >
                  <SealCheck size={16} weight="fill" className="mt-0.5 shrink-0 text-[#5fd35a]" />
                  {line}
                </motion.li>
              ))}
            </ul>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="mt-7 inline-block">
              <Link
                to="/hub"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#336886] px-5 py-3 text-sm font-black text-white shadow-[0_12px_26px_-14px_rgba(51,104,134,0.6)] transition-all hover:brightness-105 active:scale-[0.98]"
              >
                Ver o meu condomínio
                <CaretRight size={13} weight="bold" />
              </Link>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
            className="jnc-glass overflow-hidden rounded-3xl p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-slate-950">Feira de quinta</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5fd35a] px-2.5 py-1 text-xs font-black text-[#153a4c]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#153a4c] opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#153a4c]" />
                </span>
                Ao vivo
              </span>
            </div>
            <div className="mt-4 space-y-2.5">
              {['Espetinho da Dona Marta', 'Geleia artesanal', 'Pão de queijo do 12º andar'].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.12, ease: EASE }}
                  className="jnc-glass flex items-center justify-between rounded-xl px-3.5 py-2.5"
                >
                  <span className="text-sm font-bold text-slate-800">{item}</span>
                  <span className="jnc-glass rounded-full px-2.5 py-1 text-xs font-black text-[#336886]">Pedir</span>
                </motion.div>
              ))}
            </div>
            <p className="mt-4 text-xs font-semibold text-slate-500">Retirada no salão · ou entrega no seu bloco</p>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Destinos ── */}
      <section className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <motion.div {...revealSm()} className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#336886]">
                <MapPin size={13} weight="duotone" /> Seu bairro · explorar
              </p>
              <h2 className="mt-2 max-w-md text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">
                E quando a fome bate <em className="jnc-serif-i text-[#153A4C]/60">longe de casa?</em>
              </h2>
              <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600">
                Viajou, achou o destino, descobriu onde comer — e pediu por lá mesmo. Chalés, pousadas e experiências da região, no mesmo app.
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/destinos"
                className="jnc-glass inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-black text-[#336886]"
              >
                Conhecer destinos
                <CaretRight size={12} weight="bold" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section id="como-funciona" className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <motion.h2 {...revealSm()} className="text-center text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">
            Como <em className="jnc-serif-i text-[#153A4C]/60">funciona</em>
          </motion.h2>
          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.8, delay: index * 0.15, ease: EASE }}
                  whileHover={{ scale: 1.02 }}
                  className="jnc-glass relative rounded-3xl p-6"
                >
                  <span className="absolute right-5 top-5 font-serif text-2xl font-black text-[#d7e7ef]">{index + 1}</span>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#edf5fa] text-[#336886]">
                    <Icon size={20} weight="duotone" />
                  </span>
                  <h3 className="mt-3.5 text-[15px] font-black tracking-[-0.02em] text-slate-950">{step.title}</h3>
                  <p className="mt-1.5 text-sm font-semibold leading-relaxed text-slate-500">{step.text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-4 pb-16 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: EASE }}
          className="relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#153a4c_0%,#336886_100%)] px-6 py-12 text-center shadow-[0_32px_72px_-32px_rgba(21,58,76,0.5)] sm:px-10"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#5fd35a]/15 blur-[90px]" />
          <h2 className="relative text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">
            O que está perto de você está <em className="jnc-serif-i text-[#5fd35a]">esperando</em>.
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed text-white/85 sm:text-base">
            Abra o app, veja as lojas da sua região e faça seu primeiro pedido hoje.
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative mt-7 inline-block">
            <Link
              to="/hub"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#5fd35a] px-7 py-3.5 text-base font-black text-[#153a4c] shadow-[0_16px_32px_-14px_rgba(95,211,90,0.7)] transition-all hover:brightness-105 active:scale-[0.98]"
            >
              Ver o que tem perto
              <CaretRight size={16} weight="bold" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/30 bg-white/50 px-4 py-8 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-sm font-black text-slate-950">Já no Caminho</span>
          </div>
          <div className="flex items-center gap-5 text-sm font-bold text-slate-500">
            <Link to="/hub" className="transition-colors hover:text-[#336886]">Explorar o app</Link>
            <Link to="/parceiros" className="transition-colors hover:text-[#336886]">Quero vender</Link>
          </div>
        </div>
        <p className="mt-5 text-center text-xs font-semibold text-slate-400">
          Feito no interior, para o interior · <WhatsappLogo size={11} weight="fill" className="inline" /> suporte por WhatsApp dentro do app
        </p>
      </footer>
    </div>
  );
}
