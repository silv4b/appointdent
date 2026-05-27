# AppointDent

## Funcionalidades Base para o MVP

Foque em construir o fluxo principal perfeitamente antes de adicionar recursos complexos (como prontuários ou faturamento). Divida o escopo em três pilares:

### 1. Gestão de Agendamentos (O Coração do App)

* **Visualização em Calendário:** Uma tela para a secretária/dentista ver os horários do dia, da semana e do mês.
* **Bloqueio de Horários:** Permitir que o dentista bloqueie horários para almoço, congressos ou imprevistos.
* **Status do Agendamento:** Controle simples de estados: *Agendado, Confirmado, Cancelado, Em Atendimento, Concluído*.

### 2. Cadastros Essenciais

* **Pacientes:** Um prontuário cadastral básico (Nome, CPF, Telefone, Data de Nascimento).
* **Profissionais (Dentistas):** Cadastro dos dentistas da clínica e suas respectivas especialidades.
* **Procedimentos:** Lista de serviços com tempo de duração estimado (ex: Consulta: 30 min, Canal: 90 min). *Isso é fundamental para o calendário calcular o próximo horário livre.*

### 3. Painel de Configuração de Horários (Agenda)

* **Definição de Grade:** Configurar os dias e horários de atendimento de cada dentista (ex: Segunda a Sexta, das 08:00 às 12:00 e das 14:00 às 18:00).

## Recomendações de Arquitetura e Bibliotecas

Para acelerar o desenvolvimento com Next.js e Supabase, recomendo fortemente usar as seguintes ferramentas:

| Camada | Tecnologia Recomendada | Por que usar? |
| --- | --- | --- |
| **UI & Componentes** | **shadcn/ui** + Tailwind CSS | Componentes acessíveis, bonitos e que você tem total controle sobre o código. |
| **Calendário** | **React Big Calendar** ou **DayPilot** | Criar um calendário do zero é uma armadilha de tempo. Use uma lib consolidada para a visão mensal/semanal. |
| **Gerenciamento de Datas** | **date-fns** ou **Day.js** | Lidar com fusos horários e formatação de datas em JavaScript/TypeScript puro é complexo. |
| **Autenticação** | **Supabase Auth** | Já vem pronto. Você resolve o login da clínica/dentista em poucos minutos usando os hooks do Supabase. |

## Dicas de Banco de Dados (Supabase/Postgres)

Como o Supabase é Postgres puro, aproveite o poder do banco de dados para garantir a consistência do seu app:

* **Evite o "Double Booking" (Agendamento Duplicado):** No Postgres, você pode criar *Constraints* (restrições) de exclusão usando a extensão `btree_gist`. Ela garante, a nível de banco de dados, que o Dentista X não possa ter dois agendamentos que se sobreponham no mesmo horário.
* **Use RLS (Row Level Security):** Desde o dia um, ative o RLS no Supabase. Isso garante que a Clínica A nunca consiga ler ou alterar os dados de agendamento da Clínica B, deixando seu app seguro e pronto para ser um *SaaS* (Software como Serviço) no futuro.
