# 🎨 Álvaro AI — Frontend (Entrega 1)

Interface web interativa da plataforma Álvaro AI desenvolvida com **React 19**, **TypeScript**, **Vite** e **Tailwind CSS** para a comunidade acadêmica da FECAP (Alunos, Atendentes ASA e Administradores).

---

## 🛠️ Tecnologias Utilizadas
- **React 19** com **TypeScript**
- **Vite** (Build Tool e Servidor HMR)
- **Tailwind CSS** (Design system com tokens institucionais da FECAP e ASA)
- **Framer Motion** (Transições e animações de interface)
- **Lucide React** (Ícones)
- **React Markdown** + **Remark GFM** (Formatação rica das respostas de IA)
- **Zustand** (Gerenciamento de estado global)
- **Recharts** (Métricas e dashboards)

---

## 📁 Estrutura de Diretórios
```
Frontend/
├── public/                   # Recursos estáticos institucionais (logos FECAP, banners ASA)
├── src/
│   ├── assets/               # Imagens e ícones
│   ├── components/           # Componentes reutilizáveis de UI (Button, Modal, Badges, etc.)
│   ├── lib/                  # Clientes de API, dados mock e funções utilitárias
│   ├── pages/                # Páginas divididas por perfil (aluno, asa, admin, auth, public)
│   ├── store/                # Estado global Zustand (usuário atual, modo demo, chamados)
│   ├── App.tsx               # Roteamento e layout mestre da aplicação
│   ├── main.tsx              # Ponto de entrada da renderização React
│   ├── index.css             # Estilos globais e diretivas do Tailwind CSS
│   └── vite-env.d.ts         # Declarações de tipos do Vite
├── index.html                # Arquivo HTML principal
├── package.json              # Dependências e scripts do frontend
├── postcss.config.js         # Configuração do PostCSS
├── tailwind.config.ts        # Configuração e tema Tailwind CSS
├── tsconfig.json             # Configuração TypeScript
├── tsconfig.node.json        # Configuração TypeScript para o Vite
├── vite.config.ts            # Configuração do bundler Vite e proxy reverso
└── README.md
```

---

## ⚙️ Como Executar Localmente

### 1. Instalar as dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente (Opcional)
Se o backend não estiver rodando na porta padrão (3001), crie um arquivo `.env` baseado no `.env.example`:
```env
VITE_API_URL=http://localhost:3001
```

### 3. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse a aplicação no navegador em: `http://localhost:3000`

### 4. Compilar para produção
```bash
npm run build
```
Os arquivos otimizados serão gerados na pasta `dist/`.
