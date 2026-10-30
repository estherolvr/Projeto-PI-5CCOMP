# 🎓 Álvaro AI — Central de Atendimento Inteligente FECAP

<p align="center">
  <img src="https://camo.githubusercontent.com/9640a318074cf476f8f30d06059763c45be295736ae6e618e824b21b031e74dc/68747470733a2f2f656e637279707465642d74626e302e677374617469632e636f6d2f696d616765733f713d74626e3a414e6439476352685a5072526138394b6d61305a5a6f67786d3070692d74436e5f544c4b65484756787977702d4c584146475233423144506f75414a5948674b5a4756305854456634414526757371703d434155" alt="Logo Álvaro AI">
</p>

> **Projeto Interdisciplinar — Inteligência Artificial & Engenharia de Software**  
> **Fundação Escola de Comércio Álvares Penteado (FECAP)**  
> **Curso:** Ciência da Computação / Engenharia de Software <br>
> <a href="https://projeto5-rose.vercel.app">Acesso à Aplicação em Produção</a>
---

## 📌 Sobre o Projeto

O **Álvaro AI** é uma plataforma full-stack de atendimento universitário integrada para o **ASA (Área do Sucesso Alvarista)** da FECAP. A solução combina um assistente conversacional inteligente potencializado por **Inteligência Artificial Generativa (Google Gemini 3.6 Flash)** e **RAG (*Retrieval-Augmented Generation*)** com um sistema completo de gestão de chamados acadêmicos e atendimento humano (*Human-in-the-Loop*).

---

## 👥 Integrantes do Grupo

