# 💰 EcoFin — Gestor Financeiro Doméstico

> Aplicação web para controle de despesas pessoais com gráficos, orçamentos por categoria e sincronização com banco de dados.

---

## 📋 O que você vai precisar instalar antes de tudo

Antes de começar, instale os programas abaixo no seu computador. Todos são **gratuitos**:

| Programa | Para que serve | Link |
|---|---|---|
| **Node.js** (versão 18 ou superior) | Rodar o servidor e o frontend | https://nodejs.org |
| **Git** | Baixar o projeto do GitHub | https://git-scm.com |
| **MySQL** | Banco de dados | https://dev.mysql.com/downloads/installer |
| **MySQL Workbench** | Ver e gerenciar o banco visualmente | (vem junto com o MySQL Installer) |
| **VS Code** (opcional) | Editor de código | https://code.visualstudio.com |

> 💡 **Dica:** Ao instalar o Node.js, o programa `npm` já vem junto automaticamente.

---

## 📥 Passo 1 — Baixar o projeto do GitHub

Abra o **PowerShell** ou **Prompt de Comando** e execute:

```bash
git clone https://github.com/marconesdb/ecofin_V3_GestorFinanceiroDomestico.git
```

> ⚠️ Substitua `seu-usuario` pelo nome real do usuário ou organização no GitHub.

Depois entre na pasta do projeto:

```bash
cd ecofin
```

Você verá que o projeto tem **duas pastas principais**:

```
ecofin/
├── frontend/     ← Interface visual (React)
└── backend/      ← Servidor e banco de dados (Node.js)
```

---

## 🗄️ Passo 2 — Criar o Banco de Dados

### 2.1 — Abra o MySQL Workbench
- Clique duas vezes no ícone do **MySQL Workbench**
- Clique na sua conexão local (geralmente chamada de `Local instance MySQL`)
- Digite sua senha se solicitado

### 2.2 — Crie o banco de dados
- No topo da tela, clique no ícone de **"+"** para abrir uma nova aba de query
- Cole o comando abaixo e pressione **Ctrl + Enter**:

```sql
CREATE DATABASE ecofin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

- Deve aparecer na parte de baixo: `1 row(s) affected` — isso significa que funcionou! ✅

> 💡 As **tabelas** serão criadas automaticamente quando você iniciar o servidor backend pela primeira vez.

---

## ⚙️ Passo 3 — Configurar o Backend

### 3.1 — Entre na pasta do backend

```bash
cd backend
```

### 3.2 — Crie o arquivo de configuração `.env`

Este arquivo guarda informações sensíveis como senha do banco. Crie um arquivo chamado `.env` dentro da pasta `backend` com o seguinte conteúdo:

```env
# Servidor
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Banco de Dados MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha_aqui
DB_NAME=ecofin
```

> ⚠️ **Importante:** Substitua `sua_senha_aqui` pela senha que você configurou ao instalar o MySQL.

**Como criar o arquivo `.env`:**
1. Abra a pasta `backend` no VS Code (`code .`)
2. Clique com o botão direito na área de arquivos → **New File**
3. Nomeie como `.env`
4. Cole o conteúdo acima e salve com **Ctrl + S**

### 3.3 — Instale as dependências do backend

Ainda dentro da pasta `backend`, execute:

```bash
npm install
```

> ⏳ Aguarde terminar. Pode demorar alguns minutos na primeira vez.

### 3.4 — Inicie o servidor backend

```bash
node server.js
```

Se tudo estiver correto, você verá:

```
✅  Banco de dados inicializado com sucesso.
🚀  EcoFin API rodando em http://localhost:3001
```

> 💡 **Deixe esse terminal aberto!** O servidor precisa ficar rodando.

---

## 🖥️ Passo 4 — Configurar o Frontend

Abra um **novo terminal** (sem fechar o anterior) e navegue até a pasta do frontend:

```bash
cd ..        ← volta para a pasta raiz do projeto
cd frontend  ← entra na pasta do frontend
```

### 4.1 — Instale as dependências do frontend

```bash
npm install
```

### 4.2 — Inicie o frontend

```bash
npm run dev
```

Você verá algo assim:

```
  VITE v6.x.x  ready in 500ms

  ➜  Local:   http://localhost:3000/
