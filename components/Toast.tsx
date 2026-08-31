export default function Toast({ text, isError }: { text: string; isError?: boolean }) {
  return (
    <div
      className="fixed top-[66px] left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg z-[60]"
      style={{
        background: isError ? "#C1443C" : "var(--sheet-bg)",
        color: isError ? "#fff" : "var(--sheet-ink)",
      }}
    >
      {text}
    </div>
  );
}
