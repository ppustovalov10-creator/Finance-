"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { fmt } from "@/lib/format";
import { isValidDDMMYYYY, ddmmyyyyToIso, isoToDDMMYYYY, weeksRemainingToGoal, dateToSortable } from "@/lib/date";
import { spentSince, suggestedFloor } from "@/lib/calc";
import { buildReportText } from "@/lib/report";
import type { AppState, Transaction } from "@/lib/types";
import { Sheet, FieldLabel, DescInput, AmountInput, SaveButton, CancelLink, ErrText, SheetTitle, SheetHint } from "./Sheet";
import type { Refresh, ShowToast } from "./AppShell";

// Each modal below is mounted with a `key` from its parent that changes every
// time it opens (see IncomeTab.tsx / SpendTab.tsx) — that forces a fresh remount so useState's
// lazy initializer below always starts from the current data, with no
// "sync state from props" useEffect needed.

interface ModalBaseProps {
  show: boolean;
  onClose: () => void;
  state: AppState;
  refresh: Refresh;
  showToast: ShowToast;
}

export function IncomeSetupModal({ show, onClose, state, refresh }: ModalBaseProps) {
  const [date, setDate] = useState(state.currentWeek.startDate);
  const [income, setIncome] = useState(state.currentWeek.income != null ? String(state.currentWeek.income) : "");
  const [carryIn, setCarryIn] = useState(state.currentWeek.carryIn ? String(state.currentWeek.carryIn) : "");
  const [goalSaved, setGoalSaved] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const spentSoFar = spentSince(state.transactions, state.currentWeek.startDate);
  const remainderNow = (state.currentWeek.income || 0) + (state.currentWeek.carryIn || 0) - spentSoFar;
  const plannedNow =
    state.goal.target > 0
      ? Math.max(0, state.goal.target - state.goal.saved) /
        weeksRemainingToGoal(state.currentWeek.startDate, state.goal.deadlineDate)
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
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet show={show} onClose={onClose}>
      <SheetTitle>Доход за неделю</SheetTitle>
      <SheetHint>Фиксируй каждую пятницу — это и есть топливо для всех расчётов</SheetHint>
      <FieldLabel>Дата пятницы</FieldLabel>
      <DescInput placeholder="ДД.ММ.ГГГГ, например 28.08.2026" value={date} onChange={(e) => setDate(e.target.value)} />
      <FieldLabel>Доход за неделю</FieldLabel>
      <DescInput type="number" placeholder="₽" value={income} onChange={(e) => setIncome(e.target.value)} />
      <FieldLabel>Остаток с прошлой недели</FieldLabel>
      <DescInput type="number" placeholder="доп. деньги на карте, ₽" value={carryIn} onChange={(e) => setCarryIn(e.target.value)} />
      <SheetHint>Начинаешь новую неделю? Обычно сюда идёт то, что осталось сейчас: {fmt(remainderNow)}.</SheetHint>
      <div style={{ fontWeight: 700, fontSize: 16, margin: "16px 0 2px", borderTop: "1px solid var(--sheet-line)", paddingTop: 16 }}>
        Цель «{state.goal.name}»
      </div>
      <FieldLabel>Отложено в цель на этой неделе</FieldLabel>
      <DescInput type="number" placeholder="₽" value={goalSaved} onChange={(e) => setGoalSaved(e.target.value)} />
      <SheetHint>
        План на эту неделю: ~{fmt(plannedNow)}. Уже накоплено всего: {fmt(state.goal.saved)} из {fmt(state.goal.target)}.
      </SheetHint>
      <ErrText>{err}</ErrText>
      <SaveButton disabled={busy} onClick={save}>
        {busy ? "Сохраняем…" : "Сохранить"}
      </SaveButton>
      <CancelLink onClick={onClose}>Отмена</CancelLink>
    </Sheet>
  );
}

