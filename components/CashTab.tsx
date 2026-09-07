"use client";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { aggregateCashWeek, calcCashProgress, calculateSalary, cashScenarioOptions, cashWeekStart, dailyCashTarget, generateRemainingWeekdayTargets, rebalanceWeekdayTargets } from "@/lib/cash";
import { toDDMMYYYY, dowName } from "@/lib/date";
import { fmt } from "@/lib/format";
import type { AppState, CashEntry } from "@/lib/types";
import { AmountInput, CancelLink, DescInput, ErrText, FieldLabel, SaveButton, Sheet, SheetTitle } from "./Sheet";
import type { Refresh, ShowToast } from "./AppShell";

const cardStyle = { background: "var(--panel)", border: "1px solid var(--border)" };

function ProgressMeter({ value, color }: { value: number; color: string }) {
  return <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(245, 243, 236, 0.1)" }}>
    <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
  </div>;
}

export default function CashTab({ state, refresh, showToast }: { state: AppState; refresh: Refresh; showToast: ShowToast }) {
  const today = toDDMMYYYY(new Date());
  const settings = state.cashSettings;
  const week = aggregateCashWeek(state.cashEntries, cashWeekStart(today));
  const [entry, setEntry] = useState<CashEntry | null | undefined>(undefined);
  const scenarios = cashScenarioOptions({ today, goal: state.goal, envelopes: state.envelopes, salary: settings });
  const dayTargets = rebalanceWeekdayTargets(settings.weeklyTarget, state.cashEntries, today);
  const salary = calculateSalary({ weeklyCash: week.weeklyTotal, ...settings });
  const salaryTarget = calculateSalary({ weeklyCash: settings.weeklyTarget, ...settings });
  const progress = calcCashProgress({ weeklyCash: week.weeklyTotal, weeklyTarget: settings.weeklyTarget, salary, salaryTarget });

  async function choose(weeklyTarget: number) {
    await api.updateCashSettings({ ...settings, weeklyTarget, weekdayTargets: generateRemainingWeekdayTargets(weeklyTarget, today) });
    await refresh();
    showToast(`Цель кассы: ${fmt(weeklyTarget)} в неделю`);
  }

  return <main className="max-w-[520px] mx-auto px-4 pb-28 pt-6">
    <header className="mb-6">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--muted)" }}>Доход · рабочая неделя</p>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display m-0 text-[30px] font-bold leading-none tracking-[-0.045em]">Касса</h1>
          <p className="mt-2 mb-0 text-sm" style={{ color: "var(--muted)" }}>{today} · {dowName(today)}</p>
        </div>
        <div className="rounded-xl px-3 py-2 text-right" style={cardStyle}>
          <span className="block text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>Цель недели</span>
          <b className="font-mono-num text-sm">{fmt(settings.weeklyTarget)}</b>
        </div>
      </div>
    </header>

    <section className="rounded-3xl p-4" style={cardStyle} aria-label="Прогресс кассы за неделю">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>Касса недели</p>
          <div className="mt-1 flex items-baseline gap-1.5"><strong className="font-display text-[28px] leading-none tracking-[-0.04em]">{fmt(week.weeklyTotal)}</strong><span className="text-xs" style={{ color: "var(--muted)" }}>/ {fmt(settings.weeklyTarget)}</span></div>
        </div>
        <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: "rgba(47, 111, 237, 0.18)", color: "#8bb4ff" }}>{progress.cashPercent}%</span>
      </div>
      <div className="mt-4"><ProgressMeter value={progress.cashPercent} color="var(--accent-blue)" /></div>
      <div className="mt-5 flex items-end justify-between gap-4">
        <div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>Оценка зарплаты</p><strong className="font-display mt-1 block text-xl leading-none tracking-[-0.03em]">{fmt(salary)}</strong></div>
        <span className="text-xs" style={{ color: "var(--muted)" }}>от цели {fmt(salaryTarget)}</span>
      </div>
      <div className="mt-3"><ProgressMeter value={progress.salaryPercent} color="var(--accent)" /></div>
    </section>

    <section className="mt-6" aria-labelledby="weekday-heading">
      <div className="mb-3 flex items-center justify-between"><h2 id="weekday-heading" className="m-0 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>Касса по дням</h2><span className="text-[11px]" style={{ color: "var(--muted)" }}>Нажми, чтобы внести</span></div>
      <div className="grid grid-cols-5 gap-1.5">{week.days.map((day) => {
        const target = dailyCashTarget(dayTargets, day.date);
        const ahead = target > 0 && day.amount >= target;
        const current = day.date === today;
        const dayProgress = target > 0 ? Math.min(100, Math.round((day.amount / target) * 100)) : 0;
        return <button key={day.date} onClick={() => setEntry({ id: "", date: day.date, amount: 0 })} className="min-w-0 rounded-2xl px-1.5 py-3 text-left transition-transform active:scale-[0.97]" style={{ background: ahead ? "rgba(111, 207, 123, 0.13)" : "var(--hover)", border: `1px solid ${current ? "var(--accent-blue)" : ahead ? "rgba(111, 207, 123, 0.55)" : "var(--border)"}`, boxShadow: current ? "0 0 0 1px rgba(47, 111, 237, 0.22), 0 8px 20px rgba(0, 0, 0, 0.18)" : "none" }}>
          <span className="block text-[10px] font-bold uppercase tracking-wide" style={{ color: current ? "#9dc0ff" : "var(--muted)" }}>{dowName(day.date)}</span>
          <strong className="font-mono-num mt-2 block truncate text-[11px] tracking-[-0.06em]">{fmt(day.amount)}</strong>
          <span className="mt-1 block truncate text-[9px]" style={{ color: "var(--muted)" }}>{fmt(target)}</span>
          <span className="mt-2 block h-1 overflow-hidden rounded-full" style={{ background: "rgba(245, 243, 236, 0.1)" }}><span className="block h-full rounded-full" style={{ width: `${dayProgress}%`, background: ahead ? "var(--accent)" : "var(--accent-blue)" }} /></span>
        </button>;
      })}</div>
    </section>

    <section className="mt-7" aria-labelledby="scenario-heading">
      <h2 id="scenario-heading" className="m-0 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>Выбрать сценарий</h2>
      <p className="mt-2 mb-3 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>Цель сразу перераспределится между оставшимися буднями.</p>
      <div className="grid gap-2">{scenarios.map((option, index) => {
        const selected = option.weeklyCash === settings.weeklyTarget;
        const colors = ["#8bb4ff", "#8de09b", "#f3c878"];
        return <button key={option.name} onClick={() => choose(option.weeklyCash)} className="rounded-2xl p-3.5 text-left transition-transform active:scale-[0.99]" style={{ background: selected ? `color-mix(in srgb, ${colors[index]} 13%, var(--panel))` : "var(--hover)", border: `1px solid ${selected ? colors[index] : "var(--border)"}`, boxShadow: selected ? `0 8px 24px color-mix(in srgb, ${colors[index]} 10%, transparent)` : "none" }}>
          <div className="flex items-center justify-between gap-3"><span className="text-sm font-bold">{option.name}</span><span className="rounded-full px-2 py-1 text-[10px] font-bold" style={{ background: `color-mix(in srgb, ${colors[index]} 16%, transparent)`, color: colors[index] }}>{Math.round(option.multiplier * 100)}%</span></div>
          <div className="mt-2 flex items-end justify-between gap-3"><strong className="font-display text-2xl leading-none tracking-[-0.04em]">{fmt(option.weeklyCash)}</strong><span className="text-[11px]" style={{ color: "var(--muted)" }}>в неделю</span></div>
          <div className="mt-3 flex justify-between gap-2 border-t pt-2.5 text-[10px]" style={{ borderColor: "var(--line)", color: "var(--muted)" }}><span>минимум {fmt(option.minimumWeeklyCash)}</span><span>до {option.completionDate || "—"}</span></div>
        </button>;
      })}</div>
    </section>

    <section className="mt-7" aria-labelledby="entries-heading">
      <div className="mb-2 flex items-center justify-between"><h2 id="entries-heading" className="m-0 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>Записи кассы</h2><span className="text-xs" style={{ color: "var(--muted)" }}>{state.cashEntries.length}</span></div>
      <div className="overflow-hidden rounded-2xl" style={cardStyle}>{state.cashEntries.length ? state.cashEntries.slice().reverse().map((item) => <button key={item.id} onClick={() => setEntry(item)} className="flex w-full items-center justify-between gap-3 bg-transparent px-3.5 py-3 text-left" style={{ borderBottom: "1px solid var(--line)" }}><span className="text-sm">{item.date}</span><span className="font-mono-num text-sm font-bold">{fmt(item.amount)} <span className="font-sans text-[10px] font-normal" style={{ color: "var(--muted)" }}>изменить</span></span></button>) : <p className="m-0 px-3.5 py-4 text-sm" style={{ color: "var(--muted)" }}>Записей за кассу пока нет.</p>}</div>
    </section>

    <button onClick={() => setEntry({ id: "", date: today, amount: 0 })} className="mt-6 w-full rounded-2xl border-none py-4 text-sm font-bold shadow-lg transition-transform active:scale-[0.98]" style={{ background: "var(--accent-blue)", color: "#fff", boxShadow: "0 12px 30px rgba(47, 111, 237, 0.26)" }}>+ Добавить кассу</button>
    <CashEntrySheet key={`${entry?.id ?? "new"}-${entry?.date ?? "closed"}`} entry={entry} close={() => setEntry(undefined)} refresh={refresh} showToast={showToast} />
  </main>;
}

