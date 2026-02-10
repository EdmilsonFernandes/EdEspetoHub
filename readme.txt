Chama no Espeto (EdEspetoHub)
=============================

Este arquivo existe como "guia rapido" para leitura em qualquer ambiente.
Para a documentacao completa (com diagramas Mermaid, rotas, stack e deploy), veja:

- README.md


FLOW (VISÃO DE NEGÓCIO)
----------------------

1) Cliente faz pedido (Delivery / Retirada / Mesa)
- A vitrine publica fica em /:slug
- O acompanhamento publico fica em /pedido/:orderId

2) Loja prepara o pedido
- Admin (loja) muda o status: Recebido -> Em preparo -> Pronto
- Se for Delivery: Pronto -> Aguardando entregador

3) Motoboy (entregador) pega e finaliza a entrega
- Motoboy so enxerga fila quando:
  - esta com vinculo aprovado em pelo menos 1 loja
  - e esta com status ACTIVE
- Regras:
  - 1 entrega ativa por motoboy (exclusividade)
  - 2 motoboys nao conseguem aceitar o mesmo pedido (concorrencia)
- Motoboy: Aceitar -> Retirei -> Iniciar rota -> Entregue -> Confirmar pagamento (se aplicavel)


KYC (DOCUMENTOS) + VINCULO (LOJA)
--------------------------------

O cadastro do motoboy tem 2 camadas:

A) KYC global (PLATAFORMA / SUPER_ADMIN)
- Documentos: CNH + Selfie (obrigatorios) + CRLV (obrigatorio para moto/carro)
- A plataforma valida documentos e pode usar verificacao assistida (face-worker).
- Loja nao altera KYC global.

B) Vinculo por loja
- Motoboy solicita vinculo para uma loja.
- Loja aprova/rejeita o vinculo (operacao).
- Se a loja precisar, ela pode pedir reenvio de documento (com motivo), sem "derrubar" o KYC global.


PRODUÇÃO (EC2) - COMANDOS ÚTEIS
------------------------------

Subir apenas API e FRONT (build local no servidor):

  docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d --build --no-deps api frontend

Subir face-worker (quando houver alteracoes de KYC/face):

  docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d --build --no-deps face-worker

Backup/rotacao do Postgres (a cada 48h, mantendo 1 arquivo):

  BACKUP_DIR=/home/ec2-user/backups/chamanoespeto MIN_INTERVAL_HOURS=48 KEEP_LATEST=1 bash /home/ec2-user/EdEspetoHub/scripts/pg-backup-rotate.sh

