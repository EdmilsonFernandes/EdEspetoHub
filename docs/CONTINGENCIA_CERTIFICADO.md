# 🔐 Plano de Contingência — Certificado SSL (janocaminho.com.br)

> Criado após a queda de produção de **17/08/2026** (~20 min, cert expirou 19:29 BRT).
> Causa-raiz: cron de renovação rodava com PATH mínimo sem `/usr/sbin` → certbot não achava o nginx → falhava todo dia em silêncio desde maio.

## Camada 1 — Prevenção (o que roda sozinho)

| O quê | Quando | Estado |
|---|---|---|
| `jnc-renew-janocaminho-cert.sh` (renovação diária) | cron `7 4 * * *` | ✅ corrigida em 17/08 (PATH + log de falha com exit 1). Backup: `.bak-20260817` |
| `jnc-cert-watchdog.sh` (verifica expiração) | cron `17 9,21 * * *` | 🔧 instalável pelo script de setup abaixo — alerta se vencer em <21 dias |
| Monitor externo (UptimeRobot ou similar) | 5 em 5 min | ⚠️ **RECOMENDADO — falta fazer** (conta do Edmilson): monitorar `https://janocaminho.com.br` com "SSL expiry" ligado. É a única camada que pega ANY causa (não só renovação) |

Sinal de alerta no servidor: arquivo `/home/ec2-user/CERT-ALERT.txt` existe = certificado em risco.

## Camada 2 — Detecção (como saber rápido)

1. **UptimeRobot/free** → e-mail em minutos (melhor).
2. Manual em 10s: `curl -sI https://janocaminho.com.br` retornando erro/TLS → suspeitar de cert.
3. Checar expiração: `echo | openssl s_client -connect janocaminho.com.br:443 -servername janocaminho.com.br | openssl x509 -noout -enddate`

## Camada 3 — Recuperação (o fix de 1 comando)

SSH no servidor e rodar:

```bash
sudo /usr/local/sbin/jnc-cert-emergency.sh
```

O script: renova com PATH correto (`--force-renewal`, fallback `certonly --nginx`), recarrega o nginx, e **valida sozinho** (curl 200 + data de expiração nova). Duração esperada: ~1 minuto.

Se o script não existir na máquina (servidor novo/recriado), o comando manual equivalente:

```bash
sudo env PATH=/usr/sbin:/usr/bin:/bin certbot renew --cert-name janocaminho.com.br --force-renewal
sudo systemctl reload nginx
curl -s -o /dev/null -w "%{http_code}\n" https://janocaminho.com.br/
```

## Setup em servidor novo (instala as 3 peças)

Rodar via SSH (ver abaixo) o bloco do Apêndice A — cria emergency + watchdog + crons.

## Acesso SSH de emergência

- Chave primária: `/d/PESSOAL/chamanoespeto-aws/medtrack-system.pem` (drive externo — **pode desconectar!**)
- Chave reserva (funciona, gitignored no repo): `EdEspetoHub/medtrack-temp.pem`
- Host: `ec2-user@ec2-3-137-119-152.us-east-2.compute.amazonaws.com`
- SSH instável (`Connection reset`): retry com `-o ConnectionAttempts=4` (rede/brute-force no :22).

## Notas

- `chamanoespeto.com.br` (legado): cert vencido desde abril, sem renovação. Migração p/ janocaminho em andamento — ignorar até decidir aposentar o domínio.
- Cert atual (pós-incidente): válido até **15/11/2026**.

---

## Apêndice A — bloco de instalação (copiar/colar no SSH)

```bash
sudo tee /usr/local/sbin/jnc-cert-emergency.sh > /dev/null <<'EOF'
#!/bin/sh
export PATH=/usr/sbin:/usr/bin:/bin:/usr/local/sbin
/usr/bin/certbot renew --cert-name janocaminho.com.br --force-renewal || \
  /usr/bin/certbot certonly --nginx --cert-name janocaminho.com.br -d janocaminho.com.br -d www.janocaminho.com.br --force-renewal
/bin/systemctl reload nginx
sleep 2
curl -s -o /dev/null -w 'HTTPS: %{http_code}\n' --max-time 10 https://janocaminho.com.br/api/public/platform/metrics
echo | openssl s_client -connect janocaminho.com.br:443 -servername janocaminho.com.br 2>/dev/null | openssl x509 -noout -enddate
EOF
sudo chmod 755 /usr/local/sbin/jnc-cert-emergency.sh

sudo tee /usr/local/sbin/jnc-cert-watchdog.sh > /dev/null <<'EOF'
#!/bin/sh
export PATH=/usr/sbin:/usr/bin:/bin:/usr/local/sbin
END=$(echo | openssl s_client -connect localhost:443 -servername janocaminho.com.br 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
[ -z "$END" ] && { echo "[$(date -u)] WATCHDOG: não leu o certificado"; touch /home/ec2-user/CERT-ALERT.txt; exit 1; }
LEFT=$(( ( $(date -d "$END" +%s) - $(date +%s) ) / 86400 ))
if [ "$LEFT" -lt 21 ]; then
  echo "[$(date -u)] WATCHDOG: vence em ${LEFT}d ($END) — rodar jnc-cert-emergency.sh"
  touch /home/ec2-user/CERT-ALERT.txt
else
  rm -f /home/ec2-user/CERT-ALERT.txt
fi
EOF
sudo chmod 755 /usr/local/sbin/jnc-cert-watchdog.sh
( sudo crontab -l 2>/dev/null | grep -v jnc-cert-watchdog ; echo '17 9,21 * * * /usr/local/sbin/jnc-cert-watchdog.sh >> /var/log/certbot-renew.log 2>&1' ) | sudo crontab -
```
