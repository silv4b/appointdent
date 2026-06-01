<!-- markdownlint-disable MD060 -->

# Tutorial: Testar o App no Celular pela Rede Local

## Quando usar

Você quer acessar o `http://localhost:3000` pelo celular ou outro computador na mesma rede WiFi.

---

## 1. Descobrir seu IP local

```powershell
ipconfig
```

Procure por **IPv4** do seu adaptador de rede (WiFi ou Ethernet). Exemplo:

```text
Endereço IPv4. . . . . . . .  . . . . . . . : 192.168.0.106
```

Anote esse IP — vamos chamá-lo de `SEU_IP`.

---

## 2. Liberar as portas no Firewall do Windows

Execute o PowerShell **como Administrador** e cole:

```powershell
New-NetFirewallRule -DisplayName "Next Dev 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
New-NetFirewallRule -DisplayName "Supabase 54331" -Direction Inbound -Protocol TCP -LocalPort 54331 -Action Allow
```

Isso cria duas regras de entrada permitindo conexões nas portas do Next.js e do Supabase.

---

## 3. Ajustar o `.env.local`

O arquivo `.env.local` aponta para `127.0.0.1:54331`. O celular não consegue alcançar `127.0.0.1` do seu PC. Troque pelo IP local:

**Antes:**

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
```

**Depois:**

```env
NEXT_PUBLIC_SUPABASE_URL=http://192.168.0.106:54331
```

> Substitua `192.168.0.106` pelo seu IP real.

---

## 4. Iniciar o Next.js na rede

```powershell
npx next dev --hostname 0.0.0.0
```

A flag `--hostname 0.0.0.0` faz o servidor escutar em todas as interfaces de rede, não só em `localhost`.

O terminal mostrará:

```text
▲ Local:    http://localhost:3000
▲ Network:  http://192.168.0.106:3000
```

---

## 5. Acessar pelo celular

No navegador do celular (mesma WiFi), digite:

```text
http://192.168.0.106:3000
```

---

## Como desfazer (voltar ao normal)

### 5.1 Restaurar `.env.local`

Volte o valor de `NEXT_PUBLIC_SUPABASE_URL` para:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
```

### 5.2 Remover as regras do Firewall

```powershell
Remove-NetFirewallRule -DisplayName "Next Dev 3000"
Remove-NetFirewallRule -DisplayName "Supabase 54331"
```

### 5.3 Iniciar o servidor normalmente (sem `--hostname`)

```powershell
npx next dev
```

Agora o app volta a funcionar apenas em `http://localhost:3000`.

---

## Troubleshooting

| Problema | Causa | Solução |
|----------|-------|---------|
| "Site não encontrado" no celular | IP errado | Confirme o IP com `ipconfig`, verifique se está na mesma rede WiFi |
| Conexão recusada | Firewall bloqueando | Verifique regras com `Get-NetFirewallRule -DisplayName "Next Dev 3000"` |
| Login não funciona | Supabase aponta para `127.0.0.1` | Troque para `SEU_IP:54331` no `.env.local` |
| Tela branca no celular | Cache do navegador | Tente aba anônima ou limpe o cache |

> **Nota:** O Supabase local (Kong) precisa estar rodando com `npx supabase start` antes de iniciar o Next.
