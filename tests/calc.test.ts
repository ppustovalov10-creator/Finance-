import assert from "node:assert/strict";
import test from "node:test";
import { parseMoneyInput, transactionsInWeek } from "@/lib/calc";

test("keeps expenses inside the selected seven-day week only", () => {
  const result = transactionsInWeek([
    { id: "before", date: "03.09.2026", cat: "Еда", desc: "до недели", amount: -100 },
    { id: "start", date: "04.09.2026", cat: "Еда", desc: "первый день", amount: -200 },
    { id: "end", date: "10.09.2026", cat: "Такси", desc: "последний день", amount: -300 },
    { id: "next", date: "11.09.2026", cat: "Еда", desc: "следующая неделя", amount: -400 },
  ], "04.09.2026");
  assert.deepEqual(result.map((transaction) => transaction.id), ["start", "end"]);
});

test("accepts a ruble suffix and spaces in an expense amount", () => {
  assert.equal(parseMoneyInput("1 300 ₽"), 1300);
});
