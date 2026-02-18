# TODO - Migracao de Dominio para `www.janocaminho.com.br`

Objetivo: trocar de `chamanoespeto.com.br` para `janocaminho.com.br` sem downtime e sem quebrar app, webhook e e-mail.

## 0) Contexto atual (ja feito em codigo)
- Rebrand aplicado no projeto para **Jano Caminho**.
- URLs/SEO atualizados para `www.janocaminho.com.br`.
- Compatibilidade de rotas antigas mantida (`/chamanoespeto/...`) para nao quebrar links antigos.
- Commit de migracao ja no `main`: `8ef12c1`.

## 1) Pre-check (antes de virar chave)
- Confirmar IP publico/Elastic IP do servidor (ou ALB).
- Confirmar onde o Nginx roda (EC2 direto ou container).
- Confirmar se o Certbot esta instalado no host EC2.
- Confirmar que portas 80/443 estao abertas no Security Group.
- Confirmar que o backend usa env com:
  - `APP_BASE_URL`
  - `MP_WEBHOOK_URL`

## 2) DNS no Registro.br
- Criar/ajustar registros:
  - `A` para `janocaminho.com.br` -> Elastic IP (ou ALB).
  - `A` ou `CNAME` para `www.janocaminho.com.br` -> mesmo destino.
- TTL recomendado durante corte: `300`.
- Aguardar propagacao inicial (normalmente 5-30 min, pode levar mais).

## 3) Nginx (AWS/EC2)
- Backup:
  - `/etc/nginx/nginx.conf`
  - `/etc/nginx/conf.d/*.conf`
- Trocar `server_name` de:
  - `chamanoespeto.com.br www.chamanoespeto.com.br`
  - para `janocaminho.com.br www.janocaminho.com.br`
- Validar:
  - `sudo nginx -t`
  - `sudo systemctl reload nginx`

## 4) SSL novo (Lets Encrypt)
- Gerar certificado para novo dominio:
  - `janocaminho.com.br`
  - `www.janocaminho.com.br`
- Comando (exemplo):
  - `sudo certbot --nginx -d janocaminho.com.br -d www.janocaminho.com.br --agree-tos -m contato@janocaminho.com.br --non-interactive --redirect`
- Validar renovacao:
  - `sudo certbot renew --dry-run`

## 5) Variaveis de ambiente da aplicacao
- Atualizar em todos os envs de runtime (host/container/secrets):
  - `APP_BASE_URL=https://www.janocaminho.com.br`
  - `MP_WEBHOOK_URL=https://www.janocaminho.com.br/api/webhooks/mercadopago`
  - `EMAIL_FROM=Jano Caminho <no-reply@janocaminho.com.br>` (se aplicavel)
- Reiniciar servicos:
  - `docker compose up -d --build` (ou processo equivalente)

## 6) Mercado Pago (webhook)
- No painel Mercado Pago, confirmar webhook apontando para:
  - `https://www.janocaminho.com.br/api/webhooks/mercadopago`
- Disparar teste de webhook e validar log de recebimento no backend.

## 7) E-mail (Hostinger/Hoyo) - migracao de dominio
- Criar caixas no dominio novo:
  - `contato@janocaminho.com.br`
  - `no-reply@janocaminho.com.br`
- Se quiser manter entrega do antigo temporariamente:
  - deixar `contato@chamanoespeto.com.br` ativo com encaminhamento para novo.
- Ajustar DNS de e-mail no Registro.br (dominio novo):
  - MX (Hostinger)
  - SPF
  - DKIM
  - DMARC
- Validar envio/recebimento:
  - enviar de externo -> `contato@janocaminho.com.br`
  - envio da aplicacao (SMTP) -> inbox real

## 8) Validacoes finais (smoke test)
- Abrir:
  - `https://www.janocaminho.com.br`
  - `https://www.janocaminho.com.br/admin`
  - `https://www.janocaminho.com.br/{slug}`
- Criar pedido de teste ponta a ponta:
  - checkout
  - tracking
  - pagamento
  - webhook
- Testar e-mails:
  - verificacao de conta
  - pagamento pendente/aprovado
- Validar SSL:
  - cadeado no navegador + sem erro de certificado.

## 9) Compatibilidade e transicao
- Manter dominio antigo no ar por periodo de transicao (7-30 dias).
- Configurar redirect 301 do antigo para novo quando quiser encerrar:
  - `chamanoespeto.com.br/*` -> `https://www.janocaminho.com.br/$1`
- Monitorar 404/500 e logs de webhook nas primeiras 24h.

## 10) Rollback (se algo falhar)
- Restaurar backup de Nginx.
- Recarregar Nginx.
- Voltar `APP_BASE_URL` e `MP_WEBHOOK_URL` para dominio antigo.
- Rebuild/restart dos containers.
- Retestar fluxo de pedido/pagamento.

## 11) Checklist curto de conclusao
- [ ] DNS novo propagado
- [ ] Nginx com `server_name` novo
- [ ] SSL novo ativo
- [ ] Env atualizado e app reiniciada
- [ ] Webhook Mercado Pago OK
- [ ] E-mail novo (MX/SPF/DKIM/DMARC) OK
- [ ] Smoke test completo OK
