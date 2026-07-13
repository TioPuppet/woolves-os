'use client';

import { useRef, useState } from 'react';
import type { HealthConnection, HealthProvider, HealthRecord, ImportedHealthRecord } from '@/hooks/useNutrition';
import { cn } from '@/lib/utils';

const PROVIDERS: { key: HealthProvider; name: string; detail: string; mode: string }[] = [
  { key: 'apple_health', name: 'Apple Saúde', detail: 'HealthKit · iPhone e Apple Watch', mode: 'Ponte iOS nativa' },
  { key: 'health_connect', name: 'Health Connect', detail: 'Google · Android e wearables', mode: 'Ponte Android nativa' },
  { key: 'garmin', name: 'Garmin Connect', detail: 'Sono, passos, treinos e composição', mode: 'OAuth + aprovação Garmin' },
  { key: 'withings', name: 'Withings', detail: 'Balanças e composição corporal', mode: 'OAuth 2.0' },
  { key: 'manual_import', name: 'Importação manual', detail: 'CSV ou JSON de qualquer dispositivo', mode: 'Disponível agora' },
];

const DATA_TYPE_LABELS: Record<string, string> = {
  weight: 'Peso',
  body_fat: 'Gordura corporal',
  body_water: 'Água corporal',
  muscle_mass: 'Massa muscular',
  steps: 'Passos',
  heart_rate: 'Frequência cardíaca',
  sleep_duration: 'Duração do sono',
  calories: 'Calorias',
  hydration: 'Hidratação',
  workout_duration: 'Duração do treino',
  distance: 'Distância',
  vo2max: 'VO2 máx.',
  stress: 'Estresse',
};

const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

function parseImportedFile(text: string, fileName: string): ImportedHealthRecord[] {
  if (fileName.toLocaleLowerCase('pt-BR').endsWith('.json')) {
    const parsed = JSON.parse(text) as unknown;
    const rows = Array.isArray(parsed) ? parsed : (parsed as { records?: unknown[] })?.records ?? [];
    return rows.map((row, index) => {
      const item = row as Record<string, unknown>;
      const dataType = String(item.data_type ?? item.dataType ?? item.type ?? '').trim();
      const observedAt = String(item.observed_at ?? item.observedAt ?? item.date ?? item.timestamp ?? '').trim();
      const value = Number(item.value ?? item.amount);
      const unit = String(item.unit ?? '').trim();
      if (!dataType || !observedAt || !Number.isFinite(value) || !unit || Number.isNaN(new Date(observedAt).getTime())) throw new Error(`Registro ${index + 1} inválido.`);
      return { dataType, observedAt: new Date(observedAt).toISOString(), value, unit, sourceRecordId: String(item.source_record_id ?? item.sourceRecordId ?? `${fileName}-${index + 1}`), rawPayload: item };
    });
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('O CSV precisa ter cabeçalho e pelo menos um registro.');
  const headers = (lines[0] ?? '').split(',').map((header) => header.trim());
  const get = (values: string[], names: string[]) => {
    const index = headers.findIndex((header) => names.includes(header));
    return index >= 0 ? values[index]?.trim() ?? '' : '';
  };
  return lines.slice(1).map((line, index) => {
    const values = line.split(',').map((value) => value.trim());
    const dataType = get(values, ['data_type', 'dataType', 'type']);
    const observedAt = get(values, ['observed_at', 'observedAt', 'date', 'timestamp']);
    const value = Number(get(values, ['value', 'amount']));
    const unit = get(values, ['unit']);
    if (!dataType || !observedAt || !Number.isFinite(value) || !unit || Number.isNaN(new Date(observedAt).getTime())) throw new Error(`Linha ${index + 2} inválida.`);
    return { dataType, observedAt: new Date(observedAt).toISOString(), value, unit, sourceRecordId: get(values, ['source_record_id', 'sourceRecordId']) || `${fileName}-${index + 2}` };
  });
}

export function IntegrationHub({
  connections,
  records,
  importing,
  onImport,
  onDisconnect,
}: {
  connections: HealthConnection[];
  records: HealthRecord[];
  importing: boolean;
  onImport: (records: ImportedHealthRecord[]) => Promise<void>;
  onDisconnect: (provider: HealthProvider) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = parseImportedFile(await file.text(), file.name);
      await onImport(parsed);
      setMessage(`${parsed.length} registros importados com sucesso.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível importar o arquivo.');
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <section className="surface-2 anim-rise flex flex-col gap-5 rounded-3xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Central de dados</p>
          <h2 className="text-xl font-semibold">Integrações de saúde</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">Unifique peso, treinos, sono e sinais vitais sem perder a origem de cada dado.</p>
        </div>
        <span className="rounded-full border border-status-ontrack/30 bg-status-ontrack/10 px-3 py-1 text-xs font-semibold text-status-ontrack">Pronto para sincronizar</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PROVIDERS.map((provider) => {
          const connection = connections.find((item) => item.provider === provider.key);
          const connected = connection?.status === 'connected';
          const manual = provider.key === 'manual_import';
          return (
            <div key={provider.key} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/5 bg-black/15 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{provider.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{provider.detail}</p>
                </div>
                <span className={cn('shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold', connected ? 'border-status-ontrack/30 bg-status-ontrack/10 text-status-ontrack' : 'border-border text-muted-foreground')}>
                  {connected ? 'Conectado' : manual ? 'Disponível' : 'Preparar'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{provider.mode}</p>
              {connected && connection?.lastSyncedAt && <p className="text-[11px] text-muted-foreground">Última sincronização: {formatDate(connection.lastSyncedAt)}</p>}
              {manual ? (
                <>
                  <input ref={inputRef} type="file" accept=".csv,.json,application/json,text/csv" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />
                  <button type="button" onClick={() => inputRef.current?.click()} disabled={importing} className="press min-h-10 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                    {importing ? 'Importando...' : 'Importar CSV ou JSON'}
                  </button>
                  {connected && <button type="button" onClick={() => onDisconnect(provider.key)} className="press text-xs font-semibold text-muted-foreground hover:text-status-broken">Desconectar importação</button>}
                </>
              ) : (
                <p className="rounded-xl border border-border/60 bg-black/10 px-3 py-2 text-xs leading-relaxed text-muted-foreground">A conexão será ativada quando a ponte nativa ou as credenciais OAuth estiverem configuradas.</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-semibold">Formato de importação</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">CSV: <span className="font-medium text-foreground">data_type, observed_at, value, unit, source_record_id</span>. JSON: uma lista com esses mesmos campos. Os registros ficam normalizados e preservam a origem.</p>
        {message && <p className="mt-3 text-xs font-semibold text-primary">{message}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Dados recebidos</p>
            <h3 className="mt-1 text-lg font-semibold">Últimos registros</h3>
          </div>
          <span className="text-xs text-muted-foreground">{records.length} armazenados</span>
        </div>
        {records.length > 0 ? (
          <div className="mt-3 flex flex-col divide-y divide-border/60 rounded-2xl border border-white/5 bg-black/10 px-3">
            {records.slice(0, 8).map((record) => (
              <div key={record.id} className="flex min-w-0 items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm text-primary">↗</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{DATA_TYPE_LABELS[record.dataType] ?? record.dataType}</p>
                  <p className="truncate text-xs text-muted-foreground">{formatDate(record.observedAt)} · {record.provider === 'manual_import' ? 'Importação manual' : record.provider}</p>
                </div>
                <p className="shrink-0 text-sm font-bold tabular-nums text-primary">{record.value} {record.unit}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">Nenhum dado externo sincronizado ainda.</p>
        )}
      </div>
    </section>
  );
}
