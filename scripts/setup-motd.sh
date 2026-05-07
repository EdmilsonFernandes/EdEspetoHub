#!/bin/bash
# Setup login banner + access logging for Já no Caminho production servers.
# Run once on a new EC2: bash scripts/setup-motd.sh

set -euo pipefail

echo "[motd] Installing login banner..."

sudo tee /etc/motd > /dev/null <<'BANNER'

╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🤖  Já no Caminho — Production Environment                ║
║                                                              ║
║   © 2026 Edmilson Tecnologia da Informação                   ║
║   CNPJ 44.771.427/0001-69 — All rights reserved.            ║
║                                                              ║
║   ⚠️  WARNING: This server is actively monitored.            ║
║   All access is logged with timestamp, IP and username.      ║
║   Unauthorized access is strictly prohibited by law.         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

BANNER

echo "[motd] Installing access logger..."

sudo tee /etc/profile.d/access-log.sh > /dev/null <<'LOGGER'
#!/bin/bash
# Log every SSH login to a dedicated file
LOG_FILE="/var/log/ssh-access.log"
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
IP=$(echo "$SSH_CONNECTION" | awk '{print $1}')
echo "[$TIMESTAMP] user=$USER ip=$IP tty=$SSH_TTY" | sudo tee -a "$LOG_FILE" > /dev/null 2>&1
echo ""
echo "  📋 Access logged: $TIMESTAMP — $IP"
echo ""
LOGGER

sudo chmod +x /etc/profile.d/access-log.sh
sudo touch /var/log/ssh-access.log
sudo chmod 644 /var/log/ssh-access.log

echo "[motd] Done. Next SSH login will show the banner and log access."
