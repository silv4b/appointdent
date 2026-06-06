# Plano de Ação — Módulo Financeiro

## 1. Diagnóstico (o que já existe)

| Item | Situação |
|---|---|
| `procedures.price` | ✅ Preço base do procedimento |
| `dentist_procedures.price` | ✅ Preço customizado por dentista |
| `appointments.procedure_id` | ✅ Vinculo do procedimento no agendamento |
| Tabela de contas a receber | ❌ Não existe |
| Tabela de pagamentos | ❌ Não existe |
| Tabela de contas a pagar | ❌ Não existe |
| Fluxo de caixa | ❌ Não existe |
| Relatórios financeiros | ❌ Não existe |
| Notificações financeiras | ❌ Não existe |

---

## 2. Novas Tabelas (Migration)

### 2.1 `payment_methods` — catálogo de formas de pagamento

```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,             -- 'Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'PIX', 'Boleto'
  active BOOLEAN NOT NULL DEFAULT true,
  requires_installments BOOLEAN NOT NULL DEFAULT false,  -- true para cartão crédito
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.2 `invoices` — contas a receber (faturas)

Cada fatura nasce de um agendamento **confirmado** ou pode ser manual.

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  dentist_id UUID NOT NULL REFERENCES dentists(id),
  invoice_number TEXT NOT NULL,             -- NF-0001 (gerado automático)
  total_amount DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL,      -- total_amount - discount
  status TEXT NOT NULL DEFAULT 'pending'    -- pending, paid, partially_paid, overdue, cancelled
    CHECK (status IN ('pending', 'paid', 'partially_paid', 'overdue', 'cancelled')),
  due_date DATE NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
```

### 2.3 `invoice_items` — itens da fatura

```sql
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  procedure_id UUID REFERENCES procedures(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL    -- quantity * unit_price
);
```

### 2.4 `payments` — pagamentos recebidos

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
  installment_number INTEGER DEFAULT 1,     -- 1 = à vista
  total_installments INTEGER DEFAULT 1,
  paid_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.5 `expenses` — contas a pagar (despesas da clínica)

```sql
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,       -- 'Aluguel', 'Salários', 'Material', 'Água/Luz', etc.
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_method_id UUID REFERENCES payment_methods(id),
  recurring BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. Roadmap por Fase

### Fase 1 — MVP Financeiro (estimativa: 3-4 dias)

| Etapa | Tarefa | Esforço |
|---|---|---|
| 1.1 | Migration: `payment_methods`, `invoices`, `invoice_items`, `payments` | 2h |
| 1.2 | Seed de `payment_methods` (Dinheiro, Débito, Crédito, PIX, Boleto) | 15min |
| 1.3 | Server action `invoices.ts` — CRUD básico + gerar fatura de agendamento | 4h |
| 1.4 | Server action `payments.ts` — registrar pagamento (avista) | 2h |
| 1.5 | Página `/financeiro` — listagem de faturas com paginação, filtros | 4h |
| 1.6 | Página `/financeiro/[id]` — detalhe da fatura + registrar pagamento | 3h |
| 1.7 | Badge no dashboard: "Faturas em aberto: X" | 1h |
| 1.8 | RLS policies para `invoices`, `payments`, `payment_methods` | 1h |

**Entrega da Fase 1:** Usuário consegue ver faturas geradas dos agendamentos,
registrar pagamentos, visualizar total em aberto no dashboard.

---

### Fase 2 — Gestão de Despesas + Fluxo de Caixa (estimativa: 3-4 dias)

| Etapa | Tarefa | Esforço |
|---|---|---|
| 2.1 | Migration: `expense_categories`, `expenses` | 1h |
| 2.2 | Seed de `expense_categories` (Aluguel, Salários, Material, etc.) | 15min |
| 2.3 | Server action `expenses.ts` — CRUD completo | 3h |
| 2.4 | Página `/financeiro/despesas` — listagem com paginação | 3h |
| 2.5 | Página `/financeiro/despesas/novo` + editar — formulário | 2h |
| 2.6 | Dashboard financeiro (receitas vs despesas do mês) | 4h |
| 2.7 | RLS policies para `expenses` | 30min |

**Entrega da Fase 2:** Fluxo de caixa completo — receitas (faturas) e despesas,
saldo do mês, extrato financeiro.

---

### Fase 3 — Parcelamento + Relatórios (estimativa: 4-5 dias)

| Etapa | Tarefa | Esforço |
|---|---|---|
| 3.1 | Parcelamento: `payments.installment_number` + geração automática de parcelas | 4h |
| 3.2 | Relatório por dentista: quanto cada dentista produziu/faturou | 3h |
| 3.3 | Relatório por período: faturamento mensal/anual | 3h |
| 3.4 | Gráficos no dashboard financeiro (Chart.js ou Recharts) | 4h |
| 3.5 | Extrato do paciente (`/pacientes/[id]/financeiro`) | 3h |
| 3.6 | Exportar relatório CSV/PDF | 2h |

**Entrega da Fase 3:** Gestão financeira completa com relatórios gerenciais.

---

### Fase 4 — Integrações (estimativa: 5-7 dias)

| Etapa | Tarefa | Esforço |
|---|---|---|
| 4.1 | Emissão de notas fiscais / recibos | 4h |
| 4.2 | Link de pagamento PIX via gateway (Stripe/Asaas) | 8h |
| 4.3 | Cobrança automática via WhatsApp (link de pagamento) | 4h |
| 4.4 | Conciliação bancária (importar extrato CSV) | 6h |
| 4.5 | Boletos bancários (API Asaas) | 8h |

---

## 4. Fluxos do Usuário

### 4.1 Fatura gerada automaticamente

```
Agendamento confirmado
  → Server action cria registro em invoices (status: pending)
  → Itens copiados de procedure para invoice_items
  → Valor final = sum dos itens
  → Due date = data do agendamento + 7 dias (padrão configurável)
