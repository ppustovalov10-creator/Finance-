"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { lastFriday, isValidDDMMYYYY } from "@/lib/date";
import { Sheet, FieldLabel, DescInput, SaveButton, CancelLink, ErrText, SheetTitle } from "./Sheet";
import type { Refresh } from "./AppShell";

export default function Onboarding({ onDone }: { onDone: Refresh }) {
  const [step, setStep] = useState(1);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [weekDate, setWeekDate] = useState(lastFriday());
  const [income, setIncome] = useState("");
  const [err1, setErr1] = useState("");
  const [err2, setErr2] = useState("");
  const [busy, setBusy] = useState(false);

  function next1() {
    if (!goalName.trim()) return setErr1("Дай цели название");
    const target = parseFloat(goalTarget);
    if (!target || target <= 0) return setErr1("Сумма должна быть больше нуля");
    if (!isValidDDMMYYYY(goalDeadline)) return setErr1("Дата в формате ДД.ММ.ГГГГ");
    setErr1("");
    setStep(2);
  }

  function next2() {
    if (!isValidDDMMYYYY(weekDate)) return setErr2("Дата в формате ДД.ММ.ГГГГ");
    const inc = parseFloat(income);
    if (!inc || inc <= 0) return setErr2("Доход должен быть больше нуля");
    setErr2("");
    setStep(3);
  }

  async function skip() {
    setBusy(true);
    await api.onboardingSkip();
    await onDone();
  }

  async function finish() {
    setBusy(true);
    await api.onboardingFinish({
      goalName: goalName.trim(),
      goalTarget: parseFloat(goalTarget),
      goalDeadline,
      weekDate,
      income: parseFloat(income),
    });
    await onDone();
  }

  return (
    <Sheet show onClose={() => {}}>
      {step === 1 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>Привет 👋</div>
          <div style={{ fontSize: "12.5px", color: "#8A8B7E", marginTop: 4 }}>
            Это трекер для тех, чей доход зависит от продаж, а не от оклада. Настроим его под тебя — это займёт минуту.
          </div>
          <FieldLabel>На что копишь?</FieldLabel>
          <DescInput placeholder="например, Macbook" value={goalName} onChange={(e) => setGoalName(e.target.value)} />
          <FieldLabel>Сколько нужно, ₽</FieldLabel>
          <DescInput type="number" placeholder="₽" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} />
          <FieldLabel>К какой дате хочешь успеть?</FieldLabel>
          <DescInput
            placeholder="ДД.ММ.ГГГГ"
            value={goalDeadline}
            onChange={(e) => setGoalDeadline(e.target.value)}
          />
          <ErrText>{err1}</ErrText>
          <SaveButton onClick={next1}>Далее →</SaveButton>
          <CancelLink onClick={skip}>{busy ? "…" : "Пропустить, настрою позже"}</CancelLink>
        </div>
      )}
      {step === 2 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>Доход за неделю</div>
          <div style={{ fontSize: "12.5px", color: "#8A8B7E", marginTop: 4 }}>
            Приложение считает неделями, а не месяцами — так честнее для переменного дохода. Сколько составил доход
            на последней закрытой неделе?
          </div>
          <FieldLabel>Дата пятницы</FieldLabel>
          <DescInput placeholder="ДД.ММ.ГГГГ" value={weekDate} onChange={(e) => setWeekDate(e.target.value)} />
          <FieldLabel>Доход за эту неделю, ₽</FieldLabel>
          <DescInput type="number" placeholder="₽" value={income} onChange={(e) => setIncome(e.target.value)} />
          <ErrText>{err2}</ErrText>
          <SaveButton onClick={next2}>Далее →</SaveButton>
          <CancelLink onClick={() => setStep(1)}>Назад</CancelLink>
        </div>
      )}
      {step === 3 && (
        <div>
          <SheetTitle>Готово 🎉</SheetTitle>
          <div style={{ fontSize: 13, color: "#332B1E", marginTop: 10, lineHeight: 1.6 }}>
            Дальше приложение само:
            <br />
            • разложит еженедельные лимиты по конвертам как % от твоего дохода
            <br />
            • отложит 5% в подушку безопасности с каждой новой недели
            <br />
            • пересчитает, сколько нужно продать на следующей неделе, если что-то пойдёт не по плану
            <br />
            <br />
            Каждую пятницу просто заходи и фиксируй новый доход — остальное само.
          </div>
          <div className="mt-4">
            <SaveButton disabled={busy} onClick={finish}>
              {busy ? "Готовим…" : "Начать пользоваться"}
            </SaveButton>
          </div>
        </div>
      )}
    </Sheet>
  );
}
