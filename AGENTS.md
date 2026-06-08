<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Response Protocol

Be concise in your answers, only provide the necessary information. Only give more details if requested.

## Commit protocol

Given the identified project modifications (git status):

1. Analyze all changes.
2. List all changes by scope (front, back, infrastructure, architecture, etc.).
3. Inform the user of the file batches along with commit messages for each batch, following semantic commit conventions.
    - Each batch must contain: **lote number**, **commit message** (Portuguese, semantic format), and **list of files**.
    - Format example:

      ```text
      **Lote 1 — `feat: criar tabela de pacientes`**
      src/lib/actions/pacientes.ts
      src/app/(dashboard)/pacientes/client.tsx

      **Lote 2 — `fix: corrigir filtro por data`**
      src/app/(dashboard)/agenda/client.tsx
      ```

    - Each batch must depend on the previous batch.
4. **NEVER commit without explicit user permission.** The user must first confirm the batch plan.
5. After the commitments are executed, present a direct report with all the commitments made.
6. Ask the user if they want to perform a push action or if you can do it for them.

## Database backup

When the user requests a database backup, run:

```powershell
# Create date-named folder
$date = Get-Date -Format "yyyy-MM-dd"
$dir = ".db_backups/$date"
New-Item -ItemType Directory -Path $dir -Force

# Full dump (schema + data)
npx supabase db dump --local -f "$dir/backup-completo.sql"

# Schema only (uses pg_dump from the Supabase Postgres container)
docker exec supabase_db_appointdent pg_dump -U postgres `
  --schema-only --quote-all-identifier `
  --exclude-schema "information_schema|pg_*|_analytics|_realtime|_supavisor|auth|etl|extensions|pgbouncer|realtime|storage|supabase_functions|supabase_migrations|cron|dbdev|graphql|graphql_public|net|pgmq|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault" `
  > "$dir/backup-schema.sql"
```

Both files are saved inside `.db_backups/<AAAA-MM-DD>/`. The directory is gitignored.

## Pagination

All tables in the system (current and future) **must** have pagination on their listing pages. Use server-side pagination with `LIMIT`/`OFFSET` (SQL) or `.range()` (Supabase JS). Default page size: 10 records. Include page size selector (10/20/50/100) and total record count display.

## RLS & Database Security

Toda nova tabela criada no Supabase **deve** seguir estas regras de segurança obrigatoriamente:

### 1. RLS obrigatório

- Toda tabela **deve** ter `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` na migration de criação.
- Nenhuma tabela pode ficar sem RLS — dados ficam expostos via API REST do Supabase.

### 2. Policies por role

Toda operação (SELECT/INSERT/UPDATE/DELETE) deve ser escopada pelo perfil do usuário usando `public.get_user_role()`:

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| **admin** | tudo | tudo | tudo | tudo |
| **dentist** | só o que lhe pertence (`dentist_id` = próprio perfil) | só criando para si | só o que lhe pertence | só o que lhe pertence |
| **receptionist** | só o que pertence a dentistas vinculados (`receptionist_dentists`) | **nunca** (salvo exceção explícita) | **nunca** (salvo exceção explícita) | **nunca** |

Template padrão de policy:

```sql
CREATE POLICY "select <table> by scope" ON <table>
  FOR SELECT
  USING (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'dentist' AND <owner_fk> IN (SELECT id FROM public.dentists WHERE profile_id = auth.uid()))
    OR (public.get_user_role() = 'receptionist' AND <owner_fk> IN (SELECT <fk> FROM public.receptionist_dentists WHERE receptionist_id = auth.uid()))
  );
```

O mesmo padrão se aplica a INSERT (WITH CHECK), UPDATE (USING + WITH CHECK) e DELETE (USING).

### 3. Nunca usar `USING (true)` em SELECT

Select público (`USING (true)`) jamais pode ser usado em tabelas com dados sensíveis. Se um SELECT irrestrito for necessário (ex: tabela de lookup tipo `procedures`), use `auth.role() = 'authenticated'` como mínimo — ao menos exige login.

### 4. Atenção ao nome das policies ao dropar

Quando uma migration anterior renomeou policies, o nome antigo usado num `DROP POLICY` pode não funcionar. Sempre verifique o nome atual da policy em `pg_policies` antes de dropar. Use `DROP POLICY IF EXISTS "<nome_exato>" ON <tabela>`.

### 5. Policies conflitantes (OR)

RLS faz **OR** entre policies do mesmo comando numa tabela. Se você criar uma policy restritiva sem dropar a permissiva anterior, a permissiva ainda vale. Sempre drope a antiga ao substituir.

### 6. Server actions como camada extra

Toda query a dados do Supabase deve passar por server actions (`"use server"` em `src/lib/actions/`), não por `createClient()` direto no cliente. Exceção única: canais real-time (WebSocket), que precisam do client-side.

### 7. Revisão ao adicionar feature

Ao criar uma nova tabela ou adicionar uma operação numa tabela existente:

1. Adicione RLS + policies na mesma migration
2. Siga o template de escopo por role
3. Verifique se não há policies antigas conflitando (use `pg_policies`)
4. Teste a migration localmente com `npx supabase migration up`
