# Conversa e ajustes - EdEspetoHub

## Ajustes feitos
- Corrigido erro de tela branca no `StorePage` (referencia a `storeSlug` fora de escopo).
- Admin > Fila do churrasqueiro:
  - Header com logo/identidade mantido e responsivo.
  - Botões "Voltar" (para vitrine) e "Sair" no header.
  - Corrigido "Adicionar item" na fila: comparação de `id` como string.
  - Nome do cliente exibido como "Cliente: ..."; telefone aparece apenas se existir.
  - Estados da fila voltaram para amarelo/verde padrão.
- Admin > Tema:
  - Criadas classes utilitárias de tema em `src/index.css` (brand primary/secondary).
  - Aplicadas cores da loja em telas admin (principais ações e destaques).
  - Ações destrutivas/erros mantidas em vermelho padrão.
- Admin > Dashboard:
  - Dashboard reorganizado em abas: Resumo, Produtos, Configurações, Fila.
- Admin > Pedidos:
  - Lista real de pedidos com detalhes (status, total, itens).
  - Filtros: status + data, busca, limpar filtros.
  - Modo Cards/Tabela com persistência no localStorage.
  - Tabela compacta no mobile (esconde colunas).
- Vitrine (loja):
  - Aplicadas cores de marca no Menu, Carrinho e Sucesso.
  - Status Aberto/Fechado com cores da loja.

## Arquivos principais alterados
- frontend/src/pages/StorePage.tsx
- frontend/src/pages/AdminDashboard.tsx
- frontend/src/pages/AdminOrders.tsx
- frontend/src/pages/AdminQueue.tsx
- frontend/src/components/Admin/GrillQueue.tsx
- frontend/src/components/Admin/DashboardView.tsx
- frontend/src/components/Admin/ProductManager.tsx
- frontend/src/components/Admin/StoreIdentityCard.tsx
- frontend/src/components/Admin/OpeningHoursCard.tsx
- frontend/src/pages/AdminLogin.tsx
- frontend/src/components/Client/MenuView.tsx
- frontend/src/components/Client/CartView.tsx
- frontend/src/components/Client/SuccessView.tsx
- frontend/src/index.css

## Pendências / próximos ajustes possíveis
- Validar se precisa limpar o select "Adicionar item" após incluir.
- Opcional: mostrar telefone/mesa também no Admin > Pedidos (cards/tabela).
- Testar fluxo completo no navegador (dev server).
