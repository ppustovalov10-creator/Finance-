"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { parseMoneyInput, transactionsInWeek } from "@/lib/calc";
import { toDDMMYYYY, dateToSortable } from "@/lib/date";
import { fmt } from "@/lib/format";
import { weeklyCapsOf } from "@/lib/types";
import type { AppState, Transaction } from "@/lib/types";
import { iconKeyFor } from "@/lib/categories";
import { IconBadge } from "./Icon";
import EnvelopesTab from "./EnvelopesTab";
import type { Refresh, ShowToast } from "./AppShell";

const cardStyle = { background: "var(--hover)", border: "1px solid var(--border)" };

export default function ExpenseTab({ state, refresh, showToast }: { state: AppState; refresh: Refresh; showToast: ShowToast }) {
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState("");
  const weekTransactions = useMemo(() => transactionsInWeek(state.transactions, state.currentWeek.startDate), [state.transactions, state.currentWeek.startDate]);
  const expenses = weekTransactions.filter((transaction) => transaction.amount < 0);
  const spent = expenses.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const caps = weeklyCapsOf(state.envelopes);
  const byCategory = expenses.reduce<Record<string, Transaction[]>>((result, transaction) => {
    (result[transaction.cat] ||= []).push(transaction);
    return result;
  }, {});
  const categories = Object.entries(byCategory).sort(([, left], [, right]) => right.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0) - left.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const value = parseMoneyInput(amount);
    if (value <= 0 || !desc.trim()) return setError("Заполни сумму и назначение");
    try {
      const result = await api.addTransaction({ amount: -value, desc: desc.trim(), dateStr: toDDMMYYYY(new Date()) });
      await refresh();
      setAmount("");
      setDesc("");
      setError("");
      showToast(`Трата добавлена в «${result.cat}»`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить");
    }
  }

  return <main className="max-w-[520px] mx-auto px-4 pb-28 pt-6">
    <header className="mb-5">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--muted)" }}>Деньги · рабочая неделя</p>
      <h1 className="font-display m-0 text-[30px] font-bold leading-none tracking-[-0.045em]">Расходы</h1>
      <p className="mt-2 mb-0 text-sm" style={{ color: "var(--muted)" }}>Неделя с {state.currentWeek.startDate}</p>
    </header>

    <section className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl p-4" style={cardStyle}><span className="block text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>Доход недели</span><b className="font-display mt-1 block text-xl">{state.currentWeek.income == null ? "не задан" : fmt(state.currentWeek.income)}</b></div>
      <div className="rounded-2xl p-4" style={cardStyle}><span className="block text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>Потрачено за неделю</span><b className="font-display mt-1 block text-xl" style={{ color: "var(--danger)" }}>{fmt(-spent)}</b></div>
    </section>

    <form onSubmit={save} className="mt-4 rounded-3xl p-4" style={cardStyle}>
      <div className="flex items-center justify-between"><b className="text-sm">Добавить расход</b><span className="text-[11px]" style={{ color: "var(--muted)" }}>в эту неделю</span></div>
      <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Сколько потрачено<div className="relative mt-1"><input aria-label="Сколько потрачено" inputMode="decimal" placeholder="0" value={amount} onChange={(event) => { setAmount(event.target.value); if (error) setError(""); }} className="block w-full rounded-2xl px-4 py-3 pr-10 text-lg font-bold outline-none" style={{ background: "var(--panel)", border: `1px solid ${error ? "var(--danger)" : "var(--border)"}` }} /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: "var(--muted)" }}>₽</span></div></label>
      {error && <p className="mt-2 mb-0 text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
      <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>На что<input aria-label="На что" placeholder="Например, обед" value={desc} onChange={(event) => { setDesc(event.target.value); if (error) setError(""); }} className="mt-1 block w-full rounded-2xl p-3 outline-none" style={{ background: "var(--panel)", border: "1px solid var(--border)" }} /></label>
      <button className="mt-4 w-full rounded-2xl py-3 text-sm font-bold" style={{ background: "var(--accent-blue)", color: "#fff" }}>Сохранить расход</button>
    </form>

    <section className="mt-7" aria-labelledby="spent-heading">
      <div className="mb-3 flex items-center justify-between"><h2 id="spent-heading" className="m-0 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>На что потрачено</h2><span className="text-xs" style={{ color: "var(--muted)" }}>{expenses.length} трат</span></div>
      <div className="grid gap-2">{categories.length ? categories.map(([category, transactions]) => {
        const categorySpent = transactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
        const cap = caps[category];
        const percent = cap ? Math.min(100, Math.round(categorySpent / cap * 100)) : 0;
        return <div key={category} className="rounded-2xl p-3.5" style={cardStyle}><div className="flex items-center gap-2"><IconBadge name={iconKeyFor(category, state.envelopes)} /><b className="flex-1 text-sm">{category}</b><strong className="font-mono-num text-sm" style={{ color: "var(--danger)" }}>{fmt(-categorySpent)}</strong></div>{cap !== undefined && <><div className="mt-3 flex justify-between text-[11px]" style={{ color: "var(--muted)" }}><span>из {fmt(cap)}</span><span>{percent}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--panel)" }}><div className="h-full rounded-full" style={{ width: `${percent}%`, background: categorySpent > cap ? "var(--danger)" : "var(--accent-blue)" }} /></div></>}<div className="mt-3 space-y-1.5">{transactions.slice().sort((left, right) => dateToSortable(right.date).localeCompare(dateToSortable(left.date))).map((transaction) => <div key={transaction.id} className="flex gap-3 text-xs" style={{ color: "var(--muted)" }}><span className="flex-1 truncate">{transaction.desc}</span><span>{transaction.date}</span><span className="font-mono-num">{fmt(transaction.amount)}</span></div>)}</div></div>;
      }) : <div className="rounded-2xl px-4 py-5 text-sm" style={{ ...cardStyle, color: "var(--muted)" }}>За эту неделю расходов пока нет.</div>}</div>
    </section>

    <section className="mt-8 border-t pt-7" style={{ borderColor: "var(--line)" }}><h2 className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>Конверты недели</h2><p className="mt-0 mb-3 text-xs" style={{ color: "var(--muted)" }}>Лимиты и траты только за период текущей недели.</p><EnvelopesTab state={state} refresh={refresh} showToast={showToast} /></section>
  </main>;
}
