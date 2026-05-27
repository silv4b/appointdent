# Relatório de Auditoria — AppointDent

> **Gerado em:** 26/05/2026
> **Escopo:** Análise de segurança, arquitetura e qualidade de código
> **Metodologia:** Revisão manual do código-fonte + análise estática

---

## Índice

1. [Auditoria de Segurança](#1-auditoria-de-segurança)
2. [Análise de Arquitetura](#2-análise-de-arquitetura)
3. [Relatório de Qualidade de Código](#3-relatório-de-qualidade-de-código)
4. [Recomendações Prioritárias](#4-recomendações-prioritárias)

---

## 1. Auditoria de Segurança

### 1.1 Ausência de Verificação de Autenticação em Server Actions

**Severidade: CRÍTICA**

Nenhuma das 19 funções exportadas nos 5 arquivos de server action verifica se o usuário está autenticado antes de operar:

| Arquivo | Funções | Total |
|---------|---------|-------|
| `src/lib/actions/appointments.ts` | `getAppointments`, `createAppointment`, `updateAppointment`, `updateAppointmentStatus`, `deleteAppointment` | 5 |
| `src/lib/actions/patients.ts` | `getPatients`, `createPatient`, `quickCreatePatient`, `updatePatient`, `deletePatient` | 5 |
| `src/lib/actions/availability-slots.ts` | `getAvailabilitySlots`, `createAvailabilitySlot`, `updateAvailabilitySlot`, `deleteAvailabilitySlot` | 4 |
| `src/lib/actions/procedures.ts` | `getProcedures`, `createProcedure`, `updateProcedure`, `deleteProcedure` | 4 |
| `src/lib/actions/dentists.ts` | `getDentists`, `createDentist`, `updateDentist`, `deleteDentist` | 4 |

**Impacto:** Qualquer usuário anônimo que consiga chamar estas server actions (via formulário, fetch, ou ferramentas de desenvolvedor) pode ler, criar, alterar ou deletar dados do banco. A única barreira é o RLS no banco, que depende de um cookie de sessão válido.

**Mitigação atual:** O `proxy.ts` (middleware Next.js 16) redireciona requisições não autenticadas para `/login`. Server actions executam no servidor e passam pelo middleware, mas ainda é uma camada frágil — seria trivial contornar com uma chamada direta se o RLS for mal configurado.

**Solução:** Adicionar `supabase.auth.getUser()` no início de cada server action, abortando com redirect ou erro caso o usuário não esteja logado.

---

### 1.2 Ausência de Validação de Entrada

**Severidade: CRÍTICA**

Todas as 14 funções de mutação usam `formData.get("campo") as string` sem qualquer validação:

- `appointments.ts` (linhas 52, 98, 129, 142)
- `patients.ts` (linhas 15, 35, 52, 71)
- `availability-slots.ts` (linhas 16, 30, 48)
- `procedures.ts` (linhas 15, 30, 50)
- `dentists.ts` (linhas 15, 29, 48)

**Problemas:**

1. **Type coercion cega:** `as string` não valida — se o campo vier `null` ou `undefined`, o valor será a string `"null"` ou lançará erro em tempo de execução.
2. **Injeção indireta:** Embora o Supabase query builder escape valores, campos como `notes`, `name`, `description` não são sanitizados para XSS. Se esses valores forem renderizados sem escape no frontend, há risco.
3. **Campos obrigatórios:** `createAppointment` não valida se `patient_id`, `dentist_id`, `start_time` estão presentes antes de enviar ao banco.
4. **Tipos numéricos:** `Number(formData.get("day_of_week"))` retorna `NaN` silenciosamente se o valor não for numérico.

**Solução:** Implementar schemas com zod para validar entrada em cada server action.

---

### 1.3 Login sem Rate Limiting

**Severidade: MÉDIA**

A função `login()` em `src/lib/supabase/actions.ts` (linha 7) não implementa:

- Rate limiting (tentativas por IP/tempo)
- Verificação de brute force
- Delay progressivo
- Captcha/reCAPTCHA

**Impacto:** Ataque de força bruta contra contas de usuário.

---

### 1.4 Senha sem Validação de Força

**Severidade: MÉDIA**

A função `signup()` em `src/supabase/lib/actions.ts` (linha 23) aceita qualquer senha sem validar:

- Comprimento mínimo
- Complexidade (maiúsculas, números, símbolos)
- Verificação contra vazamentos conhecidos

**Dependência total no Supabase Auth:** O Supabase já aplica políticas de senha no lado dele (mínimo 6 caracteres por padrão), mas não há validação no frontend nem no servidor antes de chamar `signUp()`.

---

### 1.5 RLS Policies Permissivas Demais

**Severidade: MÉDIA**

O arquivo `supabase/migrations/00001_initial_schema.sql` (linhas 126-202) define 28 políticas RLS que concedem **CRUD completo a qualquer usuário autenticado** em todas as tabelas:

```sql
CREATE POLICY "authenticated users can delete appointments"
  ON appointments FOR DELETE USING (auth.role() = 'authenticated');
```

Isso significa que um dentista pode deletar pacientes de outro dentista, ou um recepcionista pode alterar procedimentos. Não há segregação por papel/função.

**Atenuação:** Para um MVP single-tenant onde todos os usuários são confiáveis, isso é aceitável. Mas para produção com múltiplas clínicas ou hierarquia de acesso, é insuficiente.

---

### 1.6 Credenciais no Código Fonte

**Severidade: BAIXA (OK)**

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` é uma chave pública (design do Supabase)
- `NEXT_PUBLIC_SUPABASE_URL` é a URL pública do servidor
- **Nenhuma chave secreta** (service_role key, JWT secret) está no código
- **Nenhum `dangerouslySetInnerHTML`** encontrado na base

---

### 1.7 Headers de Segurança

**Severidade: BAIXA (OK parcial)**

- O Next.js 16 já define `X-DNS-Prefetch-Control`, `X-Content-Type-Options` por padrão
- CSP, HSTS, `X-Frame-Options` não estão configurados explicitamente

**Solução (opcional):** Configurar CSP no `next.config.ts` para mitigar XSS.

---

### 1.8 Falta de `.env.example`

**Severidade: BAIXA**

Não há arquivo `.env.example` documentando as variáveis necessárias para novos desenvolvedores. Apenas `.env.local` existe com valores locais.

---

## 2. Análise de Arquitetura

### 2.1 Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js | 16.2.6 |
| Linguagem | TypeScript | 5.x |
| UI | Base UI + shadcn/ui | 1.5.0 |
| CSS | Tailwind CSS v4 + CSS Variables | 4.x |
| Banco | PostgreSQL (Supabase) | 17 |
| ORM/Cliente | Supabase JS SDK + SSR | 2.106.1 |
| Calendário | react-big-calendar | 1.19.4 |
| Tema | next-themes | 1.0.0-beta.0 |
| Ícones | lucide-react | 1.16.0 |
| Data | date-fns | 4.3.0 |
| Testes | Jest + Testing Library | 30.x |
| Linter | ESLint + Prettier | 9.x |

### 2.2 Estrutura de Diretórios

```
src/
├── app/
│   ├── (dashboard)/          # Rotas protegidas (layout + páginas)
│   │   ├── agenda/           # Calendário principal
│   │   ├── pacientes/        # CRUD pacientes
│   │   ├── dentistas/        # CRUD dentistas
│   │   ├── procedimentos/    # CRUD procedimentos
│   │   ├── horarios/         # CRUD disponibilidade
│   │   ├── dashboard-client.tsx
│   │   ├── layout.tsx        # Sidebar + Header + Toaster
│   │   └── page.tsx          # Home
│   ├── auth/                 # Callbacks de autenticação
│   ├── login/                # Página de login
│   ├── layout.tsx            # Root layout (fontes, providers)
│   └── globals.css
├── components/
│   ├── ui/                   # shadcn/ui primitives
│   ├── providers/            # SupabaseProvider
│   ├── confirm-dialog.tsx    # Diálogo de confirmação reutilizável
│   ├── crud-page.tsx         # Template genérico de CRUD
│   ├── dashboard-header.tsx
│   ├── entity-dialog.tsx     # Diálogo genérico para entidades
│   ├── sidebar.tsx
│   ├── shadcn-big-calendar.css
│   └── theme-provider.tsx
├── hooks/
│   └── use-local-storage.ts
├── lib/
│   ├── actions/              # Server actions (CRUD)
│   ├── supabase/             # Clients + middleware + auth actions
│   └── utils.ts
├── types/
│   └── database.ts           # Tipos gerados do Supabase
└── proxy.ts                  # Next.js 16 middleware (auth redirect)
```

### 2.3 Fluxo de Dados

```
Browser → proxy.ts (middleware auth check)
         → layout.tsx (dashboard layout with sidebar)
         → page.tsx → client.tsx (react-big-calendar)
             ↓ user action
         → server action (ex: createAppointment)
             ↓
         → Supabase JS SDK (parameterized query)
             ↓
         → PostgreSQL + RLS
             ↓
         → response → revalidatePath → UI refresh
```

### 2.4 Padrão de CRUD

O sistema usa um padrão consistente em todos os módulos:

1. **Server action** (`src/lib/actions/*.ts`) — "use server", recebe `FormData`, opera no banco, chama `revalidatePath`
2. **Página** (`src/app/(dashboard)/*/page.tsx`) — Server component que busca dados e renderiza o client component
3. **Client component** (`src/app/(dashboard)/*/client.tsx`) — "use client", renderiza tabela + diálogos
4. **EntityDialog** (`src/components/entity-dialog.tsx`) — Componente genérico de formulário com slots

### 2.5 Estado Global vs Local

- **Autenticação:** Gerenciada via cookies + middleware (proxy.ts), sem estado global no cliente
- **Sidebar collapsed:** `useState` local no layout do dashboard
- **View do calendário:** `useLocalStorage` (persistente entre sessões)
- **Filtro de dentista:** Estado local no client da agenda
- **Dados de calendário:** Buscados via server action, estado local no componente

### 2.6 Observações Arquiteturais

**Positivos:**

- Separação clara entre server e client components
- Server actions centralizam toda a lógica de banco
- Tipos do Supabase gerados ([`Database`](src/types/database.ts:1)) garantem type safety nas queries
- Template CRUD reutilizável reduz duplicação
- Next.js 16 `proxy.ts` para middleware de autenticação

**Pontos de atenção:**

- Toda busca de dados do calendário é feita via server action (`getAppointments`), não via fetch direto do cliente — isso adiciona latência vs. chamada direta ao Supabase do lado do cliente
- O calendário busca 1 dia por vez (`getAppointments(date: string)`), o que é ineficiente para views de mês/semana (múltiplas chamadas)
- Não há cache ou SWR/React Query — cada navegação refaz fetch completo
- Toda responsabilidade de validação está no frontend (camada de formulário), sem fallback no servidor

---

## 3. Relatório de Qualidade de Código

### 3.1 Type Safety

#### 3.1.1 Uso Excessivo de `as string` (30+ ocorrências)

Todos os server actions fazem coerção indiscriminada:

```typescript
// Exemplo em appointments.ts:55
const startTimeLocal = formData.get("start_time") as string
```

`formData.get()` retorna `string | File | null` — o `as string` suprime o erro do TypeScript mas não valida se o valor realmente é uma string.

#### 3.1.2 `any` e Tipos Implícitos

O arquivo `src/types/database.ts` usa genéricos complexos com `infer R` e `infer I` que dificultam a manutenção. Preferível usar `supabase gen types` para gerar tipos atualizados automaticamente.

#### 3.1.3 `!` (Non-null Assertion) em Variáveis de Ambiente

```typescript
// server.ts:9-10
process.env.NEXT_PUBLIC_SUPABASE_URL!
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
```

Se essas variáveis não estiverem definidas, o erro será silencioso até o runtime. Melhor: validação na inicialização.

### 3.2 Boilerplate e Duplicação

#### 3.2.1 Tratamento de Erro Repetitivo

```typescript
// Padrão repetido 14+ vezes:
if (error) return { error: error.message }
```

Cada server action trata erro da mesma forma, mas:

- `appointments.ts` retorna `{ error: string }`
- `patients.ts` retorna `{ error: string } | { data: ... }`
- `dentists.ts` retorna apenas `{ error: string }` ou nada

Inconsistência no retorno: algumas funções retornam `void` em caso de sucesso, outras retornam `{ data }`.

#### 3.2.2 `revalidatePath` Hardcoded

Cada server action chama `revalidatePath("/rota")` com o path hardcoded. Se a rota mudar, todas as actions precisam ser atualizadas.

#### 3.2.3 Criação de Client Repetida

Toda server action chama `const supabase = await createClient()` — 19 vezes em 5 arquivos. Um helper `withAuth` resolveria isso.

### 3.3 Padrões e Convenções

#### 3.3.1 Nomes Misturados (🇧🇷/🇺🇸)

- Server actions e componentes: **Inglês** (`createAppointment`, `getPatients`)
- Mensagens de erro/exibição: **Português** (`"Conflito de horário"`)
- Comentários no migration SQL: **Inglês** + **Português** misturados

#### 3.3.2 Convenção de Arquivos

- `client.tsx` dentro de cada rota (agenda, pacientes, etc.) — boa prática do Next.js (separação server/client)
- Componentes reutilizáveis na pasta `components/` — boa prática
- `page.tsx` como server component e `client.tsx` como client component — consistente

### 3.4 Performance

#### 3.4.1 Busca de Dados do Calendário

`getAppointments` busca 1 dia por vez. Na visualização de **mês**, o `client.tsx` precisa chamar esta função para cada dia visível (até 31 chamadas). Isso gera N+1 requests.

**Alternativa:** Criar `getAppointmentsRange(start: string, end: string)` para buscar intervalo completo.

#### 3.4.2 Revalidação Agressiva

`revalidatePath("/agenda")` é chamado após cada operação, forçando refetch completo. Sem cache layer, isso é aceitável para MVP mas pode ser melhorado.

### 3.5 Testes

**Nenhum teste foi encontrado na base de código.** Embora Jest e Testing Library estejam configurados no `package.json`, não há arquivos `.test.ts` ou `.spec.ts`.

### 3.6 Código Morto

- `src/lib/supabase/client.ts` — cliente browser, usado apenas pelo `SupabaseProvider` — confirmar se ainda é necessário com o padrão de server actions
- Alguns imports não utilizados podem existir em arquivos editados ao longo do desenvolvimento (não identificados em varredura superficial)

### 3.7 CSS e Tema

- `shadcn-big-calendar.css` com 616 linhas sobrescreve completamente os estilos padrão do react-big-calendar — bem organizado
- Uso de `color-mix` para pastéis adaptáveis ao tema — boa prática
- Transição suave da sidebar com `transition-all duration-300` — consistente

---

## 4. Recomendações Prioritárias

### Críticas (Fazer Imediatamente)

| # | Ação | Arquivos Afetados | Esforço |
|---|------|-------------------|---------|
| 1 | Adicionar `requireAuth()` + verificação em todas as server actions | `src/lib/actions/*.ts`, criar `src/lib/supabase/guard.ts` | 1h |
| 2 | Implementar zod schemas para validação de entrada | `src/lib/actions/*.ts`, criar `src/lib/schemas/*.ts` | 2h |
| 3 | Corrigir retorno inconsistente das server actions (padronizar `{ data, error }`) | `src/lib/actions/*.ts` | 30min |

### Médias (Próximo Sprint)

| # | Ação | Arquivos Afetados | Esforço |
|---|------|-------------------|---------|
| 4 | Adicionar rate limiting no login | `src/lib/supabase/actions.ts` | 1h |
| 5 | Validar força de senha no signup | `src/lib/supabase/actions.ts` | 30min |
| 6 | Refinar RLS policies por papel (admin/dentista/recepcionista) | `supabase/migrations/00002_role_based_rls.sql` | 2h |
| 7 | Criar `getAppointmentsRange()` para evitar N+1 no calendário | `src/lib/actions/appointments.ts` | 30min |
| 8 | Criar `.env.example` | Raiz do projeto | 5min |

### Baixas (Backlog)

| # | Ação | Esforço |
|---|------|---------|
| 9 | Adicionar CSP headers no `next.config.ts` | 30min |
| 10 | Remover imports e código morto | 30min |
| 11 | Escrever testes unitários para server actions | 4h |
| 12 | Adicionar sonner toasts para feedback visual | 1h |
| 13 | Adicionar loading skeletons no calendário e sidebar | 1h |
| 14 | Padronizar nomes (tudo em inglês ou português) | 2h |
| 15 | Configurar `supabase gen types` para gerar tipos atualizados | 30min |

---

## Resumo

**Pontos Fortes:**

- Stack moderna e bem escolhida (Next.js 16 + Supabase + shadcn/ui)
- Sem SQL injetado (todas as queries usam o SDK parametrizado do Supabase)
- Sem `dangerouslySetInnerHTML`
- Sem chaves secretas no código fonte
- Separação clara server/client components
- Padrão CRUD consistente entre módulos
- Tema adaptável (dark/light) com transições suaves
- Autenticação via middleware (proxy.ts) protege rotas no nível de request

**Riscos Imediatos:**

- Server actions sem verificação de autenticação nem validação de entrada
- RLS policies excessivamente permissivas (qualquer usuário autenticado = superadmin)
- N+1 queries na visualização mensal do calendário
- Login sem proteção contra força bruta
- Nenhum teste automatizado

**Prioridade:** Fechar os buracos de validação e autenticação nas server actions (itens 1-3), depois refinar RLS (item 6), e então melhorar a experiência do usuário com toasts/skeletons e performance.
