/**
 * R1 — thiings.co Asset Registry (ABSOLUTE RULE).
 *
 * Keys mirror the exact filenames the owner downloaded into
 * /public/assets/thiings/{key}.png. To add an asset: drop the PNG in that
 * folder and add its key here. Until a PNG exists, <ThiingsAsset /> renders a
 * neutral placeholder.
 *
 * NEVER use icon libraries (Lucide, Font Awesome, Heroicons, emoji, CDNs) for
 * identity/gamification visuals. NEVER hotlink thiings.co.
 */

export type ThiingsAssetKey =
  | 'ai'
  | 'alimentacao'
  | 'article'
  | 'award'
  | 'book'
  | 'calories'
  | 'dashboard'
  | 'educacao'
  | 'finances'
  | 'fire'
  | 'freelance'
  | 'habits'
  | 'health'
  | 'investimentos'
  | 'journal'
  | 'knowledge'
  | 'lazer'
  | 'life_exp'
  | 'moradia'
  | 'outros'
  | 'pack'
  | 'projects'
  | 'purpose'
  | 'roupas'
  | 'salario'
  | 'saude'
  | 'settings'
  | 'sleep'
  | 'steps'
  | 'target'
  | 'tecnologia'
  | 'today'
  | 'transporte'
  | 'trophy'
  | 'video'
  | 'water'
  | 'weight'
  | 'wolf-obsidian'
  | 'wolf'
  // Muscle groups (M5+): recruited-muscle icon per exercise.
  | 'peito'
  | 'costas'
  | 'ombro'
  | 'biceps'
  | 'triceps'
  | 'perna-quadriceps'
  | 'perna-posterior'
  | 'gluteo'
  | 'abdomen'
  | 'panturrilha'
  | 'cardio'
  | 'cardio-alongamento'
  | 'cardio-basquete'
  | 'cardio-bike-indoor'
  | 'cardio-boxe'
  | 'cardio-caminhada'
  | 'cardio-caminhada-inclinada'
  | 'cardio-caminhada-rapida'
  | 'cardio-ciclismo'
  | 'cardio-corrida'
  | 'cardio-corrida-intervalada'
  | 'cardio-danca'
  | 'cardio-eliptico'
  | 'cardio-escada-stepper'
  | 'cardio-esteira'
  | 'cardio-funcional'
  | 'cardio-futebol'
  | 'cardio-hiit'
  | 'cardio-jiu-jitsu'
  | 'cardio-judo'
  | 'cardio-karate-shotokan'
  | 'cardio-kickboxing'
  | 'cardio-mma'
  | 'cardio-mobilidade'
  | 'cardio-muay-thai'
  | 'cardio-natacao'
  | 'cardio-patins'
  | 'cardio-pilates'
  | 'cardio-pular-corda'
  | 'cardio-remo'
  | 'cardio-skate'
  | 'cardio-tenis'
  | 'cardio-trilha-hiking'
  | 'cardio-voley'
  | 'cardio-yoga';

export interface ThiingsAssetEntry {
  key: ThiingsAssetKey;
  path: `/assets/thiings/${ThiingsAssetKey}.png`;
  usage: string;
  alt: string;
}

function entry(
  key: ThiingsAssetKey,
  alt: string,
  usage: string,
): ThiingsAssetEntry {
  return { key, path: `/assets/thiings/${key}.png`, alt, usage };
}

