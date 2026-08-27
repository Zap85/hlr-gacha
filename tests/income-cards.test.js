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
const rules = constantsData.constants.incomeCards;
const calculatorContext = vm.createContext({ Date });

vm.runInContext(
  readProjectFile(path.join("js", "calculator.js")),
  calculatorContext,
);

const calculateIncomeCards = vm.runInContext(
  "calculateIncomeCards",
  calculatorContext,
);

const defaultSelections = {
  monthlyCardSelected: false,
  monthlyCardAdjustment: 0,
  seasonalCardSelected: false,
  annualCardSelected: false,
  catTreatSelected: false,
};

const defaults = calculateIncomeCards(
  "2026-07-01",
  "2026-07-31",
  315,
  rules,
  defaultSelections,
);
assert.equal(defaults.valid, true);
assert.equal(defaults.monthlyCard.basePurchases, 1);
assert.equal(defaults.monthlyCard.actualPurchases, 1);
assert.equal(defaults.monthlyCard.totalDiamonds, 0);
assert.equal(defaults.monthlyCard.purchaseAmountRmb, 0);
assert.equal(defaults.monthlyCard.countsTowardLimitedRecharge, true);
assert.equal(defaults.seasonalCard.totalDiamonds, 0);
assert.equal(defaults.annualCard.commonPaint, 0);
assert.equal(defaults.catTreat.commonPaint, 0);
assert.equal(defaults.monthlySignInDiamonds, 315);

const selectedMonthlyCard = calculateIncomeCards(
  "2026-07-01",
  "2026-08-01",
  315,
  rules,
  {
    ...defaultSelections,
    monthlyCardSelected: true,
    monthlyCardAdjustment: -1,
  },
);
assert.equal(selectedMonthlyCard.monthlyCard.basePurchases, 2);
assert.equal(selectedMonthlyCard.monthlyCard.actualPurchases, 1);
assert.equal(selectedMonthlyCard.monthlyCard.dailyDiamonds, 1550);
assert.equal(selectedMonthlyCard.monthlyCard.purchaseDiamonds, 300);
assert.equal(selectedMonthlyCard.monthlyCard.purchaseAmountRmb, 30);
assert.equal(
  selectedMonthlyCard.monthlyCard.countsTowardLimitedRecharge,
  true,
);
assert.equal(selectedMonthlyCard.monthlyCard.totalDiamonds, 1850);
assert.equal(selectedMonthlyCard.monthlySignInDiamonds, 630);

const clampedMonthlyCard = calculateIncomeCards(
  "2026-07-01",
  "2026-07-31",
  315,
  rules,
  {
    ...defaultSelections,
    monthlyCardSelected: true,
    monthlyCardAdjustment: -10,
  },
);
assert.equal(clampedMonthlyCard.monthlyCard.actualPurchases, 0);
assert.equal(clampedMonthlyCard.monthlyCard.purchaseDiamonds, 0);
assert.equal(clampedMonthlyCard.monthlyCard.purchaseAmountRmb, 0);

const seasonalHoldingOnly = calculateIncomeCards(
  "2026-07-01",
  "2026-07-11",
  0,
  rules,
  {
    ...defaultSelections,
    seasonalCardSelected: true,
  },
);
assert.equal(seasonalHoldingOnly.seasonalCard.dailyDiamonds, 500);
assert.equal(seasonalHoldingOnly.seasonalCard.totalDiamonds, 500);

const includesTargetTwentyThird = calculateIncomeCards(
  "2026-07-22",
  "2026-07-23",
  0,
  rules,
  {
    ...defaultSelections,
    annualCardSelected: true,
    catTreatSelected: true,
  },
);
assert.equal(includesTargetTwentyThird.annualCard.rewardCount, 1);
assert.equal(includesTargetTwentyThird.annualCard.commonPaint, 5);
assert.equal(includesTargetTwentyThird.catTreat.rewardCount, 1);
assert.equal(includesTargetTwentyThird.catTreat.commonPaint, 1);

const excludesCurrentTwentyThird = calculateIncomeCards(
  "2026-07-23",
  "2026-08-22",
  0,
  rules,
  {
    ...defaultSelections,
    annualCardSelected: true,
    catTreatSelected: true,
  },
);
assert.equal(excludesCurrentTwentyThird.annualCard.rewardCount, 0);
assert.equal(excludesCurrentTwentyThird.catTreat.rewardCount, 0);

const crossesTwoTwentyThirds = calculateIncomeCards(
  "2026-07-22",
  "2026-08-23",
  0,
  rules,
  {
    ...defaultSelections,
    annualCardSelected: true,
    catTreatSelected: true,
  },
);
assert.equal(crossesTwoTwentyThirds.annualCard.rewardCount, 2);
assert.equal(crossesTwoTwentyThirds.annualCard.commonPaint, 10);
assert.equal(crossesTwoTwentyThirds.catTreat.commonPaint, 2);

const invalidAdjustment = calculateIncomeCards(
  "2026-07-01",
  "2026-07-31",
  0,
  rules,
  {
    ...defaultSelections,
    monthlyCardAdjustment: 0.5,
  },
);
assert.equal(invalidAdjustment.valid, false);

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

const loadIncomeCardRules = vm.runInContext(
  "loadIncomeCardRules",
  loaderContext,
);

(async () => {
  const loadedRules = await loadIncomeCardRules();

  assert.equal(requestedPaths[0], "data/constants.json");
  assert.equal(loadedRules.monthlyCard.dailyDiamonds, 50);
  assert.equal(loadedRules.monthlyCard.priceRmb, 30);
  assert.equal(loadedRules.monthlyCard.countsTowardLimitedRecharge, true);
  assert.equal(loadedRules.seasonalCard.dailyDiamonds, 50);
  assert.equal("purchaseDiamonds" in loadedRules.seasonalCard, false);
  assert.equal(loadedRules.annualCard.commonPaint, 5);
  assert.equal(loadedRules.catTreat.commonPaint, 1);
  console.log("income cards: calculation tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
