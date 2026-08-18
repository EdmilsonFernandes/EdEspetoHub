# Proposta — Comprovante para pagamentos presenciais (pix_loja / dinheiro / débito na hora)

**Data:** 18/08/2026 · **Status:** PROPOSTA (aguarda aprovação do Edmilson)
**Contexto:** pedidos pagos por chave Pix da loja ou na entrega/retirada/mesa não têm
confirmação automática (só o Mercado Pago confirma sozinho). Hoje o ciclo fecha no olho:
o cliente paga e a loja confia. O gap: cliente paga, loja não vê, pedido anda arrastado.

## Princípio iFood
O iFood não tem Pix manual — tudo online. Nosso Pix da loja é feature de pequeno
comércio; o que falta é o **fechamento do ciclo**: cliente PROVA, loja VALIDA, sistema
REFLETE (`payment_status = PAID`).

## Nível 1 — WhatsApp contextual (barato, sem migration, já)
No detalhe do pedido (OrderTracking), para métodos presenciais **não pagos**:
botão **"Enviar comprovante"** → deep link `wa.me/<loja>?text=` com mensagem pronta:

```
Comprovante do pedido #A1B2 (R$ 45,90) — Gustavão Espetos.
Segue o print do pagamento. (enviado pelo app Já no Caminho)
```

O cliente anexa o print no WhatsApp (fluxo que ele já conhece); a loja correlaciona
pelo número do pedido que já vem na mensagem. Zero backend, zero migration.
*Aproveita o `openWhatsApp` que já existe no OrderTracking.*

## Nível 2 — Comprovante anexado ao pedido (o que realmente amarra)
1. OrderTracking: campo **"Anexar comprovante"** (foto/print — mesma infra de upload
   S3 já usada por logos/avaliações) → `order_payment_proofs` (order_id, url, created_at).
2. Fila do lojista (AdminOrders): badge **"Comprovante anexado"** no card + action
   **"Confirmar pagamento"** → `payment_status = PAID` (+ timeline `payment_confirmed_manual`).
3. Cliente vê "Pagamento confirmado pela loja" no tracking (mesmo pill do PAID online).
4. Rejeição: loja marca "não localizado" → cliente é notificado para reenviar.

**Custo:** 1 migration + 1 endpoint de upload + 1 action de confirmação + UI nos dois lados.
**LGPD:** print de comprovante pode conter dados do pagador → mesmo tratamento de dado
sensível das avaliações (retenção limitada, acesso só loja vinculada).

## Recomendação
Nível 1 agora (horas de trabalho, destrava operação); Nível 2 como evolução com spec SDD
(mexe em dinheiro/status — merece gates). Dinheiro/débito na entrega **não** precisam de
comprovante antecipado — o pagamento acontece na entrega; o texto do tracking já orienta.

## Fora de escopo (decisões pendentes separadas)
- ~~Janela de expiração do Pix MP~~ **DECIDIDO 18/08: 30 minutos** — countdown, `date_of_expiration`
  do MP, fallback local e barra de progresso do PaymentQRCard alinhados; cancelamento por
  expires_at+2min (job/sweeps) com catch-all de 40min e **push "pedido cancelado — pagamento
  não confirmado"** no mesmo ciclo.
