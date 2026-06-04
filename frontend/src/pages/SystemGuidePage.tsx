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
  brandLine: string;
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
  { value: '3 meses', label: 'VIP promocional para começar vendendo' },
  { value: '1 app', label: 'cliente, loja, entregador, chalés e feiras' },
  { value: '0% comissão', label: 'mais margem para a loja crescer' },
];

const journeys: Journey[] = [
  {
    id: 'cliente',
    title: 'Cliente',
    eyebrow: 'Pedir sem esforço',
    description: 'O cliente entra no app, encontra lojas, chalés, feiras e pedidos ativos com uma jornada simples.',
    icon: UserCircle,
    brandLine: 'O cliente vê onde pedir, o que está perto, acompanha o pedido e recebe avisos claros.',
    highlights: [
      'Busca por lojas, produtos, destinos, feiras e serviços locais em uma tela fácil de navegar.',
      'Pedido com observação, endereço, retirada, entrega, mesa, Pix, cartão ou pagamento direto com a loja.',
      'Meus pedidos com status, reembolso, avaliação, foto do item e mensagens fáceis de entender.',
      'Avisos no app e por e-mail para o cliente não perder nenhuma atualização importante.',
    ],
    flow: ['Descobrir', 'Escolher', 'Revisar', 'Pedir', 'Acompanhar'],
  },
  {
    id: 'lojista',
    title: 'Lojista e operador',
    eyebrow: 'Venda e operação',
    description: 'Painel para vender, montar cardápio, receber pedido, atender mesa e imprimir cupom sem complicação.',
    icon: Storefront,
    brandLine: 'A loja recebe pedido, ajusta itens, imprime e atende mesa, retirada ou entrega sem travar o balcão.',
    highlights: [
      'Painel com cardápio, produtos, categorias, promoções, estoque, horários e formas de atendimento.',
      'Fila de pedidos com detalhe rápido, item do cardápio, item avulso, couvert artístico e taxa de serviço.',
      'Impressão pelo app Android quando a impressora estiver pareada no celular da operação.',
      'Campanha fundador, período grátis, planos, Mercado Pago conectado e pagamento direto na loja.',
    ],
    flow: ['Cadastrar', 'Configurar', 'Receber', 'Preparar', 'Imprimir'],
  },
  {
    id: 'entregador',
    title: 'Entregador',
    eyebrow: 'Entrega controlada',
    description: 'Fluxo de entrega com cadastro, vínculo com a loja, aceite seguro e confirmação pelo código do cliente.',
    icon: Scooter,
    brandLine: 'A entrega só é finalizada quando o entregador informa o código que o cliente recebeu.',
    highlights: [
      'Cadastro do entregador com documentos e conferência antes de liberar a operação.',
      'Entregas disponíveis, entrega atual, histórico e ganhos em uma área simples.',
      'Proteção para impedir que dois entregadores assumam o mesmo pedido.',
      'Retirada na loja, caminho até o cliente e finalização com código de confirmação.',
    ],
    flow: ['Aprovar', 'Aceitar', 'Retirar', 'Entregar', 'Confirmar código'],
  },
  {
    id: 'destinos',
    title: 'Destinos e chalés',
    eyebrow: 'Turismo local',
    description: 'Cidades, chalés, pousadas, restaurantes e serviços conectados para ajudar o hóspede durante a estadia.',
    icon: MapTrifold,
    brandLine: 'O hóspede vê o chalé, encontra serviços da região e envia a referência da hospedagem pelo WhatsApp.',
    highlights: [
      'Cidades turísticas com hospedagens, serviços, lojas vinculadas, busca por estado e atalhos por quantidade.',
      'Chalé com rede local, logos dos parceiros, filtro por logo e destaque no serviço escolhido.',
      'WhatsApp para serviço com nome, endereço da hospedagem e link para abrir a rota no mapa.',
      'Área do parceiro para chalés, pousadas e serviços manterem fotos, contatos e endereço atualizados.',
    ],
    flow: ['Visitar', 'Escolher chalé', 'Ver rede local', 'Chamar serviço', 'Abrir rota'],
  },
  {
    id: 'feiras',
    title: 'Feiras e condomínios',
    eyebrow: 'Venda local organizada',
    description: 'Agenda de feiras, vitrines por condomínio e acesso fácil para moradores e parceiros.',
    icon: Buildings,
    brandLine: 'O morador vê agenda, lojas participantes e pode pedir sem sair do fluxo do app.',
    highlights: [
      'Atalhos rápidos para Feiras e Visite na tela inicial do app.',
      'Vitrine por condomínio com lojas participantes e pedido pelo mesmo fluxo do app.',
      'Agenda para mostrar eventos próximos e melhorar descoberta pelos moradores.',
      'Base preparada para ampliar eventos, parceiros e visibilidade regional.',
    ],
    flow: ['Ver agenda', 'Entrar no condomínio', 'Escolher loja', 'Pedir', 'Acompanhar'],
  },
  {
    id: 'parceiros',
    title: 'Parceiros locais',
    eyebrow: 'Mais clientes na região',
    description: 'Serviços, restaurantes, pousadas e chalés aparecem para turistas e moradores no momento certo.',
    icon: Handshake,
    brandLine: 'A região ganha uma vitrine local para mostrar onde comer, comprar, visitar e pedir entrega.',
    highlights: [
      'Restaurantes e serviços podem aparecer vinculados aos chalés que atendem.',
      'O parceiro aprovado consegue manter dados básicos atualizados sem depender de troca de mensagem.',
      'Convites por WhatsApp e e-mail ajudam a trazer novos cadastros com menos atrito.',
      'Destaques e prioridade deixam a base pronta para vender mais visibilidade no futuro.',
    ],
    flow: ['Receber convite', 'Confirmar dados', 'Aparecer no app', 'Atender', 'Crescer'],
  },
];

