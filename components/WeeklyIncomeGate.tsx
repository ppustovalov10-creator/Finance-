"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { fmt } from "@/lib/format";
import { isValidDDMMYYYY, weeksRemainingToGoal } from "@/lib/date";
import { spentSince } from "@/lib/calc";
import type { AppState } from "@/lib/types";
import { Sheet, FieldLabel, DescInput, SaveButton, ErrText, SheetTitle, SheetHint } from "./Sheet";
import type { Refresh } from "./AppShell";

// Rendered instead of the whole app (see AppShell.tsx) once the Friday
// 21:00 cutoff for fixing this week's salary has passed and it hasn't
// been fixed yet — no close button, no skip, `<Sheet onClose={() => {}}>`
// makes the backdrop-click-to-dismiss a no-op (same trick Onboarding.tsx
// uses). The only way out is a successful save, which updates state and
// makes AppShell stop rendering this in the same render pass.
export default function WeeklyIncomeGate({
  state,
  refresh,
  requiredWeekStart,
}: {
  state: AppState;
  refresh: Refresh;
  requiredWeekStart: string;
}) {
  const [date, setDate] = useState(requiredWeekStart);
  const [income, setIncome] = useState("");
  const [carryIn, setCarryIn] = useState("");
  const [goalSaved, setGoalSaved] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const spentSoFar = spentSince(state.transactions, state.currentWeek.startDate);
  const remainderNow = (state.currentWeek.income || 0) + (state.currentWeek.carryIn || 0) - spentSoFar;
  const plannedNow =
    state.goal.target > 0
      ? Math.max(0, state.goal.target - state.goal.saved) / weeksRemainingToGoal(state.currentWeek.startDate, state.goal.deadlineDate)
      : 0;

  async function save() {
    setErr("");
    if (!isValidDDMMYYYY(date)) return setErr("Дата должна быть в формате ДД.ММ.ГГГГ, например 28.08.2026");
    const incomeVal = parseFloat(income);
    if (!incomeVal || incomeVal <= 0) return setErr("Укажи доход больше нуля");
    setBusy(true);
    try {
      await api.fixIncome({
        dateVal: date,
        incomeVal,
        carryInVal: carryIn !== "" ? parseFloat(carryIn) || 0 : 0,
        goalSavedVal: goalSaved !== "" ? parseFloat(goalSaved) || 0 : 0,
      });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить");
      setBusy(false);
    }
  }

  return (
    <Sheet show onClose={() => {}}>
      <SheetTitle>Пятница — зарплата на стол</SheetTitle>
      <SheetHint>
        Каждую пятницу в 21:00 приложение просит зафиксировать новую зарплату — без этого дальше не пройти, все расчёты
        недели строятся от этой цифры.
      </SheetHint>
      <FieldLabel>Дата пятницы</FieldLabel>
      <DescInput placeholder="ДД.ММ.ГГГГ, например 28.08.2026" value={date} onChange={(e) => setDate(e.target.value)} />
      <FieldLabel>Доход за неделю</FieldLabel>
      <DescInput type="number" placeholder="₽" value={income} onChange={(e) => setIncome(e.target.value)} autoFocus />
      <FieldLabel>Остаток с прошлой недели</FieldLabel>
      <DescInput type="number" placeholder="доп. деньги на карте, ₽" value={carryIn} onChange={(e) => setCarryIn(e.target.value)} />
      <SheetHint>Обычно сюда идёт то, что осталось сейчас: {fmt(remainderNow)}.</SheetHint>
      {state.goal.target > 0 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 16, margin: "16px 0 2px", borderTop: "1px solid var(--sheet-line)", paddingTop: 16 }}>
            Цель «{state.goal.name}»
          </div>
          <FieldLabel>Отложено в цель на этой неделе</FieldLabel>
          <DescInput type="number" placeholder="₽" value={goalSaved} onChange={(e) => setGoalSaved(e.target.value)} />
          <SheetHint>
            План на эту неделю: ~{fmt(plannedNow)}. Уже накоплено всего: {fmt(state.goal.saved)} из {fmt(state.goal.target)}.
          </SheetHint>
        </>
      )}
      <ErrText>{err}</ErrText>
      <SaveButton disabled={busy} onClick={save}>
        {busy ? "Сохраняем…" : "Зафиксировать и продолжить"}
      </SaveButton>
    </Sheet>
  );
}