```

---

## 🌐 Passo 5 — Acessar a aplicação

Abra seu navegador e acesse:

```
http://localhost:3000
```

🎉 **A aplicação está funcionando!**

---

## 📁 Estrutura completa do projeto

```
ecofin/
│
├── frontend/                  ← Aplicação React (interface)
│   ├── App.tsx                ← Componente principal
│   ├── types.ts               ← Tipos e categorias
│   ├── index.tsx              ← Ponto de entrada
│   ├── index.html             ← HTML base
│   ├── package.json           ← Dependências do frontend
│   └── vite.config.ts         ← Configuração do Vite
│
├── backend/                   ← API Node.js (servidor)
│   ├── server.js              ← Servidor principal
│   ├── .env                   ← ⚠️ Suas configurações (não enviar ao GitHub!)
│   ├── package.json           ← Dependências do backend
│   └── schema.sql             ← Script SQL (opcional)
│
└── README.md                  ← Este arquivo
```

---

## 🔁 Como usar no dia a dia

Toda vez que quiser usar o EcoFin, você precisa:

**Terminal 1 — Backend:**
```bash
cd ecofin/backend
node server.js
```

**Terminal 2 — Frontend:**
```bash
cd ecofin/frontend
npm run dev
```

Depois acesse `http://localhost:3000` no navegador.

---

## 🛣️ Endpoints da API (para curiosos)

Com o backend rodando, você pode acessar no navegador:

| Endereço | O que mostra |
|---|---|
| `http://localhost:3001/health` | Se o servidor está online |
| `http://localhost:3001/api/expenses` | Todas as despesas |
| `http://localhost:3001/api/budgets` | Todos os orçamentos |
| `http://localhost:3001/api/reports/summary` | Resumo financeiro |

---

## ❌ Problemas comuns e soluções

### ❓ "Unknown database 'ecofin'"
O banco não foi criado ainda. Execute no MySQL Workbench:
```sql
CREATE DATABASE ecofin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### ❓ "Access denied for user 'root'"
A senha no arquivo `.env` está errada. Corrija o campo `DB_PASSWORD`.

### ❓ "Cannot find module" ou "npm not found"
O Node.js não está instalado. Baixe em https://nodejs.org e instale novamente.

### ❓ "ECONNREFUSED" ao iniciar o backend
O MySQL não está rodando. Abra o **Gerenciador de Serviços** do Windows:
- Pressione `Win + R`, digite `services.msc` e pressione Enter
- Procure por `MySQL80` (ou similar)
- Clique com o botão direito → **Iniciar**

### ❓ A porta 3000 ou 3001 já está em uso
Outro programa está usando a porta. Encerre-o ou altere a porta no `.env` e no `vite.config.ts`.

---

## 🔒 Segurança — Arquivo .env

> ⚠️ **NUNCA envie o arquivo `.env` para o GitHub!**

Ele contém sua senha do banco de dados. Certifique-se de que o `.gitignore` contém a linha:

```
.env
```

---

## 🧰 Tecnologias utilizadas

| Tecnologia | Função |
|---|---|
| React + TypeScript | Interface do usuário |
| Vite | Compilador do frontend |
| Tailwind CSS | Estilização |
| Recharts | Gráficos |
| Node.js + Express | Servidor backend |
| MySQL2 | Conexão com banco de dados |
| Helmet | Segurança HTTP |
| Express Validator | Validação de dados |

---

## 📞 Suporte

Se tiver dúvidas, abra uma **Issue** no repositório do GitHub descrevendo o problema e a mensagem de erro que apareceu no terminal.

## 👨‍💻 Desenvolvido por **Marcone S. de Brito**