const features: Feature[] = [
  {
    title: 'Campanha fundador',
    description: 'Primeiras lojas com 3 meses VIP para começar a vender com menos barreira.',
    icon: RocketLaunch,
    accent: 'from-lime-300/30 to-emerald-500/10 text-lime-700',
  },
  {
    title: 'Área do parceiro',
    description: 'Chalés e serviços aprovados atualizam fotos, endereço e contatos próprios.',
    icon: Handshake,
    accent: 'from-sky-300/30 to-cyan-500/10 text-sky-700',
  },
  {
    title: 'Impressão pelo app',
    description: 'A loja configura a impressora pareada no Android e imprime o pedido direto na operação.',
    icon: Printer,
    accent: 'from-orange-300/30 to-amber-500/10 text-orange-700',
  },
  {
    title: 'Endereço e rota',
    description: 'Chalés, lojas e serviços mostram referência de entrega e abrem rota no mapa do celular.',
    icon: MapPin,
    accent: 'from-emerald-300/30 to-teal-500/10 text-emerald-700',
  },
  {
    title: 'E-mails profissionais',
    description: 'Mensagens com logo oficial para convites, senha, aprovação, avisos e parceiros.',
    icon: EnvelopeSimple,
    accent: 'from-rose-300/30 to-pink-500/10 text-rose-700',
  },
  {
    title: 'Avisos que levam ao lugar certo',
    description: 'Notificações podem abrir pedido, conta, loja, destino, site externo ou detalhe da mensagem.',
    icon: BellRinging,
    accent: 'from-violet-300/30 to-indigo-500/10 text-violet-700',
  },
  {
    title: 'Pedido protegido',
    description: 'Se a sessão cair, o pedido fica salvo no aparelho para o cliente não perder a sacola.',
    icon: QrCode,
    accent: 'from-slate-300/30 to-slate-500/10 text-slate-700',
  },
  {
    title: 'Atendimento em mesa',
    description: 'Mesa, retirada e entrega no mesmo fluxo, com couvert, taxa de serviço e item manual.',
    icon: ForkKnife,
    accent: 'from-yellow-300/30 to-lime-500/10 text-yellow-700',
  },
];

const platformModules = [
  { title: 'Início do app', icon: HouseLine, items: ['Lojas próximas', 'Destaques', 'Visite', 'Feiras'] },
  { title: 'Cardápio digital', icon: Package, items: ['Categorias', 'Sacola salva', 'Revisão', 'Pagamento'] },
  { title: 'Fila e operação', icon: ListChecks, items: ['Pedidos', 'Mesa', 'Impressão', 'Histórico'] },
  { title: 'Financeiro', icon: CreditCard, items: ['Mercado Pago', 'Planos', 'Período grátis', 'Reembolso'] },
  { title: 'Visite', icon: Compass, items: ['Cidades', 'Chalés', 'Rotas', 'Parceiros'] },
  { title: 'Confiança', icon: ShieldCheck, items: ['Código na entrega', 'Documentos', 'Acesso seguro', 'Avisos claros'] },
  { title: 'App Android', icon: DeviceMobile, items: ['Notificações', 'Impressora', 'Menu simples', 'Acesso rápido'] },
  { title: 'Crescimento', icon: ChartLineUp, items: ['Campanhas', 'Convites', 'Destaques', 'Prioridade'] },
];

