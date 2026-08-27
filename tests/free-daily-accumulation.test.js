"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

const constantsData = JSON.parse(
  readProjectFile(path.join("data", "constants.json")),
);
const rules = constantsData.constants.freeDailyAccumulation;
const calculatorContext = vm.createContext({ Date });

vm.runInContext(
  readProjectFile(path.join("js", "calculator.js")),
  calculatorContext,
);

const calculateFreeDailyAccumulation = vm.runInContext(
  "calculateFreeDailyAccumulation",
  calculatorContext,
);

const crossesMonday = calculateFreeDailyAccumulation(
  "2026-07-05",
  "2026-07-06",
  rules,
);
assert.equal(crossesMonday.days, 1);
assert.equal(crossesMonday.weeklyShares.count, 1);
assert.equal(crossesMonday.weeklyShares.diamonds, 30);

const excludesCurrentMonday = calculateFreeDailyAccumulation(
  "2026-07-06",
  "2026-07-12",
  rules,
);
assert.equal(excludesCurrentMonday.weeklyShares.count, 0);

const includesTargetSignIn = calculateFreeDailyAccumulation(
  "2026-07-02",
  "2026-07-03",
  rules,
);
assert.equal(includesTargetSignIn.monthlySignIns.count, 1);
assert.equal(includesTargetSignIn.monthlySignIns.diamonds, 30);

const excludesCurrentSignIn = calculateFreeDailyAccumulation(
  "2026-07-03",
  "2026-07-04",
  rules,
);
assert.equal(excludesCurrentSignIn.monthlySignIns.count, 0);

const crossesMonth = calculateFreeDailyAccumulation(
  "2026-07-30",
  "2026-08-03",
  rules,
);
assert.equal(crossesMonth.days, 4);
assert.equal(crossesMonth.dailyTasks.diamonds, 304);
assert.equal(crossesMonth.weeklyShares.count, 1);
assert.equal(crossesMonth.monthlySignIns.diamonds, 30);
assert.equal(crossesMonth.monthEndRewards.commonPaint, 1);
assert.equal(crossesMonth.totals.diamonds, 364);
assert.equal(crossesMonth.totals.commonPaint, 1);

const includesMonthEnd = calculateFreeDailyAccumulation(
  "2026-01-30",
  "2026-01-31",
  rules,
);
assert.equal(includesMonthEnd.monthEndRewards.count, 1);

const nonLeapFebruary = calculateFreeDailyAccumulation(
  "2026-02-27",
  "2026-02-28",
  rules,
);
assert.equal(nonLeapFebruary.monthEndRewards.count, 1);

const leapFebruary = calculateFreeDailyAccumulation(
  "2028-02-28",
  "2028-02-29",
  rules,
);
assert.equal(leapFebruary.monthEndRewards.count, 1);

const excludesCurrentMonthEnd = calculateFreeDailyAccumulation(
  "2026-01-31",
  "2026-02-01",
  rules,
);
assert.equal(excludesCurrentMonthEnd.monthEndRewards.count, 0);

const requestedPaths = [];
const loaderContext = vm.createContext({
  fetch: async (requestedPath) => {
    requestedPaths.push(requestedPath);

    return {
      ok: true,
      json: async () => constantsData,
    };
  },
});

vm.runInContext(
  readProjectFile(path.join("js", "data-loader.js")),
  loaderContext,
);

const loadFreeDailyAccumulationRules = vm.runInContext(
  "loadFreeDailyAccumulationRules",
  loaderContext,
);

(async () => {
  const loadedRules = await loadFreeDailyAccumulationRules();

  assert.equal(requestedPaths[0], "data/constants.json");
  assert.equal(loadedRules.dailyTaskDiamonds, 76);
  assert.equal(loadedRules.weeklyShare.diamonds, 30);
  console.log("free daily accumulation: calendar tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
