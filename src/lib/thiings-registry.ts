/**
 * R1 — thiings.co Asset Registry (ABSOLUTE RULE).
 *
 * Every identity / module / gamification / decorative visual is a thiings.co
 * asset, manually downloaded by the owner into /public/assets/thiings/{key}.png.
 *
 * - NEVER generate custom SVG illustrations for these elements.
 * - NEVER use icon libraries (Lucide, Font Awesome, Heroicons, emoji, CDNs).
 * - NEVER hotlink thiings.co.
 *
 * This file is the single source of truth for asset keys. To add an asset:
 *   1. add an entry here,
 *   2. drop the matching PNG into /public/assets/thiings/,
 *   3. reference it via <ThiingsAsset assetKey="..." />.
 *
 * Until the PNG exists, <ThiingsAsset /> renders a neutral placeholder.
 */

export type ThiingsAssetKey =
  | 'body'
  | 'money'
  | 'mission'
  | 'mind'
  | 'pack'
  | 'ai_coach'
  | 'life_exp'
  | 'alpha_badge'
  | 'trophy'
  | 'water'
  | 'sleep'
  | 'workout'
  | 'nutrition';

export interface ThiingsAssetEntry {
  /** Stable key used in code and as the PNG filename (without extension). */
  key: ThiingsAssetKey;
  /** Public path resolved by <ThiingsAsset />. */
  path: `/assets/thiings/${ThiingsAssetKey}.png`;
  /** Where/why this asset is used — guides the owner's downloads. */
  usage: string;
  /** Default alt text (pt-BR); overridable per usage. */
  alt: string;
}

export const THIINGS_REGISTRY: Record<ThiingsAssetKey, ThiingsAssetEntry> = {
  body: {
    key: 'body',
    path: '/assets/thiings/body.png',
    usage: 'Módulo corpo/treino — identidade visual',
    alt: 'Corpo',
  },
  money: {
    key: 'money',
    path: '/assets/thiings/money.png',
    usage: 'Módulo finanças — identidade visual',
    alt: 'Dinheiro',
  },
  mission: {
    key: 'mission',
    path: '/assets/thiings/mission.png',
    usage: 'Missão diária no Today Dashboard',
    alt: 'Missão',
  },
  mind: {
    key: 'mind',
    path: '/assets/thiings/mind.png',
    usage: 'Módulo mente / check-in',
    alt: 'Mente',
  },
  pack: {
    key: 'pack',
    path: '/assets/thiings/pack.png',
    usage: 'Identidade Woolves (alcateia)',
    alt: 'Alcateia',
  },
  ai_coach: {
    key: 'ai_coach',
    path: '/assets/thiings/ai_coach.png',
    usage: 'Sugestão diária / relatório semanal (IA)',
    alt: 'Coach de IA',
  },
  life_exp: {
    key: 'life_exp',
    path: '/assets/thiings/life_exp.png',
    usage: 'Barra de EXP / nível',
    alt: 'EXP de vida',
  },
  alpha_badge: {
    key: 'alpha_badge',
    path: '/assets/thiings/alpha_badge.png',
    usage: 'Marcador de nível Alpha',
    alt: 'Selo Alpha',
  },
  trophy: {
    key: 'trophy',
    path: '/assets/thiings/trophy.png',
    usage: 'Conquista / dia concluído',
    alt: 'Troféu',
  },
  water: {
    key: 'water',
    path: '/assets/thiings/water.png',
    usage: 'Quick log de água',
    alt: 'Água',
  },
  sleep: {
    key: 'sleep',
    path: '/assets/thiings/sleep.png',
    usage: 'Quick log de sono',
    alt: 'Sono',
  },
  workout: {
    key: 'workout',
    path: '/assets/thiings/workout.png',
    usage: 'Sessão de treino',
    alt: 'Treino',
  },
  nutrition: {
    key: 'nutrition',
    path: '/assets/thiings/nutrition.png',
    usage: 'Módulo nutrição — kcal/proteína',
    alt: 'Nutrição',
  },
};

/** All registered keys — useful for asset-completeness checks. */
export const THIINGS_KEYS = Object.keys(THIINGS_REGISTRY) as ThiingsAssetKey[];
