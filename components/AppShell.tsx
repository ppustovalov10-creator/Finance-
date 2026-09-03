"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { api, onNewAchievements, type NewAchievement } from "@/lib/api-client";
import type { AppState } from "@/lib/types";
import { DOW_FULL } from "@/lib/date";
import Onboarding from "./Onboarding";
import IncomeTab from "./IncomeTab";
import SpendTab from "./SpendTab";
import EnvelopesTab from "./EnvelopesTab";
import KassaTab from "./KassaTab";
import AchievementsScreen from "./AchievementsScreen";
import Toast from "./Toast";
import AchievementToast from "./AchievementToast";

type Tab = "income" | "spend";

const TAB_LABELS: Record<Tab, string> = { income: "Доход/Касса", spend: "Расход" };

export default function AppShell() {
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<Tab>("income");
  const [toast, setToast] = useState<{ text: string; isError?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [achievementToast, setAchievementToast] = useState<NewAchievement | null>(null);
  const achievementQueue = useRef<NewAchievement[]>([]);
  const achievementToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    const s = await api.getState();
    setState(s);
    return s;
  }, []);

  useEffect(() => {
    // Initial data fetch on mount — refresh() sets state only after its
    // `await` resolves, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const showToast = useCallback((text: string, isError?: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, isError });
    toastTimer.current = setTimeout(() => setToast(null), isError ? 3200 : 2200);
  }, []);

  useEffect(() => {
    // Any API call anywhere in the app can come back with newly-unlocked
    // achievements (see lib/api-client.ts) — queue them here so several
    // unlocked at once still show one at a time, unobtrusively.
    const showNext = () => {
      const next = achievementQueue.current.shift();
      if (!next) return;
      setAchievementToast(next);
      if (achievementToastTimer.current) clearTimeout(achievementToastTimer.current);
      achievementToastTimer.current = setTimeout(() => setAchievementToast(null), 3200);
      if (achievementQueue.current.length > 0) setTimeout(showNext, 3800);
    };
    onNewAchievements((list) => {
      const wasEmpty = achievementQueue.current.length === 0;
      achievementQueue.current.push(...list);
      if (wasEmpty) showNext();
    });
  }, []);

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: "var(--muted)" }}>
        Загрузка…
      </div>
    );
  }

  if (!state.onboarded) {
    return <Onboarding onDone={refresh} />;
  }

  const now = new Date();

  return (
    <div>
      <div className="sticky top-0 z-30" style={{ background: "var(--bg)", borderBottom: "1px solid var(--line)" }}>
        <div className="max-w-[420px] mx-auto px-5 pt-4 pb-2 flex items-start justify-between">
          <div>
            <div className="font-display font-bold text-2xl leading-tight" style={{ letterSpacing: "-0.01em" }}>
              {DOW_FULL[(now.getDay() + 6) % 7]}
            </div>
            <div className="text-xs mt-1 uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              {`${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`}
            </div>
          </div>
          <button
            onClick={() => setAchievementsOpen(true)}
            className="text-2xl cursor-pointer bg-transparent border-none leading-none"
            style={{ color: "var(--muted)" }}
            title="Достижения"
          >
            🏆
          </button>
        </div>
        <div className="flex items-center justify-center py-3 px-4 relative">
          <div className="flex gap-1 rounded-full p-1" style={{ background: "var(--hover)", border: "1px solid var(--border)" }}>
            {(["income", "spend"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="border-none px-[14px] py-2 rounded-full text-[13px] font-semibold cursor-pointer transition-colors"
                style={{
                  background: tab === t ? "var(--accent-blue)" : "transparent",
                  color: tab === t ? "#fff" : "var(--muted)",
                }}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="absolute right-4 text-xs cursor-pointer bg-transparent border-none"
            style={{ color: "var(--muted)" }}
          >
            Выйти
          </button>
        </div>
      </div>

      {tab === "income" && (
        <>
          <KassaTab showToast={showToast} budgetState={state} />
          <IncomeTab state={state} refresh={refresh} showToast={showToast} />
        </>
      )}
      {tab === "spend" && (
        <>
          <SpendTab state={state} refresh={refresh} showToast={showToast} />
          <EnvelopesTab state={state} refresh={refresh} showToast={showToast} />
        </>
      )}

      {achievementsOpen && <AchievementsScreen onClose={() => setAchievementsOpen(false)} />}

      {achievementToast && (
        <AchievementToast icon={achievementToast.icon} title={achievementToast.title} rarity={achievementToast.rarity} />
      )}
      {toast && !achievementToast && <Toast text={toast.text} isError={toast.isError} />}
    </div>
  );
}

export type ShowToast = (text: string, isError?: boolean) => void;
export type Refresh = () => Promise<AppState>;
