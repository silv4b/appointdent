# AppointDent <img src="assets/tooth-icon.png" alt="Ícone" width="32" height="32" />

Sistema de agendamento odontológico com gestão de pacientes, dentistas, procedimentos, anamnese digital e agenda visual com calendário interativo. Desenvolvido para clínicas e consultórios que precisam de uma ferramenta moderna e eficiente.

**Público-alvo:** Clínicas odontológicas, consultórios particulares, secretárias e dentistas que gerenciam sua própria agenda.

---

## Funcionalidades

### Agenda Visual

- Calendário interativo (react-big-calendar) com visualizações: **Dia**, **Semana**, **Mês**, **3 Dias** e **Lista**
- **Drag & Drop** para reagendar consultas por arrasto
- **Redimensionar** eventos para ajustar duração
- Filtro por dentista no calendário
- Sidebar lateral com agendamentos do **dia selecionado** (passados, **acontecendo agora**, futuros)
- Seções colapsáveis com persistência de estado (localStorage)
- Mini-calendário para navegação rápida (colapsável)
- Tooltip hover nos eventos com dados do agendamento
- Detecção de **conflitos de horário** com mensagem amigável
- Botão **Marcar Retorno** com busca por paciente/dentista/mês

### Cadastros

- **Pacientes**: CRUD completo com busca, paginação, email e cadastro rápido durante agendamento
- **Dentistas**: CRUD completo com busca e paginação
- **Procedimentos**: CRUD completo com cor, duração e valor
- **Grade de Horários**: Accordion por dentista com dias da semana e horários

### Anamnese Digital

- Formulário inline de anamnese com campos dinâmicos via `DynamicCard` (adicionar/remover/reordenar)
- **Modelos de Anamnese**: Dentistas criam templates reutilizáveis com campos pré-definidos (também usa `DynamicCard`)
- Importação de modelo para preenchimento rápido
- **Modo Foco**: expande o formulário para tela cheia
- Editor rich-text (Tiptap) no conteúdo dos campos
- Sessões vinculadas a agendamentos (`appointment_id`)
- Exportação individual ou em lote para **PDF**
- Histórico de sessões anteriores com busca textual e filtro por data
- Visualização de sessão completa em dialog

### Prescrições (Receituário)

- CRUD completo de prescrições com lista paginada e busca
- Criação vinculada a **paciente** e **agendamento**
- Modal de criação a partir da anamnese (fluxo: agendamento → anamnese → prescrição)
- Card dinâmico para adicionar/remover medicamentos
- Exportação para **PDF** com logo da clínica e dados do paciente

### Histórico do Paciente

- Página dedicada (`/historico/[pacienteId]`) com atendimentos realizados e anamneses
- Diálogo de visualização de anamnese (sem navegar para fora da página)
- Filtro por dentista (admin/receptionist) ou restrito ao próprio (dentist)
- Anamneses vinculadas ao atendimento

### Meus Procedimentos (Dentistas)

- Dentistas podem **solicitar novos procedimentos**
- Admin aprova ou rejeita solicitações
- Procedimentos aprovados são criados automaticamente e vinculados ao dentista
- Aba de solicitações pendentes no painel do admin

### Dashboard

- Cards de estatísticas: total de pacientes, agendamentos (hoje, semana, mês)
- Tabela de agendamentos do dia com cores por status e ações rápidas
- Distribuição de procedimentos (gráfico de pizza)
- Agendamentos por dentista no dia
- Indicador "Acontecendo Agora" com badge pulsante
- Badges de status padronizados (scheduled=amber, confirmed=blue, in_progress=orange, completed=green, cancelled=red)

### Autenticação e Segurança

- Login com email/senha via Supabase Auth
- **Rate limiting** no login (5 tentativas/min/IP)
- **Validação de senha** no cadastro (mín. 8 caracteres, maiúscula + número)
- **Row Level Security (RLS)** no PostgreSQL com políticas role-based
- **Content Security Policy (CSP)** via headers HTTP
- Roles: `admin`, `dentist`, `receptionist`
- Proxy de autenticação (Next.js 16) — redireciona não-autenticados para `/login`

