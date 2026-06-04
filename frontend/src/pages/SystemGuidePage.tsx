import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BellRinging,
  Buildings,
  ChartLineUp,
  CheckCircle,
  Compass,
  CreditCard,
  DeviceMobile,
  EnvelopeSimple,
  ForkKnife,
  Gear,
  Handshake,
  HouseLine,
  ListChecks,
  MapPin,
  MapTrifold,
  Package,
  Printer,
  QrCode,
  RocketLaunch,
  Scooter,
  ShieldCheck,
  Sparkle,
  Storefront,
  UserCircle,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { LandingPageLayout } from '../layouts/LandingPageLayout';

type GuideIcon = typeof Storefront;

type Journey = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  icon: GuideIcon;
  robotLine: string;
  highlights: string[];
  flow: string[];
};

type Feature = {
  title: string;
  description: string;
  icon: GuideIcon;
  accent: string;
};

const metrics = [
  { value: '50', label: 'primeiras lojas com campanha fundador' },
  { value: '3 meses', label: 'VIP promocional para acelerar adesão' },
  { value: '1 app', label: 'cliente, lojista, operador, entregador e destinos' },
  { value: '0% comissão', label: 'modelo pensado para loja ganhar tração' },
];

const journeys: Journey[] = [
  {
    id: 'cliente',
    title: 'Cliente',
    eyebrow: 'Pedir sem esforço',
    description: 'O cliente entra no Hub, encontra lojas, chalés, feiras e pedidos ativos com uma jornada simples e mobile first.',
    icon: UserCircle,
    robotLine: 'Eu mostro lojas, destaques, pedidos ativos e notificações sem o cliente precisar entender termos técnicos.',
    highlights: [
      'Hub com busca, filtros compactos, lojas próximas, itens em destaque e destinos turísticos.',
      'Checkout com observação, endereço, retirada, entrega, mesa, Pix, cartão e pagamento direto com a loja.',
      'Meus pedidos com status, reembolso, avaliação, imagem do item e mensagens humanizadas.',
      'Notificações no app e fallback por e-mail para status quando o cliente usa web.',
    ],
    flow: ['Descobrir', 'Escolher', 'Revisar', 'Pedir', 'Acompanhar'],
  },
  {
    id: 'lojista',
    title: 'Lojista e operador',
    eyebrow: 'Operação rápida',
    description: 'Painel para vender, operar fila, criar pedidos de mesa, imprimir cupom e gerenciar loja sem depender de suporte.',
    icon: Storefront,
    robotLine: 'Na operação eu priorizo velocidade: fila, impressão, itens avulsos, couvert e taxa sem travar atendimento.',
    highlights: [
      'Dashboard, cardápio, produtos, categorias, promoções, estoque, horários e tipos de pedido.',
      'Fila de pedidos com detalhe em modal, adicionar item do catálogo, item avulso, couvert artístico e taxa de serviço.',
      'Impressão térmica direta via Bluetooth no Android, com RawBT como fallback quando necessário.',
      'Campanha fundador, trial, planos, Mercado Pago conectado e modo convencional com pagamento na loja.',
    ],
    flow: ['Cadastrar', 'Configurar', 'Receber', 'Preparar', 'Imprimir'],
  },
  {
    id: 'motoboy',
    title: 'Entregador',
    eyebrow: 'Entrega controlada',
    description: 'Fluxo de motoboy com KYC, vínculo com loja, aceite concorrente e confirmação por código.',
    icon: Scooter,
    robotLine: 'Eu evito corrida duplicada: dois motoboys veem a entrega, mas só um consegue aceitar.',
    highlights: [
      'Cadastro com CNH, selfie, CRLV, verificação assistida e aprovação por KYC.',
      'Fila de entregas disponíveis, entrega atual, histórico e ganhos.',
      'Aceite concorrente protegido para impedir dois entregadores no mesmo pedido.',
      'Retirada na loja, rota até o cliente e finalização com código de confirmação.',
    ],
    flow: ['Aprovar', 'Aceitar', 'Retirar', 'Entregar', 'Receber'],
  },
  {
    id: 'destinos',
    title: 'Destinos e chalés',
    eyebrow: 'Experiência turística',
    description: 'Cidades, chalés, pousadas, serviços locais e restaurantes conectados com rota até a hospedagem.',
    icon: MapTrifold,
    robotLine: 'Aqui eu viro concierge: mostro onde ficar, onde pedir e como chegar até o chalé.',
    highlights: [
      'Cidades turísticas com hospedagens, serviços, lojas vinculadas, busca por estado e contadores clicáveis.',
      'Chalé com rede local, logos dos parceiros, filtro por logo e destaque visual no serviço selecionado.',
      'WhatsApp para serviço com referência da hospedagem, endereço do chalé e link de rota.',
      'Portal do parceiro em /parceiro para chalés, pousadas e serviços atualizarem dados seguros.',
    ],
    flow: ['Visitar', 'Escolher chalé', 'Ver rede local', 'Chamar serviço', 'Abrir rota'],
  },
  {
    id: 'condominio',
    title: 'Feiras e condomínios',
    eyebrow: 'Venda local organizada',
    description: 'Agenda de feiras, vitrines por condomínio e acesso controlado para moradores e parceiros.',
    icon: Buildings,
    robotLine: 'Eu organizo a feira para o morador ver agenda, lojas e pedidos sem perder contexto.',
    highlights: [
      'Cards rápidos na Home para Feiras e Visite, com menu inferior renomeado para linguagem mais clara.',
      'Hub por condomínio com lojas participantes, agendas próximas e fluxo de pedido normal.',
      'Cadastro e gestão de condomínios no painel com filtros e UX mobile first.',
      'Base pronta para ampliar eventos e monetização por destaque regional.',
    ],
    flow: ['Ver agenda', 'Entrar no condomínio', 'Escolher loja', 'Pedir', 'Acompanhar'],
  },
  {
    id: 'superadmin',
    title: 'Super Admin',
    eyebrow: 'Controle da plataforma',
    description: 'Gestão central para operar crescimento: lojas, parceiros, destinos, e-mails, push, planos, KYC e auditoria.',
    icon: ShieldCheck,
    robotLine: 'Eu separo operação de estratégia: aprovar parceiros, monetizar destaque e manter tudo auditável.',
    highlights: [
      'Menu vertical organizado por grupos, filtros por estado/cidade e solicitações de parceiros com antifraude.',
      'Templates de e-mail no banco, preview, logs, descadastro de marketing e variáveis seguras.',
      'Push global/promocional com rotas internas, URL externa e fallback para tela de notificações.',
      'Prioridade de destinos, chalés, serviços e vínculos para preparar monetização por destaque.',
    ],
    flow: ['Configurar', 'Aprovar', 'Auditar', 'Comunicar', 'Monetizar'],
  },
];

