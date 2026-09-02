import { fmt } from "@/lib/format";

export function Card({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
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

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] tracking-wide uppercase mb-1.5" style={{ color: "var(--muted)" }}>
      {children}
    </div>
  );
}

export function InfoBtn({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
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

export function TargetRow({ label, amt, total, dim, topBorder }: { label: string; amt: number; total?: boolean; dim?: boolean; topBorder?: boolean }) {
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
