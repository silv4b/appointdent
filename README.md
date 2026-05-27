# AppointDent

Sistema de agendamento odontológico com gestão de pacientes, dentistas, procedimentos e agenda visual com calendário interativo. Desenvolvido para clínicas e consultórios que precisam de uma ferramenta moderna e eficiente.

**Público-alvo:** Clínicas odontológicas, consultórios particulares, secretárias e dentistas que gerenciam sua própria agenda.

---

## Funcionalidades

### Agenda Visual

- Calendário interativo (react-big-calendar) com visualizações: **Dia**, **Semana**, **Mês** e **Agenda**
- **Drag & Drop** para reagendar consultas por arrasto
- **Redimensionar** eventos para ajustar duração
- Filtro por dentista no calendário
- Sidebar lateral com agendamentos do **dia selecionado** (passados, atual e futuros)
- Sidebar colapsável com persistência de estado
- Mini-calendário para navegação rápida
- Código de cores por procedimento
- Detecção de **conflitos de horário** com mensagem amigável

### Cadastros

- **Pacientes**: CRUD completo com busca, paginação e cadastro rápido durante agendamento
- **Dentistas**: CRUD completo com busca e paginação
- **Procedimentos**: CRUD completo com cor, duração e valor
- **Grade de Horários**: Accordion por dentista com dias da semana e horários

### Autenticação e Segurança

- Login com email/senha via Supabase Auth
- **Rate limiting** no login (5 tentativas/min/IP)
- **Validação de senha** no cadastro (mín. 8 caracteres, maiúscula + número)
- **Row Level Security (RLS)** no PostgreSQL com políticas role-based
- **Content Security Policy (CSP)** via headers HTTP
- Roles: `admin`, `dentist`, `receptionist`
- Middleware de autenticação (redireciona não-autenticados para `/login`)

### Experiência do Usuário

- Tema claro/escuro (next-themes)
- Componentes shadcn/ui estilizados com CSS variables
- Diálogos de confirmação em exclusões
- Toasts de feedback (sucesso/erro) em todas as operações CRUD
- Selects com busca textual nos campos de paciente, dentista e procedimento
- Loading skeletons no calendário
- Paginação + busca em todas as listagens

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| **Framework** | Next.js 16 (App Router, TypeScript) |
| **Estilo** | Tailwind CSS v4 + shadcn/ui |
| **Banco** | PostgreSQL (Supabase) + extensão `btree_gist` |
| **Autenticação** | Supabase Auth (email/senha) |
| **Datas** | date-fns |
| **Calendário** | react-big-calendar + drag-and-drop |
| **Validação** | zod |
| **Notificações** | sonner (toasts) |
| **Tema** | next-themes |

---

## Pré-requisitos

- Node.js 20+
- Docker Desktop (para Supabase local)
- NPM

---

## Configuração

### 1. Subir Supabase local

```bash
npx supabase start
```

Portas padrão (após resolução de conflitos):

| Serviço | URL |
|---------|-----|
| API | `http://127.0.0.1:54331` |
| DB | `localhost:54332` |
| Studio | `http://127.0.0.1:54333` |
| Inbucket | `http://127.0.0.1:54334` |

### 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha com os valores do output de `supabase start`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

### 3. Aplicar migrations e seed

```bash
npx supabase db reset
```

Isso aplica as migrations (`supabase/migrations/`) e popula com dados de teste (`supabase/seed.sql`).

### 4. Iniciar servidor

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Acessos de teste

| Email | Senha | Role |
|-------|-------|------|
| <admin@odonto.com> | Admin@123 | admin |
| <dentista@odonto.com> | Dent@123 | dentist |
| <secretaria@odonto.com> | Sec@123 | receptionist |

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Inicia servidor de produção |
| `npm run lint` | Executa ESLint |
| `npm run format` | Formata código com Prettier |
| `npx supabase start` | Sobe serviços Supabase local |
| `npx supabase stop` | Para serviços Supabase local |
| `npx supabase db reset` | Reseta o banco local |

---

## Estrutura do Projeto

```
src/
├── app/
│   ├── (dashboard)/           # Rotas protegidas (com sidebar)
│   │   ├── page.tsx            # Dashboard com cards de estatísticas
│   │   ├── agenda/             # Calendário + sidebar + mini-calendário
│   │   ├── pacientes/          # CRUD Pacientes
│   │   ├── dentistas/          # CRUD Dentistas
│   │   ├── procedimentos/      # CRUD Procedimentos
│   │   └── horarios/           # Grade de horários por dentista
│   ├── login/                  # Página de login
│   ├── auth/callback/          # Callback OAuth
│   ├── layout.tsx              # Layout raiz
│   ├── globals.css             # Estilos globais + tema
│   └── proxy.ts                # Middleware de autenticação
├── components/
│   ├── ui/                     # Componentes shadcn/ui
│   ├── confirm-dialog.tsx      # Diálogo genérico de confirmação
│   ├── entity-dialog.tsx       # Diálogo genérico de CRUD
│   ├── sidebar.tsx             # Sidebar de navegação
│   └── dashboard-header.tsx    # Cabeçalho com info do usuário
├── hooks/
│   └── use-local-storage.ts    # Hook SSR-safe para localStorage
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Cliente Supabase (browser)
│   │   ├── server.ts           # Cliente Supabase (server)
│   │   ├── middleware.ts        # Auth middleware
│   │   ├── actions.ts          # Auth (login, signup, logout)
│   │   └── guard.ts            # requireAuth() helper
│   ├── actions/
│   │   ├── appointments.ts     # CRUD agendamentos + overlap + range
│   │   ├── patients.ts         # CRUD pacientes + quick-create
│   │   ├── dentists.ts         # CRUD dentistas
│   │   ├── procedures.ts       # CRUD procedimentos
│   │   └── availability-slots.ts # CRUD grade de horários
│   ├── schemas/
│   │   └── index.ts            # Schemas zod
│   └── utils/
│       └── action-response.ts  # ActionResult<T>, ok(), err()
├── types/
│   └── database.ts             # Tipos gerados do Supabase
└── components/
    └── shadcn-big-calendar.css # Tema shadcn para react-big-calendar

supabase/
├── migrations/
│   ├── 00001_initial_schema.sql
│   └── 00002_role_based_rls.sql
├── config.toml
└── seed.sql
```

---

## Segurança

- **Autenticação**: Todas as server actions chamam `requireAuth()` que valida a sessão via `supabase.auth.getUser()`
- **Validação**: Todos os inputs são validados com zod (`safeParse`) antes de processar
- **Rate limiting**: Login protegido contra força bruta (5 tentativas/min/IP)
- **CSP**: Content-Security-Policy configurada no `next.config.ts`
- **RLS**: Políticas role-based — admin pode CRUD tudo; dentista/secretária têm acesso restrito a pacientes e agendamentos
- **Secrets**: Nenhuma chave hardcoded — todas via `process.env`

---

## Deploy

Consulte o guia completo em [`docs/tutorial-deploy-supabase.md`](docs/tutorial-deploy-supabase.md) para migrar do ambiente local para produção (Supabase Cloud + Netlify).
