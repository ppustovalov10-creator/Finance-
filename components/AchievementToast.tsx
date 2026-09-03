import { RARITY_LABELS, RARITY_STYLE, type Rarity } from "@/lib/achievements-data";

export default function AchievementToast({ icon, title, rarity }: { icon: string; title: string; rarity: Rarity }) {
  const style = RARITY_STYLE[rarity];
  return (
    <div
      className="fixed top-[66px] left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-2xl pl-3 pr-5 py-3 shadow-lg"
      style={{ background: "#211E1A", border: `1px solid ${style.border}`, maxWidth: "min(92vw, 380px)" }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-[22px]"
        style={{ background: style.bg }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: style.glow }}>
          Открыто достижение! · {RARITY_LABELS[rarity]}
        </div>
        <div className="text-[14px] font-bold leading-snug mt-0.5" style={{ color: "#fff" }}>
          {title}
        </div>
      </div>
    </div>
  );
}
