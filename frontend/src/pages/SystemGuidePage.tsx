import {
  Buildings,
  ChartLineUp,
  CreditCard,
  DeviceMobile,
  ForkKnife,
  Gear,
  HouseLine,
  MapPin,
  Package,
  Printer,
  Scooter,
  ShieldCheck,
  Storefront,
  Tag,
  UserCircle,
  Warehouse,
} from '@phosphor-icons/react';
import { LandingPageLayout } from '../layouts/LandingPageLayout';

const guideSections = [
  {
    id: 'inicio',
    title: 'Visão geral da plataforma',
    description: 'Entenda como o Já no Caminho conecta lojistas, clientes e entregadores em um ecossistema completo.',
    icon: Storefront,
    points: [
      'O Hub é o marketplace central onde clientes descobrem lojas, navegam cardápios e fazem pedidos de qualquer estabelecimento cadastrado.',
      'Cada loja possui sua vitrine individual acessível por link exclusivo (janocaminho.com.br/sua-loja), compartilhável em redes sociais e WhatsApp.',
      'O lojista gerencia tudo pelo painel administrativo: produtos, fila de pedidos, pagamentos, entregadores e configurações.',
      'O operador (churrasqueiro/cozinheiro) acompanha a fila de produção em tempo real com atualização automática a cada 5 segundos.',
      'O motoboy recebe entregas disponíveis, aceita, realiza e confirma pagamento — tudo pelo app ou navegador.',
      'O cliente acompanha o pedido em tempo real com status, posição na fila, ETA estimado e dados do entregador.',
      'App Android disponível na Google Play Store com push notifications para pedidos e atualizações.',
    ],
  },
  {
    id: 'hub',
    title: 'Hub — Marketplace de lojas',
    description: 'O ponto de entrada dos clientes: todas as lojas reunidas em um só lugar.',
    icon: HouseLine,
    points: [
      'Listagem de todas as lojas ativas com logo, nome, categoria e status de funcionamento (aberta/fechada).',
      'Busca por nome de loja ou produto para encontrar rapidamente o que o cliente procura.',
      'Filtros por categoria, proximidade e disponibilidade para refinar a navegação.',
      'Acesso direto à vitrine de cada loja com cardápio completo, promoções e informações de contato.',
      'Destaques patrocinados: lojas podem pagar para aparecer em posição privilegiada no Hub.',
      'Experiência mobile-first otimizada para uso no celular, com instalação como app (PWA) ou via Play Store.',
    ],
  },
  {
    id: 'loja',
    title: 'Criar e ativar uma loja',
    description: 'Do cadastro à primeira venda: fluxo completo de onboarding com trial gratuito.',
    icon: Storefront,
    points: [
      'Acesse a página de criação, preencha dados do responsável (CPF/CNPJ), endereço com CEP (preenchimento automático via ViaCEP) e aceite os termos.',
      'O sistema gera automaticamente um slug único para sua loja (ex: janocaminho.com.br/minha-loja).',
      'Confirme o e-mail de verificação enviado para ativar a conta.',
      'Período de trial gratuito configurável — a loja fica ativa sem cobrança durante esse período.',
      'Após o trial, escolha um plano e finalize o pagamento via Pix, cartão ou boleto pelo Mercado Pago.',
      'Ao ativar, configure logo, banner, cores, horários de funcionamento, chave Pix e tipos de pedido aceitos (mesa, retirada, entrega).',
      'A loja aparece automaticamente no Hub assim que estiver aberta e com produtos cadastrados.',
    ],
  },
  {
    id: 'produtos',
    title: 'Produtos, categorias e promoções',
    description: 'Monte seu cardápio digital completo com fotos, preços, destaques e ofertas.',
    icon: Package,
    points: [
      'Crie categorias para organizar seu cardápio (ex: Espetos, Bebidas, Combos, Sobremesas).',
      'Cadastre cada produto com foto, nome, descrição detalhada e preço.',
      'Ative promoções com preço promocional — o cliente vê o valor original riscado e o novo preço em destaque verde.',
      'Use o recurso de destaque para empurrar produtos específicos no topo da vitrine.',
      'Desative produtos temporariamente sem excluí-los quando precisar tirar algo do ar.',
      'Promoções aparecem em toda a jornada: vitrine, carrinho, fila operacional e tela de acompanhamento do cliente.',
    ],
  },
  {
    id: 'estoque',
    title: 'Controle de estoque',
    description: 'Gerencie quantidades reais e evite vender o que não tem.',
    icon: Warehouse,
    points: [
      'Ative a gestão de estoque por produto para controlar quantidade disponível em tempo real.',
      'Defina quantidade inicial e configure alerta de baixo estoque para saber quando repor.',
      'Ajuste o estoque manualmente sempre que entrar ou sair mercadoria da operação.',
      'Configure disponibilidade por dia da semana para esconder itens fora do calendário desejado.',
      'Quando o estoque zera, o produto aparece como "esgotado" automaticamente no cardápio — sem intervenção manual.',
      'Histórico de movimentações para rastrear entradas e saídas.',
    ],
  },
  {
    id: 'fila',
    title: 'Fila operacional e produção',
    description: 'O coração da operação: receba, prepare e libere pedidos com controle total.',
    icon: ForkKnife,
    points: [
      'Pedidos entram automaticamente na fila assim que o cliente conclui a compra.',
      'A fila é a tela principal do operador durante o expediente — atualização automática a cada 5 segundos.',
      'Cards compactos mostram itens, observações, tipo de pedido (mesa/retirada/entrega) e tempo decorrido.',
      'Fluxo de status: Recebido → Em preparo → Pronto → Finalizado (com variações para entrega).',
      'Mesa, retirada e entrega usam o mesmo pedido, mas com regras operacionais diferentes.',
      'Pedidos finalizados vão para o histórico com paginação e contagem diária.',
      'Promoções aparecem nos cards da fila com preço original riscado + promocional em verde.',
    ],
  },
  {
    id: 'impressao',
    title: 'Impressão térmica com RawBT',
    description: 'Imprima comandas e recibos direto na impressora Bluetooth do estabelecimento.',
    icon: Printer,
    points: [
      'Instale o app RawBT (gratuito) no Android usado na operação.',
      'Pareie a impressora térmica via Bluetooth nas configurações do aparelho.',
      'No painel, abra qualquer pedido e use o botão de impressão para gerar a comanda.',
      'O layout da impressão é otimizado para papel de 58mm e 80mm.',
      'Se a impressão falhar, verifique: permissão Bluetooth ativa, impressora ligada, papel carregado e bateria.',
      'Recomendação: faça um teste de impressão antes do horário de pico para garantir que tudo funciona.',
    ],
  },
  {
    id: 'motoboy',
    title: 'Entregadores e delivery',
    description: 'Cadastro com KYC, vínculo por loja, fila de entregas e confirmação de pagamento.',
    icon: Scooter,
    points: [
      'O entregador cria conta própria e envia documentos obrigatórios: CNH, selfie e CRLV.',
      'Verificação assistida por IA compara selfie com foto da CNH (face-worker) — resultado visível para o admin.',
      'O Super Admin aprova ou rejeita os documentos no fluxo KYC global da plataforma.',
      'Cada loja decide se aceita o motoboy na sua operação (aprovar/rejeitar vínculo), independente do KYC.',
      'Pedidos de entrega ficam disponíveis para aceite quando o operador marca como "pronto para entrega".',
      'O motoboy só pode ter 1 entrega ativa por vez — concorrência controlada (dois não aceitam o mesmo pedido).',
      'Acompanhamento completo: entrega atual, histórico, ganhos do dia e confirmação de pagamento em dinheiro/cartão.',
      'O cliente vê o nome do motoboy na tela de acompanhamento quando a entrega está em rota.',
    ],
  },
  {
    id: 'acompanhamento',
    title: 'Acompanhamento de pedido em tempo real',
    description: 'Página pública com status, fila, ETA e QR Pix — sem login necessário.',
    icon: MapPin,
    points: [
      'Cada pedido gera um link público único (janocaminho.com.br/pedido/:id) compartilhável por WhatsApp.',
      'Status exibido em linha visual: Recebido → Em preparo → Pronto → Entregue/Finalizado.',
      'Posição na fila e quantidade total de pedidos à frente são exibidos em tempo real.',
      'ETA v2 com breakdown completo: tempo de preparo + fila + deslocamento + buffer.',
      'QR Code Pix exibido para o cliente quando o pagamento é via Pix (com botão de cópia).',
      'Últimos 3 pedidos ficam salvos no navegador (localStorage) para reabrir o acompanhamento facilmente.',
      'Número do pedido usa prefixo do slug (3 letras) + 8 caracteres do ID para fácil identificação.',
      'Branding da loja (logo, cores) aparece na tela de acompanhamento.',
    ],
  },
  {
    id: 'pagamentos',
    title: 'Pagamentos e Mercado Pago',
    description: 'Cobrança online via Pix, crédito e débito com conexão segura por loja.',
    icon: CreditCard,
    points: [
      'A plataforma usa Mercado Pago em duas camadas: conta da plataforma (planos) e conta do lojista (pedidos).',
      'O lojista conecta sua própria conta Mercado Pago em Financeiro > Pagamentos.',
      'Com a conta conectada, pedidos com Pix, crédito ou débito geram cobrança automática no Mercado Pago do lojista.',
      'Sem conta conectada, o checkout funciona no modo convencional: registra a forma de pagamento, mas a cobrança é feita fora do sistema.',
      'Webhook automático confirma pagamentos aprovados e atualiza o status do pedido.',
      'O lojista pode desconectar a qualquer momento e voltar ao modo convencional.',
      'Chave Pix manual configurável nas configurações da loja para exibição ao cliente.',
    ],
  },
  {
    id: 'planos',
    title: 'Planos, assinatura e renovação',
    description: 'Como a loja se mantém ativa na plataforma após o trial.',
    icon: Tag,
    points: [
      'Trial gratuito configurável pelo Super Admin (padrão: 7 dias) — loja ativa sem cobrança.',
      'Após o trial, a loja precisa escolher um plano pago para continuar operando.',
      'Renovação disponível no painel em /admin/renewal com escolha de plano e geração de pagamento.',
      'Job diário monitora expiração e envia avisos automáticos em D-3, D-1 e D-0.',
      'Pagamentos expirados ou com falha geram novo link automaticamente ao renovar.',
      'Lojas VIP podem ser isentas de cobrança pelo Super Admin.',
      'Planos e valores são gerenciados centralmente e refletem o gateway de pagamento.',
    ],
  },
  {
    id: 'contas',
    title: 'Usuários e perfis de acesso',
    description: 'Cada perfil com seu fluxo, permissões e experiência dedicada.',
    icon: UserCircle,
    points: [
      'Cliente: conta própria para pedidos, endereços salvos, histórico e acompanhamento.',
      'Lojista/Admin: acesso ao painel completo da loja (produtos, fila, pagamentos, configurações, entregadores).',
      'Operador: acesso focado na fila de produção para preparar e liberar pedidos.',
      'Entregador (Motoboy): login específico com fila de entregas, entrega atual, histórico e ganhos.',
      'Super Admin: operação central da plataforma — KYC, lojas, planos, configurações globais e suporte.',
      'Autenticação via JWT com login por e-mail + senha ou slug + senha (admin).',
    ],
  },
  {
    id: 'configuracoes',
    title: 'Configurações da loja',
    description: 'Personalize identidade visual, canais de atendimento e regras operacionais.',
    icon: Gear,
    points: [
      'Identidade visual: logo, banner, descrição e paleta de cores personalizada.',
      'Horários de funcionamento por dia da semana com abertura/fechamento manual.',
      'Contato: WhatsApp, Instagram, e-mail e endereço com mapa (OpenStreetMap).',
      'Tipos de pedido aceitos: entrega, retirada no balcão e mesa.',
      'Chave Pix para exibição ao cliente na tela de pagamento.',
      'Configurações de notificação e impressão operacional.',
      'Slug personalizado para o link da vitrine (janocaminho.com.br/seu-slug).',
    ],
  },
  {
    id: 'condominio',
    title: 'Módulo Condomínio',
    description: 'Lojas exclusivas para moradores de condomínios fechados.',
    icon: Buildings,
    points: [
      'Condomínios podem ter um hub exclusivo com lojas parceiras visíveis apenas para moradores.',
      'Acesso controlado por solicitação e aprovação do síndico/administrador.',
      'Dashboard próprio do condomínio com lojas vinculadas e métricas.',
      'Moradores acessam pelo link do condomínio e veem apenas as lojas disponíveis para eles.',
      'Ideal para condomínios que querem oferecer delivery interno organizado.',
    ],
  },
  {
    id: 'app',
    title: 'App Android e Push Notifications',
    description: 'Experiência nativa na Play Store com notificações em tempo real.',
    icon: DeviceMobile,
    points: [
      'App "Já no Caminho" disponível na Google Play Store para clientes e entregadores.',
      'Push notifications para: novo pedido (lojista), status atualizado (cliente), entrega disponível (motoboy).',
      'Instalação como PWA também disponível para quem preferir não baixar da loja.',
      'Configurações de push, câmera e permissões acessíveis pelo menu lateral do app.',
      'Atualizações automáticas via Play Store — sempre na versão mais recente.',
    ],
  },
  {
    id: 'metricas',
    title: 'Dashboard e métricas',
    description: 'Dados que ajudam o lojista a tomar decisões melhores.',
    icon: ChartLineUp,
    points: [
      'Dashboard com visão geral: pedidos do dia, faturamento, ticket médio e produtos mais vendidos.',
      'Histórico de pedidos com filtros por data, status e tipo.',
      'Relatório de ganhos do motoboy por dia, semana e mês.',
      'Contagem de pedidos finalizados no dia visível na fila operacional.',
      'Métricas de assinatura e status de pagamento no painel do lojista.',
    ],
  },
  {
    id: 'seguranca',
    title: 'Segurança e LGPD',
    description: 'Proteção de dados, termos de uso e conformidade legal.',
    icon: ShieldCheck,
    points: [
      'Aceite obrigatório de Termos de Uso e Política de Privacidade (LGPD) no cadastro.',
      'Dados sensíveis armazenados com criptografia, incluindo credenciais de pagamento e senhas protegidas.',
      'Verificação de e-mail obrigatória para ativar conta.',
      'KYC do motoboy com verificação facial assistida por IA para segurança da operação.',
      'Consentimento de cookies com banner configurável.',
      'Termos e LGPD editáveis pelo Super Admin via site_settings.',
    ],
  },
];

