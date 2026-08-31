export function Sheet({
  show,
  onClose,
  children,
  maxWidth,
}: {
  show: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full rounded-t-[22px] relative overflow-hidden px-[22px] pt-[26px] pb-[30px] max-h-[90vh] overflow-y-auto"
        style={{ maxWidth: maxWidth || 420, background: "var(--sheet-bg)", color: "var(--sheet-ink)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-[5px]" style={{ background: "linear-gradient(90deg,#6FCF7B,#2F6FED)" }} />
        {children}
      </div>
    </div>
  );
}

export function FieldLabel({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div
      className="text-[11px] uppercase tracking-wide font-semibold"
      style={{ color: "#A89A7E", margin: first ? "2px 0 5px" : "14px 0 5px" }}
    >
      {children}
    </div>
  );
}

export function DescInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3 rounded-xl text-sm mb-4 outline-none ${props.className || ""}`}
      style={{ background: "#fff", color: "var(--sheet-ink)", border: "1px solid var(--sheet-line)", ...props.style }}
    />
  );
}

export function AmountInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="number"
      inputMode="decimal"
      placeholder="0"
      {...props}
      className={`font-display w-full text-center bg-transparent outline-none font-bold mb-1.5 ${props.className || ""}`}
      style={{ fontSize: 52, color: "var(--sheet-ink)", ...props.style }}
    />
  );
}

export function SaveButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="w-full py-[15px] rounded-2xl border-none font-bold text-[15px] cursor-pointer disabled:opacity-50"
      style={{ background: "var(--sheet-ink)", color: "var(--sheet-bg)" }}
    >
      {children}
    </button>
  );
}

export function CancelLink({ children, danger, ...props }: React.HTMLAttributes<HTMLDivElement> & { danger?: boolean }) {
  return (
    <div
      {...props}
      className="block text-center mt-3 text-[13px] cursor-pointer"
      style={{ color: danger ? "#C1443C" : "#8A8B7E", fontWeight: danger ? 600 : 400 }}
    >
      {children}
    </div>
  );
}

export function ErrText({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: "#E8735F", fontSize: "12.5px", margin: "4px 0 12px", minHeight: 16 }}>{children}</div>
  );
}

export function SheetTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 700, fontSize: 19 }}>{children}</div>;
}

export function SheetHint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, color: "#8A8B7E", marginTop: 2 }}>{children}</div>
  );
}