const features: Feature[] = [
  {
    title: 'Campanha fundador',
    description: 'Primeiras lojas com 3 meses VIP, cards de plano bloqueados no onboarding e status no painel.',
    icon: RocketLaunch,
    accent: 'from-lime-300/30 to-emerald-500/10 text-lime-700',
  },
  {
    title: 'Portal do parceiro',
    description: 'Chalés e serviços aprovados atualizam fotos, endereço e contatos sem mexer em campos estratégicos.',
    icon: Handshake,
    accent: 'from-sky-300/30 to-cyan-500/10 text-sky-700',
  },
  {
    title: 'Impressão Bluetooth',
    description: 'Configuração no app Android para imprimir direto e manter RawBT como plano B operacional.',
    icon: Printer,
    accent: 'from-orange-300/30 to-amber-500/10 text-orange-700',
  },
  {
    title: 'Geo e rotas melhores',
    description: 'CEP, endereço, lat/lng, provedores gratuitos e fallback com qualidade para destinos turísticos.',
    icon: MapPin,
    accent: 'from-emerald-300/30 to-teal-500/10 text-emerald-700',
  },
  {
    title: 'E-mails profissionais',
    description: 'Templates no Super Admin, logo oficial, variáveis, logs, testes e descadastro para marketing.',
    icon: EnvelopeSimple,
    accent: 'from-rose-300/30 to-pink-500/10 text-rose-700',
  },
  {
    title: 'Push com rota inteligente',
    description: 'Notificações podem abrir pedido, conta, loja, destino, URL externa ou detalhe da mensagem.',
    icon: BellRinging,
    accent: 'from-violet-300/30 to-indigo-500/10 text-violet-700',
  },
  {
    title: 'Checkout lapidado',
    description: 'Pedido salvo, observação clara, pagamento por bottom sheet e recuperação quando a sessão cai.',
    icon: QrCode,
    accent: 'from-slate-300/30 to-slate-500/10 text-slate-700',
  },
  {
    title: 'Operação em mesa',
    description: 'Mesa, retirada e entrega no mesmo motor, com couvert, taxa de serviço e item manual.',
    icon: ForkKnife,
    accent: 'from-yellow-300/30 to-lime-500/10 text-yellow-700',
  },
];

