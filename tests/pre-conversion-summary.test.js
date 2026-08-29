"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

const calculatorContext = vm.createContext({});

vm.runInContext(
  readProjectFile(path.join("js", "calculator.js")),
  calculatorContext,
);

const calculatePreConversionSummary = vm.runInContext(
  "calculatePreConversionSummary",
  calculatorContext,
);
const calculateFinalResourceTotals = vm.runInContext(
  "calculateFinalResourceTotals",
  calculatorContext,
);
const parseResourceAdjustment = vm.runInContext(
  "parseResourceAdjustment",
  calculatorContext,
);
const resourceInstances = JSON.parse(
  readProjectFile(
    path.join("data", "resources", "test-resources.json"),
  ),
).resources;
const indexHtml = readProjectFile("index.html");

[
  "other-diamond",
  "other-red-diamond",
  "other-common-paint",
  "other-timed-paint",
  "other-limited-paint",
].forEach((id) => {
  assert.match(
    indexHtml,
    new RegExp(`<input id="${id}"[^>]*value="0"`),
  );
});
assert.match(indexHtml, /个性化调整/);
assert.match(indexHtml, /资源总计/);
assert.doesNotMatch(indexHtml, /额外氪金金额|other-rmb-amount/);
assert.doesNotMatch(indexHtml, /id="pre-conversion-[^"]*pull/);

assert.equal(parseResourceAdjustment("").amount, 0);
assert.equal(parseResourceAdjustment("0").amount, 0);
assert.equal(parseResourceAdjustment("12").amount, 12);
assert.equal(parseResourceAdjustment("-12").amount, -12);
assert.equal(parseResourceAdjustment("1.5").valid, false);
assert.equal(parseResourceAdjustment("invalid").valid, false);

const targetBanner = { id: "庄园诡戏", tags: [] };
const combined = calculatePreConversionSummary({
  resourceSources: [
    {
      diamond: 100,
      red_diamond: 20,
      common_paint: 1,
      timed_paint: 2,
      灵魂老荷兰: 3,
      甜蜜老荷兰: 4,
      "timed-paint-sample-2": 5,
    },
    { diamond: 50, common_paint: 2 },
    { diamond: 30 },
    { common_paint: 3 },
    { diamond: 5, 灵魂老荷兰: 7 },
  ],
  paymentSources: [
    { amount: 60, countsTowardLimitedRecharge: true },
    { amount: 12 },
    { amount: 6, countsTowardLimitedRecharge: false },
    { amount: 100, limitedRechargeAmount: 80 },
  ],
  resourceInstances,
  targetDate: "2026-08-26",
  targetBanner,
});

assert.equal(combined.valid, true);
assert.equal(combined.resources.diamond, 185);
assert.equal(combined.resources.red_diamond, 20);
assert.equal(combined.resources.common_paint, 6);
assert.equal(combined.resources.timed_paint, 2);
assert.equal(combined.resources.limited_paint, 10);
assert.equal(combined.rmbTotal, 178);
assert.equal(combined.limitedRechargeRmb, 152);
assert.equal("pulls" in combined, false);

const combinedFinal = calculateFinalResourceTotals(combined.resources, {
  diamond: 1,
  red_diamond: 2,
  common_paint: 3,
  timed_paint: 4,
  limited_paint: 5,
});

assert.equal(combinedFinal.valid, true);
assert.equal(combinedFinal.resources.diamond, 186);
assert.equal(combinedFinal.resources.red_diamond, 22);
assert.equal(combinedFinal.resources.common_paint, 9);
assert.equal(combinedFinal.resources.timed_paint, 6);
assert.equal(combinedFinal.resources.limited_paint, 15);

const structuredAvailability = calculatePreConversionSummary({
  resourceSources: [
    {
      "timed-paint-sample-1": 10,
      "timed-paint-sample-2": 20,
      甜蜜老荷兰: 3,
      灵魂老荷兰: 4,
    },
  ],
  resourceInstances,
  targetDate: "2026-08-16",
  targetBanner: { id: "罗夏生日", tags: ["birthday"] },
});

assert.equal(structuredAvailability.resources.timed_paint, 20);
assert.equal(structuredAvailability.resources.limited_paint, 3);

const manualConfirmedResources = calculateFinalResourceTotals(
  calculatePreConversionSummary().resources,
  { timed_paint: 8, limited_paint: 9 },
);

assert.equal(manualConfirmedResources.resources.timed_paint, 8);
assert.equal(manualConfirmedResources.resources.limited_paint, 9);

const resourcesBeforeNegativeAdjustments = calculatePreConversionSummary({
  resourceSources: [{ diamond: 500, common_paint: 5 }],
});
const negativeAdjustments = calculateFinalResourceTotals(
  resourcesBeforeNegativeAdjustments.resources,
  {
    diamond: -300,
    common_paint: -2,
    timed_paint: -1,
    limited_paint: -3,
  },
);

assert.equal(negativeAdjustments.resources.diamond, 200);
assert.equal(negativeAdjustments.resources.common_paint, 3);
assert.equal(negativeAdjustments.resources.timed_paint, -1);
assert.equal(negativeAdjustments.resources.limited_paint, -3);
assert.equal(resourcesBeforeNegativeAdjustments.rmbTotal, 0);
assert.equal(resourcesBeforeNegativeAdjustments.limitedRechargeRmb, 0);

const resourcesBeforeInputChange = calculatePreConversionSummary().resources;
const beforeInputChange = calculateFinalResourceTotals(
  resourcesBeforeInputChange,
  { diamond: 1 },
);
const afterInputChange = calculateFinalResourceTotals(
  resourcesBeforeInputChange,
  { diamond: -7 },
);

assert.equal(beforeInputChange.resources.diamond, 1);
assert.equal(afterInputChange.resources.diamond, -7);

console.log("pre-conversion summary: resource and RMB tests passed");
