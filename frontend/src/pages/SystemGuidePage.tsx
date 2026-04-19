import {
  BellRinging,
  CreditCard,
  ForkKnife,
  Gear,
  HouseLine,
  Package,
  Printer,
  Scooter,
  Storefront,
  UserCircle,
  Warehouse,
} from '@phosphor-icons/react';
import { LandingPageLayout } from '../layouts/LandingPageLayout';

const guideSections = [
  {
    id: 'inicio',
    title: 'Visao geral do sistema',
    description: 'Entenda os perfis e o fluxo principal da plataforma.',
    icon: Storefront,
    points: [
      'Cliente compra pelo Hub ou pela vitrine da loja.',
      'Lojista recebe o pedido na fila operacional.',
      'Operador ou lojista muda os status de preparo.',
      'Motoboy entra quando o fluxo for de entrega.',
      'Cliente acompanha o pedido em tempo real pelo app ou navegador.',
    ],
  },
  {
    id: 'loja',
    title: 'Como criar e ativar uma loja',
    description: 'Fluxo de cadastro, verificacao, plano e ativacao inicial.',
    icon: Storefront,
    points: [
      'Acesse a pagina de criacao da loja e preencha os dados principais.',
      'Confirme o e-mail quando o sistema enviar o codigo de verificacao.',
      'Finalize o pagamento ou o trial para liberar a operacao.',
      'Acesse o painel admin da loja com o login do responsavel.',
      'Revise horarios, banner, logo, Pix e tipos de pedido antes de publicar.',
    ],
  },
  {
    id: 'produtos',
    title: 'Como criar produtos e organizar categorias',
    description: 'Cadastre catalogo, destaque, preco e disponibilidade.',
    icon: Package,
    points: [
      'Entre na area de Produtos do painel administrativo.',
      'Crie categorias para separar alimentos, bebidas, higiene ou qualquer segmento.',
      'Cadastre foto, nome, descricao e preco de cada item.',
      'Use destaque e promocao quando quiser empurrar um produto na vitrine.',
      'Desative produtos sem excluir quando precisar tirar algo do ar rapidamente.',
    ],
  },
  {
    id: 'estoque',
    title: 'Como controlar disponibilidade e estoque',
    description: 'Mantenha o catalogo sincronizado com a operacao.',
    icon: Warehouse,
    points: [
      'Ative a gestao de estoque por produto quando quiser controlar quantidade real.',
      'Defina quantidade inicial e alerta de baixo estoque para acompanhar reposicao.',
      'Ajuste o estoque manualmente na area de Estoque sempre que entrar ou sair mercadoria.',
      'Use disponibilidade por dia da semana para esconder itens fora do calendario desejado.',
      'Quando o estoque zerar, o cliente passa a ver o item como esgotado no cardapio.',
    ],
  },
  {
    id: 'fila',
    title: 'Como gerenciar a fila de pedidos',
    description: 'Fluxo da tela sensivel da operacao: receber, preparar, liberar e finalizar.',
    icon: ForkKnife,
    points: [
      'Pedidos entram automaticamente na fila quando o cliente conclui a compra.',
      'A fila deve ser a tela principal do operador durante a producao.',
      'Altere os status conforme o preparo avanca para manter cliente e equipe sincronizados.',
      'Mesa, retirada e entrega usam o mesmo pedido, mas com regras operacionais diferentes.',
      'Pedidos finalizados saem do foco operacional e vao para historico.',
    ],
  },
  {
    id: 'impressao',
    title: 'Como imprimir em impressora termica com RawBT',
    description: 'Ligacao com bluetooth, teste de impressao e uso no dia a dia.',
    icon: Printer,
    points: [
      'Instale o RawBT no Android usado na operacao.',
      'Pareie a impressora termica via bluetooth no aparelho.',
      'Abra um pedido e use o fluxo de impressao configurado no painel.',
      'Se a impressao falhar, confirme permissao bluetooth, bateria e papel.',
      'Mantenha um teste simples impresso antes do horario de pico.',
    ],
  },
  {
    id: 'motoboy',
    title: 'Como associar e operar motoboy',
    description: 'Cadastro, documentos, vinculo com loja e entrega.',
    icon: Scooter,
    points: [
      'O entregador cria conta e envia documentos do fluxo KYC.',
      'A loja aprova o vinculo quando o perfil estiver apto.',
      'Pedidos de entrega ficam disponiveis para aceite quando liberados.',
      'O motoboy acompanha entrega atual, historico e ganhos no app.',
      'Pagamento pendente em dinheiro ou cartao pode depender da confirmacao final da entrega.',
    ],
  },
  {
    id: 'contas',
    title: 'Usuarios, contas e acessos',
    description: 'Cliente, lojista, operador e entregador cada um no seu fluxo.',
    icon: UserCircle,
    points: [
      'Cliente usa conta propria para pedidos, enderecos e acompanhamento.',
      'Lojista e operador entram pelo acesso profissional.',
      'Entregador usa o login especifico de motoboy.',
      'Super Admin fica reservado para operacao central e suporte da plataforma.',
    ],
  },
  {
    id: 'configuracoes',
    title: 'Configuracoes importantes da loja',
    description: 'Ajustes que impactam vitrine, venda e atendimento.',
    icon: Gear,
    points: [
      'Logo, banner e cores da loja.',
      'Horarios de funcionamento e abertura manual.',
      'Contato da loja, WhatsApp e endereco.',
      'Tipos de pedido: entrega, retirada e mesa.',
      'Configuracoes de notificacao e impressao operacional.',
    ],
  },
  {
    id: 'renovacao',
    title: 'Planos, renovacao e pagamentos',
    description: 'Como a loja continua ativa na plataforma.',
    icon: CreditCard,
    points: [
      'A renovacao fica disponivel quando a assinatura exige regularizacao.',
      'A loja pode estar isenta quando configurada como VIP no Super Admin.',
      'Pagamento pendente leva o lojista para a tela correta de regularizacao.',
      'Os valores de plano devem sempre refletir o backend e o gateway de pagamento.',
    ],
  },
  {
    id: 'push',
    title: 'Push, foto e permissoes do app',
    description: 'Onde ativar e revisar acessos pelo proprio aplicativo.',
    icon: BellRinging,
    points: [
      'Cliente encontra configuracoes no menu lateral do Hub.',
      'Push pode ser ativado ou revisado sem sair do app.',
      'Acesso a foto e camera tambem pode ser solicitado novamente por la.',
      'No Android, alguns comportamentos dependem da versao instalada do app.',
    ],
  },
];

