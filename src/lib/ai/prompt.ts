/**
 * Woolves IA — system prompt (adapted from the old app's "Chief Performance
 * Officer" persona) and context formatters. All copy in pt-BR.
 */
export function woolvesSystemPrompt(name: string): string {
  return [
    `Você é a Woolves IA — Chief Performance Officer pessoal de ${name}.`,
    '',
    'IDENTIDADE:',
    '- Estratégica, direta e orientada à execução.',
    '- Não faz diagnósticos médicos nem dá conselhos de investimento regulados.',
    '- Sem motivação vazia. Sem elogio sem motivo. Converte dados em ação concreta.',
    '- Respostas concisas, otimizadas para mobile.',
    '- Tom: firme, humano, premium, sem julgamento. Identidade de lobo/alcateia.',
    '',
    'REGRAS:',
    '- Use apenas os dados do contexto. Se um dado faltar, diga claramente — não invente números.',
    '- Escreva em português do Brasil.',
  ].join('\n');
}

export interface DailyContext {
  status: string;
  waterMl: number;
  goalWaterMl: number | null;
  habitDone: boolean;
  requiredHabit: string | null;
  proteinToday: number;
  goalProteinG: number | null;
  kcalToday: number;
  goalKcal: number | null;
  spentToday: number;
  spendLimit: number | null;
  streak: number;
  level: number;
  levelTitle: string;
}

export function formatDailyPrompt(c: DailyContext): string {
  return [
    'Gere UMA sugestão do dia (1-2 frases curtas), acionável e específica, com base nos dados de hoje.',
    'Aponte o alvo mais importante que falta bater. Não faça lista. Comece direto.',
    '',
    'DADOS DE HOJE:',
    `- Status do dia: ${c.status}`,
    `- Nível: ${c.level} (${c.levelTitle}), streak: ${c.streak} dias`,
    `- Água: ${c.waterMl}${c.goalWaterMl ? ` / ${c.goalWaterMl}` : ''} ml`,
    `- Hábito obrigatório (${c.requiredHabit ?? '—'}): ${c.habitDone ? 'feito' : 'pendente'}`,
    `- Proteína: ${c.proteinToday}${c.goalProteinG ? ` / ${c.goalProteinG}` : ''} g`,
    `- Calorias: ${c.kcalToday}${c.goalKcal ? ` / ${c.goalKcal}` : ''} kcal`,
    `- Gasto: R$ ${c.spentToday}${c.spendLimit != null ? ` / R$ ${c.spendLimit}` : ''}`,
  ].join('\n');
}

export interface WeeklyDay {
  date: string;
  status: string | null;
  mood: number | null;
  sleepHours: number | null;
}

export function formatWeeklyPrompt(
  days: WeeklyDay[],
  expWeek: number,
): string {
  const lines = days.map(
    (d) =>
      `- ${d.date}: status ${d.status ?? 'sem check-in'}, humor ${d.mood ?? '—'}, sono ${d.sleepHours ?? '—'}h`,
  );
  return [
    'Gere um relatório semanal em markdown, curto e estratégico. Estrutura:',
    '## Leitura da semana (2-3 frases)',
    '## O que funcionou',
    '## O que travou',
    '## Foco da próxima semana (2-3 ações concretas)',
    '',
    `EXP ganho na semana: ${expWeek}.`,
    'DIAS:',
    ...lines,
  ].join('\n');
}
