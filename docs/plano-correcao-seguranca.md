# Plano de Correção — Segurança

> Gerado em: 2026-06-08

## 🔴 Críticas

### C-01 — Middleware não funciona

**Problema:** `src/proxy.ts` deveria ser `src/middleware.ts`. Sem middleware, não há proteção de rotas no servidor.

**Decisão:**

- [x] Renomear para `src/middleware.ts`
- [ ] Outro:

**Observações:** Nenhuma.

---

### C-02 — Credenciais de produção no git

**Problema:** `.env.local-dev` contém Gmail App Password, chave de criptografia e publishable key commitados.

**Decisão:**

- [x] Remover do histórico com `git filter-branch` ou `bfg-repo-cleaner`
- [ ] Rotacionar Gmail App Password
- [ ] Rotacionar `APP_CONFIG_ENCRYPTION_KEY`
- [ ] Adicionar `.env.local-dev` ao `.gitignore`
- [ ] Outro:

**Observações:** .env.local-dev já está ignorado e removi GMAIL_USER e GMAIL_APP_PASSWORD dos .envs do projeto.

---

### C-03 — Senhas do banco no git

**Problema:** `supabase-projects.json` com `db_password` em texto puro para dois projetos.

**Decisão:**

- [ ] Remover `db_password` do arquivo e usar variáveis de ambiente
- [ ] Rotacionar as senhas dos bancos Heloisa e Clínica
- [ ] Adicionar `supabase-projects.json` ao `.gitignore`
- [ ] Outro: Pode manter, pois esse arquivo estpa ignorado e nunca foi adicinoar ao git.

**Observações:** Nenhuma.

---

## 🟠 Altas

### H-01 — RLS: receptionist_dentists sem escopo

**Problema:** Qualquer autenticado pode criar/deletar vínculos entre recepcionistas e dentistas (`auth.role() = 'authenticated'`).

**Decisão:**

- [x] Restringir INSERT/DELETE para admin only
- [ ] Escopar SELECT por role (template AGENTS.md)
- [ ] Ignorar (assumir risco)
- [ ] Outro: Outras roles podem ver, mas não podem editar esses dados, apenas admin.

**Observações:** Nenhuma.

---

### H-02 — RLS: dentist_procedures sem escopo

**Problema:** Qualquer autenticado pode modificar preços/duration de qualquer dentista.

**Decisão:**

- [x] Escopar por role: admin full, dentist só próprios, receptionist read-only vinculados
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Nenhuma.

---

### H-03 — RLS: prescriptions sem escopo para recepcionista

**Problema:** Recepcionista pode ler prescrições de TODOS os dentistas, não só dos vinculados.

**Decisão:**

- [x] Escopar SELECT via `receptionist_dentists`
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Todos os dados que as role de recepcionista pode acessar dentro do sistema, tem de estar relacionado sempre com os dentistas aos quais ela tem relação (vinculo).

---

### H-04 — RLS: anamnese_sessions UPDATE/DELETE não corrigidos

**Problema:** Migração 00031 corrigiu SELECT e INSERT, mas UPDATE e DELETE da 00004 continuam sem escopo de recepcionista e sem `WITH CHECK`.

**Decisão:**

- [x] Criar migração 00038 para corrigir UPDATE (add WITH CHECK) e DELETE
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Nenhuma.

---

### H-05 — Senha em texto puro no email

**Problema:** A senha temporária é enviada no corpo do email em texto puro.

**Decisão:**

- [ ] Remover senha do email, enviar apenas notificação de conta criada
- [ ] Enviar link mágico/token para definir senha
- [x] Ignorar (assumir risco) — `must_change_password` já força troca no primeiro acesso
- [ ] Outro:

**Observações:** Por hora, vamos manter o `must_change_password`.

---

### H-06 — Stored XSS (dangerouslySetInnerHTML)

**Problema:** Conteúdo de anamnese, prescrição e histórico é renderizado com `dangerouslySetInnerHTML` sem sanitização.

**Arquivos afetados:**

- `src/app/(dashboard)/anamnese/[pacienteId]/client.tsx:977`
- `src/app/(dashboard)/prescricao/[id]/client.tsx:368,400,409`
- `src/app/(dashboard)/historico/[pacienteId]/client.tsx:308`

**Decisão:**

- [ ] Substituir por renderização de texto puro (sem HTML)
- [ ] Sanitizar com DOMPurify (client-side) + sanitização server-side
- [x] Implementar rich text editor controlado (ex.: TipTap) que gere HTML seguro
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Nenhuma.

---

### H-07 — RLS: receptionist_dentists UPDATE sem escopo

**Problema:** UPDATE em `receptionist_dentists` permite qualquer autenticado modificar vínculos.

**Decisão:**

- [x] Restringir UPDATE para admin only
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Nenhuma.

---

### H-08 — Rate limiting IP-based apenas

**Problema:** Rate limiting de login usa só IP, burlável com VPN/botnet.

**Decisão:**

- [x] Adicionar rate limiting por email
- [ ] Implementar exponential backoff
- [ ] Implementar account lockout após N tentativas
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Entre 5 ~ 10 tentativas, o que for mais viável.

---

