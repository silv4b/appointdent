# Deploy do AppointDent para um novo projeto Supabase na nuvem

> Guia rápido para subir o banco local para um projeto Supabase criado do zero em uma conta nova.

## Pré-requisitos

- Projeto já criado no [Supabase Dashboard](https://supabase.com/dashboard/projects)
- **Project Reference (ID)** anotado — string de ~20 caracteres que aparece na URL do projeto: `https://supabase.com/dashboard/project/<ID>`. Esse mesmo ID compõe a Project URL: `https://<ID>.supabase.co`
- Database Password anotada (a mesma definida na criação do projeto)
- Supabase CLI instalado (`npx supabase --version`)

## 1. Autenticar o CLI na conta nova

```powershell
npx supabase login
```

Abre o navegador — faça login na **conta nova** e autorize.

Verifique se a conta certa está conectada:

```powershell
npx supabase projects list
```

Deverá listar o projeto que você criou.

## 2. Linkar o projeto local ao remoto

```powershell
npx supabase link --project-ref <ID>
```

Digite a **Database Password** quando solicitado.

O arquivo `supabase/config.toml` será atualizado com o `project_id`.

## 3. Ativar extensão necessária no banco remoto

No **SQL Editor** do Dashboard do projeto remoto, execute:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

Essa extensão é obrigatória para as constraints de overlap nos agendamentos.

## 4. Aplicar as migrations

```powershell
npx supabase db push
```

O CLI compara as migrations locais (`supabase/migrations/`) com o remoto e aplica as que faltam.

Para confirmar:

```powershell
npx supabase migration list
```

Todas devem aparecer com `[remote]` (X).

## 5. Configurar variáveis de ambiente

No Dashboard do projeto, vá em **Project Settings → API** e copie:

- **Project URL** (ex: `https://xxxxxxxxxxxxxxx.supabase.co`)
- **Anon Key**

Crie (ou atualize) o arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJ...
```

## 6. Fazer deploy do front-end (Vercel/Netlify)

Crie um novo site no Vercel ou Netlify a partir do repositório e configure as mesmas variáveis:

| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon Key do Supabase |

## 7. Criar primeiro usuário

1. Acesse a URL do site hospedado
2. Clique em **Criar conta**
3. Preenha nome, email e senha
4. Faça login

O trigger `handle_new_user()` atribui role `admin` automaticamente ao primeiro usuário.

## 8. Configurar Auth (SMTP e URLs)

No Dashboard do Supabase → **Authentication**:

- **URL Configuration**: Site URL = URL do seu front-end, Redirect URLs = `https://seu-dominio/**`
- **SMTP Settings**: configure um provedor de email real (SendGrid, Resend, etc.) para enviar emails de confirmação e recuperação de senha
- **General → Enable email confirmations**: ON (recomendado para produção)

## Solução de problemas

### `supabase link` não encontra o projeto

```
Error: Cannot find project with ref <id>
```

- Confirme que o Project Reference está correto no Dashboard
- Execute `npx supabase login` novamente na conta certa

### `supabase db push` reclama de sync

```
Remote database has unapplied migrations
```

O banco remoto foi alterado manualmente via SQL Editor. Para sincronizar:

```powershell
npx supabase db pull
git add supabase/migrations/
git commit -m "sync: remote schema"
npx supabase db push
```

### Projeto Free pausou

O Supabase Free pausa projetos inativos após 7 dias. Acesse o Dashboard e clique em **Reactivate** no banner no topo.

---

> Para referência completa, veja também:
>
> - [`tutorial-deploy-supabase.md`](./tutorial-deploy-supabase.md) — guia detalhado com CI/CD
> - [`guia-deploy-single-tenant.md`](./guia-deploy-single-tenant.md) — visão geral de arquitetura
