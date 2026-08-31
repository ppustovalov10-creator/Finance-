"use client";

import { useState } from "react";
import { computeRequiredKassa, type KassaCalcResult, type TeamInputs } from "@/lib/kassa";
import { calcWeeklyTarget, calcTierCards } from "@/lib/calc";
import { fmt } from "@/lib/format";
import { api } from "@/lib/api-client";
import type { AppState } from "@/lib/types";
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

const TIER_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  min: { bg: "rgba(111,207,123,0.14)", border: "rgba(111,207,123,0.35)", color: "#6FCF7B" },
  mid: { bg: "rgba(47,111,237,0.14)", border: "rgba(47,111,237,0.35)", color: "#5B93F5" },
  hero: { bg: "linear-gradient(160deg, rgba(199,154,60,0.22), rgba(193,68,60,0.14))", border: "rgba(199,154,60,0.5)", color: "#D9A544" },
};

export function KassaTargetForm({
  initial,
  budgetState,
  onSaved,
  onCancel,
}: {
  initial?: Initial;
  budgetState?: AppState | null;
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
  const [pickedTierKey, setPickedTierKey] = useState<string | null>(null);

  function resetPreview() {
    setPreview(null);
    setErr("");
    setPickedTierKey(null);
  }

  const currentTeam: TeamInputs = { failedPlan, opsTotal, opsPlan, mgrTotal, mgrPlan };

  function calc() {
    setErr("");
    const salary = parseFloat(targetSalary);
    if (!salary || salary <= 0) {
      setErr("Укажи сумму больше нуля");
      return;
    }
    setPreview(computeRequiredKassa(salary, currentTeam));
  }

  async function save(salaryOverride: number, choice?: "A" | "B") {
    setBusy(true);
    setErr("");
    try {
      const res = await api.setSalesTarget({
        targetSalary: salaryOverride,
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

  // Tap a "Минималка/Средняя/Герой-красавчик" preset (same numbers already
  // shown on "Главное") — sets the target and, unless it lands in a tariff
  // gap (which needs a human pick), saves it immediately.
  async function pickTier(key: string, amount: number) {
    setTargetSalary(String(amount));
    setPickedTierKey(key);
    setErr("");
    const result = computeRequiredKassa(amount, currentTeam);
    setPreview(result);
    if (result.status !== "gap") {
      await save(amount);
    }
  }

  let tierOptions: ReturnType<typeof calcTierCards> | null = null;
  if (budgetState) {
    const targetInfo = calcWeeklyTarget(budgetState);
    tierOptions = calcTierCards(
      targetInfo.base,
      targetInfo.goalLeft,
      targetInfo.weeks,
      targetInfo.goalContribution,
      budgetState.goal.deadlineDate,
      budgetState.goal.target > 0
    );
  }

  return (
    <div>
      {tierOptions && tierOptions.status === "ok" && (
        <>
          <FieldLabel first>Быстрый выбор — те же уровни, что на «Главное»</FieldLabel>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {tierOptions.tiers.map((t) => (
              <button
                key={t.key}
                type="button"
                disabled={busy}
                onClick={() => pickTier(t.key, t.amount)}
                className="rounded-2xl px-2 py-3 text-center cursor-pointer disabled:opacity-50"
                style={{
                  background: TIER_STYLE[t.key].bg,
                  border: `1.5px solid ${pickedTierKey === t.key ? TIER_STYLE[t.key].color : TIER_STYLE[t.key].border}`,
                }}
              >
                <div className="text-lg mb-0.5">{t.emoji}</div>
                <div className="text-[9px] uppercase tracking-wide font-bold opacity-85 mb-1">{t.name}</div>
                <div className="font-display font-bold text-[13px] leading-tight" style={{ color: TIER_STYLE[t.key].color }}>
                  {fmt(t.amount)}
                </div>
              </button>
            ))}
          </div>
          <div className="text-center text-[11px] mb-3" style={{ color: "#8A8B7E" }}>
            — или введи свою сумму —
          </div>
        </>
      )}

      <FieldLabel first={!tierOptions || tierOptions.status !== "ok"}>Сколько хочешь заработать на этой неделе?</FieldLabel>
      <DescInput
        type="number"
        placeholder="₽"
        value={targetSalary}
        onChange={(e) => {
          setTargetSalary(e.target.value);
          resetPreview();
        }}
      />
      <label className="flex items-start gap-2 text-xs mb-3 cursor-pointer" style={{ color: "#332B1E" }}>
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
          {pickedTierKey ? (
            <div className="text-sm font-semibold" style={{ color: "var(--pos, #6FCF7B)" }}>
              {busy ? "Сохраняем…" : "Сохранено"}
            </div>
          ) : (
            <SaveButton disabled={busy} onClick={() => save(parseFloat(targetSalary))}>
              {busy ? "Сохраняем…" : "Сохранить (без кассы)"}
            </SaveButton>
          )}
        </div>
      )}

      {preview && preview.status === "exact" && (
        <div>
          <div className="text-sm mb-3" style={{ color: "#332B1E" }}>
            Нужная касса: <b>{fmt(preview.requiredKassa)}</b>, по <b>{fmt(preview.requiredKassa / 5)}</b>/день.
          </div>
          {pickedTierKey ? (
            <div className="text-sm font-semibold" style={{ color: "var(--pos, #6FCF7B)" }}>
              {busy ? "Сохраняем…" : "Сохранено"}
            </div>
          ) : (
            <SaveButton disabled={busy} onClick={() => save(parseFloat(targetSalary))}>
              {busy ? "Сохраняем…" : "Сохранить"}
            </SaveButton>
          )}
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
            onClick={() => save(parseFloat(targetSalary), "A")}
            className="w-full text-left px-4 py-3 rounded-xl mb-2 cursor-pointer disabled:opacity-50"
            style={{ border: "1.5px solid #E5DCC5", background: "#fff", color: "#332B1E" }}
          >
            <b>Вариант А</b> — касса {fmt(preview.optionA.kassa)} → зарплата {fmt(preview.optionA.salary)}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => save(parseFloat(targetSalary), "B")}
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
