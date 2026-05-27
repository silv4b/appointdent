# Tutorial: Migrar Supabase Local para Nuvem (Produção)

## Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Criar projeto no Supabase (plataforma)](#2-criar-projeto-no-supabase-plataforma)
3. [Autenticar CLI na sua máquina](#3-autenticar-cli-na-sua-máquina)
4. [Linkar projeto local ao remoto](#4-linkar-projeto-local-ao-remoto)
5. [Fazer deploy das migrations](#5-fazer-deploy-das-migrations)
6. [Seed data (opcional)](#6-seed-data-opcional)
7. [Configurar variáveis de ambiente](#7-configurar-variáveis-de-ambiente)
8. [Atualizar o app para apontar para produção](#8-atualizar-o-app-para-apontar-para-produção)
9. [CI/CD com GitHub Actions](#9-cicd-com-github-actions)
10. [Solução de problemas](#10-solução-de-problemas)

---

## 1. Pré-requisitos

- Conta no [Supabase](https://supabase.com) (plano Free ou superior)
- Supabase CLI instalado (já incluso nas dependências do projeto)
- Repositório git com suas migrations em `supabase/migrations/`
- Docker rodando na máquina (para testar localmente)

Verifique se o CLI está disponível:

```powershell
supabase --version
```

Caso precise instalar/atualizar:

```powershell
npm install supabase@latest --save-dev
```

---

## 2. Criar projeto no Supabase (plataforma)

1. Acesse [https://supabase.com/dashboard/projects](https://supabase.com/dashboard/projects)
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: `appointdent-prod` (ou nome desejado)
   - **Database Password**: crie uma senha forte e **guarde-a** (necessário para `db push`)
   - **Region**: escolha a mais próxima dos seus usuários (ex: `South America (São Paulo)` — `sa-saopaulo`)
   - **Pricing Plan**: Free para começar
4. Clique em **"Create new project"**
5. Aguarde a criação (~2 minutos)

Após criar, você verá o dashboard do projeto. Anote:

- **Project Reference** (ID): está na URL `https://supabase.com/dashboard/project/<project-ref>` — algo como `abcdefghijklmnopqrst`
- **Supabase URL**: em *Project Settings → API → Project URL*
- **Anon Key**: em *Project Settings → API → anon public*

> ⚠️ **Importante**: Não crie tabelas nem rode SQL no Dashboard. Toda a configuração do banco será feita via migrations da sua máquina.

---

## 3. Autenticar CLI na sua máquina

Faça login no Supabase CLI para que ele possa se conectar ao seu projeto na nuvem:

```powershell
supabase login
```

Isso abrirá o navegador pedindo autorização. Após confirmar, um token será criado e salvo na sua máquina.

Para verificar se está logado:

```powershell
supabase projects list
```

Deverá listar os seus projetos.

---

## 4. Linkar projeto local ao remoto

No diretório raiz do projeto, execute:

```powershell
supabase link --project-ref <project-ref>
```

Substitua `<project-ref>` pelo ID anotado no passo 2.

Exemplo:

```powershell
supabase link --project-ref abcdefghijklmnopqrst
```

O CLI pergunta a senha do banco (a mesma que você definiu no passo 2). O arquivo `supabase/config.toml` será atualizado com o `project_id`.

Para verificar se o link funcionou:

```powershell
supabase db remote commit
```

Isso mostra o estado atual das migrations no banco remoto (vazio, se acabou de criar).

---

## 5. Fazer deploy das migrations

Antes de enviar, é recomendado resetar o banco local para garantir que as migrations estão consistentes:

```powershell
supabase db reset
```

Isso recria o banco local do zero aplicando todas as migrations em ordem.

Agora, faça o deploy para a nuvem:

```powershell
supabase db push
```

O CLI compara as migrations locais (`supabase/migrations/`) com o histórico remoto e aplica apenas as que faltam.

Você verá algo como:

```
Applying migration 20240101000001_initial_schema.sql...
Applying migration 20240102000002_role_based_rls.sql...
Done.
```

Para confirmar que tudo foi aplicado:

```powershell
supabase migration list
```

Migrations com `[remote]` (X) estão aplicadas no remoto.

---

## 6. Seed data (opcional)

Se quiser povoar o banco remoto com dados de teste (útil para staging, **evitar em produção**):

```powershell
supabase db push --include-seed
```

> ⚠️ Só use `--include-seed` em ambientes de teste/staging. Em produção, os dados virão do uso real da aplicação.

---

## 7. Configurar variáveis de ambiente

No seu provedor de deploy (Netlify, Render, Railway, etc.), configure:

| Variável | Onde encontrar |
|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon public |

### Netlify

1. Acesse [https://netlify.com](https://netlify.com) → seu site → **Site configuration → Environment variables**
2. Adicione as duas variáveis acima
3. Faça um novo deploy (ou ative auto-deploy via git)

### Local (.env.local)

Atualize seu `.env.local` para testar localmente contra a nuvem:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

> Lembre-se de que `.env.local` não é versionado. Use `.env.example` como template.

---

## 8. Atualizar o app para apontar para produção

O app já usa `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` via `src/lib/supabase/client.ts` e `src/lib/supabase/server.ts`. Basta configurar essas variáveis no ambiente de produção (passo 7) e fazer deploy.

### Resumo do fluxo de deploy

```mermaid
flowchart LR
    A[Desenvolvimento local] --> B[supabase db push]
    B --> C[Produção na nuvem]
    D[Front-end local] --> E[Netlify deploy]
    E --> F[Deploy Vercel]
    F --> G[Aplicação em produção]

### Deploy manual no Netlify

```powershell
# Build do projeto
npm run build

# Deploy via Netlify CLI (opcional)
npx netlify deploy --prod --dir=.next
```
```

---

## 9. CI/CD com GitHub Actions

Para automatizar o deploy de migrations ao fazer push na `main`, crie `.github/workflows/deploy-supabase.yml`:

```yaml
name: Deploy Migrations to Production

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.PRODUCTION_DB_PASSWORD }}
      SUPABASE_PROJECT_ID: ${{ secrets.PRODUCTION_PROJECT_ID }}

    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - run: supabase link --project-ref $SUPABASE_PROJECT_ID
      - run: supabase db push
```

### Build e deploy no Netlify

Adicione um passo extra no workflow para fazer deploy automático no Netlify após as migrations:

```yaml
name: Deploy Migrations + Netlify

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.PRODUCTION_DB_PASSWORD }}
      SUPABASE_PROJECT_ID: ${{ secrets.PRODUCTION_PROJECT_ID }}

    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - run: supabase link --project-ref $SUPABASE_PROJECT_ID
      - run: supabase db push

      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v3
        with:
          publish-dir: .next
          production-branch: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions"
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### Configurar secrets no Netlify

No Netlify Dashboard → Site settings → Environment variables, adicione:

| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key do seu projeto Supabase |

### Workflow recomendado com staging

Para ambientes maiores, use dois projetos (staging + produção):

```yaml
name: CI/CD

on:
  pull_request:
    branches: [develop]
  push:
    branches: [develop, main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase db start
      - run: supabase db lint
      - run: supabase gen types typescript --local > types/supabase.ts
      - run: git diff --exit-code types/supabase.ts

  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    needs: test
    runs-on: ubuntu-latest
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.STAGING_DB_PASSWORD }}
      SUPABASE_PROJECT_ID: ${{ secrets.STAGING_PROJECT_ID }}
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase link --project-ref $SUPABASE_PROJECT_ID
      - run: supabase db push

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.PRODUCTION_DB_PASSWORD }}
      SUPABASE_PROJECT_ID: ${{ secrets.PRODUCTION_PROJECT_ID }}
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase link --project-ref $SUPABASE_PROJECT_ID
      - run: supabase db push
```

---

## 10. Solução de problemas

### `supabase link` falha

```
Error: Cannot find project with ref <id>
```

**Causa**: Project Reference errado ou CLI desatualizado.

**Solução**:
- Verifique o ID no Dashboard → Project Settings → General
- Atualize o CLI: `npm install supabase@latest`
- Verifique o login: `supabase login`

### `supabase db push` falha com sync error

```
Error: Remote database has unapplied migrations
```

**Causa**: O banco remoto foi alterado manualmente (pelo SQL Editor ou Table Editor do Dashboard).

**Solução**:

```powershell
# Puxa o schema remoto como migration
supabase db pull

# Commit a migration gerada
git add supabase/migrations/_remote_schema.sql
git commit -m "chore: sync remote schema"

# Agora o push funciona
supabase db push
```

### `supabase db push` pede `supabase migration repair`

**Causa**: A tabela `supabase_migrations.schema_migrations` no remoto está fora de sync com as migrations locais.

**Solução**:

```powershell
# Ver o estado
supabase migration list

# Se uma migration já foi aplicada mas não está na tabela:
supabase migration repair --status applied <timestamp>

# Se uma migration está na tabela mas não deve ser reaplicada:
supabase migration repair --status reverted <timestamp>
```

### Erro de permissão (`42501`)

**Causa**: A migration usa um role customizado e o usuário `postgres` não tem permissão.

**Solução**: Conceda ownership ao role `postgres` no banco remoto via SQL Editor (emergencial):

```sql
grant <custom_role> to postgres;
```

Depois volte ao fluxo de migrations.

### `supabase db push` fica pendurado/hangs

**Causa**: Conexão lenta ou migration muito grande.

**Solução**:
- Verifique a conexão de rede
- Certifique-se de que o banco não está pausado (Free Plan pausa após 7 dias inativo)
- Use `supabase db push --debug` para logs detalhados

---

## Checklist Final

- [ ] Projeto criado no Supabase Dashboard
- [ ] Anotado Project Reference, URL e Anon Key
- [ ] `supabase login` executado com sucesso
- [ ] `supabase link --project-ref <id>` executado
- [ ] `supabase db reset` local passou sem erros
- [ ] `supabase db push` executou sem erros
- [ ] `supabase migration list` mostra migrations aplicadas no remoto
- [ ] Variáveis de ambiente configuradas no Netlify (ou provedor de deploy)
- [ ] Netlify deploy feito (`npm run build` + upload ou auto-deploy via git)
- [ ] Aplicação rodando em produção apontando para o novo projeto

---

> **Dica**: Sempre teste migrations localmente com `supabase db reset` antes de dar push para produção. Use um projeto de staging separado para validar mudanças em um ambiente que espelha produção.
