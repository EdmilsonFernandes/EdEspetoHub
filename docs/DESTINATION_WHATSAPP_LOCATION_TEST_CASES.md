# Casos de uso - localizacao no WhatsApp de destinos

Objetivo: garantir que o contato manual de chales, pousadas, servicos e lojas oficiais leve a localizacao do chale/pousada onde o turista esta hospedado quando o contato partir desse contexto.

## Cenários cobertos por teste

- Hospedagem com WhatsApp, endereco e coordenadas: o link do WhatsApp deve incluir o endereco para entrega e a localizacao do chale.
- Hospedagem com loja oficial vinculada: o link para a loja deve carregar os parametros da hospedagem para a mensagem posterior do WhatsApp.
- Servico aberto dentro de um chale: a mensagem deve enviar para o restaurante/servico a referencia da hospedagem e o link `Como chegar ate meu chale`.
- Servico sem hospedagem vinculada: a mensagem deve usar `Endereco do atendimento` e gerar mapa por endereco quando nao houver latitude/longitude.

## Como testar manualmente

1. Abra `/destinos/<cidade>`.
2. Escolha um chale/pousada com endereco cadastrado.
3. Toque em `Falar` e confira se a mensagem do WhatsApp mostra o endereco e o link do mapa.
4. Entre no detalhe do chale/pousada.
5. Toque em uma loja oficial vinculada.
6. Ao chamar a loja pelo WhatsApp, confira se a mensagem informa em qual hospedagem o cliente esta, inclui endereco/localizacao dela e o link de rota.
7. Abra um servico direto da cidade sem hospedagem.
8. Confira se a mensagem usa `Endereco do atendimento`, sem falar em APK ou termos tecnicos.
9. No detalhe do servico dentro do chale, toque em `Chegar ate meu chale` e valide a tela de rota.
10. No Android, toque em Google Maps/Waze e confira se o app instalado e acionado quando disponivel.

## Resultado esperado

O comerciante recebe a mensagem ja com contexto suficiente para saber de onde veio o cliente, qual hospedagem deve atender, qual endereco/mapa usar e qual rota enviar ao motoboy.