export function SystemGuidePage() {
  return (
    <LandingPageLayout>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_48%,#ffffff_100%)] py-14 sm:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(47,157,247,0.16),_transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-4">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-700 font-semibold">Guia funcional</p>
            <h1 className="mt-3 text-3xl sm:text-5xl font-black text-slate-900 leading-[1.05]">
              Como usar o Ja no Caminho na pratica
            </h1>
            <p className="mt-4 text-sm sm:text-lg text-slate-600">
              Um manual operacional da plataforma, pensado para lojista, operador, entregador e suporte.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/create?plan=trial"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.6)] transition hover:bg-slate-800"
              >
                Criar loja
              </a>
              <a
                href="/hub"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
              >
                <HouseLine size={18} weight="bold" />
                Abrir Hub
              </a>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[0.36fr_0.64fr]">
            <aside className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.35)]">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Navegacao rapida</p>
              <div className="mt-4 space-y-2">
                {guideSections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-white hover:border-sky-200 hover:text-sky-700 transition"
                  >
                    <span>{section.title}</span>
                    <span className="text-slate-300">#</span>
                  </a>
                ))}
              </div>
            </aside>

            <div className="grid gap-4">
              {guideSections.map((section) => {
                const Icon = section.icon;
                return (
                  <article
                    key={section.id}
                    id={section.id}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.3)]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#0f172a,#1d4ed8)] text-white shadow-[0_16px_30px_-18px_rgba(29,78,216,0.55)]">
                        <Icon size={22} weight="duotone" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900">{section.title}</h2>
                        <p className="mt-1 text-sm text-slate-500">{section.description}</p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-2">
                      {section.points.map((point) => (
                        <div
                          key={point}
                          className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-700"
                        >
                          {point}
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </LandingPageLayout>
  );
}
