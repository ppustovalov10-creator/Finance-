import assert from "node:assert/strict";
import test from "node:test";
import { aggregateCashWeek, calcCashProgress, calculateSalary, dailyCashTarget, generateWeekdayTargets, salaryTierPercent } from "@/lib/cash";

test("uses the configured target for each weekday instead of assuming an equal split", () => {
  const targets = { mon: 67_100, tue: 53_225, wed: 50_000, thu: 55_000, fri: 54_675 };
  assert.equal(dailyCashTarget(targets, "07.09.2026"), 67_100);
  assert.equal(dailyCashTarget(targets, "08.09.2026"), 53_225);
});

test("generates a five-day distribution whose sum equals a new weekly target", () => {
  assert.deepEqual(generateWeekdayTargets(12_500), { mon: 2_500, tue: 2_500, wed: 2_500, thu: 2_500, fri: 2_500 });
});

test("aggregates cash entries by day and only includes the requested Monday-Friday week", () => {
  const result = aggregateCashWeek(
    [
      { id: "mon-1", date: "07.09.2026", amount: 500 },
      { id: "mon-2", date: "07.09.2026", amount: 700 },
      { id: "fri", date: "11.09.2026", amount: 1_000 },
      { id: "weekend", date: "12.09.2026", amount: 900 },
      { id: "previous", date: "04.09.2026", amount: 1_100 },
    ],
    "07.09.2026"
  );

  assert.equal(result.weeklyTotal, 2_200);
  assert.deepEqual(
    result.days.map((day) => ({ date: day.date, amount: day.amount })),
    [
      { date: "07.09.2026", amount: 1_200 },
      { date: "08.09.2026", amount: 0 },
      { date: "09.09.2026", amount: 0 },
      { date: "10.09.2026", amount: 0 },
      { date: "11.09.2026", amount: 1_000 },
    ]
  );
});

test("caps cash and salary progress at 100 percent", () => {
  assert.deepEqual(calcCashProgress({ weeklyCash: 15_000, weeklyTarget: 12_500, salary: 40_000, salaryTarget: 32_000 }), {
    cashPercent: 100,
    salaryPercent: 100,
  });
});

test("returns zero progress when targets are not configured", () => {
  assert.deepEqual(calcCashProgress({ weeklyCash: 500, weeklyTarget: 0, salary: 500, salaryTarget: 0 }), {
    cashPercent: 0,
    salaryPercent: 0,
  });
});

test("uses the specified inclusive salary tier boundaries", () => {
  assert.equal(salaryTierPercent(69_999), 0);
  assert.equal(salaryTierPercent(70_000), 0.025);
  assert.equal(salaryTierPercent(99_999), 0.025);
  assert.equal(salaryTierPercent(100_000), 0.05);
  assert.equal(salaryTierPercent(279_999), 0.1);
  assert.equal(salaryTierPercent(280_000), 0.105);
  assert.equal(salaryTierPercent(300_000), 0.11);
});

test("calculates tier commission and all team bonuses", () => {
  assert.equal(
    calculateSalary({ weeklyCash: 100_000, failedPlan: false, opsTotal: 3, opsPlan: 2, managersTotal: 2, managersPlan: 1 }),
    15_500
  );
  assert.equal(
    calculateSalary({ weeklyCash: 100_000, failedPlan: true, opsTotal: 0, opsPlan: 0, managersTotal: 0, managersPlan: 0 }),
    5_000
  );
});
