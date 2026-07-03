import { ThiingsAsset } from '@/components/ThiingsAsset';
import { levelFromExp } from '@/lib/exp-config';
import { THIINGS_KEYS } from '@/lib/thiings-registry';

/**
 * M0 placeholder for the Today Dashboard (built for real in M2/M3).
 * Its only job now is to prove the shell renders: design tokens, the
 * ThiingsAsset placeholder pipeline, and the EXP/level derivation.
 */
export default function TodayPage() {
  const demoExp = 240;
  const lvl = levelFromExp(demoExp);

  return (
    <main className="flex min-h-screen flex-col gap-6 px-5 py-8">
      <header className="flex items-center gap-3">
        <ThiingsAsset assetKey="pack" size={44} />
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Woolves Life OS
          </p>
          <h1 className="text-lg font-semibold">M0 · Shell pronto</h1>
        </div>
      </header>

      <section className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center gap-3">
          <ThiingsAsset assetKey="life_exp" size={32} />
          <div className="flex-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">
                Nível {lvl.level} · {lvl.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {lvl.intoLevel}
                {lvl.span === Infinity ? '' : ` / ${lvl.span}`} EXP
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.round(lvl.progress * 100)}%` }}
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Demonstração da curva de EXP (100 × N^1.6). Loop real chega no M3.
        </p>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">
          Assets thiings pendentes (placeholders abaixo)
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {THIINGS_KEYS.map((key) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <ThiingsAsset assetKey={key} size={40} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Cada quadro vira o PNG real quando o arquivo for adicionado em
          /public/assets/thiings/.
        </p>
      </section>
    </main>
  );
}
