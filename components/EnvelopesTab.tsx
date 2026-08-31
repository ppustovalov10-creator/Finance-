"use client";

import { useState } from "react";
import type { AppState, Transaction } from "@/lib/types";
import { weeklyCapsOf, irregularCategoriesOf } from "@/lib/types";
import { fmt } from "@/lib/format";
import { dateToSortable } from "@/lib/date";
import { envelopeCategoriesForView } from "@/lib/calc";
import { iconKeyFor } from "@/lib/categories";
import { IconBadge } from "./Icon";
import { EnvNewModal, EnvEditModal, RulesModal } from "./EnvelopeModals";
import { EditTxModal } from "./HomeModals";
import { api } from "@/lib/api-client";
import type { Refresh, ShowToast } from "./AppShell";

export default function EnvelopesTab({ state, refresh, showToast }: { state: AppState; refresh: Refresh; showToast: ShowToast }) {
  const week = state.currentWeek;
  const weekStartSortable = dateToSortable(week.startDate);
  const thisWeekTx = state.transactions.filter((t) => dateToSortable(t.date) >= weekStartSortable);
  const totalSpent = thisWeekTx.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const caps = weeklyCapsOf(state.envelopes);
  const irregular = irregularCategoriesOf(state.envelopes);

  const byCat: Record<string, Transaction[]> = {};
  thisWeekTx.forEach((t) => {
    if (t.amount < 0) {
      if (!byCat[t.cat]) byCat[t.cat] = [];
      byCat[t.cat].push(t);
    }
  });

  const allCats = envelopeCategoriesForView(state);

  const [newModal, setNewModal] = useState(false);
  const [editCat, setEditCat] = useState<string | null>(null);
  const [rulesModal, setRulesModal] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [recalcBusy, setRecalcBusy] = useState(false);

  async function recalc() {
    if (!week.income) {
      setFeedback({ text: "Сначала зафиксируй доход за неделю на вкладке «Главное» — не от чего считать проценты", ok: false });
      return;
    }
    setRecalcBusy(true);
    try {
      await api.recalcCaps();
      await refresh();
      setFeedback({ text: `Лимиты пересчитаны от дохода ${fmt(week.income)}.`, ok: true });
    } catch (e) {
      setFeedback({ text: e instanceof Error ? e.message : "Не удалось пересчитать", ok: false });
    } finally {
      setRecalcBusy(false);
    }
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 pt-5 pb-[60px] text-[13.5px]">
      <h1 className="font-display font-bold text-[22px] mb-1">Конверты</h1>
      <div className="text-[12.5px] mb-[18px]" style={{ color: "var(--muted)" }}>
        Неделя с {week.startDate} · потрачено {fmt(-totalSpent)}
      </div>
      <button
        type="button"
        disabled={recalcBusy}
        onClick={recalc}
        className="inline-block mr-2 mb-4 px-4 py-2 rounded-full font-bold text-[12.5px] cursor-pointer"
        style={{ border: "1.5px solid var(--accent-blue)", background: "none", color: "var(--accent-blue)" }}
      >
        Пересчитать лимиты от дохода (% от зарплаты)
      </button>
      <button
        type="button"
        onClick={() => setRulesModal(true)}
        className="inline-block mb-4 px-4 py-2 rounded-full font-bold text-[12.5px] cursor-pointer"
        style={{ border: "1.5px solid var(--accent-blue)", background: "none", color: "var(--accent-blue)" }}
      >
        🏷 Правила распознавания
      </button>
      {feedback && (
        <div className="text-[12.5px] mb-3.5" style={{ color: feedback.ok ? "var(--pos)" : "var(--danger)" }}>
          {feedback.text}
        </div>
      )}

      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))" }}>
        {allCats.map((cat) => {
          const txs = (byCat[cat] || []).slice().sort((a, b) => dateToSortable(b.date).localeCompare(dateToSortable(a.date)));
          const spent = txs.reduce((s, t) => s + Math.abs(t.amount), 0);
          const cap = caps[cat];
          const pct = cap ? Math.min(100, (spent / cap) * 100) : 0;
          const over = cap !== undefined && spent > cap;
          return (
            <div key={cat} className="rounded-2xl p-4" style={{ background: "var(--hover)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <IconBadge name={iconKeyFor(cat, state.envelopes)} />
                <div className="font-display font-semibold text-[15px] flex-1">
                  {cat}
                  {irregular.includes(cat) && (
                    <span
                      className="inline-block ml-1.5 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded align-middle"
                      style={{ color: "var(--muted)", background: "var(--border)" }}
                    >
                      нерегулярный
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEditCat(cat)}
                  className="bg-transparent border-none cursor-pointer p-1 rounded"
                  style={{ color: "var(--muted)" }}
                  title="Изменить лимит"
                >
                  ✎
                </button>
              </div>
              <div className="font-display font-semibold text-[22px] mb-1.5" style={{ color: over ? "var(--danger)" : "var(--ink)" }}>
                {fmt(-spent)}
                {cap !== undefined && (
                  <span className="text-[11px] font-normal ml-1" style={{ color: "var(--muted)" }}>
                    из {fmt(cap)}
                  </span>
                )}
              </div>
              {cap !== undefined && (
                <div className="h-[5px] rounded-full mb-2.5 overflow-hidden" style={{ background: "var(--border)" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: over ? "var(--danger)" : "var(--accent-blue)" }} />
                </div>
              )}
              <div className="max-h-[170px] overflow-y-auto">
                {txs.length === 0 ? (
                  <div className="text-[11.5px] py-1.5" style={{ color: "var(--muted)" }}>
                    Пока пусто
                  </div>
                ) : (
                  txs.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setEditTx(t)}
                      className="grid gap-2 py-1.5 items-center cursor-pointer"
                      style={{ gridTemplateColumns: "1fr auto auto", borderTop: "1px solid var(--border)", fontSize: 12 }}
                    >
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{t.desc}</span>
                      <span className="whitespace-nowrap text-[10.5px]" style={{ color: "var(--muted)" }}>
                        {t.date}
                      </span>
                      <span className="font-mono-num whitespace-nowrap" style={{ color: "var(--danger)" }}>
                        {fmt(t.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setNewModal(true)}
          className="rounded-2xl min-h-[110px] flex items-center justify-center font-bold text-[13.5px] cursor-pointer bg-transparent"
          style={{ border: "2px dashed var(--border)", color: "var(--muted)" }}
        >
          + Новый конверт
        </button>
      </div>

      <EnvNewModal key={newModal ? "new-open" : "new-closed"} show={newModal} onClose={() => setNewModal(false)} state={state} refresh={refresh} showToast={showToast} />
      <EnvEditModal key={`env-${editCat || "closed"}`} show={!!editCat} onClose={() => setEditCat(null)} state={state} refresh={refresh} showToast={showToast} category={editCat} />
      <RulesModal show={rulesModal} onClose={() => setRulesModal(false)} state={state} refresh={refresh} showToast={showToast} />
      <EditTxModal key={`tx-${editTx?.id || "closed"}`} show={!!editTx} onClose={() => setEditTx(null)} state={state} refresh={refresh} showToast={showToast} tx={editTx} />
    </div>
  );
}
