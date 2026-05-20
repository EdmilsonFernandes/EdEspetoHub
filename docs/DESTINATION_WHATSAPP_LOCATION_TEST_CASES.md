# Casos de uso - localizacao no WhatsApp de destinos

Objetivo: garantir que o contato manual de chales, pousadas, servicos e lojas oficiais leve a localizacao do lugar que o turista esta vendo.

## Cenários cobertos por teste

- Hospedagem com WhatsApp, endereco e coordenadas: o link do WhatsApp deve incluir `Local da hospedagem` e `Mapa da hospedagem`.
- Hospedagem com loja oficial vinculada: o link para a loja deve carregar os parametros da hospedagem para a mensagem posterior do WhatsApp.
- Servico sem hospedagem vinculada: a mensagem deve usar `Local do atendimento` e gerar mapa por endereco quando nao houver latitude/longitude.

## Como testar manualmente

1. Abra `/destinos/<cidade>`.
2. Escolha um chale/pousada com endereco cadastrado.
3. Toque em `Falar` e confira se a mensagem do WhatsApp mostra o endereco e o link do mapa.
4. Entre no detalhe do chale/pousada.
5. Toque em uma loja oficial vinculada.
6. Ao chamar a loja pelo WhatsApp, confira se a mensagem informa em qual hospedagem o cliente esta e inclui a localizacao dela.
7. Abra um servico direto da cidade sem hospedagem.
8. Confira se a mensagem usa `Local do atendimento`, sem falar em APK ou termos tecnicos.

## Resultado esperado

O comerciante recebe a mensagem ja com contexto suficiente para saber de onde veio o cliente, qual hospedagem ele esta vendo e qual endereco/mapa usar para orientar o atendimento.