export function GoalEditModal({ show, onClose, state, refresh }: ModalBaseProps) {
  const isCompleted = state.goal.target > 0 && state.goal.saved >= state.goal.target;
  const [name, setName] = useState(state.goal.name);
  const [target, setTarget] = useState(state.goal.target ? String(state.goal.target) : "");
  const [saved, setSaved] = useState(String(state.goal.saved || 0));
  const [deadline, setDeadline] = useState(state.goal.deadlineDate || "");
  const [isNewMoney, setIsNewMoney] = useState(false);
  const [startNew, setStartNew] = useState(isCompleted);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const savedChanged = startNew || parseFloat(saved) !== (state.goal.saved || 0);

  async function save() {
    setErr("");
    const nameTrim = name.trim();
    if (!nameTrim) return setErr("Дай цели название");
    const targetVal = parseFloat(target);
    if (!targetVal || targetVal <= 0) return setErr("Целевая сумма должна быть больше нуля");
    const savedVal = parseFloat(saved);
    if (isNaN(savedVal) || savedVal < 0) return setErr("Накоплено — число от нуля");
    if (!isValidDDMMYYYY(deadline)) return setErr("Дедлайн в формате ДД.ММ.ГГГГ, например 09.10.2026");
    setBusy(true);
    try {
      await api.updateGoal({
        name: nameTrim,
        target: targetVal,
        saved: savedVal,
        deadlineDate: deadline,
        isNewMoney,
        startNew: isCompleted ? startNew : false,
      });
      await refresh();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet show={show} onClose={onClose}>
      <SheetTitle>Редактировать цель</SheetTitle>
      {isCompleted && (
        <div
          className="mb-3.5 px-3.5 py-2.5 rounded-xl"
          style={{ background: "rgba(111,207,123,0.14)", border: "1px solid rgba(111,207,123,0.35)" }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, color: "#332B1E" }}>🎉 Цель «{state.goal.name}» достигнута!</div>
          <button
            type="button"
            onClick={() => {
              setStartNew(true);
              setName("");
              setTarget("");
              setSaved("0");
              setDeadline("");
            }}
            className="w-full text-left px-3 py-2 rounded-lg mt-2 cursor-pointer"
            style={{
              border: startNew ? "2px solid var(--accent-blue, #2F6FED)" : "1.5px solid #E5DCC5",
              background: startNew ? "rgba(47,111,237,0.08)" : "#fff",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 12.5, color: "#332B1E" }}>{startNew ? "✓ " : ""}Начать новую цель</div>
            {startNew && (
              <div style={{ fontSize: 11, color: "#8A8B7E", marginTop: 2, fontWeight: 400 }}>
                Заполни название, сумму и дедлайн новой цели ниже
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setStartNew(false);
              setName(state.goal.name);
              setTarget(String(state.goal.target));
              setSaved(String(state.goal.saved || 0));
              setDeadline(state.goal.deadlineDate || "");
            }}
            className="w-full text-left px-3 py-2 rounded-lg mt-1.5 cursor-pointer"
            style={{
              border: !startNew ? "2px solid var(--accent-blue, #2F6FED)" : "1.5px solid #E5DCC5",
              background: !startNew ? "rgba(47,111,237,0.08)" : "#fff",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 12.5, color: "#332B1E" }}>
              {!startNew ? "✓ " : ""}Нет, просто поправить эту же цель
            </div>
          </button>
        </div>
      )}
      <FieldLabel>Название</FieldLabel>
      <DescInput placeholder="например, Macbook" value={name} onChange={(e) => setName(e.target.value)} />
      <FieldLabel>Целевая сумма</FieldLabel>
      <DescInput type="number" placeholder="₽" value={target} onChange={(e) => setTarget(e.target.value)} />
      <FieldLabel>Уже накоплено всего</FieldLabel>
      <DescInput type="number" placeholder="₽" value={saved} onChange={(e) => setSaved(e.target.value)} />
      {savedChanged && (
        <div className="mb-3.5">
          <div style={{ fontSize: 11.5, color: "#8A8B7E", marginBottom: 6 }}>Откуда эта сумма?</div>
          <button
            type="button"
            onClick={() => setIsNewMoney(false)}
            className="w-full text-left px-3.5 py-2.5 rounded-xl mb-2 cursor-pointer"
            style={{
              border: !isNewMoney ? "2px solid var(--accent-blue, #2F6FED)" : "1.5px solid #E5DCC5",
              background: !isNewMoney ? "rgba(47,111,237,0.08)" : "#fff",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: "#332B1E" }}>
              {!isNewMoney ? "✓ " : ""}Деньги уже были — это просто поправка суммы
            </div>
            <div style={{ fontSize: 11.5, color: "#8A8B7E", marginTop: 2 }}>
              Например, отложено ещё до приложения. Баланс недели не тронем.
            </div>
          </button>
          <button
            type="button"
            onClick={() => setIsNewMoney(true)}
            className="w-full text-left px-3.5 py-2.5 rounded-xl cursor-pointer"
            style={{
              border: isNewMoney ? "2px solid var(--accent-blue, #2F6FED)" : "1.5px solid #E5DCC5",
              background: isNewMoney ? "rgba(47,111,237,0.08)" : "#fff",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: "#332B1E" }}>
              {isNewMoney ? "✓ " : ""}Отложил новые деньги на этой неделе
            </div>
            <div style={{ fontSize: 11.5, color: "#8A8B7E", marginTop: 2 }}>Уменьшит баланс недели.</div>
          </button>
        </div>
      )}
      <FieldLabel>Дедлайн</FieldLabel>
      <DescInput placeholder="ДД.ММ.ГГГГ" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      <ErrText>{err}</ErrText>
      <SaveButton disabled={busy} onClick={save}>
        {busy ? "Сохраняем…" : "Сохранить"}
      </SaveButton>
      <CancelLink onClick={onClose}>Отмена</CancelLink>
    </Sheet>
  );
}

