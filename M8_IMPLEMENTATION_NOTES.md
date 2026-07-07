# M8 — Woolves IA (Groq) + Notas

**Status:** ✅ Completo — typecheck limpo, 20/20 testes, `next build` exit 0.
**Ação sua:** aplicar 2 migrations. A `GROQ_API_KEY` já está no `.env.local`.

## Woolves IA (Groq — grátis)
- **`0022_ai_outputs.sql`** — cache de saídas da IA (1 sugestão/dia, 1 relatório/semana),
  para chamar o Groq no máximo 1x por período.
- **`/api/ai`** (server-only) — chama o **Groq** (`llama-3.3-70b-versatile`) com o
  system prompt **"Chief Performance Officer"** (reaproveitado do app antigo, com o
  seu tratamento/nome). **Fallback elegante** se a chave faltar/erro.
- **Card no dashboard** — a Woolves IA (roxo IA) dá a **sugestão do dia** a partir dos
  seus dados (água, hábito, proteína, gasto, streak).
- **`/relatorio`** — **relatório semanal** em markdown (leitura da semana, o que
  funcionou/travou, foco da próxima). Link no card da IA.

## Notas (estilo iPhone)
- **`0023_notes.sql`** — tabela `notes` + RLS.
- **`/notas`** — lista (título = 1ª linha + preview + data) e **editor com autosave**
  (debounce). Nota vazia é descartada ao sair. Botão **+** cria; lixeira exclui.
- **5ª aba** na navegação: Hoje · Treino · Finanças · **Notas** · Perfil.

## Aplicar (SQL Editor)
1. `0022_ai_outputs.sql`
2. `0023_notes.sql`

## Commit
```bash
cd ~/Desktop/Woolves-Life-OS
rm -f .git/index.lock
git add -A && git commit -m "M8: Woolves IA (Groq daily suggestion + weekly report) + iPhone-style Notes module + 5th nav tab" && git push
```

## Segurança
- `GROQ_API_KEY` é **server-only** (sem `NEXT_PUBLIC`); nunca vai ao cliente.
- Rotacione a chave que foi exposta no chat (console.groq.com).
- Para deploy (Vercel), adicione `GROQ_API_KEY` nas env vars do projeto.

## Testar
`npm run dev` → dashboard mostra a sugestão da Woolves IA; toque em "Relatório
semanal" para o relatório. Aba **Notas** → crie/edite (autosave).
