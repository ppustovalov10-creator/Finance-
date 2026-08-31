import { FALLBACK_CATEGORY } from "./categories";

// Ported 1:1 from the prototype's guessCat(). Order matters: more specific /
// higher-priority checks first.
const RULES: [string, RegExp][] = [
  ["Аренда и жильё", /аренд|квартир|съём|съем|коммунал|жкх|ипотек/],
  [
    "Здоровье и красота",
    /аптек|врач|стомат|больниц|клиник|анализ|массаж|салон красот|парикмахер|маникюр|педикюр|космет|фитнес|спортзал|тренаж/,
  ],
  ["Одежда и аксессуары", /одежд|обув|кроссов|футболк|куртк|джинс|платье|носк|lamoda|wildberries|zara\b|h&m/],
  [
    "Транспорт",
    /такси|метро|автобус|бензин|азс|заправ|каршеринг|парковк|электричк|поезд|самолёт|самолет|билет.*(поезд|автобус|самолёт|самолет)/,
  ],
  [
    "Рестораны и кафе",
    /кофе|кафе|ресторан|обед|ужин|завтрак|бар\b|паб\b|пицц|суши|бургер|starbucks|kfc|makdonalds|макдоналдс|шаурм|пекарн|кондитер|еда(?!.*доставк)|яндекс\s*еда/,
  ],
  [
    "Отдых и развлечения",
    /кино|театр|концерт|игр|развлеч|каток|боулинг|бильярд|клуб|компьютерн|комп[ыа]|подпис.*(netflix|spotify|кино|игр)|steam|плейстейшн|playstation|xbox|парк аттракцион|квест|вечеринк/,
  ],
  ["Прочие расходы", /доставк|курьер|лавка|самокат|заказ/],
];

export function guessCat(text: string): string {
  const d = " " + text.toLowerCase() + " ";
  for (const [cat, re] of RULES) {
    if (re.test(d)) return cat;
  }
  if (/продукт|магнит|пятерочк|перекрест|ашан|лента|вкусвилл|дикси|супермаркет|магазин(?!.*одежд)/.test(d)) {
    return "Супермаркеты";
  }
  return FALLBACK_CATEGORY;
}

/**
 * customKeywords: category -> ordered list of keywords, ordered by the
 * category's first-created keyword (oldest category wins ties), matching the
 * prototype's Object.keys() insertion-order iteration.
 */
export function categorize(text: string, customKeywords: Record<string, string[]>): string {
  const d = text.toLowerCase();
  for (const cat of Object.keys(customKeywords)) {
    if ((customKeywords[cat] || []).some((kw) => kw && d.includes(kw))) {
      return cat;
    }
  }
  return guessCat(text);
}

export function extractKeyword(desc: string): string | null {
  const cleaned = desc
    .toLowerCase()
    .replace(/[^a-zа-яё0-9 ]/gi, " ")
    .trim();
  const words = cleaned.split(/\s+/).filter((w) => w.length >= 3);
  return words[0] || null;
}