### Experiência do Usuário

- Tema claro/escuro (next-themes)
- Componentes shadcn/ui estilizados com CSS variables
- Componentes reutilizáveis `DynamicField` e `DynamicCard` para formulários com campos configuráveis
- Diálogos de confirmação em exclusões
- Toasts de feedback (sucesso/erro) em todas as operações CRUD
- Selects com busca textual nos campos de paciente, dentista e procedimento
- Loading skeletons no calendário
- Paginação + busca em todas as listagens
- Cabeçalhos de tabela clicáveis para ordenação

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
| **Rich Text** | Tiptap |
| **PDF** | jsPDF + html2canvas |

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

Após `npx supabase db reset`, utilize:

| Email | Nome | Senha | Role |
|-------|------|-------|------|
| <admin@odonto.com> | Admin Odonto | 123456 | admin |
| <mariarecepcao@odonto.com> | Maria de Andrade | 123456 | receptionist |
| <anapaularecepcao@odonto.com> | Ana Paula Souza | 123456 | receptionist |
| <joaosilva@odonto.com> | Dr. João Silva | 123456 | dentist |
| <anacosta@odonto.com> | Dra. Ana Costa | 123456 | dentist |
| <pedrooliveira@odonto.com> | Dr. Pedro Oliveira | 123456 | dentist |
| <marianasantos@odonto.com> | Dra. Mariana Santos | 123456 | dentist |
| <lucasmendes@odonto.com> | Dr. Lucas Mendes | 123456 | dentist |

> **Produção:** O primeiro acesso admin é criado via SQL durante o deploy.
> Consulte [`supabase/criar-admin.sql`](supabase/criar-admin.sql) para instruções.
> Após o login, o admin pode criar novos usuários (dentistas/secretárias)
> diretamente pelo menu **Configurações > Usuários**.

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

