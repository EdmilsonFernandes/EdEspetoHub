# Refactor da Home/Hub Marketplace

Este documento explica a organizacao atual da Home principal do app (`/hub`) depois do refactor do `MarketplacePage.tsx`.

## Objetivo do refactor

Antes, `frontend/src/pages/MarketplacePage.tsx` concentrava muita responsabilidade: UI, chamadas de API, GPS, endereco principal, cache de distancia, filtros, favoritos, pedidos ativos e estados de loading. Isso dificultava manutencao, aumentava risco de regressao e deixava qualquer ajuste visual ou funcional mais perigoso.

O refactor transformou a pagina em uma camada de orquestracao. Ela continua montando a experiencia final da Home, mas regras de estado e dados foram movidas para hooks especificos em `frontend/src/hooks/hub/`.

## Estrutura principal

- `frontend/src/pages/MarketplacePage.tsx`: orquestra o Hub. Deve juntar hooks, componentes, callbacks e estados pequenos de tela.
- `frontend/src/components/Marketplace/Hub/`: componentes visuais do Hub, como header, filtros, cards, carrosseis, favoritos, estados vazios/loading e popup.
- `frontend/src/hooks/hub/`: regras de tela, estado, cache, polling e chamadas de API ligadas ao Hub.
- `frontend/src/services/`: clientes HTTP usados pelos hooks e paginas.
- `frontend/src/utils/`: formatadores, resolucao de assets, links, regras puras e funcoes reutilizaveis.

## Hooks do Hub

- `useHubSearchPlaceholder`: controla a rotacao do placeholder da busca.
- `useHubFavorites`: controla favoritos de lojas no `localStorage` e ordena favoritos abertos primeiro.
- `useHubFeaturedProducts`: busca e monta itens em destaque patrocinados/organicos.
- `useHubLocation`: resolve endereco principal do cliente, fallback por GPS, regiao ativa, label exibida e link de destinos com contexto.
- `useHubStores`: carrega a vitrine de lojas via `storeService.listPortfolio`, controla loading, erro, refresh e alternancia entre "minha regiao" e "todas as lojas".
- `useHubStoreDistances`: calcula distancia local por Haversine quando a API nao entrega distancia pronta, cacheia por contexto e preserva cache valido em caso de falha.
- `useHubAnonymousOrders`: hidrata pedidos anonimos salvos no navegador e reconcilia status publico.
- `useHubCustomerActiveOrders`: faz polling dos pedidos ativos do cliente logado.

## Fluxo de dados atual

1. `MarketplacePage.tsx` le sessao do cliente, filtros de UI e contexto selecionado, como condominio.
2. `useHubLocation` define o contexto geografico ativo. O endereco principal do cliente tem prioridade sobre GPS.
3. `useHubStores` chama a vitrine de lojas com cidade/estado/lat/lng quando a Home esta regionalizada.
4. `MarketplacePage.tsx` enriquece a lista com assets, status de abertura, badges, segmentos e favoritos.
5. `useHubStoreDistances` calcula distancias locais apenas quando necessario.
6. Componentes em `components/Marketplace/Hub/` renderizam header, filtros, destaques, favoritos, lista de lojas e estados de loading/vazio.

## Regras de manutencao

- Nao recolocar chamadas grandes de API, efeitos de GPS, cache ou polling diretamente em `MarketplacePage.tsx`.
- Nova regra de estado/cache/localStorage/polling deve virar hook em `frontend/src/hooks/hub/`.
- Nova UI deve virar componente pequeno em `frontend/src/components/Marketplace/Hub/`.
- Preservar a ordenacao de lojas e filtros existentes, salvo pedido explicito.
- Qualquer mudanca em lojas, filtros, destaques, pedidos ativos ou navegacao mobile deve ter teste unitario/e2e ajustado.
- Se mexer em build info, versionamento ou release, nao commitar arquivos gerados por `npm run build` sem intencao clara.

## Sobre o app e versao

O menu vertical usa `ProfileDrawer`. A versao exibida no modal "Sobre o app" vem de `APP_BUILD_INFO.versionLabel`, passado pela `MarketplacePage`.

Nao criar outra fonte de versao para o drawer. A fonte oficial continua sendo `frontend/src/generated/buildInfo.ts`, gerada pelo script de build.

## Testes adicionados no refactor

- `useHubLocation.test.tsx`: valida que o endereco principal do cliente vira contexto ativo do Hub.
- `useHubStores.test.tsx`: valida carregamento regionalizado e alternancia para todas as lojas sem contexto geografico.
- `useHubStoreDistances.test.tsx`: valida calculo e cache local de distancia.

## Validacao recomendada para mudancas no Hub

```bash
npm --prefix frontend run test:unit
npm --prefix frontend run build
sh scripts/compose-dev-frontend.sh
```

Depois do rebuild local Docker:

```bash
curl -I http://localhost:8080/hub
curl -I http://localhost:8080/api/public/stores
docker exec janocaminho-postgres psql -U postgres -d espetinho -c "SELECT 'users' entidade, COUNT(*) total FROM users UNION ALL SELECT 'stores', COUNT(*) FROM stores UNION ALL SELECT 'products', COUNT(*) FROM products UNION ALL SELECT 'orders', COUNT(*) FROM orders UNION ALL SELECT 'site_settings', COUNT(*) FROM site_settings ORDER BY entidade;"
```

Se a mudanca afetar UX critica, navegacao mobile, filtros, lojas, destaques ou pedidos ativos:

```bash
npm --prefix frontend run test:e2e
```