function CashEntrySheet({ entry, close, refresh, showToast }: { entry: CashEntry | null | undefined; close: () => void; refresh: Refresh; showToast: ShowToast }) {
  const [amount, setAmount] = useState(String(entry?.amount || ""));
  const [date, setDate] = useState(entry?.date || "");
  const [error, setError] = useState("");
  async function save() {
    const value = Number(amount);
    if (!date || value <= 0) return setError("Укажи дату и сумму больше нуля");
    try {
      if (entry?.id) await api.updateCash(entry.id, { date, amount: value }); else await api.addCash({ date, amount: value });
      await refresh(); showToast("Касса сохранена"); close();
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось сохранить"); }
  }
  return <Sheet show={!!entry} onClose={close}><SheetTitle>{entry?.id ? "Изменить кассу" : "Добавить кассу"}</SheetTitle><FieldLabel>Дата (ДД.ММ.ГГГГ)</FieldLabel><DescInput value={date} onChange={e => setDate(e.target.value)} /><FieldLabel>Сумма</FieldLabel><AmountInput value={amount} onChange={e => setAmount(e.target.value)} /><ErrText>{error}</ErrText><SaveButton onClick={save}>Сохранить</SaveButton>{entry?.id && <button onClick={async () => { await api.deleteCash(entry.id); await refresh(); showToast("Запись удалена"); close(); }} className="w-full mt-3 text-red-500">Удалить</button>}<CancelLink onClick={close}>Отмена</CancelLink></Sheet>;
}
