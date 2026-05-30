# Shelf — Wishlist de Comics, Mangás e Livros

Aplicação full-stack para gerenciar sua wishlist de quadrinhos, mangás e livros, com busca automática de preços e capas.

## Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (SSR + Server Functions)
- **Router**: [TanStack Router](https://tanstack.com/router) (file-based routing)
- **UI**: [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS v4 + Radix
- **State**: [TanStack React Query](https://tanstack.com/query)
- **Auth & DB**: [Supabase](https://supabase.com/) (PostgreSQL + Auth)
- **Animações**: Framer Motion
- **Build**: Vite 7 + Nitro (server runtime)

## Pré-requisitos

- **Node.js** >= 18 (testado com 20+)
- **npm** (ou bun/pnpm se preferir)
- Uma conta no [Supabase](https://supabase.com/) com o projeto configurado
- (Opcional) Chave da [SerpAPI](https://serpapi.com/) para busca de preços

## Setup do Banco de Dados (Supabase)

No painel do Supabase, crie a tabela `wishlists` com o seguinte SQL:

```sql
-- Enum para tipo de item
CREATE TYPE public.wishlist_item_type AS ENUM ('comic', 'manga', 'book');

-- Tabela principal
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  type public.wishlist_item_type NOT NULL DEFAULT 'book',
  cover_url TEXT,
  current_price NUMERIC,
  original_price NUMERIC,
  discount_percent INTEGER,
  price_source TEXT,
  affiliate_url TEXT,
  purchased BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS (Row Level Security)
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- Política: usuário só vê/edita seus próprios itens
CREATE POLICY "Users can manage their own wishlists"
  ON public.wishlists
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## Variáveis de Ambiente

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
cp .env.example .env
```

Edite o `.env`:

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL do projeto Supabase (server-side) |
| `SUPABASE_PUBLISHABLE_KEY` | Anon key do Supabase (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (operações admin, server-side) |
| `VITE_SUPABASE_URL` | Mesma URL (exposta ao client) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Mesma anon key (exposta ao client) |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto Supabase |
| `SERPAPI_KEY` | Chave da SerpAPI para busca de preços (opcional) |

> As variáveis com prefixo `VITE_` são expostas ao browser. Nunca coloque secrets nelas.

## Instalação

```bash
# Com npm
npm install

# Ou com bun (se instalado)
bun install
```

## Executando em Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em **http://localhost:5173** (porta padrão do Vite).

## Build de Produção

```bash
npm run build
npm run preview
```

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Build de produção (client + server) |
| `npm run preview` | Preview do build de produção |
| `npm run lint` | Executa ESLint |
| `npm run format` | Formata código com Prettier |

## Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── ui/              # Componentes shadcn/ui
│   ├── add-item-drawer.tsx
│   └── wishlist-card.tsx
├── hooks/               # Custom hooks
│   ├── use-mobile.tsx
│   └── use-session.ts
├── integrations/
│   └── supabase/        # Clients e middleware do Supabase
├── lib/
│   ├── api/             # Server functions de exemplo
│   ├── config.server.ts # Config server-only
│   ├── openlibrary.ts   # Busca de capas (Open Library + Google Books)
│   ├── prices.functions.ts # Busca de preços via SerpAPI
│   ├── types.ts         # Tipos derivados do schema Supabase
│   └── utils.ts         # Utilitários (cn)
├── routes/              # Rotas (file-based routing)
│   ├── __root.tsx       # Layout raiz
│   ├── index.tsx        # Redirect baseado em auth
│   ├── auth.tsx         # Login / Cadastro
│   ├── wishlist.tsx     # Página principal da wishlist
│   └── reset-password.tsx
├── router.tsx           # Configuração do router
├── server.ts            # Entry point do servidor (error handling)
├── start.ts             # Middleware global do TanStack Start
└── styles.css           # Estilos globais + tema dark
```

## Funcionalidades

- **Autenticação**: Login com email/senha, magic link, reset de senha
- **Wishlist CRUD**: Adicionar, marcar como comprado, deletar itens
- **Busca de preços**: Integração com SerpAPI (Google Shopping BR) para encontrar o menor preço
- **Busca de capas**: Open Library + Google Books API
- **Filtros**: Por tipo (comic/manga/book), comprados, busca por texto
- **UI responsiva**: Dark mode, animações com Framer Motion
- **Optimistic updates**: Feedback instantâneo nas ações

## Notas

- A busca de preços (`fetchPrices`) requer uma chave da SerpAPI. Sem ela, você ainda pode adicionar itens manualmente.
- O projeto usa TanStack Start com Nitro como server runtime, permitindo server functions (`createServerFn`) que rodam no backend.
- O tema é dark-first com uma paleta quente inspirada em estantes de livros.