* **Esther Oliveira Costa** — [@estherolvr](https://github.com/estherolvr) (`jaegcostaesther@gmail.com`)
* **Higor Fonseca** — [@higor-f](https://github.com/higor-f) (`higorlfonsecas@gmail.com`)
* **João Victor Faria** — [@joaovictorfaria](https://github.com/joaovictorfaria) (`joao.fsantana@outlook.com`)

---

## 🏛️ Estrutura do Repositório (Padrão de Entregas FECAP)

O repositório segue rigorosamente a estrutura acadêmica definida pela FECAP:

```text
Projeto5/
├── documentos/
│   ├── Entrega 1/
│   │   ├── Inteligência Artifical e Aprendizado de Máquina/
│   │   ├── Projeto Interdisciplinar_ Inteligência Artificial/
│   │   ├── Psicologia, Liderança e Soft Skills/
│   │   ├── Sistemas Operacionais Computação em Nuvem/
│   │   └── Álgebra Linear, Vetores e Geometria Analítica/
│   └── Entrega 2/
├── imagens/
├── src/
│   ├── Entrega 1/
│   │   ├── Backend/          <-- Projeto Backend completo (Node.js, Express, Prisma, SQLite)
│   │   └── Frontend/         <-- Projeto Frontend completo (React 19, Vite, Tailwind CSS)
│   └── Entrega 2/
│       ├── Backend/
│       └── Frontend/
├── package.json              <-- Scripts de orquestração geral para desenvolvimento
└── README.md
```

---

## 🚀 Principais Módulos & Funcionalidades

### 1. 🎓 Portal do Aluno
* **Chatbot Álvaro AI 24/7:** Responde a dúvidas sobre regulamentos acadêmicos, prazos, bolsas, TCC, trancamento e financeiro com formatação rica em Markdown e citação nominal dos documentos institucionais.
* **Abertura de Chamados com Contexto (*Human-in-the-Loop*):** Ao solicitar a abertura de chamado pelo chat, todo o histórico de mensagens trocadas com a IA é automaticamente vinculado ao ticket.
* **Documentos Digitais:** Emissão instantânea de atestados de matrícula e declarações acadêmicas com validação digital.
* **Histórico de Chamados:** Acompanhamento do status (`Aberto`, `Em atendimento`, `Resolvido`), mensagens do atendente e previsão de SLA.

### 2. 🏛️ Painel do Atendente ASA
* **Fila de Atendimento em Tempo Real:** Visualização dinâmica dos chamados pendentes com contador decrescente de SLA e filtros por criticidade.
* **Visualização do Histórico Prévio da IA:** O atendente humano visualiza exatamente o que o aluno perguntou e o que a IA respondeu antes de abrir o ticket.
* **Análise Preditiva & Recomendação de Resposta:** A IA analisa a intenção do aluno, calcula o sentimento e sugere uma resposta pronta que pode ser inserida com 1 clique.
* **Gestão de Base de Conhecimento RAG:** Upload de arquivos PDF/TXT/MD institucionais com divisão automática em chunks semânticos e indexação no banco.

### 3. ⚙️ Painel Administrativo & Governança de IA
* **Central de Controle (Command Center):** Monitoramento de saúde das APIs, status dos atendentes e auditoria de eventos.
* **Métricas de Atendimento:** Volume de conversas, taxa de resolução por IA, tempo médio de resposta e cumprimento de SLA.

---

## 🛠️ Tecnologias Utilizadas

### **Frontend** (`src/Entrega 1/Frontend`)
* **React 19** + **TypeScript** + **Vite**
* **Tailwind CSS** para estilização com tokens oficiais FECAP/ASA
* **Framer Motion** para animações fluidas
* **Lucide React** para iconografia
* **React Markdown** + **Remark GFM** para renderização de tabelas e tópicos
* **Zustand** para gerenciamento de estado global

### **Backend & Banco de Dados** (`src/Entrega 1/Backend`)
* **Node.js** + **Express** com arquitetura RESTful modular
* **Prisma ORM** + **SQLite** para persistência relacional
* **JWT (JSON Web Tokens)** + **Bcrypt** para autenticação e perfis (`aluno`, `asa`, `admin`)
* **Multer** para upload de arquivos
* **Google Gemini 3.6 Flash** (`@google/generative-ai`) para RAG e respostas inteligentes
* **pdf-parse** para extração de texto em PDFs institucionais

---

## 📦 Como Instalar e Executar Localmente

### Opção 1: Executar pelos Módulos Independentes (Padrão de Avaliação FECAP)

#### Backend (`src/Entrega 1/Backend`):
```bash
cd "src/Entrega 1/Backend"
npm install
cp .env.example .env
npm run db:push
npm run seed
npm run dev
```
* Servidor ativo em: `http://localhost:3001`
* Endpoint de teste: `http://localhost:3001/api/health`

#### Frontend (`src/Entrega 1/Frontend`):
```bash
cd "src/Entrega 1/Frontend"
npm install
npm run dev
```
* Aplicação web: `http://localhost:3000`

---

### Opção 2: Executar da Raiz do Projeto (Comando Único)

1. **Instalar dependências de ambos os módulos:**
   ```bash
   npm run install:all
   ```

2. **Inicializar banco de dados e seeds:**
   ```bash
   npm run db:push
   npm run seed
   ```

3. **Iniciar Frontend e Backend simultaneamente:**
   ```bash
   npm run dev
   ```

---

## 🔑 Credenciais de Demonstração

| Perfil | E-mail Institucional | Senha Global | Acesso |
| :--- | :--- | :--- | :--- |
| **Aluna** | `esther.rodrigues@aluno.fecap.br` | `@#$273baratA` | Portal do Aluno & Chatbot |
| **Atendente ASA** | `fernanda.costa@fecap.br` | `@#$273baratA` | Fila ASA & Base de Conhecimento |
| **Administrador** | `ricardo.mendes@fecap.br` | `@#$273baratA` | Central de Controle & Governança |

---

## 📄 Licença

Projeto desenvolvido para fins educacionais no curso de graduação da **FECAP (Fundação Escola de Comércio Álvares Penteado)**. Todos os direitos reservados © 2026.

## Painel administrativo com dados persistidos

As telas de administração consultam a mesma API e o mesmo banco dos portais Aluno e ASA. Chamados, fila, alunos, equipe, agendamentos, feedbacks, documentos, regras e auditoria não têm fallback para exemplos no admin. As consultas são atualizadas a cada 30 segundos e ao voltar à janela; falhas de conexão aparecem com opção de tentar novamente.

- Métricas aceitam períodos de 1, 7, 30 e 90 dias, no fuso `America/Sao_Paulo`. Os cartões de chamados consideram os criados no período; o gráfico considera eventos de criação e resolução ocorridos no período.
- Tempos de primeira resposta usam mensagens públicas de ASA/admin. Resoluções usam as transições registradas em auditoria. Sem amostra suficiente, a interface mostra “Sem dados”. Avaliações da IA não representam satisfação com atendimento humano.
- O SLA da fila usa o prazo atual. Novos chamados usam a regra ativa mais recente para prioridade/categoria, com preferência por regra específica. Sem regra cadastrada, mantém-se o prazo padrão por prioridade. Alterar uma regra não modifica chamados existentes.
- Saúde verifica API/banco e informa se Gemini/R2 estão configurados; não inventa disponibilidade histórica ou latência externa. Diagnósticos identificam a origem Gemini ou regras locais e tratam o índice como estimativa.
- Automações são definições persistidas; não há executor automático. Permissões individuais, SMTP e manutenção ainda não possuem edição pelo painel.

### Preservação dos registros

O build do Render não executa mais o seed de demonstração. `npm run seed` é permitido apenas em banco vazio de desenvolvimento e recusa produção ou registros existentes sem apagá-los. Dados de exemplo previamente gravados não são removidos automaticamente, pois compartilham o banco com os registros de uso.

Para usar os dados já existentes, configure o frontend para a mesma API usada pelo Aluno/ASA (`VITE_API_URL`) e mantenha o banco existente no backend. A configuração Vercel do projeto já encaminha `/api` para o backend configurado. Não execute seed sobre a base real. Em hospedagens com disco efêmero, configure armazenamento persistente para SQLite antes de utilizar dados reais.

### Validação

```powershell
npm run build:frontend
npm run build:backend
cd "src/Entrega 1/Backend"
npm test
```

Os testes de integração exigem Node.js 22.13 ou superior, criam uma base SQLite isolada em `Backend/work/` e não consultam serviços externos. Cobrem o fluxo aluno → ASA → admin, filtros, permissões, SLA, estados vazios, resolução/reabertura e agregações acima de mil chamados.
