# Implementacoes Recentes - Home, Auth, Checkout e Mobile

Documento para alinhamento com desenvolvimento/QA sobre os ajustes implementados recentemente no app Ja no Caminho.

## Resumo Executivo

Foram feitos ajustes em quatro frentes principais:

- Polimento premium da Home geral do app.
- Correcoes de fluxo no checkout e safe area mobile.
- Evolucao do cadastro/login do usuario final com validacao por codigo de email.
- Melhorias de sessao, biometria, avatar cache, menu vertical e protecoes contra pedido anonimo malicioso.

As alteracoes foram implementadas de forma incremental e com build validado ao final dos commits principais.

## Home Geral do App

### Busca, destino e filtros

Arquivo principal:

- `frontend/src/pages/MarketplacePage.tsx`
- `frontend/src/components/Marketplace/HeaderAvatarTrigger.tsx`

O topo da home foi redesenhado para ficar mais premium e menos "flat":

- Header sticky recebeu visual glass/gradiente, borda suave, sombra e blur.
- Avatar do usuario deixou de ser apenas circular simples e passou a ter formato arredondado premium, sombra e ring.
- Bloco "Entregar em" virou um mini-card com icone de localizacao, melhor hierarquia visual e melhor area clicavel.
- Campo de busca foi refinado com fundo mais solido, sombra, foco mais elegante e icone dentro de bloco destacado.
- Filtros rapidos foram transformados em chips com icones e estado ativo mais forte.
- Labels dos filtros foram compactados para melhorar espaco mobile:
  - `Ver Todos` virou `Todos`.
  - `Frete Gratis` virou `Frete gratis`.
  - `Perto de Voce` virou `Perto de voce`.
  - `Abertos Agora` virou `Abertos`.
- Botao `Limpar` ganhou icone e visual mais integrado.

### Banner da home

Arquivo principal:

- `frontend/src/pages/MarketplacePage.tsx`

Foi criado mais respiro entre a busca/filtros e o banner. O carrossel de destaques agora fica dentro de um card premium:

- Container com fundo glass/gradiente.
- Borda e sombra mais suaves.
- Glows discretos no fundo.
- Titulo `Destaques`.
- Subtitulo contextual.
- Melhor separacao visual entre busca e conteudo promocional.

## Checkout e Safe Area Mobile

Arquivos principais envolvidos:

- `frontend/src/pages/StorePage.tsx`
- Componentes de checkout/cart relacionados ao fluxo normal e condominio.

Problemas tratados:

- Header do checkout conflitando com relogio/bateria do celular.
- Duplicidade de voltar/header no checkout.
- Perda de visual premium apos remover redundancia.
- Espaco superior branco com aparencia amadora.
- Nome/telefone do pedido sendo preenchidos com dados antigos da ultima sessao.

Alteracoes:

- Removido header global duplicado quando a view esta em `cart`.
- Checkout passou a manter um unico header premium com botao voltar, logo/avatar da loja e nome da loja.
- Safe area superior foi protegida para app nativo.
- Quando o usuario esta logado, os dados reais da sessao do cliente passam a ter prioridade sobre cache antigo do checkout.
- Cache antigo de dados de checkout e ignorado/removido quando existe sessao logada.

## Logout e Sessoes de Cliente

Arquivos principais:

- `frontend/src/utils/customerSessionStorage.ts`
- `frontend/src/pages/MarketplacePage.tsx`
- `frontend/src/pages/StorePage.tsx`

Problema:

- Apos sair da conta, ao voltar para home e abrir uma loja, o app podia restaurar uma sessao antiga do cliente na loja.
- Isso fazia parecer que o usuario ainda estava logado e tambem preenchia dados antigos no checkout.

Solucao:

- Criado utilitario centralizado para limpar todas as sessoes de cliente.
- Logout da home agora limpa:
  - `customerSession`
  - `customerSession:<slug>`
  - chaves antigas no padrao `customerSession_...`
- StorePage tambem usa a mesma rotina de limpeza ao sair/limpar sessao.

## Cadastro de Usuario Final com Codigo de Email

Arquivos/backend e frontend relacionados ao fluxo de auth do cliente.

Objetivo:

- Manter o fluxo atual do lojista com link/token por email sem regressao.
- Implementar para usuario final um fluxo especifico com codigo de 4 digitos no app.

Fluxo implementado:

- Usuario final preenche cadastro no app.
- Sistema envia codigo de 4 digitos para o email informado.
- App exibe modal premium para inserir o codigo.
- Codigo tem validade de 30 minutos.
- Se o usuario tentar logar sem confirmar, o app informa que falta confirmar a conta e permite reenviar codigo.
- Ao reenviar, o usuario consegue finalizar a confirmacao.
- Flow do lojista permanece com token/link tradicional.

Correcoes posteriores no OTP:

- Mensagem de erro generica foi ajustada para indicar codigo/token incorreto de forma mais coerente.
- Corrigido bug visual onde a tela piscava ao errar o ultimo digito por causa da verificacao automatica.
- Mantida verificacao automatica ao preencher todos os digitos, mas sem travar/piscar a tela.

## Biometria

Decisao de produto:

- Voltar a suportar apenas uma conta biometrica por aparelho.
- Ao cadastrar/habilitar biometria para uma nova conta, ela passa a ser a conta biometrica vigente.
- Evita confusao de multiplas contas de cliente competindo no login biometrico.

Complementos:

- Botao de login biometrico foi reposicionado para ficar imediatamente acima da acao principal de login.
- Autologin biometrico do cliente foi preservado/restaurado.

## Cache de Avatar do Cliente

Arquivos principais:

- Hook/util de cache de imagem de perfil do cliente.
- Pontos de uso no header/menu do marketplace.

Problema:

