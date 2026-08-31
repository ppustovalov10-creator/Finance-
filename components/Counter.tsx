export function Counter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span style={{ fontSize: 13, color: "var(--sheet-ink, #15170F)" }}>{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-8 h-8 rounded-full text-base font-bold cursor-pointer flex items-center justify-center"
          style={{ border: "1.5px solid #E5DCC5", background: "#fff", color: "#332B1E" }}
        >
          −
        </button>
        <span className="font-display font-semibold text-base w-6 text-center" style={{ color: "#332B1E" }}>
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-full text-base font-bold cursor-pointer flex items-center justify-center"
          style={{ border: "1.5px solid #E5DCC5", background: "#fff", color: "#332B1E" }}
        >
          +
        </button>
      </div>
    </div>
  );
}