export function SystemGuidePage() {
  return (
    <LandingPageLayout>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#0a0f1a_0%,#101829_40%,#0f172a_100%)] py-16 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.08),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(99,102,241,0.06),_transparent_50%)]" />

        <div className="relative max-w-6xl mx-auto px-4">
          {/* Header com logo */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-14 w-14 rounded-2xl overflow-hidden ring-2 ring-white/10 shadow-[0_0_40px_-10px_rgba(56,189,248,0.3)]">
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-sky-400/80 font-semibold">Guia funcional</p>
              <p className="text-sm text-slate-400 font-medium">Já no Caminho</p>
            </div>
          </div>

          {/* Hero */}
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-5xl font-black text-white leading-[1.08] tracking-tight">
              Tudo que você precisa saber para operar a plataforma
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl">
              Manual completo para lojistas, operadores, entregadores e suporte.
              Do cadastro à primeira venda, da fila operacional ao delivery com motoboy.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="/create?plan=trial"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-sky-500 to-sky-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_-8px_rgba(14,165,233,0.5)] transition hover:from-sky-400 hover:to-sky-500 hover:shadow-[0_16px_40px_-8px_rgba(14,165,233,0.6)]"
              >
                Criar loja grátis
              </a>
              <a
                href="/hub"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-bold text-slate-200 backdrop-blur transition hover:bg-white/10 hover:border-white/20"
              >
                <HouseLine size={18} weight="bold" />
                Abrir Hub
              </a>
            </div>
          </div>

          {/* Grid principal */}
          <div className="mt-12 grid gap-5 lg:grid-cols-[0.32fr_0.68fr]">
            {/* Sidebar navegação */}
            <aside className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-4">Navegação rápida</p>
              <div className="space-y-1.5">
                {guideSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="flex items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-[13px] font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-sky-400 hover:border-white/[0.06]"
                    >
                      <Icon size={16} weight="duotone" className="shrink-0 opacity-60" />
                      <span className="truncate">{section.title}</span>
                    </a>
                  );
                })}
              </div>
            </aside>

            {/* Conteúdo */}
            <div className="grid gap-5">
              {guideSections.map((section) => {
                const Icon = section.icon;
                return (
                  <article
                    key={section.id}
                    id={section.id}
                    className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7 backdrop-blur-sm transition hover:border-white/[0.1] hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 text-sky-400 ring-1 ring-white/[0.08]">
                        <Icon size={20} weight="duotone" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">{section.title}</h2>
                        <p className="mt-1 text-sm text-slate-500 leading-relaxed">{section.description}</p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-2">
                      {section.points.map((point, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 text-[13px] leading-relaxed text-slate-300"
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-[10px] font-bold text-sky-400">
                            {idx + 1}
                          </span>
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Footer CTA */}
          <div className="mt-14 text-center">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-6 py-4 backdrop-blur-sm">
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/10" />
              <div className="text-left">
                <p className="text-sm font-bold text-white">Pronto para começar?</p>
                <p className="text-xs text-slate-500">Crie sua loja gratuitamente e comece a vender hoje.</p>
              </div>
              <a
                href="/create?plan=trial"
                className="ml-4 rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-400"
              >
                Começar
              </a>
            </div>
          </div>
        </div>
      </section>
    </LandingPageLayout>
  );
}