- Foto do perfil do cliente demorava para carregar toda vez.

Solucao:

- Implementado cache local mais agressivo para avatar do cliente.
- A imagem passa a ser reaproveitada localmente.
- Invalidacao ocorre quando a foto/perfil muda, evitando buscar novamente sem necessidade.

## Menu Vertical / Drawer

Arquivos principais:

- `frontend/src/components/Marketplace/ProfileDrawer.tsx`
- Componentes relacionados ao drawer do marketplace.

Melhorias:

- Menu de convidado foi polido para visual premium.
- Botao superior ficou focado em entrada/login.
- Guia de primeiro acesso ficou responsavel pelo fluxo de criacao de conta.
- Rodape do menu vertical foi redesenhado com visual premium, logo e versao.
- Acao `Sair da conta` foi harmonizada visualmente com fundo pastel e consistencia com os demais itens.
- Area de perfil foi refinada para evitar label `cliente` visualmente estranho.
- Copys como ajuda/termos foram melhoradas em pontos anteriores.

## Alternar Acesso

Arquivos principais:

- Componentes do modal/fluxo de alternancia de acesso.

Melhorias:

- Modal de alternar acesso foi redesenhado com referencia premium.
- Cards para Usuario, Lojista e Entregador ficaram mais claros, com status e biometria.
- Visual foi aproximado do modelo enviado: fundo com blur, cards arredondados, destaque do acesso atual e botao de fechar.

## Admin / Operador

Arquivos principais:

- Areas de admin/fila de pedidos.
- Componentes de header/admin e access switcher.

Melhorias:

- Ajuste para acelerar recuperacao/reconexao do feed de pedidos.
- Polimento no access switcher.
- Correcoes anteriores em destaque/admin dashboard para nao perder menu vertical ao navegar.

## Pedidos Anonimos e Protecao Antiabuso

Arquivos principais:

- Fluxo de checkout.
- Backend/servicos relacionados a pedidos convidados.

Problema:

- Pedido anonimo podia ser feito sem telefone/WhatsApp obrigatorio.
- Isso abria margem para pedidos maliciosos ou sem contato.

Decisao:

- Para usuario logado, admin ou operador: telefone pode continuar opcional/preenchido automaticamente conforme o caso.
- Para pedido anonimo: telefone/WhatsApp passa a ser obrigatorio.

Protecoes implementadas:

- Guard para pedido convidado com telefone obrigatorio.
- Protecao por IP/telefone para reduzir abuso em pedido anonimo.
- Estrutura preparada para evoluir depois com painel de bloqueio, pagamento antecipado ou validacao real via WhatsApp/SMS.

Observacao:

- A insercao manual de telefone bloqueado via banco foi deixada de lado por enquanto, conforme decisao posterior.

## Android / App Nativo

Alteracoes recentes:

- Icone instalado do app foi trocado pelo novo asset enviado.
- Versoes Android foram incrementadas quando necessario para gerar AAB aceito pela Play Store.
- AABs foram gerados nas rodadas em que houve alteracao nativa/versao.
- Ajustes de safe area e espacamento mobile foram feitos para reduzir sobreposicao com rodape/menu inferior em fontes medias.

## Commits Recentes Relevantes

- `afd8f364` - `style(hub): premiumize search and filters header`
- `4ac5bcbd` - `style(hub): add premium spacing around banner`
- `d1282fa1` - `fix(auth): clear store customer sessions on logout`
- `88e17f60` - `fix(checkout): prioritize logged customer identity`
- `5cd164bd` - `style(checkout): restore premium store header`
- `ba66472c` - `fix(checkout): remove duplicate store header`
- `0170770e` - `style(drawer): harmonize logout action`
- `c897ab91` - `fix(admin): speed up order feed recovery and polish access switcher`
- `efdf900b` - `fix(checkout): protect mobile header safe area`
- `dba92551` - `fix(mobile): polish auth code and safe checkout chrome`
- `e90c146c` - `fix(checkout): protect guest orders and restore customer auto biometrics`
- `77b0c2ae` - `feat(checkout): add guest order ip and phone block guard`
- `0b1fa673` - `feat(customer-auth): add in-app email otp flow`
- `b91fbbd4` - `perf(client): cache customer profile avatar locally`
- `93d2ec7c` - `feat(app): refresh admin polish and replace installed app icon`

## Pontos de QA Recomendados

Validar em app mobile com fonte pequena, media e grande:

- Home geral: header, avatar, destino, busca, filtros e banner.
- Busca: foco, limpar, scroll entre telas e retorno para home.
- Checkout normal: safe area, header unico, nome/telefone quando logado e anonimo.
- Checkout condominio: safe area, header unico e finalizacao.
- Logout cliente: sair, voltar para home, abrir loja e confirmar que nao restaura sessao antiga.
- Cadastro usuario final: receber codigo, inserir codigo certo, inserir codigo errado e reenviar.
- Login sem conta confirmada: mensagem e reenvio de codigo.
- Biometria: uma conta vigente por aparelho.
- Pedido anonimo: telefone obrigatorio.
- Menu vertical: perfil, sair da conta, rodape com versao, primeiro acesso e entrar.

## Observacoes para o Desenvolvedor

- O fluxo de lojista com token/link por email deve permanecer como esta.
- O fluxo novo de codigo de 4 digitos e apenas para usuario final/cliente do app.
- A limpeza de sessao de cliente deve continuar centralizada em `customerSessionStorage.ts`.
- Nao reintroduzir cache antigo de checkout sobrepondo usuario logado.
- Cuidado com safe area em telas nativas: o problema mais recorrente foi conflito com hora/bateria e rodape.
- Alteracoes visuais recentes seguem a direcao premium: glassmorphism discreto, sombras suaves, azul petroleo, tons claros e hierarquia forte.
