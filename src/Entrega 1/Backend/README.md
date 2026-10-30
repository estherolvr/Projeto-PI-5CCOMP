# 🚀 Álvaro AI — Backend (Entrega 1)

Módulo Backend da plataforma Álvaro AI desenvolvido em **Node.js**, **Express**, **TypeScript** e **Prisma ORM (SQLite)** para o ASA da FECAP.

---

## 🛠️ Tecnologias Utilizadas
- **Node.js** & **Express 5**
- **TypeScript** & **TSX**
- **Prisma ORM** com **SQLite**
- **JWT (jsonwebtoken)** e **Bcrypt** para autenticação e segurança
- **Google Generative AI (Gemini 3.6 Flash)** para o motor de IA e RAG
- **Multer** e **pdf-parse** para upload e extração de base de conhecimento

---

## 📁 Estrutura de Diretórios
```
Backend/
├── prisma/
│   └── schema.prisma         # Modelagem relacional do banco de dados SQLite
├── src/
│   ├── middleware/           # Middlewares de autenticação e controle de acesso
│   ├── routes/               # Rotas RESTful (auth, chat, ticket, kb, metrics, admin, student)
│   ├── services/             # Regras de negócio e integração com Google Gemini RAG
│   ├── db.ts                 # Instância singleton do Prisma Client
│   ├── index.ts              # Entrypoint do servidor Express
│   ├── mock-data.ts          # Dados base institucionais
│   └── seed.ts               # Script de população do banco de dados
├── .env.example              # Modelo de variáveis de ambiente
├── package.json              # Dependências e scripts do backend
├── tsconfig.json             # Configuração TypeScript
└── README.md
```

---

## ⚙️ Como Executar Localmente

### 1. Instalar as dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
Crie o arquivo `.env` a partir do modelo `.env.example`:
```bash
cp .env.example .env
```
Ou configure manualmente:
```env
PORT=3001
JWT_SECRET=alvaro-ai-super-secret-jwt-key-2026-fecap
GEMINI_API_KEY=sua_chave_gemini_aqui
DATABASE_URL="file:./dev.db"
```

### 3. Sincronizar o banco de dados e popular dados iniciais
```bash
npm run db:push
npm run seed
```

O seed é opcional e exclusivo para um banco vazio de desenvolvimento. Ele recusa produção ou registros existentes sem apagá-los. Para dados reais, mantenha o mesmo banco usado pelo Aluno e pelo ASA e não execute seed.

`DATABASE_URL` é compartilhado pela aplicação e pelos scripts `db:push`, `db:generate` e `db:studio`. Sem configuração, esses scripts usam `prisma/dev.db`; caminhos SQLite relativos são resolvidos a partir de `prisma/`. Em produção, use um arquivo em armazenamento persistente. Prefira os scripts npm acima ao invocar a CLI do Prisma diretamente.

### 4. Iniciar o servidor em modo de desenvolvimento
```bash
npm run dev
```
O servidor estará ativo em: `http://localhost:3001`
Acesse a saúde da API em: `http://localhost:3001/api/health`
