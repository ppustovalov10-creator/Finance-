"use client";

import { useState } from "react";
import { computeRequiredKassa, type KassaCalcResult, type TeamInputs } from "@/lib/kassa";
import { fmt } from "@/lib/format";
import { api } from "@/lib/api-client";
import { Counter } from "./Counter";
import { FieldLabel, DescInput, SaveButton, CancelLink, ErrText } from "./Sheet";

interface Initial {
  targetSalary: number;
  failedPlan: boolean;
  opsTotal: number;
  opsPlan: number;
  mgrTotal: number;
  mgrPlan: number;
}

export function KassaTargetForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Initial;
  onSaved: () => Promise<unknown>;
  onCancel?: () => void;
}) {
  const [targetSalary, setTargetSalary] = useState(initial ? String(initial.targetSalary) : "");
  const [failedPlan, setFailedPlan] = useState(initial?.failedPlan ?? false);
  const [opsTotal, setOpsTotal] = useState(initial?.opsTotal ?? 0);
  const [opsPlan, setOpsPlan] = useState(initial?.opsPlan ?? 0);
  const [mgrTotal, setMgrTotal] = useState(initial?.mgrTotal ?? 0);
  const [mgrPlan, setMgrPlan] = useState(initial?.mgrPlan ?? 0);
  const [preview, setPreview] = useState<KassaCalcResult | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  function resetPreview() {
    setPreview(null);
    setErr("");
  }

  function calc() {
    setErr("");
    const salary = parseFloat(targetSalary);
    if (!salary || salary <= 0) {
      setErr("Укажи сумму больше нуля");
      return;
    }
    const team: TeamInputs = { failedPlan, opsTotal, opsPlan, mgrTotal, mgrPlan };
    setPreview(computeRequiredKassa(salary, team));
  }

  async function save(choice?: "A" | "B") {
    setBusy(true);
    setErr("");
    try {
      const res = await api.setSalesTarget({
        targetSalary: parseFloat(targetSalary),
        failedPlan,
        opsTotal,
        opsPlan,
        mgrTotal,
        mgrPlan,
        choice,
      });
      if (res.needsChoice) {
        setPreview(res.result);
        setErr("Выбери один из двух вариантов ниже");
        return;
      }
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <FieldLabel first>Сколько хочешь заработать на этой неделе?</FieldLabel>
      <DescInput
        type="number"
        placeholder="₽"
        value={targetSalary}
        onChange={(e) => {
          setTargetSalary(e.target.value);
          resetPreview();
        }}
      />
      <label
        className="flex items-start gap-2 text-xs mb-3 cursor-pointer"
        style={{ color: "#332B1E" }}
      >
        <input
          type="checkbox"
          className="mt-0.5"
          checked={failedPlan}
          onChange={(e) => {
            setFailedPlan(e.target.checked);
            resetPreview();
          }}
        />
        <span>План не выполняется 4+ недели подряд (оклад 5000 ₽ обнулится)</span>
      </label>

      <FieldLabel>Команда (если есть — иначе оставь 0)</FieldLabel>
      <div className="rounded-xl px-3 mb-3" style={{ background: "#F5F1E6" }}>
        <Counter
          label="Операторы: всего в команде"
          value={opsTotal}
          onChange={(v) => {
            setOpsTotal(v);
            resetPreview();
          }}
        />
        <Counter
          label="Операторы: выполнили план"
          value={opsPlan}
          onChange={(v) => {
            setOpsPlan(v);
            resetPreview();
          }}
        />
        <Counter
          label="Менеджеры/инструкторы: всего"
          value={mgrTotal}
          onChange={(v) => {
            setMgrTotal(v);
            resetPreview();
          }}
        />
        <Counter
          label="Менеджеры/инструкторы: выполнили план"
          value={mgrPlan}
          onChange={(v) => {
            setMgrPlan(v);
            resetPreview();
          }}
        />
      </div>

      <ErrText>{err}</ErrText>

      {!preview && <SaveButton onClick={calc}>Рассчитать кассу</SaveButton>}

      {preview && preview.status === "covered" && (
        <div>
          <div className="text-sm mb-3" style={{ color: "#332B1E" }}>
            Оклад ({fmt(preview.baseSalary)}) и бонусы ({fmt(preview.opBonus + preview.mgrBonus)}) уже покрывают
            цель, кассу можно не считать.
          </div>
          <SaveButton disabled={busy} onClick={() => save()}>
            {busy ? "Сохраняем…" : "Сохранить (без кассы)"}
          </SaveButton>
        </div>
      )}

      {preview && preview.status === "exact" && (
        <div>
          <div className="text-sm mb-3" style={{ color: "#332B1E" }}>
            Нужная касса: <b>{fmt(preview.requiredKassa)}</b>, по <b>{fmt(preview.requiredKassa / 5)}</b>/день.
          </div>
          <SaveButton disabled={busy} onClick={() => save()}>
            {busy ? "Сохраняем…" : "Сохранить"}
          </SaveButton>
        </div>
      )}

      {preview && preview.status === "gap" && (
        <div>
          <div className="text-sm mb-3" style={{ color: "#332B1E" }}>
            Ровно {fmt(parseFloat(targetSalary))} на этой шкале математически недостижимо (между тарифами есть
            скачок процента). Выбери ближайший вариант:
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => save("A")}
            className="w-full text-left px-4 py-3 rounded-xl mb-2 cursor-pointer disabled:opacity-50"
            style={{ border: "1.5px solid #E5DCC5", background: "#fff", color: "#332B1E" }}
          >
            <b>Вариант А</b> — касса {fmt(preview.optionA.kassa)} → зарплата {fmt(preview.optionA.salary)}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => save("B")}
            className="w-full text-left px-4 py-3 rounded-xl mb-3 cursor-pointer disabled:opacity-50"
            style={{ border: "1.5px solid #E5DCC5", background: "#fff", color: "#332B1E" }}
          >
            <b>Вариант Б</b> — касса {fmt(preview.optionB.kassa)} → зарплата {fmt(preview.optionB.salary)}
          </button>
        </div>
      )}

      {onCancel && <CancelLink onClick={onCancel}>Отмена</CancelLink>}
    </div>
  );
}
