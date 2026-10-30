#!/bin/bash
# ==============================================================================
# PROJETO 5 — FECAP: Central de Atendimento Inteligente (Álvaro AI)
# Disciplina: Sistemas Operacionais e Computação em Nuvem
# Script de Provisionamento e Configuração de Infraestrutura Linux
# ==============================================================================

set -euo pipefail

echo ">>> [1/7] Atualizando repositórios do sistema..."
sudo apt-get update -y
sudo apt-get install -y curl git ufw htop net-tools openssh-server

echo ">>> [2/7] Criando grupos e contas de usuários..."
sudo groupadd -f devs

# Usuários da equipe de desenvolvimento
for user in higor esther joao; do
    if ! id "$user" &>/dev/null; then
        sudo useradd -m -s /bin/bash -g devs -G sudo "$user"
        echo "Usuário $user criado e adicionado aos grupos 'devs' e 'sudo'."
    fi
done

# Usuário exclusivo de serviço (sem shell interativo por segurança)
if ! id "alvaro-app" &>/dev/null; then
    sudo useradd -m -s /usr/sbin/nologin -g devs alvaro-app
    echo "Usuário de serviço 'alvaro-app' criado com sucesso."
fi

echo ">>> [3/7] Criando estrutura de diretórios da aplicação..."
sudo mkdir -p /opt/alvaro-ai/{backend,frontend,config,logs}

echo ">>> [4/7] Aplicando Política de Segredos e Permissões Restritas..."
if [ ! -f /opt/alvaro-ai/config/.env ]; then
    sudo tee /opt/alvaro-ai/config/.env > /dev/null << 'EOF'
# Configuração do Ambiente Álvaro AI - Produção Local
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
JWT_SECRET=fecap_alvaro_ai_super_secret_jwt_key_2026
GEMINI_API_KEY=AIzaSyD_FECAP_DEMO_KEY_2026
DATABASE_URL="file:/opt/alvaro-ai/backend/prisma/prod.db"
CORS_ORIGIN="http://localhost:3000"
EOF
fi

# Permissão 600 no arquivo .env (somente o dono pode ler/escrever)
sudo chmod 600 /opt/alvaro-ai/config/.env
# Dono da aplicação e grupo de desenvolvedores
sudo chown -R alvaro-app:devs /opt/alvaro-ai
# Permissões de diretório restritas (750: dono rwx, grupo rx, outros nada)
sudo chmod 750 /opt/alvaro-ai
sudo chmod 750 /opt/alvaro-ai/config

echo ">>> [5/7] Configurando Serviço Systemd para o Álvaro AI..."
sudo tee /etc/systemd/system/alvaro-backend.service > /dev/null << 'EOF'
[Unit]
Description=Alvaro AI Backend Service (FECAP Projeto 5)
After=network.target

[Service]
Type=simple
User=alvaro-app
Group=devs
WorkingDirectory=/opt/alvaro-ai/backend
EnvironmentFile=/opt/alvaro-ai/config/.env
ExecStart=/usr/bin/node /opt/alvaro-ai/backend/dist/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=alvaro-backend

# Hardening do Processo no Systemd
ProtectSystem=full
ProtectHome=true
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
echo "Serviço systemd alvaro-backend configurado."

echo ">>> [6/7] Configurando Regras de Firewall (UFW)..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 3000/tcp comment 'Frontend Alvaro AI'
sudo ufw allow 3001/tcp comment 'Backend Alvaro AI API'
echo "Regras UFW registradas."

echo ">>> [7/7] Verificação do Ambiente..."
echo "Uptime: $(uptime)"
echo "Memória Livre: $(free -h | awk '/^Mem:/ {print $4}')"
echo "Disco Disponível: $(df -h / | awk 'NR==2 {print $4}')"
echo "=============================================================================="
echo "PROVISIONAMENTO CONCLUÍDO COM SUCESSO!"
echo "=============================================================================="