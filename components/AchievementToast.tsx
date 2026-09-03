export default function AchievementToast({ icon, title }: { icon: string; title: string }) {
  return (
    <div
      className="fixed top-[66px] left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-2xl pl-3 pr-5 py-3 shadow-lg"
      style={{ background: "#211E1A", border: "1px solid rgba(242,169,59,0.35)", maxWidth: "min(92vw, 380px)" }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-[22px]"
        style={{ background: "linear-gradient(135deg, #F2B84B, #E8735A)" }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#F2B84B" }}>
          Открыто достижение!
        </div>
        <div className="text-[14px] font-bold leading-snug mt-0.5" style={{ color: "#fff" }}>
          {title}
        </div>
      </div>
    </div>
  );
}
