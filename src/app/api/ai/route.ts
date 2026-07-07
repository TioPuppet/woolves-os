import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { fetchTodaySnapshot } from '@/lib/today';
import { localDayString, shiftLocalDay, localHour } from '@/lib/date';
import { computeDayStatus, DAY_STATUS_META } from '@/lib/day-status';
import { levelFromExp } from '@/lib/exp-config';
import { calledName } from '@/lib/greeting';
import { callGroq } from '@/lib/ai/groq';
import {
  woolvesSystemPrompt,
  formatDailyPrompt,
  formatWeeklyPrompt,
  type WeeklyDay,
} from '@/lib/ai/prompt';

export async function POST(req: Request) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { type?: string };
  const type = body.type === 'weekly' ? 'weekly' : 'daily';

  const { data: p } = await supabase
    .from('profiles')
    .select(
      'title, display_name, timezone, required_habit, goal_water_ml, goal_protein_g, goal_kcal, goal_spend_limit_brl',
    )
    .eq('id', user.id)
    .maybeSingle();

  const timezone = p?.timezone ?? 'America/Sao_Paulo';
  const name = calledName(p?.title, p?.display_name);
  const today = localDayString(timezone);
  const system = woolvesSystemPrompt(name);

  const refKey = type === 'daily' ? today : shiftLocalDay(today, -6);

  // Cache hit → return immediately.
  const { data: cached } = await supabase
    .from('ai_outputs')
    .select('content')
    .eq('kind', type)
    .eq('ref_key', refKey)
    .maybeSingle();
  if (cached?.content) {
    return NextResponse.json({ content: cached.content, cached: true });
  }

  let prompt: string;
  if (type === 'daily') {
    const snap = await fetchTodaySnapshot(supabase, timezone);
    const level = levelFromExp(snap.expTotal);
    const status =
      snap.checkinStatus ??
      computeDayStatus({
        localHour: localHour(timezone),
        checkinDone: false,
        missionAccomplished: false,
        missionFailed: false,
        yesterdayBroken: false,
        protein: p?.goal_protein_g
          ? { current: snap.proteinToday, goal: p.goal_protein_g }
          : undefined,
        spend: p?.goal_spend_limit_brl
          ? { current: snap.spentToday, goal: p.goal_spend_limit_brl }
          : undefined,
      });
    prompt = formatDailyPrompt({
      status: DAY_STATUS_META[status].label,
      waterMl: snap.waterMl,
      goalWaterMl: p?.goal_water_ml ?? null,
      habitDone: snap.habitDone,
      requiredHabit: p?.required_habit ?? null,
      proteinToday: snap.proteinToday,
      goalProteinG: p?.goal_protein_g ?? null,
      kcalToday: snap.kcalToday,
      goalKcal: p?.goal_kcal ?? null,
      spentToday: snap.spentToday,
      spendLimit: p?.goal_spend_limit_brl ?? null,
      streak: snap.streak,
      level: level.level,
      levelTitle: level.title,
    });
  } else {
    const weekAgo = shiftLocalDay(today, -6);
    const [checkins, sleep, exp] = await Promise.all([
      supabase
        .from('checkins')
        .select('ref_date, day_status, mood')
        .gte('ref_date', weekAgo)
        .lte('ref_date', today),
      supabase
        .from('sleep_logs')
        .select('ref_date, hours')
        .gte('ref_date', weekAgo)
        .lte('ref_date', today),
      supabase.from('exp_events').select('amount').gte('ref_date', weekAgo),
    ]);
    const ciMap = new Map(
      (checkins.data ?? []).map((c: { ref_date: string; day_status: string; mood: number }) => [c.ref_date, c]),
    );
    const slMap = new Map(
      (sleep.data ?? []).map((s: { ref_date: string; hours: number }) => [s.ref_date, s.hours]),
    );
    const days: WeeklyDay[] = Array.from({ length: 7 }, (_, i) => {
      const d = shiftLocalDay(today, i - 6);
      const ci = ciMap.get(d);
      return {
        date: d,
        status: ci?.day_status ?? null,
        mood: ci?.mood ?? null,
        sleepHours: slMap.get(d) ?? null,
      };
    });
    const expWeek = (exp.data ?? []).reduce(
      (s: number, r: { amount: number }) => s + (r.amount ?? 0),
      0,
    );
    prompt = formatWeeklyPrompt(days, expWeek);
  }

  const content = await callGroq(system, prompt);
  if (!content) {
    return NextResponse.json({
      content:
        type === 'daily'
          ? 'A Woolves IA está indisponível agora. Tente novamente em instantes.'
          : 'Não foi possível gerar o relatório agora. Tente novamente mais tarde.',
      fallback: true,
    });
  }

  await supabase
    .from('ai_outputs')
    .upsert(
      { user_id: user.id, kind: type, ref_key: refKey, content },
      { onConflict: 'user_id,kind,ref_key' },
    );

  return NextResponse.json({ content });
}
