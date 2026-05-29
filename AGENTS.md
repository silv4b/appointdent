<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Response Protocol

Be concise in your answers, only provide the necessary information. Only give more details if requested.

## Commit protocol

Before staging any changes, read `docs/batched-commits.md` and follow the
4-step protocol: analyze → group → present → execute only on user approval.
Never push — the user does that manually.

## Database backup

When the user requests a database backup, run:

```powershell
# Create date-named folder
$date = Get-Date -Format "yyyy-MM-dd"
$dir = ".db_backups/$date"
New-Item -ItemType Directory -Path $dir -Force

# Full dump
npx supabase db dump -f "$dir/backup-completo.sql"

# Schema only
npx supabase db dump --schema-only -f "$dir/backup-schema.sql"
```

Both files are saved inside `.db_backups/<AAAA-MM-DD>/`. The directory is gitignored.

## Pagination

All tables in the system (current and future) **must** have pagination on their listing pages. Use server-side pagination with `LIMIT`/`OFFSET` (SQL) or `.range()` (Supabase JS). Default page size: 20 records. Include page size selector (20/50/100) and total record count display.
