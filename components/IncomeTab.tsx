"use client";

import { useState } from "react";
import type { AppState } from "@/lib/types";
import { fmt } from "@/lib/format";
import { calcWeeklyTarget, calcTierCards } from "@/lib/calc";
import { InlineIcon } from "./Icon";
import InfoModal from "./InfoModal";
import { IncomeSetupModal, GoalEditModal } from "./HomeModals";
import { Card, Tag, InfoBtn, TargetRow } from "./HomeCardBits";
import type { Refresh, ShowToast } from "./AppShell";

// Everything related to income — fixing the week's earnings, the goal,
// the reserve, and how much needs to be earned — lives here. Кассa (the
// personal sales-commission tracker) is rendered right after this by the
// parent, unchanged, since it's conceptually part of the same "income"
// side of the app.
export default function IncomeTab({ state, refresh, showToast }: { state: AppState; refresh: Refresh; showToast: ShowToast }) {
  const week = state.currentWeek;
  const hasIncome = week.income != null;

  const targetInfo = calcWeeklyTarget(state);
  const tiers = calcTierCards(
    targetInfo.base,
    targetInfo.goalLeft,
    targetInfo.weeks,
    targetInfo.goalContribution,
    state.goal.deadlineDate,
    state.goal.target > 0
  );

  const [targetDetailsOpen, setTargetDetailsOpen] = useState(false);
  const [infoKey, setInfoKey] = useState<string | null>(null);
  const [incomeModal, setIncomeModal] = useState(false);
  const [goalModal, setGoalModal] = useState(false);

  return (
    <div className="max-w-[420px] mx-auto px-5 pt-6 pb-[40px]">
      <div className="mb-3">
        <Card onClick={() => setIncomeModal(true)}>
          <Tag>Доход с {week.startDate}</Tag>
          <div className="font-display font-semibold text-[26px]">
            {hasIncome ? (
              <>
                {fmt(week.income as number)}
                {week.carryIn ? (
                  <span className="block text-[13px] font-normal mt-0.5" style={{ color: "var(--muted)" }}>
                    {week.carryIn > 0 ? "+" : "−"} {fmt(Math.abs(week.carryIn))} остаток
                  </span>
                ) : null}
              </>
            ) : (
              <small className="text-sm">не задан</small>
            )}
          </div>
        </Card>
      </div>

      <div className="mb-3">
        <Card onClick={() => setGoalModal(true)}>
          <Tag>Цель: {state.goal.target > 0 ? state.goal.name : "—"}</Tag>
          <div className="font-display font-semibold text-[26px]">
            {state.goal.target > 0 ? (
              <>
                {Math.min(100, (state.goal.saved / state.goal.target) * 100).toFixed(0)}
                <small className="text-sm">%</small>
              </>
            ) : (
              "—"
            )}
          </div>
          <div className="text-[11.5px] mt-1" style={{ color: "var(--muted)" }}>
            {state.goal.target > 0 ? (
              <>
                нужно вкладывать ~<b>{fmt(targetInfo.goalContribution)}</b>/нед.
              </>
            ) : (
              <span className="underline">нажми, чтобы создать цель</span>
            )}
          </div>
          {state.goal.target > 0 && (
            <div className="h-1.5 rounded-full mt-2.5 overflow-hidden" style={{ background: "var(--border)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (state.goal.saved / state.goal.target) * 100)}%`,
                  background: "var(--accent-blue)",
                }}
              />
            </div>
          )}
        </Card>
      </div>

      <div className="rounded-2xl p-4 mb-5" style={{ background: "var(--hover)", border: "1px solid var(--border)" }}>
        <Tag>
          Нужно заработать на след. неделю <InfoBtn onClick={() => setInfoKey("target")} />
        </Tag>
        <div className="font-display font-semibold text-[22px]">{fmt(targetInfo.target)}</div>
        <div className="text-[12px] mt-1.5" style={{ color: "var(--muted)" }}>
          {state.goal.target > 0
            ? `база трат ${fmt(targetInfo.base)} + взнос в «${state.goal.name}» ${fmt(targetInfo.goalContribution)} + буфер 10% (осталось ${targetInfo.goalLeft > 0 ? fmt(targetInfo.goalLeft) + ", " : ""}${targetInfo.weeks.toFixed(1)} нед. до ${state.goal.deadlineDate})`
            : `база трат ${fmt(targetInfo.base)} + буфер 10% (цель ещё не задана — нажми на карточку «Цель» выше)`}
        </div>
        <div
          className="text-[11.5px] mt-2 cursor-pointer underline"
          style={{ color: "var(--accent-blue)" }}
          onClick={() => setTargetDetailsOpen((v) => !v)}
        >
          {targetDetailsOpen ? "Скрыть по конвертам ▴" : "Показать по конвертам ▾"}
        </div>
        {targetDetailsOpen && (
          <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--line)" }}>
            {targetInfo.regularEntries
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amt]) => (
                <TargetRow key={cat} label={cat} amt={amt} />
              ))}
            <TargetRow label="База трат — сумма конвертов выше" amt={targetInfo.base} topBorder />
            <TargetRow label={`Взнос в «${state.goal.name}»`} amt={targetInfo.goalContribution} />
            <TargetRow label="Буфер 10%" amt={targetInfo.bufferAmt} />
            <TargetRow label="Итого нужно заработать" amt={targetInfo.target} total />
            {targetInfo.irregularEntries.length > 0 && (
              <>
                <div className="text-xs mt-2 italic" style={{ color: "var(--muted)" }}>
                  Не входят в план (нерегулярные, лимит всё равно действует):
                </div>
                {targetInfo.irregularEntries
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amt]) => (
                    <TargetRow key={cat} label={cat} amt={amt} dim />
                  ))}
              </>
            )}
          </div>
        )}
        {hasIncome && (
          <div
            className="text-[12px] mt-2 font-semibold"
            style={{ color: (week.income as number) + (week.carryIn || 0) - targetInfo.target >= 0 ? "var(--accent-blue)" : "var(--danger)" }}
          >
            {(week.income as number) + (week.carryIn || 0) - targetInfo.target >= 0 ? (
              <>
                <InlineIcon name="check" /> Доход перекрывает цель на {fmt((week.income as number) + (week.carryIn || 0) - targetInfo.target)}
              </>
            ) : (
              <>
                <InlineIcon name="alert" /> Не хватает {fmt(targetInfo.target - ((week.income as number) + (week.carryIn || 0)))} до цели этой недели
              </>
            )}
          </div>
        )}
        {state.goal.log.length > 0 && (
          <div className="mt-2.5">
            {state.goal.log
              .slice(-3)
              .reverse()
              .map((l, i) => {
                const gap = l.actual - l.planned;
                return (
                  <div key={i} className="text-[11.5px] py-1" style={{ color: "var(--muted)", borderBottom: "1px solid var(--line)" }}>
                    {l.weekStart}: план <b style={{ color: "var(--ink)" }}>{fmt(l.planned)}</b>, отложено{" "}
                    <b style={{ color: "var(--ink)" }}>{fmt(l.actual)}</b> ·{" "}
                    {gap >= 0 ? (
                      <span style={{ color: "var(--pos)" }}>+{fmt(gap)} к плану</span>
                    ) : (
                      <span style={{ color: "var(--danger)" }}>−{fmt(-gap)} недолож.</span>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <div className="text-xs uppercase tracking-wide mb-2.5" style={{ color: "var(--muted)" }}>
        Уровни цели по зарплате
      </div>
      <TierGrid tiers={tiers} onNoGoal={() => setGoalModal(true)} />

      <div className="rounded-2xl p-4 mb-5" style={{ background: "var(--hover)", border: "1px solid var(--border)" }}>
        <Tag>Зарплата по неделям · рост</Tag>
        <SalaryChart incomeLog={state.incomeLog} />
      </div>

      <div
        className="text-center text-xs mt-2 cursor-pointer underline"
        style={{ color: "var(--muted)" }}
        onClick={() => setIncomeModal(true)}
      >
        Зафиксировать доход за неделю / изменить цель
      </div>

      <IncomeSetupModal key={incomeModal ? "income-open" : "income-closed"} show={incomeModal} onClose={() => setIncomeModal(false)} state={state} refresh={refresh} showToast={showToast} />
      <GoalEditModal key={goalModal ? "goal-open" : "goal-closed"} show={goalModal} onClose={() => setGoalModal(false)} state={state} refresh={refresh} showToast={showToast} />
      <InfoModal infoKey={infoKey} onClose={() => setInfoKey(null)} />
    </div>
  );
}

function TierGrid({
  tiers,
  onNoGoal,
}: {
  tiers: ReturnType<typeof calcTierCards>;
  onNoGoal: () => void;
}) {
  if (tiers.status === "no-goal") {
    return (
      <div
        className="rounded-2xl p-3 text-center cursor-pointer mb-[22px]"
        style={{ background: "rgba(47,111,237,0.14)", border: "1px solid rgba(47,111,237,0.35)" }}
        onClick={onNoGoal}
      >
        <div className="text-2xl mb-1">🎯</div>
        <div className="text-[10.5px] uppercase tracking-wide font-bold opacity-85">Цель ещё не задана</div>
        <div className="text-[9.5px] opacity-80 mt-1.5">нажми на карточку «Цель» выше, чтобы создать</div>
      </div>
    );
  }
  if (tiers.status === "done") {
    return (
      <div
        className="rounded-2xl p-3 text-center mb-[22px]"
        style={{ background: "linear-gradient(160deg, rgba(199,154,60,0.22), rgba(193,68,60,0.14))", border: "1px solid rgba(199,154,60,0.5)" }}
      >
        <div className="text-2xl mb-1">🏆</div>
        <div className="text-[10.5px] uppercase tracking-wide font-bold opacity-85">Цель уже закрыта!</div>
      </div>
    );
  }
  const styles: Record<string, { bg: string; border: string; color: string }> = {
    min: { bg: "rgba(111,207,123,0.14)", border: "rgba(111,207,123,0.35)", color: "#6FCF7B" },
    mid: { bg: "rgba(47,111,237,0.14)", border: "rgba(47,111,237,0.35)", color: "#5B93F5" },
    hero: { bg: "linear-gradient(160deg, rgba(199,154,60,0.22), rgba(193,68,60,0.14))", border: "rgba(199,154,60,0.5)", color: "#D9A544" },
  };
  return (
    <div className="grid grid-cols-3 gap-2 mb-[22px]">
      {tiers.tiers.map((t) => (
        <div key={t.key} className="rounded-2xl px-2.5 py-3 text-center" style={{ background: styles[t.key].bg, border: `1px solid ${styles[t.key].border}` }}>
          <div className="text-[22px] mb-1">{t.emoji}</div>
          <div className="text-[10.5px] uppercase tracking-wide font-bold opacity-85 mb-1.5">{t.name}</div>
          <div className="font-display font-bold text-[17px] leading-tight mb-1" style={{ color: styles[t.key].color }}>
            {fmt(t.amount)}
          </div>
          <div className="text-[9.5px] opacity-80 leading-tight">{t.sub}</div>
        </div>
      ))}
    </div>
  );
}

function SalaryChart({ incomeLog }: { incomeLog: AppState["incomeLog"] }) {
  const log = incomeLog.slice(-8);
  if (log.length === 0) {
    return <div className="text-[11.5px] mt-1.5" style={{ color: "var(--muted)" }}>Пока нет истории — доход появится здесь после первой фиксации.</div>;
  }
  const max = Math.max(1, ...log.map((w) => w.income));
  let hint: string;
  if (log.length >= 2) {
    const delta = log[log.length - 1].income - log[0].income;
    hint =
      delta >= 0
        ? `С первой записи доход вырос на ${fmt(delta)} (${log[0].startDate} → ${log[log.length - 1].startDate}). Так держать.`
        : `С первой записи доход просел на ${fmt(-delta)}. Есть куда расти к следующей пятнице.`;
  } else {
    hint = "Как накопится хотя бы 2 недели — здесь появится тренд роста.";
  }
  return (
    <>
      <div className="flex items-end gap-2.5" style={{ height: 92, margin: "12px 0 4px" }}>
        {log.map((w, i) => {
          const pct = (w.income / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="font-mono-num" style={{ fontSize: 9 }}>
                {Math.round(w.income / 1000)}к
              </div>
              <div className="w-full rounded-t" style={{ maxWidth: 34, height: `${pct}%`, minHeight: 2, background: "var(--accent-blue)" }} />
              <div className="font-mono-num mt-1" style={{ fontSize: "9.5px", color: "var(--muted)" }}>
                {w.startDate.slice(0, 5)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-[11.5px] mt-1.5" style={{ color: "var(--muted)" }}>
        {hint}
      </div>
    </>
  );
}
