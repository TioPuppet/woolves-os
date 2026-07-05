# Insights do app antigo — o que trazer (e o que deixar para depois)

Mineração das duas bases antigas (`Claude/Projects/Woolves OS` — código Next 15;
`Documents/woolves-life-os` — bíblia de produto, 24 docs). Filtrado pelo que é
**relevante e compatível com o escopo fixo do PRD atual**. Nada aqui altera o MVP
sem sua aprovação.

---

## 1. ADOTAR AGORA — Identidade de marca (Wolf Design System)

O achado mais importante: sua bíblia de design (`04_MOBILE_FIRST_UX_SYSTEM`) define
uma **paleta de marca** — e o nosso verde atual **não está nela**. A marca é
ouro + roxo sobre preto:

| Token | Hex | Uso |
|---|---|---|
| Fundo | `#0A0A0A` | fundo principal (já usamos ~isso) |
| Superfícies | `#111111 / #151515 / #1A1A1A` | cards (já usamos ~isso) |
| **Wolf Gold** | `#D4AF37` | **destaques, metas, conquistas, EXP, premium** |
| **Titanium Silver** | `#B8BDC7` | textos secundários, stats, ícones |
| **IA Purple** | `#7C5CFC` | **Woolves IA, insights, recomendações** |
| Tipografia | **SF Pro Display** | confirma nossa escolha atual |

**Recomendação:** trocar o acento primário de verde para **Wolf Gold**, usar
**IA Purple** no card de IA (M8) e **Titanium Silver** nos textos secundários.
Isso deixa o app fiel à sua marca. É uma mudança visual — aguardo seu OK para aplicar.

**Princípios de design a manter (batem com o que fazemos):**
- **Luxury Minimalism** — "menos elementos, mais significado"; cada tela responde "o que é mais importante aqui?".
- **Mobile-first absoluto** — 390px (iPhone Pro) como base; desktop é adaptação.
- **3-Second Rule** — em 3s o usuário entende onde está, o que importa, o que fazer.
- **Personalidade:** poder, elegância, inteligência, clareza, disciplina. Nunca infantil, nunca excesso de cor.
- **Bottom navigation fixa** — padrão para quando tivermos as 5 telas (hoje temos só Hoje).

---

## 2. ADOTAR AGORA — Estrutura que confirma nosso rumo

- **Prioridade principal do dia** = nossa **missão diária**. Regra: clara, objetiva,
  executável, medível, relevante. Bons exemplos: "Treinar musculação", "Registrar
  todas as despesas". Ruins: "ser mais produtivo", "focar mais".
- **Registro em <15s** — idêntico ao nosso R5.
- **Dimensões do check-in** (Finance, Health, Knowledge, Mind, Routine) — o nosso
  check-in de humor já cobre "Mind"; as demais entram naturalmente com M4–M6.
- **Princípio "NÃO transformar em culpa"** — o dia quebrado gera dado, não vergonha.
  Isso valida nosso day-status `recovery` (dia seguinte com missão reduzida).

---

## 3. GUARDAR PARA O M8 — Voz da Woolves IA

Copy pronta e excelente para o relatório semanal + sugestão diária (M8):

- **Persona:** "Chief Performance Officer". Direta, elegante, honesta, estratégica, disciplinadora.
- **Perguntas diárias:** "Qual é sua prioridade principal hoje?" · "Você executou sua prioridade?" · "O que impediu sua execução?" · "O que precisa mudar amanhã?"
- **Tom (exemplos reais da bíblia):**
  - Positivo: *"Prioridade principal concluída. Excelente. Hoje houve execução real."*
  - Neutro: *"Você não falhou. Você gerou dado. Agora precisamos entender o padrão."*
  - Disciplinador: *"O problema não foi falta de tempo. Foi ausência de prioridade clara."*
- **Cor:** IA Purple `#7C5CFC` no card de IA.

---

## 4. BACKLOG PÓS-MVP — Ideias grandes (fora do escopo atual do PRD)

O app antigo era a visão "tudo". Estas ideias são fortes, mas estão na lista **OUT**
do seu PRD atual — registro aqui para não perdermos, sem inflar o MVP:

- **Life Score (0–100) + 6 subscores** (Performance, Health, Finance, Knowledge,
  Routine, Purpose), com faixas: Crítico / Instável / Em construção / Forte / Elite.
  *(Colide com "Money Score / life scores" na lista OUT — fica para v2.)*
- **Woolves IA como chat** (hoje o MVP só tem relatório semanal + 1 sugestão).
- **Módulos:** Conhecimento/Estudo, Notas, Diário, Tarefas/Projetos, Propósito/Life Goals.
- **Finanças avançadas:** contas, orçamentos, dívidas, patrimônio (wealth snapshots).
  *(MVP de finanças é raso: receita/despesa + limite diário.)*
- **5 telas + bottom nav:** Hoje · Registrar · Finanças · Evolução · Notas.
- **Push notifications** (havia `push_subscriptions`; está na lista OUT do MVP).

---

## 5. Do CÓDIGO antigo (Claude/Projects/Woolves OS)

Stack: Next 15 / React 19, com `modules/`, `core/`, `lib/`, `supabase/` e docs de
reconstrução (BLUEPRINT, ROADMAP, PHASE specs, auditoria forense). Vale como
referência de arquitetura modular quando o app crescer. Posso fazer um mergulho
específico no `lib/` (fórmulas) e `modules/` se/quando formos construir o Life Score
ou a IA — hoje não é necessário para M4.

---

## Recomendação de ação

1. **Aplicar a paleta de marca** (Wolf Gold + IA Purple + Titanium Silver) — pequeno,
   alto impacto, deixa o app fiel à sua identidade. **Preciso do seu OK.**
2. **Seguir no M4** com a estrutura confirmada.
3. **Reservar** a voz da IA e o Life Score para M8 / v2.