export function FloorEditModal({ show, onClose, state, refresh }: ModalBaseProps) {
  const suggested = suggestedFloor(state.incomeLog);
  const [value, setValue] = useState(state.incomeFloor != null ? String(state.incomeFloor) : suggested != null ? String(suggested) : "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const val = parseFloat(value);
    if (!val || val <= 0) return setErr("Значение должно быть больше нуля");
    setBusy(true);
    try {
      await api.updateFloor(val);
      await refresh();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet show={show} onClose={onClose}>
      <SheetTitle>Доход-пол</SheetTitle>
      <SheetHint>
        Реалистичный минимум за неделю — на случай просевших продаж. Считается от твоей истории доходов, но можно
        поправить.
      </SheetHint>
      <FieldLabel>Доход-пол, ₽</FieldLabel>
      <DescInput type="number" placeholder="₽" value={value} onChange={(e) => setValue(e.target.value)} />
      <div style={{ fontSize: "11.5px", color: "#8A8B7E", margin: "-10px 0 12px" }}>
        {suggested != null ? `Предложение от истории (минимум из логов): ${fmt(suggested)}` : "Пока нет истории доходов для подсказки"}
      </div>
      <ErrText>{err}</ErrText>
      <SaveButton disabled={busy} onClick={save}>
        {busy ? "Сохраняем…" : "Сохранить"}
      </SaveButton>
      <CancelLink onClick={onClose}>Отмена</CancelLink>
    </Sheet>
  );
}

export function ReserveEditModal({ show, onClose, state, refresh }: ModalBaseProps) {
  const [saved, setSaved] = useState(String(state.reserve.saved));
  const [withdraw, setWithdraw] = useState("");
  const [isNewMoney, setIsNewMoney] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const savedChanged = parseFloat(saved) !== state.reserve.saved;

  async function save() {
    setErr("");
    const savedVal = parseFloat(saved);
    if (isNaN(savedVal) || savedVal < 0) return setErr("Накоплено — число от нуля");
    setBusy(true);
    try {
      const w = withdraw.trim() !== "" ? parseFloat(withdraw) : null;
      await api.updateReserve({ saved: savedVal, withdraw: w && w > 0 ? w : null, isNewMoney });
      await refresh();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet show={show} onClose={onClose}>
      <SheetTitle>Подушка безопасности</SheetTitle>
      <SheetHint>Отдельно от цели — страховка на случай простоя, а не мечта. Пополняется только вручную.</SheetHint>
      <FieldLabel>Накоплено сейчас (поправить вручную)</FieldLabel>
      <DescInput type="number" value={saved} onChange={(e) => setSaved(e.target.value)} />
      {savedChanged && (
        <div className="mb-3.5">
          <div style={{ fontSize: 11.5, color: "#8A8B7E", marginBottom: 6 }}>Откуда эта сумма?</div>
          <button
            type="button"
            onClick={() => setIsNewMoney(false)}
            className="w-full text-left px-3.5 py-2.5 rounded-xl mb-2 cursor-pointer"
            style={{
              border: !isNewMoney ? "2px solid var(--accent-blue, #2F6FED)" : "1.5px solid #E5DCC5",
              background: !isNewMoney ? "rgba(47,111,237,0.08)" : "#fff",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: "#332B1E" }}>
              {!isNewMoney ? "✓ " : ""}Деньги уже были — это просто поправка суммы
            </div>
            <div style={{ fontSize: 11.5, color: "#8A8B7E", marginTop: 2 }}>Баланс недели не тронем.</div>
          </button>
          <button
            type="button"
            onClick={() => setIsNewMoney(true)}
            className="w-full text-left px-3.5 py-2.5 rounded-xl cursor-pointer"
            style={{
              border: isNewMoney ? "2px solid var(--accent-blue, #2F6FED)" : "1.5px solid #E5DCC5",
              background: isNewMoney ? "rgba(47,111,237,0.08)" : "#fff",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: "#332B1E" }}>
              {isNewMoney ? "✓ " : ""}Отложил новые деньги на этой неделе
            </div>
            <div style={{ fontSize: 11.5, color: "#8A8B7E", marginTop: 2 }}>Уменьшит баланс недели.</div>
          </button>
        </div>
      )}
      <FieldLabel>Использовать из подушки сейчас (форс-мажор)</FieldLabel>
      <DescInput type="number" placeholder="сумма, ₽ — необязательно" value={withdraw} onChange={(e) => setWithdraw(e.target.value)} />
      <ErrText>{err}</ErrText>
      <SaveButton disabled={busy} onClick={save}>
        {busy ? "Сохраняем…" : "Сохранить"}
      </SaveButton>
      <CancelLink onClick={onClose}>Отмена</CancelLink>
    </Sheet>
  );
}

export function AddTxModal({
  show,
  onClose,
  refresh,
  showToast,
  dateOverride,
  forceCat,
}: ModalBaseProps & { dateOverride: string | null; forceCat?: string }) {
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [dateIso, setDateIso] = useState(dateOverride ? ddmmyyyyToIso(dateOverride) : new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setErr("");
    let amt = parseFloat(amount);
    let d = desc;
    if (!amt || amt <= 0) {
      const m = d.match(/(\d[\d\s]*[.,]?\d*)/);
      if (m) {
        amt = parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
        d = (d.slice(0, m.index) + d.slice((m.index || 0) + m[0].length)).replace(/₽|руб\.?/gi, "").trim();
      }
    }
    if (!amt || amt <= 0) return setErr("Не вижу сумму — впиши число в верхнее поле («₽ — сумма траты»)");
    const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(dateIso) ? isoToDDMMYYYY(dateIso) : new Date().toLocaleDateString("ru-RU");
    setBusy(true);
    try {
      await api.addTransaction({ amount: amt, desc: d || forceCat || "", dateStr, cat: forceCat });
      await refresh();
      onClose();
      showToast(`Записано на ${dateStr}: ${fmt(-amt)}${forceCat ? ` · ${forceCat}` : ""}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet show={show} onClose={onClose}>
      {forceCat && <SheetTitle>{forceCat}</SheetTitle>}
      <FieldLabel first>Сумма траты</FieldLabel>
      <AmountInput value={amount} onChange={(e) => setAmount(e.target.value)} />
      <div style={{ textAlign: "center", color: "#8A8B7E", fontSize: 12, marginBottom: 20 }}>₽</div>
      <FieldLabel>На что</FieldLabel>
      <DescInput placeholder="необязательно" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <FieldLabel>Дата</FieldLabel>
      <DescInput type="date" value={dateIso} onChange={(e) => setDateIso(e.target.value)} />
      <ErrText>{err}</ErrText>
      <SaveButton disabled={busy} onClick={save}>
        {busy ? "Пишем…" : "Записать"}
      </SaveButton>
      <CancelLink onClick={onClose}>Отмена</CancelLink>
    </Sheet>
  );
}

export function EditTxModal({
  show,
  onClose,
  state,
  refresh,
  showToast,
  tx,
}: ModalBaseProps & { tx: Transaction | null }) {
  const [amount, setAmount] = useState(tx ? String(Math.abs(tx.amount)) : "");
  const [desc, setDesc] = useState(tx?.desc || "");
  const [dateIso, setDateIso] = useState(tx ? ddmmyyyyToIso(tx.date) : "");
  const [cat, setCat] = useState(tx?.cat || "");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!tx) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setBusy(true);
    try {
      const dateStr = isoToDDMMYYYY(dateIso);
      const res = await api.updateTransaction(tx.id, { amount: amt, desc, dateStr, cat, remember });
      await refresh();
      onClose();
      if (res.learned) showToast(`Запомнила: слово «${res.learned}» теперь ведёт в «${cat}»`);
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!tx) return;
    setBusy(true);
    try {
      await api.deleteTransaction(tx.id);
      await refresh();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet show={show && !!tx} onClose={onClose}>
      <SheetTitle>Изменить трату</SheetTitle>
      <FieldLabel>Сумма</FieldLabel>
      <AmountInput style={{ fontSize: 38 }} value={amount} onChange={(e) => setAmount(e.target.value)} />
      <div style={{ textAlign: "center", color: "#8A8B7E", fontSize: 12, marginBottom: 20 }}>₽</div>
      <FieldLabel>На что</FieldLabel>
      <DescInput placeholder="на что" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <DescInput type="date" value={dateIso} onChange={(e) => setDateIso(e.target.value)} />
      <select
        className="w-full px-4 py-3 rounded-xl text-sm mb-4"
        style={{ background: "#fff", color: "var(--sheet-ink)", border: "1px solid var(--sheet-line)" }}
        value={cat}
        onChange={(e) => setCat(e.target.value)}
      >
        {state.categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#332B1E", margin: "-6px 0 14px", cursor: "pointer" }}>
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <span>Запомнить для похожих трат в будущем</span>
      </label>
      <SaveButton disabled={busy} onClick={save}>
        Сохранить
      </SaveButton>
      <CancelLink danger onClick={del}>
        Удалить трату
      </CancelLink>
      <CancelLink onClick={onClose}>Отмена</CancelLink>
    </Sheet>
  );
}

export function ReportModal({ show, onClose, state }: ModalBaseProps) {
  const weeks = [...state.incomeLog].sort((a, b) => (dateToSortable(a.startDate) < dateToSortable(b.startDate) ? 1 : -1));
  const [weekStartDate, setWeekStartDate] = useState(state.currentWeek.startDate);
  const [status, setStatus] = useState("");
  const text = buildReportText(state, weekStartDate);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Скопировано — вставь в чат с Claude.");
    } catch {
      setStatus("Не получилось скопировать автоматически — текст уже выделен выше, просто зажми и выбери «Копировать» вручную.");
    }
  }

  return (
    <Sheet show={show} onClose={onClose}>
      <SheetTitle>Отчёт за неделю</SheetTitle>
      <SheetHint>Скопируй текст ниже и вставь в чат с Claude или сохрани на Диск.</SheetHint>
      {weeks.length > 1 && (
        <>
          <FieldLabel>Неделя</FieldLabel>
          <select
            value={weekStartDate}
            onChange={(e) => {
              setWeekStartDate(e.target.value);
              setStatus("");
            }}
            className="w-full px-4 py-3 rounded-xl text-sm mb-1 outline-none"
            style={{ background: "#fff", color: "var(--sheet-ink)", border: "1px solid var(--sheet-line)" }}
          >
            {weeks.map((w) => (
              <option key={w.startDate} value={w.startDate}>
                {w.startDate === state.currentWeek.startDate ? `${w.startDate} (текущая)` : w.startDate}
              </option>
            ))}
          </select>
        </>
      )}
      <textarea
        readOnly
        value={text}
        className="w-full mt-3 p-3 rounded-xl resize-y"
        style={{
          minHeight: 260,
          border: "1px solid var(--sheet-line)",
          fontFamily: "var(--font-plex-mono), monospace",
          fontSize: 12,
          color: "var(--sheet-ink)",
          background: "#fff",
        }}
      />
      <div style={{ fontSize: 12, color: status.startsWith("Скопировано") ? "var(--pos)" : "#8A8B7E", margin: "8px 0 4px", minHeight: 16 }}>
        {status}
      </div>
      <SaveButton onClick={copy}>Копировать в буфер</SaveButton>
      <CancelLink onClick={onClose}>Закрыть</CancelLink>
    </Sheet>
  );
}
