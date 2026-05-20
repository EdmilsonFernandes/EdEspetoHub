# Casos de teste - observação do cliente no pedido

## Objetivo
Validar que o cliente consegue enviar uma observação opcional no checkout sem quebrar pedido, fila, impressão e fluxos existentes.

## Casos manuais recomendados
1. Pedido sem observação: finalizar retirada e entrega; a fila não deve mostrar bloco de observação.
2. Pedido com observação curta: digitar "sem ketchup" na revisão; confirmar que aparece na fila admin e no detalhe do pedido.
3. Pedido com observação longa: colar mais de 240 caracteres; o campo deve limitar o texto e manter o layout mobile sem scroll horizontal.
4. Pedido de condomínio: preencher observação, finalizar e confirmar que a operação recebe a mensagem.
5. Cupom do lojista: imprimir pedido com observação e conferir o bloco "OBS CLIENTE".
6. WhatsApp para loja em pedido visitante de retirada/mesa: conferir que a mensagem inclui a observação.
7. Regressão da fila: iniciar preparo, marcar pronto, finalizar e adicionar item continuam funcionando.
8. Regressão mobile: revisar no celular se o campo não cobre o botão final e não força movimento lateral.