```text
src/
├── app/
│   ├── (dashboard)/              # Rotas protegidas (com sidebar)
│   │   ├── page.tsx               # Dashboard com cards + status
│   │   ├── agenda/                # Calendário + sidebar + tooltip
│   │   ├── pacientes/             # CRUD Pacientes
│   │   ├── dentistas/             # CRUD Dentistas
│   │   ├── procedimentos/         # CRUD Procedimentos
│   │   ├── horarios/              # Grade de horários por dentista
│   │   ├── historico/             # Histórico de pacientes
│   │   │   └── [pacienteId]/      # Detalhes + anamneses vinculadas
│   │   ├── anamnese/[pacienteId]/ # Anamnese digital inline
│   │   ├── minha-agenda/          # Visão do dentista logado
│   │   ├── minhas-anamneses/      # Modelos de anamnese do dentista
│   │   ├── meus-procedimentos/    # Solicitações de procedimento
│   │   └── admin/usuarios/        # Admin: gerenciar contas
│   ├── login/                     # Página de login
│   ├── auth/callback/             # Callback OAuth
│   ├── layout.tsx                 # Layout raiz
│   ├── globals.css                # Estilos globais + tema
│   └── proxy.ts                   # Proxy de autenticação (Next.js 16)
├── components/
│   ├── ui/                        # Componentes shadcn/ui
│   ├── confirm-dialog.tsx         # Diálogo genérico de confirmação
│   ├── entity-dialog.tsx          # Diálogo genérico de CRUD
│   ├── event-tooltip.tsx          # Tooltip hover em eventos
│   ├── sidebar.tsx                # Sidebar de navegação
│   ├── data-table-pagination.tsx  # Paginação reutilizável
│   ├── rich-text-editor.tsx       # Editor Tiptap
│   └── dashboard-header.tsx       # Cabeçalho com info do usuário
├── hooks/
│   ├── use-local-storage.ts       # Hook SSR-safe (c/ função updater)
│   └── use-debounce.ts            # Debounce para busca
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Cliente Supabase (browser)
│   │   ├── server.ts              # Cliente Supabase (server)
│   │   ├── guard.ts               # requireAuth() helper
│   │   └── actions.ts             # Auth (login, logout)
│   ├── actions/
│   │   ├── appointments.ts        # CRUD agendamentos + overlap
│   │   ├── patients.ts            # CRUD pacientes + quick-create
│   │   ├── dentists.ts            # CRUD dentistas
│   │   ├── procedures.ts          # CRUD procedimentos
│   │   ├── availability-slots.ts  # Grade de horários
│   │   ├── anamnese.ts            # Sessões de anamnese
│   │   ├── anamnesis-templates.ts # Modelos de anamnese
│   │   ├── procedure-requests.ts  # Solicitações de procedimento
│   │   ├── dentist-procedures.ts  # Vínculo dentista-procedimento
│   │   ├── admin.ts               # Admin: criar/listar usuários
│   │   └── notifications.ts       # Notificações
│   ├── schemas/
│   │   └── index.ts               # Schemas zod
│   └── utils/
│       ├── action-response.ts     # ActionResult<T>, ok(), err()
│       └── export-anamnese-pdf.ts # Geração de PDF
├── types/
│   └── database.ts                # Tipos gerados do Supabase
│   └── react-big-calendar-override.d.ts  # Type decl para 3-day view
└── components/
    └── shadcn-big-calendar.css    # Tema shadcn para react-big-calendar

supabase/
├── migrations/
│   ├── 00001_initial_schema.sql
│   ├── 00002_role_based_rls.sql
│   ├── 00003_add_return_to_id.sql
│   ├── 00004_anamnese_sessions.sql
│   ├── 00005_anamnese_sessions_title.sql
│   ├── 00006_anamnese_sessions_fields.sql
│   ├── 00007_notifications.sql
│   ├── 00008_admin_usuarios.sql
│   ├── 00009_dentist_procedures.sql
│   ├── 00010_procedure_requests.sql
│   ├── 00011_anamnesis_templates.sql
│   ├── 00012_blocked_slots.sql
│   ├── 00013_handle_new_user.sql
│   ├── 00014_appointment_email.sql
│   ├── 00015_anamnese_appointment_link.sql
│   ├── 00016_fix_handle_new_user.sql
│   ├── 00017_update_handle_new_user.sql
│   ├── 00018_dashboard_stats.sql
│   └── 00019_add_patient_email.sql
├── config.toml
├── seed.sql
├── criar-admin.sql                # Função para criar admin em produção
└── clear_db.sql                   # Utilitário para limpar dados
```

---

## Segurança

- **Autenticação**: Todas as server actions chamam `requireAuth()` que valida a sessão via `supabase.auth.getUser()`
- **Validação**: Todos os inputs são validados com zod (`safeParse`) antes de processar
- **Rate limiting**: Login protegido contra força bruta (5 tentativas/min/IP)
- **CSP**: Content-Security-Policy configurada no `next.config.ts`
- **RLS**: Políticas role-based — admin pode CRUD tudo; dentista/secretária têm acesso restrito a pacientes e agendamentos
- **Secrets**: Nenhuma chave hardcoded — todas via `process.env`
- **Proxy**: Rota protegida via `src/proxy.ts` (Next.js 16) — redireciona não-autenticados para `/login`

---

## Deploy

Consulte o guia completo em [`docs/tutorial-deploy-supabase.md`](docs/tutorial-deploy-supabase.md) para migrar do ambiente local para produção (Supabase Cloud + Netlify).

### Database Backup

```powershell
# Backup completo (schema + dados)
npx supabase db dump --local -f ".db_backups/$(Get-Date -Format yyyy-MM-dd)/backup-completo.sql"

# Schema apenas
docker exec supabase_db_appointdent pg_dump -U postgres --schema-only --quote-all-identifier `
  --exclude-schema "information_schema|pg_*|_analytics|_realtime|_supavisor|auth|etl|extensions|pgbouncer|realtime|storage|supabase_functions|supabase_migrations|cron|dbdev|graphql|graphql_public|net|pgmq|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault" `
  > ".db_backups/$(Get-Date -Format yyyy-MM-dd)/backup-schema.sql"
```
