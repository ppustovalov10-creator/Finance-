export function fmt(n: number): string {
  const s = n < 0 ? "−" : "";
  return s + Math.round(Math.abs(n)).toLocaleString("ru-RU") + " ₽";
}
