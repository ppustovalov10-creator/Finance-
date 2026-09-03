// Ported 1:1 from budget-app-prototype.html <script> constants.

export const CATEGORIES = [
  "Супермаркеты",
  "Рестораны и кафе",
  "Отдых и развлечения",
  "Прочие расходы",
  "Одежда и аксессуары",
  "Здоровье и красота",
  "Транспорт",
  "Аренда и жильё",
  "Выдача наличных",
  "Оплата по QR СБП",
  "Прочие операции",
  "Перевод с карты",
  "Пополнение",
  "Инвестиции",
];

export const CATEGORY_PCT: Record<string, number> = {
  Супермаркеты: 0.15,
  "Рестораны и кафе": 0.06,
  Транспорт: 0.04,
  "Здоровье и красота": 0.03,
  "Отдых и развлечения": 0.05,
  "Прочие расходы": 0.05,
  "Одежда и аксессуары": 0.03,
};

export const ESSENTIAL_CATEGORIES = ["Супермаркеты", "Транспорт", "Аренда и жильё"];

// Categories that default to "irregular" (not counted toward the weekly earn target)
// the first time an envelope is auto-created for them.
export const DEFAULT_IRREGULAR_CATEGORIES = ["Одежда и аксессуары", "Здоровье и красота"];

export const CAT_ICON: Record<string, string> = {
  Супермаркеты: "cart",
  "Рестораны и кафе": "coffee",
  "Отдых и развлечения": "star",
  "Прочие расходы": "box",
  "Одежда и аксессуары": "shirt",
  "Здоровье и красота": "pill",
  Транспорт: "bus",
  "Аренда и жильё": "home",
  "Выдача наличных": "cash",
  "Оплата по QR СБП": "qrcode",
  "Прочие операции": "help",
  "Перевод с карты": "exchange",
  Пополнение: "plus",
  Инвестиции: "cash",
};

export const ICON_PICK_CHOICES = [
  "tag",
  "star",
  "box",
  "cart",
  "coffee",
  "shirt",
  "pill",
  "bus",
  "cash",
  "home",
  "qrcode",
  "help",
];

export const FALLBACK_CATEGORY = "Прочие расходы";

export function iconKeyFor(category: string, envelopes: { category: string; iconKey: string | null }[]): string {
  if (CAT_ICON[category]) return CAT_ICON[category];
  const env = envelopes.find((e) => e.category === category);
  return env?.iconKey || "tag";
}