```

### 4.2 Pagamento registrado

```
Usuário abre fatura → clica "Registrar Pagamento"
  → Escolhe forma de pagamento
  → Se crédito: informa número de parcelas
  → Valor pago (parcial ou total)
  → Sistema cria registro em payments
  → Invoice.status atualiza:
      - valor = total → 'paid'
      - valor < total → 'partially_paid'
```

### 4.3 Despesa registrada

```
Usuário vai em /financeiro/despesas → "Nova Despesa"
  → Preenche: descrição, categoria, valor, vencimento, forma pagamento
  → Ao pagar: informa data do pagamento
  → Status muda para 'paid'
```

---

## 5. Estrutura de Arquivos

```
src/
  lib/
    actions/
      invoices.ts        # Server actions de faturas
      payments.ts        # Server actions de pagamentos
      expenses.ts        # Server actions de despesas
  app/
    (dashboard)/
      financeiro/
        page.tsx                          # Lista de faturas
        client.tsx                        # Client component da lista
        [id]/
          page.tsx                        # Detalhe da fatura
          client.tsx                      # Client component + form pagamento
        despesas/
          page.tsx                        # Lista de despesas
          client.tsx
          novo/page.tsx                   # Nova despesa
          [id]/page.tsx                   # Editar despesa
```

---

## 6. Controle de Acesso (RLS)

Segue o mesmo template do sistema:

| Tabela | admin | dentista | receptionist |
|---|---|---|---|
| `payment_methods` | CRUD | SELECT | SELECT |
| `invoices` | ALL | SELECT own patients | SELECT linked |
| `invoice_items` | ALL | SELECT own | SELECT linked |
| `payments` | ALL | SELECT own | SELECT linked |
| `expenses` | ALL | SELECT own | Nenhum |
| `expense_categories` | CRUD | SELECT | SELECT |

---

## 7. Observações Técnicas

- **Geração de `invoice_number`**: usar sequência: `SELECT COALESCE(MAX(SUBSTRING(invoice_number, 4)::INTEGER), 0) + 1 FROM invoices` e formatar como `NF-0001`.
- **Status automático**: criar trigger ou função que atualiza `invoices.status` quando `payments` é inserido.
- **Valor do procedimento**: usar `dentist_procedures.price` se existir, senão `procedures.price`.
- **Fatura manual**: admin pode criar fatura avulsa (sem agendamento) para proced avulsos.