const platformModules = [
  { title: 'Hub/Home', icon: HouseLine, items: ['Lojas próximas', 'Destaques', 'Destinos', 'Feiras'] },
  { title: 'Vitrine online', icon: Package, items: ['Categorias sticky', 'Carrinho salvo', 'Checkout', 'Pagamento'] },
  { title: 'Fila e operação', icon: ListChecks, items: ['Pedidos', 'Mesa', 'Impressão', 'Histórico'] },
  { title: 'Financeiro', icon: CreditCard, items: ['Mercado Pago', 'Planos', 'Trial', 'Reembolso'] },
  { title: 'Destinos', icon: Compass, items: ['Cidades', 'Chalés', 'Rotas', 'Parceiros'] },
  { title: 'Segurança', icon: ShieldCheck, items: ['MFA', 'KYC', 'Auditoria', 'Antifraude'] },
  { title: 'Mobile/App', icon: DeviceMobile, items: ['Push', 'Bluetooth', 'Safe area', 'Offline UX'] },
  { title: 'Configurações', icon: Gear, items: ['Home', 'E-mails', 'Banners', 'Prioridade'] },
];

const guideTimeline = [
  { title: 'Descobrir', text: 'Cliente acha loja, item, feira, cidade ou chalé pelo Hub.', icon: Sparkle },
  { title: 'Converter', text: 'Vitrine e checkout guiam o usuário com CTA único e linguagem simples.', icon: CheckCircle },
  { title: 'Operar', text: 'Lojista recebe, edita, imprime e finaliza sem travar atendimento.', icon: ForkKnife },
  { title: 'Entregar', text: 'Motoboy aceita, retira, entrega e confirma com segurança.', icon: Scooter },
  { title: 'Comunicar', text: 'Push, e-mail e WhatsApp mantêm cliente e parceiro informados.', icon: WhatsappLogo },
  { title: 'Monetizar', text: 'Planos, VIP fundador, destaque e prioridade preparam crescimento.', icon: ChartLineUp },
];

