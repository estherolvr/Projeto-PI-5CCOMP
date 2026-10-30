# 🔐 Política de Gestão de Segredos e Hardening da Infraestrutura

## 1. Princípio do Menor Privilégio (*Least Privilege*)
- **Execução não-root:** A aplicação **Álvaro AI** não é executada sob o usuário `root`. Foi criado o usuário de sistema dedicado `alvaro-app` sem shell interativo (`/usr/sbin/nologin`).
- **Grupos Administrativos:** Apenas desenvolvedores autorizados (`higor`, `esther`, `joao`) pertencem ao grupo `devs` e possuem permissão `sudo` para tarefas de manutenção.

## 2. Gestão de Variáveis de Ambiente e Arquivo `.env`
- O arquivo de configuração confidencial reside em `/opt/alvaro-ai/config/.env`.
- **Permissões de Arquivo:** O arquivo possui máscara estrita `chmod 600` (`-rw-------`), pertencendo ao dono `alvaro-app:devs`. Nenhum outro usuário ou processo do sistema possui permissão de leitura ou escrita.
- **Isolamento de Segredos:** Tokens de autenticação (JWT) e chaves de API externas (Google Gemini API Key) são injetados diretamente pelo Systemd via diretiva `EnvironmentFile=` em tempo de execução, nunca persistidos em código-fonte ou versionados no Git (`.gitignore`).

## 3. Segurança de Rede e Port Forwarding
- A máquina virtual opera sob interface de rede **NAT** isolada.
- O acesso a partir do host é restrito às seguintes portas mapeadas:
  - `2222 -> 22` (SSH para administração segura)
  - `3000 -> 3000` (Frontend React/Vite)
  - `3001 -> 3001` (Backend Node.js/Express)
- **Firewall Local (UFW):** Todas as portas não explicitamente autorizadas são bloqueadas por padrão (`ufw default deny incoming`).

## 4. Auditoria e Rastreabilidade de Logs
- Acesso administrativo e tentativas de elevação `sudo` são auditados no `/var/log/auth.log`.
- Eventos de inicialização e saídas de aplicação são centralizados e gerenciados pelo `systemd-journald` (`journalctl -u alvaro-backend`).