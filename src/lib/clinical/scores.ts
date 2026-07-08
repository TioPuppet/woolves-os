// Escores clínicos (fórmulas/critérios publicados). Determinísticos.
// Cada escore é uma lista de itens pontuados; o total define a interpretação.
// NÃO substituem julgamento clínico.

export interface ScoreItem {
  key: string;
  label: string;
  points: number;
}

export interface ScoreBand {
  label: string;
  note: string;
  tone: string;
}

export interface ClinicalScore {
  key: string;
  name: string;
  subtitle: string;
  items: ScoreItem[];
  interpret: (total: number) => ScoreBand;
}

export function scoreTotal(items: ScoreItem[], selected: Set<string>): number {
  return items.reduce((sum, it) => sum + (selected.has(it.key) ? it.points : 0), 0);
}

const GREEN = '145 63% 45%';
const AMBER = '38 92% 52%';
const RED = '0 74% 56%';

export const SCORES: ClinicalScore[] = [
  {
    key: 'cha2ds2vasc',
    name: 'CHA₂DS₂-VASc',
    subtitle: 'Risco de AVC em fibrilação atrial',
    items: [
      { key: 'chf', label: 'ICC / disfunção de VE', points: 1 },
      { key: 'htn', label: 'Hipertensão', points: 1 },
      { key: 'age75', label: 'Idade ≥ 75 anos', points: 2 },
      { key: 'dm', label: 'Diabetes', points: 1 },
      { key: 'stroke', label: 'AVC / AIT / tromboembolismo prévio', points: 2 },
      { key: 'vasc', label: 'Doença vascular (IAM, DAP, placa aórtica)', points: 1 },
      { key: 'age65', label: 'Idade 65–74 anos', points: 1 },
      { key: 'female', label: 'Sexo feminino', points: 1 },
    ],
    interpret: (t) => {
      if (t === 0) return { label: `${t} ponto`, note: 'Risco baixo — anticoagulação geralmente não indicada.', tone: GREEN };
      if (t === 1) return { label: `${t} ponto`, note: 'Risco intermediário — considerar anticoagulação.', tone: AMBER };
      return { label: `${t} pontos`, note: 'Risco alto — anticoagulação oral recomendada.', tone: RED };
    },
  },
  {
    key: 'curb65',
    name: 'CURB-65',
    subtitle: 'Gravidade da pneumonia adquirida na comunidade',
    items: [
      { key: 'confusion', label: 'Confusão mental (novo)', points: 1 },
      { key: 'urea', label: 'Ureia > 50 mg/dL (> 7 mmol/L)', points: 1 },
      { key: 'rr', label: 'Frequência respiratória ≥ 30 irpm', points: 1 },
      { key: 'bp', label: 'PAS < 90 ou PAD ≤ 60 mmHg', points: 1 },
      { key: 'age65', label: 'Idade ≥ 65 anos', points: 1 },
    ],
    interpret: (t) => {
      if (t <= 1) return { label: `${t} ponto${t === 1 ? '' : 's'}`, note: 'Baixo risco — tratamento ambulatorial geralmente possível.', tone: GREEN };
      if (t === 2) return { label: `${t} pontos`, note: 'Risco moderado — considerar internação / observação.', tone: AMBER };
      return { label: `${t} pontos`, note: 'Alto risco — internar; avaliar UTI se ≥ 4.', tone: RED };
    },
  },
  {
    key: 'wells_dvt',
    name: 'Wells (TVP)',
    subtitle: 'Probabilidade de trombose venosa profunda',
    items: [
      { key: 'cancer', label: 'Câncer ativo', points: 1 },
      { key: 'paralysis', label: 'Paralisia / imobilização de MI', points: 1 },
      { key: 'bedridden', label: 'Acamado > 3 dias ou cirurgia < 12 semanas', points: 1 },
      { key: 'tender', label: 'Dor à palpação no trajeto venoso profundo', points: 1 },
      { key: 'swollenleg', label: 'Edema de todo o membro', points: 1 },
      { key: 'calf', label: 'Panturrilha > 3 cm vs. contralateral', points: 1 },
      { key: 'pitting', label: 'Edema depressível no membro sintomático', points: 1 },
      { key: 'collateral', label: 'Veias colaterais superficiais (não varicosas)', points: 1 },
      { key: 'prevdvt', label: 'TVP prévia documentada', points: 1 },
      { key: 'altdx', label: 'Diagnóstico alternativo tão ou mais provável', points: -2 },
    ],
    interpret: (t) => {
      if (t >= 2) return { label: `${t} ponto${t === 1 ? '' : 's'}`, note: 'TVP provável — prosseguir com US Doppler.', tone: RED };
      return { label: `${t} ponto${Math.abs(t) === 1 ? '' : 's'}`, note: 'TVP improvável — considerar D-dímero.', tone: GREEN };
    },
  },
];
