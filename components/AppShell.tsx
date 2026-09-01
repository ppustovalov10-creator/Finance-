"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { api, onNewAchievements, type NewAchievement } from "@/lib/api-client";
import type { AppState } from "@/lib/types";
import Onboarding from "./Onboarding";
import HomeTab from "./HomeTab";
import EnvelopesTab from "./EnvelopesTab";
import KassaTab from "./KassaTab";
import AchievementsScreen from "./AchievementsScreen";
import Toast from "./Toast";

type Tab = "minimal" | "envelopes" | "kassa";

const TAB_LABELS: Record<Tab, string> = { minimal: "Главное", envelopes: "Конверты", kassa: "Касса" };

export default function AppShell() {
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<Tab>("minimal");
  const [toast, setToast] = useState<{ text: string; isError?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const achievementQueue = useRef<NewAchievement[]>([]);

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
      showToast(`${next.icon} Новое достижение: ${next.title}`);
      if (achievementQueue.current.length > 0) setTimeout(showNext, 2600);
    };
    onNewAchievements((list) => {
      const wasEmpty = achievementQueue.current.length === 0;
      achievementQueue.current.push(...list);
      if (wasEmpty) showNext();
    });
  }, [showToast]);

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

  return (
    <div>
      <div
        className="sticky top-0 z-30 flex items-center justify-center py-3 px-4 relative"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--line)" }}
      >
        <div className="flex gap-1 rounded-full p-1" style={{ background: "var(--hover)", border: "1px solid var(--border)" }}>
          {(["minimal", "envelopes", "kassa"] as Tab[]).map((t) => (
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
          onClick={() => setAchievementsOpen(true)}
          className="absolute left-4 text-lg cursor-pointer bg-transparent border-none leading-none"
          style={{ color: "var(--muted)" }}
          title="Достижения"
        >
          🏆
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="absolute right-4 text-xs cursor-pointer bg-transparent border-none"
          style={{ color: "var(--muted)" }}
        >
          Выйти
        </button>
      </div>

      {tab === "minimal" && <HomeTab state={state} refresh={refresh} showToast={showToast} />}
      {tab === "envelopes" && <EnvelopesTab state={state} refresh={refresh} showToast={showToast} />}
      {tab === "kassa" && <KassaTab showToast={showToast} budgetState={state} />}

      {achievementsOpen && <AchievementsScreen onClose={() => setAchievementsOpen(false)} />}

      {toast && <Toast text={toast.text} isError={toast.isError} />}
    </div>
  );
}

export type ShowToast = (text: string, isError?: boolean) => void;
export type Refresh = () => Promise<AppState>;
