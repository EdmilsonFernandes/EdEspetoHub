# Casos de uso para validar a fila do lojista

Use estes testes manuais depois de subir a tela `/admin/queue`.

## Loading e atualizacao

1. Abrir `/admin/queue` com internet normal e sem pedidos carregados em cache.
   - Esperado: aparece apenas o skeleton de carregamento da aba ativa.
   - Nao deve aparecer skeleton e faixa azul de carregamento ao mesmo tempo.

2. Com pedidos visiveis, atualizar a pagina ou aguardar o polling.
   - Esperado: os cards continuam na tela e aparece apenas uma faixa discreta de atualizacao.
   - Nao deve bloquear clique nos pedidos.

3. Alternar para `Em rota` e `Vendas`.
   - Esperado: cada aba mostra loading proprio apenas quando estiver vazia.
   - Nao deve misturar loading da fila com loading de historico.

## Detalhe do pedido

4. No desktop/web, clicar em um card de pedido.
   - Esperado: o detalhe abre centralizado na tela, com overlay escuro e sem cobrir o menu lateral.
   - O botao fechar deve voltar para a fila sem alterar status.

5. No celular/app, clicar em um card de pedido.
   - Esperado: o detalhe abre em tela cheia, sem scroll lateral e com as acoes visiveis acima da area segura inferior.

6. Abrir um pedido e acionar confirmacao de pagamento/finalizacao quando disponivel.
   - Esperado: o modal de confirmacao fica acima do detalhe do pedido.

## Inclusao de itens

7. Abrir o detalhe de um pedido e pesquisar um produto existente por 3 letras.
   - Esperado: a lista mostra imagem, nome, categoria e preco.

8. Selecionar um produto e tocar em `Incluir`.
   - Esperado: o item entra no pedido como `Novo`, sem mudar automaticamente o status do pedido.

9. Abrir `Catalogo com fotos` com muitos produtos.
   - Esperado: a lista fica navegavel, agrupada por categoria, com imagem e preco.

10. Buscar um item inexistente.
    - Esperado: a tela orienta a abrir o catalogo ou adicionar item avulso.

## Regressao sensivel

11. Validar pedidos nos status `pending`, `preparing`, `ready_for_delivery`, `waiting_for_motoboy`, `in_delivery`, `dispatched`, `done` e `cancelled`.
    - Esperado: os botoes de acao continuam respeitando as mesmas regras de antes.

12. Validar pedido de retirada, entrega, mesa e condominio.
    - Esperado: os identificadores continuam legiveis e nao cortam informacao importante.
