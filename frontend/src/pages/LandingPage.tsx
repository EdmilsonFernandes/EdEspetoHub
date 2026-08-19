// @ts-nocheck
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
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
 * Landing CONSUMER do Já no Caminho (auditoria 2, 18/08).
 *
 * A landing antiga era dark-SaaS com voz dupla ("peça OU venda") e virou
 * /parceiros (PartnersPage). Esta página fala com quem PEDE, usando os tokens
 * do hub (light #E2EBF2, teal #336886, verde ao-vivo) — a porta de entrada do
 * mesmo produto que o usuário encontra depois em /hub.
 *
 * Hero aprovado pelo Edmilson: "O seu bairro tem mais sabor do que você imagina."
 */

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

export function LandingPage() {
  useEffect(() => {
    document.title = 'Já no Caminho — Peça, retire e descubra perto de você';
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-[#E2EBF2] text-slate-900">
      {/* ── Navbar glass (mesma linguagem do hub) ─────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[#153a4c]/8 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/hub" className="flex items-center gap-2.5">
            <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-9 w-9 rounded-xl object-cover ring-1 ring-white" />
            <span className="text-[15px] font-black tracking-[-0.02em] text-slate-950">Já no Caminho</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 sm:flex">
            <a href="#o-que-da-pra-fazer" className="transition-colors hover:text-[#336886]">O que dá pra fazer</a>
            <a href="#seu-bairro" className="transition-colors hover:text-[#336886]">Seu bairro</a>
            <a href="#como-funciona" className="transition-colors hover:text-[#336886]">Como funciona</a>
          </nav>
          <Link
            to="/hub"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-[#336886] px-4 text-sm font-black text-white shadow-[0_10px_24px_-12px_rgba(51,104,134,0.6)] transition hover:brightness-105 active:scale-[0.98]"
          >
            Entrar no app
            <CaretRight size={13} weight="bold" />
          </Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-14 pt-12 sm:pt-20">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#336886]/12 blur-[110px]" />
        <div className="pointer-events-none absolute -left-20 top-40 h-64 w-64 rounded-full bg-[#5fd35a]/10 blur-[100px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d7e7ef] bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-[#336886] shadow-sm">
              <Sparkle size={12} weight="fill" className="text-[#5fd35a]" />
              O app do que está perto de você
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-[-0.035em] text-slate-950 sm:text-5xl lg:text-6xl">
              O seu bairro tem mais <span className="text-[#336886]">sabor</span> do que você imagina.
            </h1>
            <p className="mt-5 max-w-md text-base font-semibold leading-relaxed text-slate-600 sm:text-lg">
              Restaurantes, mercados e vendedores do seu condomínio — entrega, retirada e feiras num só app.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/hub"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#336886] px-6 py-3.5 text-base font-black text-white shadow-[0_16px_32px_-16px_rgba(51,104,134,0.65)] transition hover:brightness-105 active:scale-[0.98]"
              >
                Ver o que tem perto
                <CaretRight size={16} weight="bold" />
              </Link>
              <Link
                to="/cliente?mode=login"
                className="inline-flex items-center justify-center rounded-2xl border border-[#d7e7ef] bg-white px-6 py-3.5 text-base font-bold text-[#336886] transition hover:bg-[#edf5fa] active:scale-[0.98]"
              >
                Já tenho conta
              </Link>
            </div>
            <p className="mt-4 text-xs font-semibold text-slate-500">
              Grátis pra pedir · Sem cadastro pra explorar · Pix, cartão ou dinheiro
            </p>
          </div>

          {/* Composição de produto: cards reais do hub em cima da página */}
          <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
            <div className="rounded-3xl border border-white/80 bg-[linear-gradient(180deg,#ffffff,#f4f8fb)] p-4 shadow-[var(--shadow-overlay)] ring-1 ring-white/60">
              <div className="flex items-center gap-2 rounded-2xl border border-[#d7e7ef] bg-white px-3.5 py-3 shadow-[var(--shadow-flat)]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#edf5fa] text-[#336886]">
                  <Storefront size={17} weight="duotone" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-950">Gustavão Espetos</p>
                  <p className="text-xs font-semibold text-emerald-600">Aberto agora · entrega e retirada</p>
                </div>
                <span className="rounded-full bg-[#336886] px-3 py-1.5 text-xs font-black text-white">Pedir</span>
              </div>

              <div className="mt-3 overflow-hidden rounded-2xl">
                <div className="flex items-center gap-3 border border-[#d7e7ef] bg-white p-3">
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
              </div>

              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#d7e7ef] bg-white p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf5fa] text-[#336886]">
                  <Scooter size={18} weight="duotone" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-950">Seu pedido saiu pra entrega</p>
                  <p className="text-xs font-semibold text-slate-500">Chega em ~15 min · Pix confirmado</p>
                </div>
                <SealCheck size={18} weight="fill" className="shrink-0 text-[#5fd35a]" />
              </div>
            </div>
            <div className="pointer-events-none absolute -bottom-5 -right-3 hidden rotate-2 rounded-2xl border-2 border-dashed border-[#336886]/30 bg-white px-4 py-2.5 shadow-[var(--shadow-raised)] sm:block">
              <p className="text-xs font-black text-[#336886]">Do lanche de quinta…</p>
              <p className="text-xs font-bold text-slate-500">à escapada no chalé ✦</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── O que dá pra fazer ─────────────────────────────────────────── */}
      <section id="o-que-da-pra-fazer" className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Descubra perto de você</p>
          <h2 className="mx-auto mt-2 max-w-lg text-center text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">
            Um app, tudo que existe na sua região
          </h2>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHAT_YOU_CAN_DO.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-3xl border border-white/80 bg-white p-5 shadow-[var(--shadow-raised)]"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#edf5fa] text-[#336886]">
                  <Icon size={20} weight="duotone" />
                </span>
                <h3 className="mt-3.5 text-[15px] font-black tracking-[-0.02em] text-slate-950">{title}</h3>
                <p className="mt-1.5 text-sm font-semibold leading-relaxed text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Seu bairro (condomínio + feira) ─────────────────────────────── */}
      <section id="seu-bairro" className="px-4 py-14">
        <div className="mx-auto grid max-w-6xl items-center gap-8 rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,#ffffff_0%,#f0f7fa_100%)] p-6 shadow-[var(--shadow-raised)] sm:p-10 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#336886]">
              <Buildings size={13} weight="duotone" /> Seu bairro
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">
              A feira chegou no seu condomínio.
            </h2>
            <p className="mt-3 max-w-md text-base font-semibold leading-relaxed text-slate-600">
              Vizinhos que vendem, pequenos mercados internos e feiras no salão de festas — com entrega no bloco ou retirada na portaria. Só o Já no Caminho faz isso.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                'Vendedores moradores com entrega dentro do condomínio',
                'Feiras com data, horário e pedidos antecipados',
                'Retirada combinada (bloco B, portaria 2…)',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm font-bold text-slate-700">
                  <SealCheck size={16} weight="fill" className="mt-0.5 shrink-0 text-[#5fd35a]" />
                  {line}
                </li>
              ))}
            </ul>
            <Link
              to="/hub"
              className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#336886] px-5 py-3 text-sm font-black text-white shadow-[0_12px_26px_-14px_rgba(51,104,134,0.6)] transition hover:brightness-105 active:scale-[0.98]"
            >
              Ver o meu condomínio
              <CaretRight size={13} weight="bold" />
            </Link>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white p-5 shadow-[var(--shadow-raised)]">
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
              {['Espetinho da Dona Marta', 'Geleia artesanal', 'Pão de queijo do 12º andar'].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-xl border border-[#d7e7ef] bg-[#f4f8fb] px-3.5 py-2.5">
                  <span className="text-sm font-bold text-slate-800">{item}</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-[#336886] ring-1 ring-[#d7e7ef]">Pedir</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs font-semibold text-slate-500">Retirada no salão · ou entrega no seu bloco</p>
          </div>
        </div>
      </section>

      {/* ── Destinos ───────────────────────────────────────────────────── */}
      <section className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#336886]">
                <MapPin size={13} weight="duotone" /> Seu bairro · explorar
              </p>
              <h2 className="mt-2 max-w-md text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">
                E quando a fome bate longe de casa?
              </h2>
              <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600">
                Viajou, achou o destino, descobriu onde comer — e pediu por lá mesmo. Chalés, pousadas e experiências da região, no mesmo app.
              </p>
            </div>
            <Link
              to="/destinos"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#d7e7ef] bg-white px-4 py-2.5 text-sm font-black text-[#336886] transition hover:bg-[#edf5fa] active:scale-[0.98]"
            >
              Conhecer destinos
              <CaretRight size={12} weight="bold" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Como funciona ──────────────────────────────────────────────── */}
      <section id="como-funciona" className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">Como funciona</h2>
          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <div key={title} className="relative rounded-3xl border border-white/80 bg-white p-6 shadow-[var(--shadow-raised)]">
                <span className="absolute right-5 top-5 font-mono text-2xl font-black text-[#d7e7ef]">{index + 1}</span>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#edf5fa] text-[#336886]">
                  <Icon size={20} weight="duotone" />
                </span>
                <h3 className="mt-3.5 text-[15px] font-black tracking-[-0.02em] text-slate-950">{title}</h3>
                <p className="mt-1.5 text-sm font-semibold leading-relaxed text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ──────────────────────────────────────────────────── */}
      <section className="px-4 pb-16 pt-6">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#153a4c_0%,#336886_100%)] px-6 py-12 text-center shadow-[var(--shadow-overlay)] sm:px-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#5fd35a]/15 blur-[90px]" />
          <h2 className="relative text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">
            O que está perto de você está esperando.
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed text-white/85 sm:text-base">
            Abra o app, veja as lojas da sua região e faça seu primeiro pedido hoje.
          </p>
          <Link
            to="/hub"
            className="relative mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#5fd35a] px-7 py-3.5 text-base font-black text-[#153a4c] shadow-[0_16px_32px_-14px_rgba(95,211,90,0.7)] transition hover:brightness-105 active:scale-[0.98]"
          >
            Ver o que tem perto
            <CaretRight size={16} weight="bold" />
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#153a4c]/8 bg-white/70 px-4 py-8 backdrop-blur">
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
