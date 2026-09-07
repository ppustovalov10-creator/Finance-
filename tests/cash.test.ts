import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateCashWeek,
  calcCashProgress,
  calculateSalary,
  cashScenarioOptions,
  dailyCashTarget,
  generateRemainingWeekdayTargets,
  generateWeekdayTargets,
  rebalanceWeekdayTargets,
  selectedCashScenario,
  salaryTierPercent,
  teamMotivationRows,
} from "@/lib/cash";

test("uses the configured target for each weekday instead of assuming an equal split", () => {
  const targets = { mon: 67_100, tue: 53_225, wed: 50_000, thu: 55_000, fri: 54_675 };
  assert.equal(dailyCashTarget(targets, "07.09.2026"), 67_100);
  assert.equal(dailyCashTarget(targets, "08.09.2026"), 53_225);
});

test("generates a five-day distribution whose sum equals a new weekly target", () => {
  assert.deepEqual(generateWeekdayTargets(12_500), { mon: 2_500, tue: 2_500, wed: 2_500, thu: 2_500, fri: 2_500 });
});

test("allocates a selected weekly target only over remaining weekdays", () => {
  assert.deepEqual(generateRemainingWeekdayTargets(12_500, "09.09.2026"), { mon: 0, tue: 0, wed: 4_167, thu: 4_167, fri: 4_166 });
  assert.deepEqual(generateRemainingWeekdayTargets(12_500, "12.09.2026"), { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0 });
});

test("rebalances later weekdays after a cash result above or below plan", () => {
  assert.deepEqual(rebalanceWeekdayTargets(1_000, [{ id: "mon", date: "07.09.2026", amount: 300 }], "07.09.2026"), { mon: 200, tue: 175, wed: 175, thu: 175, fri: 175 });
  assert.deepEqual(rebalanceWeekdayTargets(1_000, [{ id: "mon", date: "07.09.2026", amount: 100 }], "07.09.2026"), { mon: 200, tue: 225, wed: 225, thu: 225, fri: 225 });
});

test("aggregates cash entries by day and only includes the requested Monday-Friday week", () => {
  const result = aggregateCashWeek([{ id: "mon-1", date: "07.09.2026", amount: 500 }, { id: "mon-2", date: "07.09.2026", amount: 700 }, { id: "fri", date: "11.09.2026", amount: 1_000 }, { id: "weekend", date: "12.09.2026", amount: 900 }, { id: "previous", date: "04.09.2026", amount: 1_100 }], "07.09.2026");
  assert.equal(result.weeklyTotal, 2_200);
  assert.deepEqual(result.days.map((day) => ({ date: day.date, amount: day.amount })), [{ date: "07.09.2026", amount: 1_200 }, { date: "08.09.2026", amount: 0 }, { date: "09.09.2026", amount: 0 }, { date: "10.09.2026", amount: 0 }, { date: "11.09.2026", amount: 1_000 }]);
});

test("caps cash and salary progress at 100 percent", () => {
  assert.deepEqual(calcCashProgress({ weeklyCash: 15_000, weeklyTarget: 12_500, salary: 40_000, salaryTarget: 32_000 }), { cashPercent: 100, salaryPercent: 100 });
});

test("returns zero progress when targets are not configured", () => {
  assert.deepEqual(calcCashProgress({ weeklyCash: 500, weeklyTarget: 0, salary: 500, salaryTarget: 0 }), { cashPercent: 0, salaryPercent: 0 });
});

test("uses the specified inclusive salary tier boundaries", () => {
  assert.equal(salaryTierPercent(69_999), 0); assert.equal(salaryTierPercent(70_000), 0.025); assert.equal(salaryTierPercent(99_999), 0.025); assert.equal(salaryTierPercent(100_000), 0.05); assert.equal(salaryTierPercent(279_999), 0.1); assert.equal(salaryTierPercent(280_000), 0.105); assert.equal(salaryTierPercent(300_000), 0.11);
});

test("calculates tier commission and all team bonuses", () => {
  assert.equal(calculateSalary({ weeklyCash: 100_000, failedPlan: false, opsTotal: 3, opsPlan: 2, managersTotal: 2, managersPlan: 1 }), 15_500);
  assert.equal(calculateSalary({ weeklyCash: 100_000, failedPlan: true, opsTotal: 0, opsPlan: 0, managersTotal: 0, managersPlan: 0 }), 5_000);
});

test("always uses the fixed 100, 125, and 150 percent scenarios", () => {
  const options = cashScenarioOptions({
    today: "07.09.2026", goal: { target: 130_000, saved: 10_000, deadlineDate: "05.10.2026" },
    envelopes: [{ weeklyCap: 8_000, isRegular: true }, { weeklyCap: 4_000, isRegular: false }, { weeklyCap: 7_000, isRegular: true }],
    salary: { failedPlan: false, opsTotal: 2, opsPlan: 1, managersTotal: 1, managersPlan: 0 },
  });
  assert.deepEqual(options.map((option) => option.name), ["Минималка", "Средний", "Герой-красавчик"]);
  const required = 15_000 + 30_000;
  assert.ok(calculateSalary({ weeklyCash: options[0].minimumWeeklyCash, failedPlan: false, opsTotal: 2, opsPlan: 1, managersTotal: 1, managersPlan: 0 }) >= required);
  assert.ok(calculateSalary({ weeklyCash: options[0].minimumWeeklyCash - 1, failedPlan: false, opsTotal: 2, opsPlan: 1, managersTotal: 1, managersPlan: 0 }) < required);
  assert.deepEqual(options.map((option) => option.multiplier), [1, 1.25, 1.5]);
  assert.deepEqual(options.map((option) => option.weeklyCash), [options[0].minimumWeeklyCash, Math.ceil(options[0].minimumWeeklyCash * 1.25), Math.ceil(options[0].minimumWeeklyCash * 1.5)]);
  assert.equal(options[0].completionDate, "05.10.2026");
});

test("includes the expected salary for each cash scenario", () => {
  const salary = { failedPlan: false, opsTotal: 1, opsPlan: 1, managersTotal: 1, managersPlan: 1 };
  const options = cashScenarioOptions({ today: "07.09.2026", goal: { target: 20_000, saved: 0, deadlineDate: "14.09.2026" }, envelopes: [], salary });
  assert.deepEqual(options.map((option) => option.weeklySalary), options.map((option) => calculateSalary({ weeklyCash: option.weeklyCash, ...salary })));
});

test("clamps a passed or sub-week goal horizon to one week", () => {
  const [option] = cashScenarioOptions({ today: "07.09.2026", goal: { target: 25_000, saved: 5_000, deadlineDate: "08.09.2026" }, envelopes: [], salary: { failedPlan: true, opsTotal: 0, opsPlan: 0, managersTotal: 0, managersPlan: 0 } });
  assert.equal(option.weeks, 1); assert.equal(option.goalContribution, 20_000);
});

test("identifies the selected scenario and leaves custom goals selectable", () => {
  const options = [
    { name: "Минималка", weeklyCash: 100 },
    { name: "Средний", weeklyCash: 125 },
    { name: "Герой-красавчик", weeklyCash: 150 },
  ];
  assert.equal(selectedCashScenario(options, 125)?.name, "Средний");
  assert.equal(selectedCashScenario(options, 130), undefined);
});

test("lists the operator and manager bonuses used in the salary calculation", () => {
  assert.deepEqual(teamMotivationRows(), [
    { role: "Операторы", perPerson: 500, perPlan: 500 },
    { role: "Менеджеры", perPerson: 1_000, perPlan: 1_000 },
  ]);
});
