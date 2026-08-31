"use client";

import { useState } from "react";
import type { AppState, Transaction } from "@/lib/types";
import { weeklyCapsOf } from "@/lib/types";
import { addDays, daysUntil, DOW_FULL } from "@/lib/date";
import { fmt } from "@/lib/format";
import { calcWeeklyTarget, calcTierCards, calcDayBreakdown, categoryTotalsThisWeek, spentSince } from "@/lib/calc";
import { iconKeyFor } from "@/lib/categories";
import { IconBadge, InlineIcon } from "./Icon";
import InfoModal from "./InfoModal";
import {
  IncomeSetupModal,
  GoalEditModal,
  FloorEditModal,
  ReserveEditModal,
  AddTxModal,
  EditTxModal,
  ReportModal,
} from "./HomeModals";
import type { Refresh, ShowToast } from "./AppShell";
import { api } from "@/lib/api-client";

export default function HomeTab({ state, refresh, showToast }: { state: AppState; refresh: Refresh; showToast: ShowToast }) {
  const now = new Date();
  const week = state.currentWeek;
  const nextFriday = addDays(week.startDate, 7);
  const daysLeft = daysUntil(nextFriday, now);
  const spent = spentSince(state.transactions, week.startDate);
  const caps = weeklyCapsOf(state.envelopes);

  const targetInfo = calcWeeklyTarget(state);
  const dayBreakdownBase = week.income == null ? Object.values(caps).reduce((a, b) => a + b, 0) : targetInfo.base;
  const days = calcDayBreakdown(state, dayBreakdownBase, now);
  const tiers = calcTierCards(
    targetInfo.base,
    targetInfo.goalLeft,
    targetInfo.weeks,
    targetInfo.goalContribution,
    state.goal.deadlineDate,
    state.goal.target > 0
  );

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [targetDetailsOpen, setTargetDetailsOpen] = useState(false);
  const [infoKey, setInfoKey] = useState<string | null>(null);
  const [incomeModal, setIncomeModal] = useState(false);
  const [goalModal, setGoalModal] = useState(false);
  const [floorModal, setFloorModal] = useState(false);
  const [reserveModal, setReserveModal] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [addTxDate, setAddTxDate] = useState<string | null>(null);
  const [addTxOpen, setAddTxOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [survivalBusy, setSurvivalBusy] = useState(false);

  async function toggleSurvival() {
    setSurvivalBusy(true);
    try {
      await api.setSurvival(!state.survivalMode);
      await refresh();
    } finally {
      setSurvivalBusy(false);
    }
  }

  const hasIncome = week.income != null;
  const remaining = hasIncome ? (week.income as number) + (week.carryIn || 0) - spent : 0;
  const perDay = hasIncome ? (daysLeft > 0 ? remaining / daysLeft : remaining) : 0;

  const byCat = categoryTotalsThisWeek(state);
  const allCats = new Set<string>([...Object.keys(byCat), ...Object.keys(caps)]);
  const catList = [...allCats].map((cat) => [cat, byCat[cat] || 0] as [string, number]).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...catList.map((c) => c[1]), ...Object.values(caps));

  const suggestedFloorVal = state.incomeFloor;
  const floorDisplay =
    state.incomeFloor != null
      ? { text: fmt(state.incomeFloor), sub: "реалистичный минимум недели" }
      : state.incomeLog.length > 0
        ? { text: fmt(Math.min(...state.incomeLog.map((w) => w.income))), sub: "предложение от истории — нажми, чтобы подтвердить" }
        : { text: "—", sub: "нужно 2+ недели истории или впиши вручную" };

  return (
    <div className="max-w-[420px] mx-auto px-5 pt-6 pb-[100px]">
      <div className="mb-[22px]">
        <div className="font-display font-bold text-2xl leading-tight" style={{ letterSpacing: "-0.01em" }}>
          {DOW_FULL[(now.getDay() + 6) % 7]}
        </div>
        <div className="text-xs mt-1 uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          {`${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`}
        </div>
      </div>

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
            ? `${fmt(week.income as number)} дохода${week.carryIn ? ` ${week.carryIn > 0 ? "+" : "−"} ${fmt(Math.abs(week.carryIn))} остаток` : ""} − ${fmt(spent)} трат = ${fmt(remaining)}, ÷ ${daysLeft} дн. до ${nextFriday}`
            : `Ещё не знаю твой доход с ${week.startDate} — нажми «Зафиксировать доход» ниже.`}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-[30px]">
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
        <Card
          onClick={() => document.getElementById("dayBreakdown")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          <Tag>Потрачено с {week.startDate}</Tag>
          <div className="font-display font-semibold text-[26px]">{fmt(-spent)}</div>
        </Card>
      </div>

      {state.survivalMode && (
        <div
          className="rounded-xl px-3.5 py-3 text-[12.5px] font-semibold mb-4"
          style={{ background: "rgba(232,115,95,0.15)", border: "1px solid var(--danger)", color: "var(--danger)" }}
        >
          Режим выживания включён: не-обязательные конверты обнулены. Оставлены только еда, транспорт, жильё.
          Доход-пол: {suggestedFloorVal != null ? fmt(suggestedFloorVal) : floorDisplay.text}.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Card onClick={() => setFloorModal(true)}>
          <Tag>
            Доход-пол{" "}
            <InfoBtn
              onClick={(e) => {
                e.stopPropagation();
                setInfoKey("floor");
              }}
            />
          </Tag>
          <div className="font-display font-semibold text-[22px]">{floorDisplay.text}</div>
          <div className="text-[11.5px] mt-1" style={{ color: "var(--muted)" }}>
            {floorDisplay.sub}
          </div>
          <button
            type="button"
            disabled={survivalBusy}
            onClick={(e) => {
              e.stopPropagation();
              toggleSurvival();
            }}
            className="mt-2.5 w-full py-2 rounded-[10px] font-bold text-[11.5px] cursor-pointer"
            style={{
              border: `1.5px solid ${state.survivalMode ? "var(--danger)" : "var(--border)"}`,
              background: state.survivalMode ? "var(--danger)" : "none",
              color: state.survivalMode ? "#fff" : "var(--muted)",
            }}
          >
            {state.survivalMode ? "Выключить режим выживания" : "Режим выживания"}
          </button>
        </Card>
        <Card onClick={() => setReserveModal(true)}>
          <Tag>
            Подушка безопасности{" "}
            <InfoBtn
              onClick={(e) => {
                e.stopPropagation();
                setInfoKey("reserve");
              }}
            />
          </Tag>
          <div className="font-display font-semibold text-[22px]">{fmt(state.reserve.saved)}</div>
          <div className="text-[11.5px] mt-1" style={{ color: "var(--muted)" }}>
            {(state.reserve.pct * 100).toFixed(0)}% с каждого дохода — авто
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
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
          Нужно заработать на след. неделю{" "}
          <InfoBtn
            onClick={() => setInfoKey("target")}
          />
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
      <div
        className="text-center text-xs mt-[30px] cursor-pointer underline"
        style={{ color: "var(--muted)" }}
        onClick={() => setIncomeModal(true)}
      >
        Зафиксировать доход за неделю / изменить цель
      </div>

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

      <IncomeSetupModal key={incomeModal ? "income-open" : "income-closed"} show={incomeModal} onClose={() => setIncomeModal(false)} state={state} refresh={refresh} showToast={showToast} />
      <GoalEditModal key={goalModal ? "goal-open" : "goal-closed"} show={goalModal} onClose={() => setGoalModal(false)} state={state} refresh={refresh} showToast={showToast} />
      <FloorEditModal key={floorModal ? "floor-open" : "floor-closed"} show={floorModal} onClose={() => setFloorModal(false)} state={state} refresh={refresh} showToast={showToast} />
      <ReserveEditModal key={reserveModal ? "reserve-open" : "reserve-closed"} show={reserveModal} onClose={() => setReserveModal(false)} state={state} refresh={refresh} showToast={showToast} />
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
      <InfoModal infoKey={infoKey} onClose={() => setInfoKey(null)} />
    </div>
  );
}

function Card({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-4 relative"
      style={{ background: "var(--hover)", border: "1px solid var(--border)", cursor: onClick ? "pointer" : "default" }}
    >
      {children}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] tracking-wide uppercase mb-1.5" style={{ color: "var(--muted)" }}>
      {children}
    </div>
  );
}

function InfoBtn({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center w-[15px] h-[15px] rounded-full text-[9.5px] leading-none cursor-pointer align-middle"
      style={{ border: "1px solid var(--muted)", background: "none", color: "var(--muted)", padding: 0 }}
    >
      ?
    </button>
  );
}

function TargetRow({ label, amt, total, dim, topBorder }: { label: string; amt: number; total?: boolean; dim?: boolean; topBorder?: boolean }) {
  return (
    <div
      className="flex justify-between text-xs py-1"
      style={{
        color: total ? "var(--ink)" : "var(--muted)",
        fontWeight: total ? 700 : 400,
        borderTop: total || topBorder ? "1px solid var(--line)" : "none",
        marginTop: total || topBorder ? 4 : 0,
        paddingTop: total || topBorder ? 6 : 4,
        opacity: dim ? 0.6 : 1,
      }}
    >
      <span>{label}</span>
      <span className="font-mono-num">{fmt(amt)}</span>
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
