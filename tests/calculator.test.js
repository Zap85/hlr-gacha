"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const calculatorPath = path.join(__dirname, "..", "js", "calculator.js");
const calculatorCode = fs.readFileSync(calculatorPath, "utf8");
const context = vm.createContext({ Date });

vm.runInContext(calculatorCode, context);

const calculateDateRange = vm.runInContext("calculateDateRange", context);

const cases = [
  ["2026-07-01", "2026-07-21", 20],
  ["2026-07-01", "2026-07-31", 30],
  ["2026-07-31", "2026-08-01", 1],
];

for (const [currentDate, targetDate, expectedDays] of cases) {
  const result = calculateDateRange(currentDate, targetDate);

  assert.equal(result.valid, true);
  assert.equal(result.days, expectedDays);
  assert.equal(result.error, null);
}

for (const [currentDate, targetDate] of [
  ["2026-07-01", "2026-07-01"],
  ["2026-07-21", "2026-07-01"],
]) {
  const result = calculateDateRange(currentDate, targetDate);

  assert.equal(result.valid, false);
  assert.equal(result.days, null);
  assert.equal(result.error, "目标日期必须晚于当前日期。");
}

console.log("calculator.js: 5 date range tests passed");
