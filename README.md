# Odonto Schedule

Sistema de agendamento odontológico multi-tenant construído com Next.js e Supabase.

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Estilo:** Tailwind CSS v4 + Shadcn/ui
- **Banco:** PostgreSQL (Supabase) com extensão `btree_gist` para evitar double-booking
- **Autenticação:** Supabase Auth (email/senha)
- **Datas:** date-fns
- **Calendário:** React Big Calendar
- **Testes:** Jest + Testing Library

## Pré-requisitos

- Node.js 20+
- Docker Desktop (para Supabase local)
- NPM

## Configuração

### 1. Subir Supabase local

```bash
# Inicializa os containers Docker do Supabase
npx supabase start
```

Isso sobe: PostgreSQL, Auth, Storage, Realtime, Studio (<http://127.0.0.1:54333>).

### 2. Configurar variáveis de ambiente

Copie do output do `supabase start` para o `.env.local`:

| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54331` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` |

### 3. Rodar as migrations

```bash
# As migrations são aplicadas automaticamente no `supabase start`
# Para resetar o banco:
npx supabase db reset
```

### 4. Iniciar o servidor

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Inicia servidor de produção |
| `npm run lint` | Executa ESLint |
| `npm run format` | Formata código com Prettier |
| `npm test` | Executa testes |
| `npm run test:watch` | Testes em modo watch |
| `npx supabase start` | Sobe serviços Supabase local |
| `npx supabase stop` | Para serviços Supabase local |
| `npx supabase db reset` | Reseta o banco local |

## Estrutura do Projeto

```
src/
├── app/
│   ├── (dashboard)/      # Rotas protegidas (com sidebar)
│   │   ├── page.tsx       # Dashboard
│   │   ├── pacientes/     # CRUD Pacientes
│   │   ├── dentistas/     # CRUD Dentistas
│   │   ├── procedimentos/ # CRUD Procedimentos
│   │   └── horarios/      # Grade de horários (em breve)
│   │   └── agenda/        # Calendário (em breve)
│   ├── login/             # Página de login
│   ├── auth/callback/     # Callback OAuth
│   ├── layout.tsx         # Layout raiz
│   ├── globals.css        # Estilos globais + tema azul
│   └── proxy.ts           # Middleware/proxy de autenticação
├── components/
│   ├── ui/                # Componentes Shadcn/ui
│   ├── providers/         # Providers (Supabase Auth)
│   └── sidebar.tsx        # Sidebar de navegação
├── lib/
│   ├── supabase/          # Clientes Supabase (client, server)
│   └── actions/           # Server Actions (CRUDs)
└── types/
    └── database.ts        # Tipos gerados do Supabase

supabase/
├── migrations/            # Migrations SQL
├── config.toml            # Configuração do Supabase
└── seed.sql               # Dados iniciais
```

## Funcionalidades

### MVP

- [x] Autenticação (login/cadastro)
- [x] CRUD Pacientes
- [x] CRUD Dentistas
- [x] CRUD Procedimentos
- [ ] Grade de Horários (availability_slots)
- [ ] Calendário de Agendamentos

### Futuro

- Bloqueio de horários
- Controle de status (Agendado, Confirmado, Em Atendimento, Concluído, Cancelado)
- Multi-clínica (tenant isolation)
- Painel administrativo

### Acessos

- <admin@odonto.com> / 123456
- <dentista@odonto.com> / 123456
- <secretaria@odonto.com> / 123456