function GuideRobot({ line, activeTitle }: { line: string; activeTitle: string }) {
  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-[2.2rem] border border-white/60 bg-white/70 p-5 shadow-[0_28px_80px_-38px_rgba(21,58,76,0.55)] backdrop-blur-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(95,211,90,0.24),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(51,104,134,0.20),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.88),rgba(245,249,247,0.72))]" />
      <motion.div
        aria-hidden="true"
        className="absolute left-6 top-7 h-2 w-28 rounded-full bg-[#5FD35A]/50 blur-[2px]"
        animate={{ x: [0, 24, 0], opacity: [0.35, 0.9, 0.35] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute bottom-14 left-8 right-8 h-20 rounded-[2rem] border border-dashed border-[#336886]/20"
        animate={{ rotate: [0, -1.5, 0, 1.5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex h-full min-h-[380px] flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#336886]/70">Guia interativo</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#153A4C]">Robô no comando</h2>
          </div>
          <span className="rounded-full bg-[#153A4C] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-[#153A4C]/20">
            Ao vivo
          </span>
        </div>

        <div className="relative mx-auto mt-6 flex w-full max-w-[280px] flex-col items-center">
          <motion.div
            className="relative h-7 w-24"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute left-1/2 top-0 h-7 w-1 -translate-x-1/2 rounded-full bg-[#336886]" />
            <motion.div
              className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 rounded-full bg-[#5FD35A] shadow-[0_0_28px_rgba(95,211,90,0.75)]"
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
          </motion.div>
          <motion.div
            className="relative h-32 w-40 rounded-[2.2rem] border-[6px] border-white bg-[#153A4C] shadow-[0_26px_50px_-28px_rgba(21,58,76,0.95)]"
            animate={{ y: [0, -8, 0], rotate: [0, -1, 0, 1, 0] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute inset-3 rounded-[1.55rem] bg-gradient-to-b from-[#336886] to-[#153A4C]" />
            <motion.div
              className="absolute left-9 top-12 h-4 w-4 rounded-full bg-[#5FD35A] shadow-[0_0_18px_rgba(95,211,90,0.9)]"
              animate={{ scaleY: [1, 0.25, 1] }}
              transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 1.2 }}
            />
            <motion.div
              className="absolute right-9 top-12 h-4 w-4 rounded-full bg-[#5FD35A] shadow-[0_0_18px_rgba(95,211,90,0.9)]"
              animate={{ scaleY: [1, 0.25, 1] }}
              transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 1.2 }}
            />
            <div className="absolute bottom-9 left-1/2 h-2 w-16 -translate-x-1/2 rounded-full bg-white/80" />
            <div className="absolute -left-8 top-16 h-4 w-10 rounded-full bg-[#5FD35A]/80 shadow-lg shadow-[#5FD35A]/30" />
            <div className="absolute -right-8 top-16 h-4 w-10 rounded-full bg-[#5FD35A]/80 shadow-lg shadow-[#5FD35A]/30" />
          </motion.div>
          <motion.div
            className="mt-2 h-24 w-52 rounded-[2rem] border-[6px] border-white bg-gradient-to-b from-[#336886] to-[#153A4C] shadow-[0_26px_60px_-35px_rgba(21,58,76,0.9)]"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="mx-auto mt-5 h-5 w-24 rounded-full bg-white/18" />
            <div className="mx-auto mt-3 grid w-32 grid-cols-3 gap-2">
              <div className="h-2 rounded-full bg-[#5FD35A]" />
              <div className="h-2 rounded-full bg-white/45" />
              <div className="h-2 rounded-full bg-white/25" />
            </div>
          </motion.div>
        </div>

        <div className="mt-7 rounded-[1.5rem] border border-white/70 bg-white/82 p-4 shadow-[0_18px_45px_-32px_rgba(21,58,76,0.55)]">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#5FD35A]/20 text-[#153A4C]">
              <Sparkle size={16} weight="fill" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#336886]/70">Foco atual</p>
              <p className="text-sm font-black text-[#153A4C]">{activeTitle}</p>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={line}
              className="mt-3 text-sm font-semibold leading-relaxed text-slate-600"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {line}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function SystemGuidePage() {
  const [activeJourneyId, setActiveJourneyId] = useState(journeys[0].id);
  const activeJourney = useMemo(
    () => journeys.find((journey) => journey.id === activeJourneyId) ?? journeys[0],
    [activeJourneyId],
  );
  const ActiveJourneyIcon = activeJourney.icon;

  return (
    <LandingPageLayout>
      <main className="overflow-hidden bg-[#F1F5F2] text-[#153A4C]">
        <section className="relative pt-28 sm:pt-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(95,211,90,0.22),transparent_26%),radial-gradient(circle_at_88%_10%,rgba(51,104,134,0.18),transparent_34%),linear-gradient(180deg,#F7FAF7_0%,#EEF4F1_60%,#F1F5F2_100%)]" />
          <div className="absolute inset-x-0 top-0 h-40 bg-white/55 backdrop-blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:px-8 lg:pb-20">
            <div className="flex flex-col justify-center">
              <motion.div
                className="inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/78 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#336886] shadow-[0_16px_35px_-30px_rgba(21,58,76,0.75)] backdrop-blur-xl"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <Sparkle size={13} weight="fill" className="text-[#5FD35A]" />
                Guia 2026 atualizado
              </motion.div>

              <motion.h1
                className="mt-5 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-[#153A4C] sm:text-6xl lg:text-7xl"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.05 }}
              >
                Entenda o Já no Caminho em uma experiência viva.
              </motion.h1>

              <motion.p
                className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-slate-600 sm:text-lg"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.12 }}
              >
                Um guia interativo para mostrar como cliente, lojista, operador, motoboy, chalé, serviço e Super Admin
                usam a plataforma sem perder contexto. Atualizado com Hub refatorado, destinos, portal parceiro,
                impressão Bluetooth, e-mails, push e campanha fundador.
              </motion.p>

              <motion.div
                className="mt-7 flex flex-wrap gap-3"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.18 }}
              >
                <a
                  href="/create?plan=founder-vip"
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[#153A4C] px-5 py-3.5 text-sm font-black text-white shadow-[0_20px_45px_-24px_rgba(21,58,76,0.8)] transition hover:-translate-y-0.5 hover:bg-[#1f4d63] motion-reduce:transform-none"
                >
                  Criar loja com 3 meses VIP
                  <ArrowRight size={16} weight="bold" className="transition group-hover:translate-x-0.5 motion-reduce:transform-none" />
                </a>
                <a
                  href="/hub"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#153A4C]/10 bg-white/82 px-5 py-3.5 text-sm font-black text-[#153A4C] shadow-[0_18px_40px_-32px_rgba(21,58,76,0.7)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#336886]/28 motion-reduce:transform-none"
                >
                  <HouseLine size={17} weight="duotone" />
                  Abrir o app
                </a>
                <a
                  href="/destinos"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#153A4C]/10 bg-white/58 px-5 py-3.5 text-sm font-black text-[#336886] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/82 motion-reduce:transform-none"
                >
                  <MapTrifold size={17} weight="duotone" />
                  Ver destinos
                </a>
              </motion.div>

              <motion.div
                className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } },
                }}
              >
                {metrics.map((metric) => (
                  <motion.div
                    key={metric.label}
                    className="rounded-[1.45rem] border border-white/80 bg-white/72 p-4 shadow-[0_18px_45px_-35px_rgba(21,58,76,0.65)] backdrop-blur-xl"
                    variants={{
                      hidden: { opacity: 0, y: 14 },
                      show: { opacity: 1, y: 0 },
                    }}
                  >
                    <p className="text-2xl font-black tracking-tight text-[#153A4C]">{metric.value}</p>
                    <p className="mt-1 text-[11px] font-bold leading-snug text-slate-500">{metric.label}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.12 }}
            >
              <GuideRobot line={activeJourney.robotLine} activeTitle={activeJourney.title} />
            </motion.div>
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#336886]/70">Escolha seu papel</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-[#153A4C]">O guia muda junto com o usuário</h2>
            </div>
            <p className="max-w-md text-sm font-medium leading-relaxed text-slate-500">
              Clique em um perfil para o robô explicar a jornada e mostrar as partes da plataforma que mais importam.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.38fr_0.62fr]">
            <div className="grid gap-2">
              {journeys.map((journey) => {
                const Icon = journey.icon;
                const isActive = journey.id === activeJourney.id;
                return (
                  <button
                    key={journey.id}
                    type="button"
                    onClick={() => setActiveJourneyId(journey.id)}
                    className={`group flex w-full items-center gap-3 rounded-[1.35rem] border p-3 text-left transition ${
                      isActive
                        ? 'border-[#153A4C]/14 bg-white shadow-[0_22px_55px_-38px_rgba(21,58,76,0.75)]'
                        : 'border-white/70 bg-white/48 hover:border-[#336886]/18 hover:bg-white/78'
                    }`}
                    aria-pressed={isActive}
                  >
                    <span
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition ${
                        isActive ? 'bg-[#153A4C] text-white' : 'bg-[#153A4C]/6 text-[#336886]'
                      }`}
                    >
                      <Icon size={22} weight={isActive ? 'fill' : 'duotone'} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#336886]/65">
                        {journey.eyebrow}
                      </span>
                      <span className="mt-0.5 block text-sm font-black text-[#153A4C]">{journey.title}</span>
                    </span>
                    <ArrowRight
                      size={16}
                      weight="bold"
                      className={`ml-auto shrink-0 transition ${isActive ? 'translate-x-0 text-[#5FD35A]' : 'text-slate-300 group-hover:translate-x-0.5'}`}
                    />
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.article
                key={activeJourney.id}
                className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/76 shadow-[0_28px_90px_-55px_rgba(21,58,76,0.85)] backdrop-blur-xl"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.22 }}
              >
                <div className="border-b border-[#153A4C]/8 bg-gradient-to-br from-white/95 to-white/58 p-5 sm:p-7">
                  <div className="flex items-start gap-4">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#153A4C] text-white shadow-[0_18px_40px_-24px_rgba(21,58,76,0.85)]">
                      <ActiveJourneyIcon size={26} weight="duotone" />
                    </span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#336886]/70">{activeJourney.eyebrow}</p>
                      <h3 className="mt-1 text-2xl font-black tracking-tight text-[#153A4C]">{activeJourney.title}</h3>
                      <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">{activeJourney.description}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 p-5 sm:p-7">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {activeJourney.highlights.map((highlight) => (
                      <div
                        key={highlight}
                        className="rounded-[1.35rem] border border-[#153A4C]/7 bg-[#F7FAF7] p-4 text-sm font-semibold leading-relaxed text-slate-600"
                      >
                        <CheckCircle size={18} weight="fill" className="mb-2 text-[#5FD35A]" />
                        {highlight}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[1.5rem] border border-[#153A4C]/8 bg-[#153A4C] p-4 text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">Fluxo resumido</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {activeJourney.flow.map((step, index) => (
                        <div key={step} className="flex items-center gap-2">
                          <span className="rounded-full bg-white/12 px-3 py-2 text-xs font-black text-white ring-1 ring-white/10">
                            {step}
                          </span>
                          {index < activeJourney.flow.length - 1 ? <ArrowRight size={13} weight="bold" className="text-[#5FD35A]" /> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.article>
            </AnimatePresence>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#336886]/70">Recursos atuais</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-[#153A4C]">O que já está no produto</h2>
            </div>
            <p className="max-w-md text-sm font-medium leading-relaxed text-slate-500">
              Esta página deixou de ser um manual antigo: agora mostra as features que foram adicionadas e lapidadas no app.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.article
                  key={feature.title}
                  className="group min-h-[210px] rounded-[1.75rem] border border-white/80 bg-white/74 p-5 shadow-[0_24px_70px_-52px_rgba(21,58,76,0.78)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white motion-reduce:transform-none"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.32, delay: index * 0.03 }}
                >
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${feature.accent}`}>
                    <Icon size={22} weight="duotone" />
                  </span>
                  <h3 className="mt-4 text-lg font-black tracking-tight text-[#153A4C]">{feature.title}</h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{feature.description}</p>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-[2.2rem] border border-white/80 bg-white/64 p-5 shadow-[0_28px_95px_-60px_rgba(21,58,76,0.75)] backdrop-blur-xl sm:p-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#336886]/70">Mapa da plataforma</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-[#153A4C]">Módulos sem linguagem técnica</h2>
              </div>
              <p className="max-w-sm text-sm font-medium leading-relaxed text-slate-500">
                Cada bloco usa nome de produto para facilitar apresentação comercial e onboarding de parceiros.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {platformModules.map((module) => {
                const Icon = module.icon;
                return (
                  <article key={module.title} className="rounded-[1.45rem] border border-[#153A4C]/7 bg-[#F7FAF7] p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-[#336886] shadow-[0_12px_35px_-28px_rgba(21,58,76,0.75)]">
                        <Icon size={20} weight="duotone" />
                      </span>
                      <h3 className="text-sm font-black text-[#153A4C]">{module.title}</h3>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {module.items.map((item) => (
                        <span key={item} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-[#153A4C]/6">
                          {item}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#336886]/70">Jornada ponta a ponta</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[#153A4C]">Do primeiro clique até monetizar</h2>
          </div>

          <div className="grid gap-3 lg:grid-cols-6">
            {guideTimeline.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  className="relative rounded-[1.5rem] border border-white/80 bg-white/70 p-4 shadow-[0_22px_65px_-52px_rgba(21,58,76,0.8)] backdrop-blur-xl"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.32, delay: index * 0.04 }}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#153A4C] text-white">
                    <Icon size={20} weight="duotone" />
                  </span>
                  <p className="mt-4 text-base font-black text-[#153A4C]">{item.title}</p>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{item.text}</p>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2.3rem] bg-[#153A4C] p-6 text-white shadow-[0_32px_100px_-58px_rgba(21,58,76,0.95)] sm:p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(95,211,90,0.28),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(255,255,255,0.16),transparent_28%)]" />
            <div className="relative grid gap-7 lg:grid-cols-[0.72fr_0.28fr] lg:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#5FD35A]">Próximo passo</p>
                <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                  Use este guia para apresentar o app para lojistas, chalés, serviços e parceiros.
                </h2>
                <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-white/70">
                  A página mostra o valor comercial do Já no Caminho sem parecer documentação técnica. O robô orienta,
                  os cards explicam e os CTAs levam direto para criação de loja, Hub e destinos.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <a
                  href="/create?plan=founder-vip"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#5FD35A] px-5 py-3.5 text-sm font-black text-[#153A4C] shadow-[0_20px_45px_-28px_rgba(95,211,90,0.9)] transition hover:-translate-y-0.5 motion-reduce:transform-none"
                >
                  Quero minha loja
                  <ArrowRight size={16} weight="bold" />
                </a>
                <a
                  href="https://wa.me/551239334979"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/10 px-5 py-3.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/16"
                >
                  <WhatsappLogo size={18} weight="fill" />
                  Falar no WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </LandingPageLayout>
  );
}
