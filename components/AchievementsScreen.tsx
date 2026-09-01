"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { AchievementDef } from "@/lib/achievements-data";

interface Overview {
  achievements: AchievementDef[];
  unlockedCount: number;
  totalCount: number;
  unlocked: Record<string, string>;
  pathProgress: Record<string, number>;
  kassaMetInWindow: number;
  goalsClosedInWindow: number;
}

const PATHS: { name: string; progressKey: string; unit: (v: number) => string }[] = [
  { name: "Без права на слабину", progressKey: "discipline", unit: (v) => `${Math.floor(v)} нед. подряд` },
  { name: "Касса не ждёт", progressKey: "kassa_streak", unit: (v) => `${Math.floor(v)} нед. подряд` },
  { name: "Деньги любят наглых", progressKey: "income_growth", unit: (v) => `+${v.toFixed(0)}%` },
  { name: "Меня не сломать", progressKey: "reserve_cushion", unit: (v) => `${v.toFixed(1)} нед. дохода` },
  { name: "Коллекционирую победы", progressKey: "goals_closed", unit: (v) => `${Math.floor(v)} целей` },
];

const SITUATIONAL_GROUPS: { title: string; keys: string[] }[] = [
  { title: "Касса", keys: ["kassa_bullseye", "kassa_explosion", "kassa_volcano", "kassa_bounce", "kassa_no_gaps"] },
  { title: "Цели", keys: ["goal_first_seed", "goal_first_finish", "goal_beat_deadline", "goal_rollercoaster"] },
  { title: "Бюджетная дисциплина", keys: ["budget_cold_head", "budget_caught_myself", "budget_own_system"] },
  { title: "Подушка", keys: ["reserve_first_egg", "reserve_purposeful"] },
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AchievementsScreen({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<Overview | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    api.getAchievements().then(setData);
  }, []);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <div className="max-w-[420px] mx-auto px-5 pt-6 pb-[60px]">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display font-bold text-2xl">Достижения</h1>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border-none text-lg cursor-pointer flex items-center justify-center"
            style={{ background: "var(--hover)", color: "var(--ink)" }}
          >
            ✕
          </button>
        </div>

        {!data ? (
          <div className="py-10 text-center" style={{ color: "var(--muted)" }}>
            Загрузка…
          </div>
        ) : (
          <>
            <div className="text-[13px] mb-6" style={{ color: "var(--muted)" }}>
              Получено {data.unlockedCount} из {data.totalCount}
            </div>

            {PATHS.map((p) => {
              const defs = data.achievements.filter((a) => a.path === p.name).sort((a, b) => (a.tier || 0) - (b.tier || 0));
              const rawValue = p.progressKey === "kassa_streak" ? Math.max(data.pathProgress[p.progressKey], 0) : data.pathProgress[p.progressKey];
              return (
                <div key={p.name} className="mb-5">
                  <div className="text-[13px] font-semibold mb-2">{p.name}</div>
                  <div className="grid grid-cols-4 gap-2">
                    {defs.map((d) => {
                      const isUnlocked = !!data.unlocked[d.key];
                      const isExpanded = expandedKey === d.key;
                      const isTier4Special = d.key === "kassa_streak_tier4" || d.key === "goals_closed_tier4";
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => setExpandedKey(isExpanded ? null : d.key)}
                          className="rounded-xl py-3 px-1 text-center cursor-pointer flex flex-col items-center"
                          style={{
                            background: isUnlocked ? "var(--hover)" : "transparent",
                            border: isUnlocked ? "1px solid var(--border)" : "1px dashed var(--border)",
                            opacity: isUnlocked ? 1 : 0.55,
                          }}
                        >
                          <div style={{ fontSize: 26 }}>{d.icon}</div>
                          <div className="text-[9.5px] mt-1" style={{ color: "var(--muted)" }}>
                            {isTier4Special ? "спец." : `ур. ${d.tier}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {expandedKey && defs.some((d) => d.key === expandedKey) && (
                    <div
                      className="mt-2 px-3 py-2.5 rounded-xl text-[12px]"
                      style={{ background: "var(--hover)", color: "var(--muted)" }}
                    >
                      {(() => {
                        const d = defs.find((x) => x.key === expandedKey)!;
                        const unlockedAt = data.unlocked[d.key];
                        if (unlockedAt) {
                          return (
                            <>
                              <div style={{ color: "var(--pos)", fontWeight: 700 }}>{d.title}</div>
                              <div>Получено {fmtDate(unlockedAt)}</div>
                            </>
                          );
                        }
                        const progressText =
                          d.key === "kassa_streak_tier4"
                            ? `${data.kassaMetInWindow}/40 из последних 52 недель`
                            : d.key === "goals_closed_tier4"
                              ? `${data.goalsClosedInWindow}/10 закрытых целей за последние 52 недели`
                              : `Сейчас: ${p.unit(rawValue)}`;
                        return (
                          <>
                            <div style={{ fontWeight: 700, color: "var(--ink)" }}>{d.title}</div>
                            <div>{d.description}</div>
                            <div className="mt-1">{progressText}</div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="h-4" />

            {SITUATIONAL_GROUPS.map((group) => (
              <div key={group.title} className="mb-5">
                <div className="text-[13px] font-semibold mb-2">{group.title}</div>
                <div className="grid grid-cols-2 gap-2">
                  {group.keys.map((key) => {
                    const d = data.achievements.find((a) => a.key === key);
                    if (!d) return null;
                    const unlockedAt = data.unlocked[key];
                    return (
                      <div
                        key={key}
                        className="rounded-xl p-3"
                        style={{
                          background: unlockedAt ? "var(--hover)" : "transparent",
                          border: unlockedAt ? "1px solid var(--border)" : "1px dashed var(--border)",
                          opacity: unlockedAt ? 1 : 0.55,
                        }}
                      >
                        <div style={{ fontSize: 22 }}>{d.icon}</div>
                        <div className="text-[12px] font-semibold mt-1">{d.title}</div>
                        <div className="text-[10.5px] mt-0.5" style={{ color: "var(--muted)" }}>
                          {unlockedAt ? fmtDate(unlockedAt) : d.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
