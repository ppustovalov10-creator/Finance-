"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { KassaState, KassaEntry } from "@/lib/kassa";
import { calcKassaDayBreakdown, progressForTarget } from "@/lib/kassa";
import { fmt } from "@/lib/format";
import type { AppState } from "@/lib/types";
import { KassaTargetForm } from "./KassaTargetForm";
import { KassaEntryModal } from "./KassaEntryModal";
import { Sheet, SheetTitle } from "./Sheet";
import type { ShowToast } from "./AppShell";

export default function KassaTab({ showToast, budgetState }: { showToast: ShowToast; budgetState: AppState | null }) {
  const [state, setState] = useState<KassaState | null>(null);
  const [editTargetOpen, setEditTargetOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryModalDate, setEntryModalDate] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<KassaEntry | null>(null);

  const refresh = useCallback(async () => {
    const s = await api.getKassaState();
    setState(s);
    return s;
  }, []);

  useEffect(() => {
    // Initial fetch on mount — setState happens only after the await resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (!state) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center" style={{ color: "var(--muted)" }}>
        Загрузка…
      </div>
    );
  }

  if (!state.target) {
    return (
      <div className="max-w-[420px] mx-auto px-5 pt-6 pb-[100px]">
        <h1 className="font-display font-bold text-2xl mb-1">Касса</h1>
        <div className="text-[12.5px] mb-5" style={{ color: "var(--muted)" }}>
          Личная цель по кассе на неделю — не связана с бюджетными вкладками.
        </div>
        <div className="rounded-2xl p-4" style={{ background: "var(--hover)", border: "1px solid var(--border)" }}>
          <KassaTargetForm budgetState={budgetState} onSaved={refresh} />
        </div>
      </div>
    );
  }

  const target = state.target;
  const progress = progressForTarget(target, state.entries);
  const hasKassaGoal = target.requiredKassa > 0;
  const over = hasKassaGoal && progress.totalEntered > target.requiredKassa;
  const days = calcKassaDayBreakdown(state.weekStartDate, state.entries, target.requiredKassa);
  const todayInfo = days.find((d) => d.isToday) ?? days.find((d) => d.isFuture) ?? days[days.length - 1];
  const liveDailyTarget = todayInfo ? todayInfo.dayTarget : progress.dailyTarget;

  return (
    <div className="max-w-[420px] mx-auto px-5 pt-6 pb-[100px]">
      <h1 className="font-display font-bold text-2xl mb-1">Касса</h1>
      <div className="text-[12.5px] mb-5" style={{ color: "var(--muted)" }}>
        Неделя с {state.weekStartDate}
      </div>

      {hasKassaGoal ? (
        (() => {
          const dayEntered = todayInfo?.dayTotal ?? 0;
          const dayDone = liveDailyTarget > 0 ? dayEntered >= liveDailyTarget : dayEntered > 0;
          return (
            <div className="mb-5">
              <div className="text-[11px] tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>
                Касса дня
              </div>
              <div className="font-display font-bold leading-none mb-5" style={{ fontSize: "clamp(32px,9vw,42px)" }}>
                <span style={{ color: dayDone ? "var(--pos)" : "var(--ink)" }}>{fmt(dayEntered)}</span>
                <span style={{ color: "var(--muted)" }}> / {fmt(liveDailyTarget)}</span>
              </div>
              <div className="text-[11px] tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>
                Касса недели
              </div>
              <div className="font-display font-semibold leading-none" style={{ fontSize: "clamp(20px,6vw,26px)" }}>
                {fmt(progress.totalEntered)} / {fmt(target.requiredKassa)}
              </div>
            </div>
          );
        })()
      ) : (
        <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--hover)", border: "1px solid var(--border)" }}>
          <div className="text-[13px]" style={{ color: "var(--muted)" }}>
            Оклад и бонусы уже покрывают цель — кассу можно не делать.
          </div>
        </div>
      )}

      {hasKassaGoal && (
        <>
          <div className="grid grid-cols-5 gap-1.5 mb-5">
            {days.map((d) => {
              // Fill height is capped at 100% so the square never overflows,
              // but the displayed number keeps going past it on overshoot.
              const rawPct = d.dayTarget > 0 ? (d.dayTotal / d.dayTarget) * 100 : d.dayTotal > 0 ? 100 : 0;
              const fillPct = Math.min(100, rawPct);
              const dayDone = rawPct >= 100;
              return (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => {
                    setEntryModalDate(d.dateStr);
                    setEditEntry(null);
                    setEntryModalOpen(true);
                  }}
                  className="relative rounded-xl overflow-hidden cursor-pointer flex flex-col items-center justify-end"
                  style={{
                    height: 80,
                    border: d.isToday ? "1.5px solid var(--accent-blue)" : "1px solid var(--border)",
                    background: "var(--hover)",
                  }}
                >
                  <div
                    className="absolute inset-x-0 bottom-0"
                    style={{
                      height: `${fillPct}%`,
                      background: dayDone ? "var(--pos)" : "var(--accent-blue)",
                      opacity: 0.3,
                      transition: "height .3s ease",
                    }}
                  />
                  <div className="relative z-10 text-center pb-1.5 px-0.5">
                    <div style={{ fontSize: 9.5, color: "var(--muted)" }}>{d.dow}</div>
                    <div className="font-display font-bold" style={{ fontSize: 12, color: dayDone ? "var(--pos)" : "var(--ink)" }}>
                      {rawPct.toFixed(0)}%
                    </div>
                    <div style={{ fontSize: 8.5, color: dayDone ? "var(--pos)" : "var(--muted)", marginTop: 1 }}>
                      {d.dayTotal > 0
                        ? Math.round(d.dayTotal).toLocaleString("ru-RU")
                        : Math.round(d.dayTarget).toLocaleString("ru-RU")}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>
            Выполнение кассы
          </div>
          <div className="mb-2">
            <div
              className="font-display font-bold leading-none"
              style={{ fontSize: "clamp(40px,13vw,56px)", color: over ? "var(--pos)" : "var(--ink)" }}
            >
              {progress.kassaPct.toFixed(0)}%
            </div>
          </div>
          <div className="h-2.5 rounded-full mb-1.5 overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, progress.kassaPct)}%`,
                background: over ? "var(--pos)" : "var(--accent-blue)",
              }}
            />
          </div>
          {over && (
            <div className="text-[12.5px] font-semibold mb-4" style={{ color: "var(--pos)" }}>
              Касса перевыполнена на {fmt(progress.totalEntered - target.requiredKassa)}
            </div>
          )}
          {!over && <div className="mb-4" />}

          <div className="rounded-2xl p-3.5 mb-5" style={{ background: "var(--hover)", border: "1px solid var(--border)" }}>
            <div className="flex justify-between items-baseline mb-1.5">
              <div className="text-[11px] tracking-wide uppercase" style={{ color: "var(--muted)" }}>
                Прогресс к зарплате
              </div>
              <div className="font-display font-semibold text-[15px]">{progress.salaryPct.toFixed(0)}%</div>
            </div>
            <div className="h-1.5 rounded-full mb-1.5 overflow-hidden" style={{ background: "var(--border)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, progress.salaryPct)}%`, background: "var(--accent, #6FCF7B)" }}
              />
            </div>
            <div className="text-[11.5px]" style={{ color: "var(--muted)" }}>
              Сейчас вышло бы ~{fmt(progress.currentSalary)} из {fmt(target.targetSalary)}
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setEditTargetOpen(true)}
        className="block w-full text-center mb-6 py-2.5 rounded-full font-bold text-[12.5px] cursor-pointer"
        style={{ border: "1.5px solid var(--accent-blue)", background: "none", color: "var(--accent-blue)" }}
      >
        Изменить цель
      </button>

      <div className="text-xs uppercase tracking-wide mb-2.5" style={{ color: "var(--muted)" }}>
        По дням этой недели
      </div>
      <div>
        {days.map((d) => (
          <div key={d.dateStr} className="mb-4">
            <div className="flex justify-between items-baseline pb-1">
              <div className="font-display font-semibold text-[14.5px]" style={{ color: d.isToday ? "var(--accent-blue)" : "var(--ink)" }}>
                {d.dow}, {d.dateStr}
                {d.isToday ? " · сегодня" : ""}
              </div>
              <div className="flex items-center">
                <div className="font-mono-num text-[13px]" style={{ color: "var(--muted)" }}>
                  {d.dayTotal > 0 ? fmt(d.dayTotal) : "—"}
                </div>
                <button
                  onClick={() => {
                    setEntryModalDate(d.dateStr);
                    setEditEntry(null);
                    setEntryModalOpen(true);
                  }}
                  className="w-[22px] h-[22px] rounded-full border-none text-sm leading-none cursor-pointer inline-flex items-center justify-center ml-2 shrink-0"
                  style={{ background: "var(--hover)", color: "var(--ink)" }}
                  title="Внести кассу за этот день"
                >
                  +
                </button>
              </div>
            </div>
            {d.comment && (
              <div
                className="text-[11.5px] px-2.5 py-2 rounded-lg my-1"
                style={{
                  background: "var(--hover)",
                  color: d.commentClass === "warn" ? "var(--danger)" : d.commentClass === "ok" ? "var(--pos)" : "var(--muted)",
                }}
              >
                {d.comment}
              </div>
            )}
            {d.dayEntries.length === 0 ? (
              !d.isFuture && (
                <div className="text-[11.5px] py-1" style={{ color: "var(--muted)" }}>
                  Касса не внесена
                </div>
              )
            ) : (
              d.dayEntries.map((e) => (
                <div
                  key={e.id}
                  onClick={() => {
                    setEditEntry(e);
                    setEntryModalOpen(true);
                  }}
                  className="flex justify-between py-1.5 cursor-pointer"
                  style={{ borderBottom: "1px solid var(--line)", fontSize: "12.5px" }}
                >
                  <span>Касса</span>
                  <span className="font-display" style={{ color: "var(--pos)" }}>
                    {fmt(e.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          setEntryModalDate(null);
          setEditEntry(null);
          setEntryModalOpen(true);
        }}
        className="fixed bottom-[26px] left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-none text-[28px] cursor-pointer flex items-center justify-center z-20"
        style={{ background: "var(--ink)", color: "var(--bg)", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}
      >
        +
      </button>

      <Sheet show={editTargetOpen} onClose={() => setEditTargetOpen(false)}>
        <SheetTitle>Изменить цель</SheetTitle>
        <div className="mt-2">
          <KassaTargetForm
            key={editTargetOpen ? "open" : "closed"}
            budgetState={budgetState}
            initial={{
              targetSalary: target.targetSalary,
              failedPlan: target.failedPlan,
              opsTotal: target.opsTotal,
              opsPlan: target.opsPlan,
              mgrTotal: target.mgrTotal,
              mgrPlan: target.mgrPlan,
            }}
            onSaved={async () => {
              await refresh();
              setEditTargetOpen(false);
              showToast("Цель на неделю обновлена");
            }}
            onCancel={() => setEditTargetOpen(false)}
          />
        </div>
      </Sheet>

      <KassaEntryModal
        key={editEntry?.id || (entryModalOpen ? `add-${entryModalDate || "today"}` : "closed")}
        show={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        onSaved={refresh}
        entry={editEntry}
        defaultDate={entryModalDate}
      />
    </div>
  );
}