export const THIINGS_REGISTRY: Record<ThiingsAssetKey, ThiingsAssetEntry> = {
  ai: entry('ai', 'IA', 'Coach de IA / sugestão diária'),
  alimentacao: entry('alimentacao', 'Alimentação', 'Módulo nutrição'),
  article: entry('article', 'Artigo', 'Conteúdo / leitura'),
  award: entry('award', 'Troféu', 'Conquista / dia concluído'),
  book: entry('book', 'Livro', 'Conhecimento / leitura'),
  calories: entry('calories', 'Calorias', 'Treino / gasto calórico'),
  dashboard: entry('dashboard', 'Painel', 'Visão geral'),
  educacao: entry('educacao', 'Educação', 'Módulo educação'),
  finances: entry('finances', 'Finanças', 'Módulo finanças'),
  fire: entry('fire', 'Sequência', 'Streak / dias em sequência'),
  freelance: entry('freelance', 'Freelance', 'Renda / trabalho'),
  habits: entry('habits', 'Hábitos', 'Hábito obrigatório / hábitos'),
  health: entry('health', 'Saúde', 'Saúde geral'),
  investimentos: entry('investimentos', 'Investimentos', 'Finanças / investimentos'),
  journal: entry('journal', 'Diário', 'Check-in / notas'),
  knowledge: entry('knowledge', 'Conhecimento', 'Aprendizado'),
  lazer: entry('lazer', 'Lazer', 'Lazer / descanso'),
  life_exp: entry('life_exp', 'EXP de vida', 'Barra de EXP / nível'),
  moradia: entry('moradia', 'Moradia', 'Despesas de moradia'),
  outros: entry('outros', 'Outros', 'Categoria diversa'),
  pack: entry('pack', 'Alcateia', 'Identidade Woolves (login/dashboard)'),
  projects: entry('projects', 'Projetos', 'Metas / projetos'),
  purpose: entry('purpose', 'Propósito', 'Onboarding / objetivo'),
  roupas: entry('roupas', 'Roupas', 'Despesas com vestuário'),
  salario: entry('salario', 'Salário', 'Renda'),
  saude: entry('saude', 'Saúde', 'Saúde / consultas'),
  settings: entry('settings', 'Configurações', 'Ajustes'),
  sleep: entry('sleep', 'Sono', 'Quick log de sono'),
  steps: entry('steps', 'Passos', 'Atividade / passos'),
  target: entry('target', 'Missão', 'Missão diária'),
  tecnologia: entry('tecnologia', 'Tecnologia', 'Despesas com tecnologia'),
  today: entry('today', 'Hoje', 'Dashboard do dia'),
  transporte: entry('transporte', 'Transporte', 'Despesas de transporte'),
  trophy: entry('trophy', 'Troféu', 'Conquistas / marcos'),
  video: entry('video', 'Vídeo', 'Conteúdo em vídeo'),
  water: entry('water', 'Água', 'Quick log de água'),
  weight: entry('weight', 'Peso', 'Quick log de peso'),
  'wolf-obsidian': entry('wolf-obsidian', 'Lobo obsidiana', 'Variante escura do lobo'),
  wolf: entry('wolf', 'Lobo', 'Mascote / identidade'),
  peito: entry('peito', 'Peito', 'Grupo muscular: peito'),
  costas: entry('costas', 'Costas', 'Grupo muscular: costas'),
  ombro: entry('ombro', 'Ombro', 'Grupo muscular: ombro'),
  biceps: entry('biceps', 'Bíceps', 'Grupo muscular: bíceps'),
  triceps: entry('triceps', 'Tríceps', 'Grupo muscular: tríceps'),
  'perna-quadriceps': entry('perna-quadriceps', 'Quadríceps', 'Grupo muscular: quadríceps'),
  'perna-posterior': entry('perna-posterior', 'Posterior', 'Grupo muscular: posterior de coxa'),
  gluteo: entry('gluteo', 'Glúteo', 'Grupo muscular: glúteo'),
  abdomen: entry('abdomen', 'Abdômen', 'Grupo muscular: abdômen'),
  panturrilha: entry('panturrilha', 'Panturrilha', 'Grupo muscular: panturrilha'),
  cardio: entry('cardio', 'Cardio', 'Cardio / condicionamento'),
  'cardio-alongamento': entry('cardio-alongamento', 'Alongamento', 'Modalidade cardio/esporte'),
  'cardio-basquete': entry('cardio-basquete', 'Basquete', 'Modalidade cardio/esporte'),
  'cardio-bike-indoor': entry('cardio-bike-indoor', 'Bike indoor', 'Modalidade cardio/esporte'),
  'cardio-boxe': entry('cardio-boxe', 'Boxe', 'Modalidade cardio/esporte'),
  'cardio-caminhada': entry('cardio-caminhada', 'Caminhada', 'Modalidade cardio/esporte'),
  'cardio-caminhada-inclinada': entry('cardio-caminhada-inclinada', 'Caminhada inclinada', 'Modalidade cardio/esporte'),
  'cardio-caminhada-rapida': entry('cardio-caminhada-rapida', 'Caminhada rápida', 'Modalidade cardio/esporte'),
  'cardio-ciclismo': entry('cardio-ciclismo', 'Ciclismo', 'Modalidade cardio/esporte'),
  'cardio-corrida': entry('cardio-corrida', 'Corrida', 'Modalidade cardio/esporte'),
  'cardio-corrida-intervalada': entry('cardio-corrida-intervalada', 'Corrida intervalada', 'Modalidade cardio/esporte'),
  'cardio-danca': entry('cardio-danca', 'Dança', 'Modalidade cardio/esporte'),
  'cardio-eliptico': entry('cardio-eliptico', 'Elíptico', 'Modalidade cardio/esporte'),
  'cardio-escada-stepper': entry('cardio-escada-stepper', 'Escada/Stepper', 'Modalidade cardio/esporte'),
  'cardio-esteira': entry('cardio-esteira', 'Esteira', 'Modalidade cardio/esporte'),
  'cardio-funcional': entry('cardio-funcional', 'Funcional', 'Modalidade cardio/esporte'),
  'cardio-futebol': entry('cardio-futebol', 'Futebol', 'Modalidade cardio/esporte'),
  'cardio-hiit': entry('cardio-hiit', 'HIIT', 'Modalidade cardio/esporte'),
  'cardio-jiu-jitsu': entry('cardio-jiu-jitsu', 'Jiu-jitsu', 'Modalidade cardio/esporte'),
  'cardio-judo': entry('cardio-judo', 'Judô', 'Modalidade cardio/esporte'),
  'cardio-karate-shotokan': entry('cardio-karate-shotokan', 'Karatê Shotokan', 'Modalidade cardio/esporte'),
  'cardio-kickboxing': entry('cardio-kickboxing', 'Kickboxing', 'Modalidade cardio/esporte'),
  'cardio-mma': entry('cardio-mma', 'MMA', 'Modalidade cardio/esporte'),
  'cardio-mobilidade': entry('cardio-mobilidade', 'Mobilidade', 'Modalidade cardio/esporte'),
  'cardio-muay-thai': entry('cardio-muay-thai', 'Muay Thai', 'Modalidade cardio/esporte'),
  'cardio-natacao': entry('cardio-natacao', 'Natação', 'Modalidade cardio/esporte'),
  'cardio-patins': entry('cardio-patins', 'Patins', 'Modalidade cardio/esporte'),
  'cardio-pilates': entry('cardio-pilates', 'Pilates', 'Modalidade cardio/esporte'),
  'cardio-pular-corda': entry('cardio-pular-corda', 'Pular corda', 'Modalidade cardio/esporte'),
  'cardio-remo': entry('cardio-remo', 'Remo', 'Modalidade cardio/esporte'),
  'cardio-skate': entry('cardio-skate', 'Skate', 'Modalidade cardio/esporte'),
  'cardio-tenis': entry('cardio-tenis', 'Tênis', 'Modalidade cardio/esporte'),
  'cardio-trilha-hiking': entry('cardio-trilha-hiking', 'Trilha/Hiking', 'Modalidade cardio/esporte'),
  'cardio-voley': entry('cardio-voley', 'Vôlei', 'Modalidade cardio/esporte'),
  'cardio-yoga': entry('cardio-yoga', 'Yoga', 'Modalidade cardio/esporte'),
};

/** All registered keys — useful for asset-completeness checks. */
export const THIINGS_KEYS = Object.keys(THIINGS_REGISTRY) as ThiingsAssetKey[];