### H-09 — Error messages vazam detalhes internos

**Problema:** Server actions retornam `error.message` cru do Supabase com nomes de tabelas e constraints.

**Decisão:**

- [x] Registrar erro no servidor e retornar mensagem genérica
- [ ] Expandir `translateMessage()` para cobrir mais padrões
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Nenhuma.

---

### H-10 — Validação de tamanho da chave de criptografia

**Problema:** `crypto.ts` não valida se a chave tem 32 bytes (64 hex chars).

**Decisão:**

- [x] Adicionar validação de tamanho no `getKey()`
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Nenhuma.

---

## 🟡 Médias

### M-01 — CSP com unsafe-inline e unsafe-eval

**Problema:** Content-Security-Policy permite `unsafe-inline` e `unsafe-eval`, anulando proteção XSS.

**Decisão:**

- [ ] Migrar para nonce-based CSP
- [ ] Remover `unsafe-eval`
- [ ] Ignorar (assumir risco)
- [ ] Outro: Nenhuma.

**Observações:** Salve para revermos futuramente.

---

### M-02 — RLS: blocked_slots READ sem escopo

**Problema:** `blocked_slots` pode ser lido por qualquer autenticado sem filtro por dentista.

**Decisão:**

- [x] Escopar SELECT por role (template AGENTS.md)
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Nenhuma.

---

### M-03 — Admin pages sem proteção server-side

**Problema:** `admin/usuarios/page.tsx` e `admin/solicitacoes/page.tsx` não verificam role antes de renderizar.

**Decisão:**

- [x] Adicionar server-side role check
- [x] Ignorar (assumir risco) — middleware + server actions protegem
- [ ] Outro:

**Observações:** Verifique qual prática é a melhor para o nosso caso e aplique.

---

### M-04 — Self-registration habilitado

**Problema:** `signup` server action permite qualquer pessoa criar conta com role `receptionist`.

**Decisão:**

- [x] Desabilitar `signup` action
- [ ] Restringir para admin-only com convite
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Nenhuma.

---

### M-05 — select("*") em queries de contagem

**Problema:** Uso de `select("*")` em queries com `head: true`. Seguro hoje, mas risco se `head: true` for removido.

**Decisão:**

- [x] Substituir por `select()` sem argumentos
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Apenas se o comportamento for o mesmo, se não for, salve para resolvermos futuramente.

---

### M-06 — Console.error com dados do usuário

**Problema:** `console.error()` em server actions pode expor PII em sistemas de monitoramento.

**Decisão:**

- [x] Sanitizar mensagens antes de logar
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Nenhuma.

---

### M-07 — Math.random() no gerador de senhas

**Problema:** `password.ts` usa `Math.random()` em vez de `crypto.randomInt()`.

**Decisão:**

- [x] Substituir por `crypto.randomInt()`
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Nenhuma.

---

### M-08 — Upload de logo sem validação

**Problema:** Campo `logo` em `clinic_settings` aceita qualquer string sem validação de tamanho/formato.

**Decisão:**

- [x] Validar tamanho e formato server-side
- [ ] Migrar para Supabase Storage
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Valide apenas o formato, permitindo, JPG, JPEG e PNG, apenas.

---

### M-09 — Sem rate limiting em password/email change

**Problema:** `updateProfilePassword` e `updateProfileEmail` não têm rate limiting.

**Decisão:**

- [x] Adicionar rate limiting
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Nenhuma.

---

### M-10 — getUserDentistFilter retorna null em erro

**Problema:** Se `getUserDentistFilter()` falha, retorna `null` (sem filtro = admin access).

**Decisão:**

- [x] Diferenciar "admin" de "erro" no retorno
- [ ] Ignorar (assumir risco) — RLS é defense-in-depth
- [ ] Outro:

**Observações:** Nenhuma.

---

## 🔵 Baixas

### L-01 — Auth callback sem validação de state

**Problema:** `auth/callback/route.ts` não valida parâmetro `state`.

**Decisão:**

- [x] Adicionar validação de state
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Nenhuma.

---

### L-02 — HSTS header ausente

**Problema:** Nenhum header `Strict-Transport-Security` configurado.

**Decisão:**

- [x] Adicionar HSTS no `next.config.ts`
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Nenhuma.

---

### L-03 — Permissions-Policy header ausente

**Problema:** Nenhum header `Permissions-Policy` configurado.

**Decisão:**

- [x] Adicionar Permissions-Policy restritivo
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Nenhuma.

---

### L-04 — Senha em texto puro no RPC criar_usuario

**Problema:** A senha é passada como parâmetro no RPC e pode aparecer em logs do PostgreSQL.

**Decisão:**

- [x] Garantir que `log_statement` não seja `'all'` em produção
- [x] Hashar a senha antes de chamar o RPC
- [ ] Ignorar (assumir risco)
- [ ] Outro:

**Observações:** Nenhuma.

---

### L-05 — npm audit (2 moderate)

**Problema:** `postcss` via Next.js tem vulnerabilidade XSS em build-time.

**Decisão:**

- [x] Monitorar atualização do Next.js
- [ ] Ignorar (build-time only, baixo risco)
- [ ] Outro:

**Observações:** Nenhuma.
