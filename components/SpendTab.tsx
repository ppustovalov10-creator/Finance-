"use client";

import { useState } from "react";
import type { AppState, Transaction } from "@/lib/types";
import { weeklyCapsOf } from "@/lib/types";
import { addDays, daysUntil } from "@/lib/date";
import { fmt } from "@/lib/format";
import { calcWeeklyTarget, calcDayBreakdown, categoryTotalsThisWeek, spentSince, committedThisWeek } from "@/lib/calc";
import { iconKeyFor } from "@/lib/categories";
import { IconBadge, InlineIcon } from "./Icon";
import { AddTxModal, EditTxModal, ReportModal } from "./HomeModals";
import { Card, Tag } from "./HomeCardBits";
import type { Refresh, ShowToast } from "./AppShell";

// Everything related to spending — how much is left today, what's gone out,
// the day-by-day pace, and adding a transaction. Конверты (envelope limits)
// is rendered right after this by the parent, unchanged, since it's the
// other half of the same "spending" side of the app.
export default function SpendTab({ state, refresh, showToast }: { state: AppState; refresh: Refresh; showToast: ShowToast }) {
  const now = new Date();
  const week = state.currentWeek;
  const nextFriday = addDays(week.startDate, 7);
  const daysLeft = daysUntil(nextFriday, now);
  const spent = spentSince(state.transactions, week.startDate);
  const committed = committedThisWeek(state);
  const caps = weeklyCapsOf(state.envelopes);

  const targetInfo = calcWeeklyTarget(state);
  const dayBreakdownBase = week.income == null ? Object.values(caps).reduce((a, b) => a + b, 0) : targetInfo.base;
  const days = calcDayBreakdown(state, dayBreakdownBase, now);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [addTxDate, setAddTxDate] = useState<string | null>(null);
  const [addTxOpen, setAddTxOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  const hasIncome = week.income != null;
  const remaining = hasIncome ? (week.income as number) + (week.carryIn || 0) - spent - committed.total : 0;
  const perDay = hasIncome ? (daysLeft > 0 ? remaining / daysLeft : remaining) : 0;

  const byCat = categoryTotalsThisWeek(state);
  const allCats = new Set<string>([...Object.keys(byCat), ...Object.keys(caps)]);
  const catList = [...allCats].map((cat) => [cat, byCat[cat] || 0] as [string, number]).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...catList.map((c) => c[1]), ...Object.values(caps));

  return (
    <div className="max-w-[420px] mx-auto px-5 pt-6 pb-[100px]">
      <div className="text-[11px] tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>
        Можно потратить сегодня
      </div>
      <div className="mb-[34px]">
        <div
          className="font-display font-bold leading-none"
          style={{ fontSize: "clamp(48px,15vw,68px)", letterSpacing: "-0.02em", color: hasIncome && perDay < 0 ? "var(--danger)" : "var(--ink)" }}
        >
          {hasIncome ? fmt(perDay) : "?"}
        </div>
        <div className="text-[13px] mt-2" style={{ color: "var(--muted)" }}>
          {hasIncome
            ? `${fmt(week.income as number)} дохода${week.carryIn ? ` ${week.carryIn > 0 ? "+" : "−"} ${fmt(Math.abs(week.carryIn))} остаток` : ""} − ${fmt(spent)} трат${committed.total > 0 ? ` − ${fmt(committed.total)} взносы (цель+подушка)` : ""} = ${fmt(remaining)}, ÷ ${daysLeft} дн. до ${nextFriday}`
            : `Ещё не знаю твой доход с ${week.startDate} — зафиксируй его на вкладке «Доход/Касса».`}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Card>
          <Tag>Потрачено с {week.startDate}</Tag>
          <div className="font-display font-semibold text-[26px]">{fmt(-spent)}</div>
        </Card>
        <Card>
          <Tag>До след. пятницы</Tag>
          <div className="font-display font-semibold text-[26px]">
            {daysLeft} <small className="text-sm">дн.</small>
          </div>
          {hasIncome && (
            <div className="text-[11.5px] mt-1 font-semibold" style={{ color: remaining < 0 ? "var(--danger)" : "var(--pos)" }}>
              {fmt(remaining)} баланс
            </div>
          )}
        </Card>
      </div>

      <div
        className="text-center text-[12.5px] py-2.5 cursor-pointer select-none"
        style={{ color: "var(--muted)" }}
        onClick={() => setDetailsOpen((v) => !v)}
      >
        {detailsOpen ? "Скрыть траты недели ▴" : "Показать траты этой недели по категориям ▾"}
      </div>
      {detailsOpen && (
        <div className="mb-2">
          {catList.map(([cat, amt]) => {
            const cap = caps[cat];
            const over = cap !== undefined && amt > cap;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2.5 py-2" style={{ borderBottom: "1px solid var(--line)", fontSize: "13.5px" }}>
                  <IconBadge name={iconKeyFor(cat, state.envelopes)} />
                  <div className="flex-1">{cat}</div>
                  <div className="font-display font-semibold" style={{ color: over ? "var(--danger)" : "var(--muted)" }}>
                    {fmt(amt)}
                    {cap !== undefined ? ` / лимит ${fmt(cap)}` : ""}
                  </div>
                </div>
                <div className="h-1 rounded-full mt-1.5" style={{ background: "var(--line)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, (amt / maxCat) * 100)}%`, opacity: 0.5, background: over ? "var(--danger)" : "var(--accent-blue)" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-xs uppercase tracking-wide mt-6 mb-2.5" style={{ color: "var(--muted)" }}>
        По дням этой недели
      </div>
      <div id="dayBreakdown">
        {days.map((d) => (
          <div key={d.dateStr} className="mb-4">
            <div className="flex justify-between items-baseline pb-1">
              <div className="font-display font-semibold text-[14.5px]" style={{ color: d.isToday ? "var(--accent-blue)" : "var(--ink)" }}>
                {d.dow}, {d.dateStr}
                {d.isToday ? " · сегодня" : ""}
              </div>
              <div className="flex items-center">
                <div className="font-mono-num text-[13px]" style={{ color: "var(--muted)" }}>
                  {d.dayTotal > 0 ? fmt(-d.dayTotal) : "—"}
                </div>
                <button
                  onClick={() => {
                    setAddTxDate(d.dateStr);
                    setAddTxOpen(true);
                  }}
                  className="w-[22px] h-[22px] rounded-full border-none text-sm leading-none cursor-pointer inline-flex items-center justify-center ml-2 shrink-0"
                  style={{ background: "var(--hover)", color: "var(--ink)" }}
                  title="Добавить трату на этот день"
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
            {!d.isFuture &&
              (d.dayTx.length === 0 ? (
                <div className="text-[11.5px] py-1" style={{ color: "var(--muted)" }}>
                  Трат нет
                </div>
              ) : (
                d.dayTx.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setEditTx(t)}
                    className="flex justify-between py-1.5 cursor-pointer"
                    style={{ borderBottom: "1px solid var(--line)", fontSize: "12.5px" }}
                  >
                    <span>
                      <IconBadge name={iconKeyFor(t.cat, state.envelopes)} small /> {t.desc}
                    </span>
                    <span className="font-display" style={{ color: "var(--danger)" }}>
                      {fmt(t.amount)} <InlineIcon name="pencil" />
                    </span>
                  </div>
                ))
              ))}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setReportModal(true)}
        className="block w-full text-center mt-2.5 mb-0 py-2.5 rounded-full font-bold text-[12.5px] cursor-pointer"
        style={{ border: "1.5px solid var(--accent-blue)", background: "none", color: "var(--accent-blue)" }}
      >
        📋 Скопировать отчёт для чата / Google Диска
      </button>

      <button
        onClick={() => {
          setAddTxDate(null);
          setAddTxOpen(true);
        }}
        className="fixed bottom-[26px] left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-none text-[28px] cursor-pointer flex items-center justify-center z-20"
        style={{ background: "var(--ink)", color: "var(--bg)", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}
      >
        +
      </button>

      <ReportModal show={reportModal} onClose={() => setReportModal(false)} state={state} refresh={refresh} showToast={showToast} />
      <AddTxModal
        key={addTxOpen ? `add-open-${addTxDate || "today"}` : "add-closed"}
        show={addTxOpen}
        onClose={() => setAddTxOpen(false)}
        state={state}
        refresh={refresh}
        showToast={showToast}
        dateOverride={addTxDate}
      />
      <EditTxModal key={editTx?.id || "edit-closed"} show={!!editTx} onClose={() => setEditTx(null)} state={state} refresh={refresh} showToast={showToast} tx={editTx} />
    </div>
  );
}