const guideTimeline = [
  { title: 'Descobrir', text: 'Cliente acha loja, item, feira, cidade ou chalé pelo app.', icon: Sparkle },
  { title: 'Pedir', text: 'Cardápio e revisão do pedido mostram a próxima ação sem confundir.', icon: CheckCircle },
  { title: 'Operar', text: 'Lojista recebe, edita, imprime e finaliza sem travar atendimento.', icon: ForkKnife },
  { title: 'Entregar', text: 'Entregador aceita, retira e só finaliza com o código do cliente.', icon: Scooter },
  { title: 'Comunicar', text: 'Notificações, e-mail e WhatsApp mantêm cliente e parceiro informados.', icon: WhatsappLogo },
  { title: 'Crescer', text: 'Planos, campanha fundador, destaque e prioridade ajudam a vender mais.', icon: ChartLineUp },
];

function GuideBrandScene({ line, activeTitle }: { line: string; activeTitle: string }) {
  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-[2.2rem] border border-white/60 bg-white/70 p-5 shadow-[0_28px_80px_-38px_rgba(21,58,76,0.55)] backdrop-blur-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(95,211,90,0.24),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(51,104,134,0.20),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.9),rgba(245,249,247,0.72))]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.10] [background-image:linear-gradient(rgba(21,58,76,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(21,58,76,0.16)_1px,transparent_1px)] [background-size:34px_34px]" />

      <div className="relative z-10 flex h-full min-h-[380px] flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#336886]/70">Guia visual</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#153A4C]">Já no Caminho</h2>
          </div>
          <span className="rounded-full bg-[#153A4C] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-[#153A4C]/20">
            Interativo
          </span>
        </div>

        <div className="relative mx-auto mt-6 h-[250px] w-full max-w-[330px]">
          <div className="absolute left-1/2 top-4 h-[210px] w-[210px] -translate-x-1/2 rounded-full border border-[#153A4C]/10" />
          <div className="absolute left-1/2 top-0 h-[240px] w-[240px] -translate-x-1/2 rounded-full border border-dashed border-[#336886]/12" />
          <svg className="absolute left-1/2 top-[35px] h-[170px] w-[305px] -translate-x-1/2 overflow-visible" viewBox="0 0 305 170" fill="none">
            <path
              d="M18 124 C72 48 124 150 168 72 C202 15 236 58 286 26"
              stroke="rgba(51,104,134,0.36)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="11 13"
            />
            <motion.path
              d="M18 124 C72 48 124 150 168 72 C202 15 236 58 286 26"
              stroke="rgba(95,211,90,0.68)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray="1 33"
              animate={{ strokeDashoffset: [0, -170] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: 'linear' }}
            />
          </svg>

          {[
            { label: 'Lojas', icon: Storefront, className: 'left-0 top-[86px]' },
            { label: 'Chalés', icon: MapPin, className: 'left-[42px] top-3' },
            { label: 'Feiras', icon: Buildings, className: 'right-[38px] top-5' },
            { label: 'Entregas', icon: Scooter, className: 'right-0 top-[95px]' },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                className={`absolute ${item.className} flex min-h-10 items-center gap-1.5 rounded-2xl border border-white/70 bg-white/76 px-3 text-[#336886] shadow-[0_16px_35px_-28px_rgba(21,58,76,0.72)] backdrop-blur-xl`}
                animate={{ y: [0, -7, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: index * 0.16, ease: 'easeInOut' }}
              >
                <Icon size={16} weight="duotone" />
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">{item.label}</span>
              </motion.div>
            );
          })}

          <motion.div
            className="absolute left-1/2 top-[70px] flex h-[96px] w-[96px] -translate-x-1/2 items-center justify-center rounded-[1.85rem] border-[5px] border-white bg-[#153A4C] shadow-[0_30px_65px_-32px_rgba(21,58,76,0.95)]"
            animate={{ y: [0, -9, 0], scale: [1, 1.025, 1] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute inset-2 rounded-[1.28rem] bg-[#336886]/30 blur-xl" />
            <span className="absolute -top-3 left-1/2 h-5 w-[2px] -translate-x-1/2 rounded-full bg-[#5FD35A]/80" />
            <span className="absolute -top-4 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-[#5FD35A] shadow-[0_0_18px_rgba(95,211,90,0.9)]" />
            <img src="/janocaminho.jpg" alt="Já no Caminho" className="relative h-[66px] w-[66px] rounded-[1.18rem] object-contain p-1" />
          </motion.div>

          <div className="absolute bottom-5 left-1/2 h-[54px] w-[286px] -translate-x-1/2 overflow-hidden rounded-full border border-[#153A4C]/10 bg-white/54 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)] backdrop-blur-xl">
            <motion.div
              className="absolute left-0 top-1/2 h-[3px] w-[620px] -translate-y-1/2 bg-[repeating-linear-gradient(90deg,#336886_0_24px,transparent_24px_46px)] opacity-55"
              animate={{ x: [0, -92] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute left-8 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center overflow-hidden rounded-[0.86rem] bg-white p-1 shadow-[0_0_26px_rgba(95,211,90,0.6)] ring-2 ring-[#5FD35A]/55"
              animate={{ x: [0, 164, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img src="/janocaminho.jpg" alt="" className="h-full w-full rounded-[0.58rem] object-contain" />
            </motion.div>
            <div className="absolute left-[78px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#5FD35A] shadow-[0_0_18px_rgba(95,211,90,0.82)]" />
            <div className="absolute right-[68px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#336886] shadow-[0_0_18px_rgba(51,104,134,0.62)]" />
          </div>

          <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/70 bg-white/72 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 shadow-[0_16px_35px_-30px_rgba(21,58,76,0.75)] backdrop-blur-xl">
            <ForkKnife size={12} weight="duotone" className="text-[#336886]" />
            pedidos
            <span className="h-1 w-1 rounded-full bg-slate-400" />
            <Sparkle size={12} weight="duotone" className="text-[#5FD35A]" />
            experiências locais
          </div>
        </div>

        <div className="mt-7 rounded-[1.5rem] border border-white/70 bg-white/82 p-4 shadow-[0_18px_45px_-32px_rgba(21,58,76,0.55)]">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-[#153A4C] p-1">
              <img src="/janocaminho.jpg" alt="" className="h-full w-full rounded-lg object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#336886]/70">Agora no guia</p>
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
                Guia atualizado
              </motion.div>

              <motion.h1
                className="mt-5 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-[#153A4C] sm:text-6xl lg:text-7xl"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.05 }}
              >
                Veja como o Já no Caminho ajuda a vender mais.
              </motion.h1>

              <motion.p
                className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-slate-600 sm:text-lg"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.12 }}
              >
                Um guia interativo para mostrar como clientes, lojas, entregadores, chalés, restaurantes e serviços
                usam o Já no Caminho no dia a dia. Agora com cardápio digital, destinos, área do parceiro,
                impressão pelo app, mensagens profissionais e campanha fundador.
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
              <GuideBrandScene line={activeJourney.brandLine} activeTitle={activeJourney.title} />
            </motion.div>
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#336886]/70">Escolha seu perfil</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-[#153A4C]">O guia muda conforme a necessidade</h2>
            </div>
            <p className="max-w-md text-sm font-medium leading-relaxed text-slate-500">
              Clique em um perfil para ver como o Já no Caminho ajuda cada pessoa na prática.
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
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">Como funciona</p>
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
              Esta página mostra os recursos de forma simples para quem quer vender, atender melhor ou atrair hóspedes.
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
                <h2 className="mt-2 text-3xl font-black tracking-tight text-[#153A4C]">Tudo conectado no mesmo app</h2>
              </div>
              <p className="max-w-sm text-sm font-medium leading-relaxed text-slate-500">
                A ideia é simples: o cliente encontra, a loja vende, o entregador confirma e o parceiro aparece melhor.
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
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[#153A4C]">Do primeiro clique até vender melhor</h2>
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
                  Traga sua loja, chalé ou serviço para o Já no Caminho.
                </h2>
                <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-white/70">
                  O app ajuda clientes, turistas e moradores a descobrirem negócios locais, fazerem pedidos e entrarem
                  em contato com quem atende a região.
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
