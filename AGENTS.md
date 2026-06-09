<!-- markdownlint-disable MD041 MD060 -->
## Response Protocol

Be concise in your answers, only provide the necessary information. Only give more details if requested.

## Terminal command execution

Never execute terminal commands without the user's express authorization. Any action involving the shell (docker, supabase CLI, git, npm, etc.) must first be described and approved before execution. Exception: purely informational commands with no side effects, such as `npx tsc --noEmit` for type checking.

## Commit protocol

Given the identified project modifications (git status):

1. Analyze all changes.
2. List all changes by scope (front, back, infrastructure, architecture, etc.).
3. Inform the user of the file batches along with commit messages for each batch, following semantic commit conventions.
    - Each batch must contain: **batch number**, **commit message** (Portuguese, semantic format), and **list of files**.
    - Format example:

      ```text
      **Batch 1 — `feat: criar tabela de pacientes`**
      src/lib/actions/pacientes.ts
      src/app/(dashboard)/pacientes/client.tsx

      **Batch 2 — `fix: corrigir filtro por data`**
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

Every new table created in Supabase **must** follow these security rules:

### 1. RLS is mandatory

- Every table **must** have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in the creation migration.
- No table may be left without RLS — data becomes exposed via the Supabase REST API.

### 2. Policies by role

Every operation (SELECT/INSERT/UPDATE/DELETE) must be scoped by the user's profile using `public.get_user_role()`:

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| **admin** | everything | everything | everything | everything |
| **dentist** | only what belongs to them (`dentist_id` = own profile) | only creating for themselves | only what belongs to them | only what belongs to them |
| **receptionist** | only what belongs to linked dentists (`receptionist_dentists`) | **never** (unless explicitly excepted) | **never** (unless explicitly excepted) | **never** (unless explicitly excepted) |

Default policy template:

```sql
CREATE POLICY "select <table> by scope" ON <table>
  FOR SELECT
  USING (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'dentist' AND <owner_fk> IN (SELECT id FROM public.dentists WHERE profile_id = auth.uid()))
    OR (public.get_user_role() = 'receptionist' AND <owner_fk> IN (SELECT <fk> FROM public.receptionist_dentists WHERE receptionist_id = auth.uid()))
  );
```

The same pattern applies to INSERT (WITH CHECK), UPDATE (USING + WITH CHECK) and DELETE (USING).

### 3. Never use `USING (true)` in SELECT

Public SELECT (`USING (true)`) must never be used on tables with sensitive data. If an unrestricted SELECT is necessary (e.g. lookup tables like `procedures`), use `auth.role() = 'authenticated'` as a minimum — at least requires login.

### 4. Pay attention to policy names when dropping

When a previous migration renamed policies, the old name used in a `DROP POLICY` statement may not work. Always verify the current policy name in `pg_policies` before dropping. Use `DROP POLICY IF EXISTS "<exact_name>" ON <table>`.

### 5. Conflicting policies (OR)

RLS applies **OR** between policies of the same command on a table. If you create a restrictive policy without dropping the previous permissive one, the permissive one still applies. Always drop the old one when replacing.

### 6. Server actions as an extra layer

Every query to Supabase data must go through server actions (`"use server"` in `src/lib/actions/`), not through `createClient()` directly on the client. Sole exception: real-time channels (WebSocket), which need the client-side.

### 7. Review when adding a feature

When creating a new table or adding an operation to an existing table:

1. Add RLS + policies in the same migration
2. Follow the role-based scope template
3. Check if there are no old policies conflicting (use `pg_policies`)
4. Test the migration locally with `npx supabase migration up`

## Test conventions

Every test file **must** have a comment at the top describing **what** it tests and **where** the code under test lives. Be simple and direct — one or two lines.

```text
// Tests: src/lib/utils/password.ts — generatePassword()
// Ensures passwords meet length, character class requirements, and randomness.
```

New tests should prioritize **meaningful scenarios** over coverage:

- Boundary values (empty, max length, off-by-one)
- Security (tampered payloads, access denied, rate limited)
- Business rules (overlap rejection, wrong dentist blocked, cancellation rate)
- Failure modes (Supabase returns error, auth fails, RPC unavailable)

Available commands in `package.json`:

- `npm test` — runs all tests
- `npm run test:watch` — watch mode
- `npm run test:coverage` — with coverage report
- `npm run test:schemas` — only Zod schema tests
- `npm run test:utils` — only utils, crypto, rate-limit, access-filter, email
- `npm run test:actions` — only server actions
