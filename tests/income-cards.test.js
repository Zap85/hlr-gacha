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
const parseInventoryAmount = vm.runInContext(
  "parseInventoryAmount",
  calculatorContext,
);
const indexHtml = readProjectFile("index.html");

const defaultSelections = {
  monthlyCardSelected: false,
  monthlyCardRemainingDays: 0,
  monthlyCardExtraPurchases: 0,
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
assert.equal(defaults.monthlyCard.requiredPurchases, 0);
assert.equal(defaults.monthlyCard.extraPurchases, 0);
assert.equal(defaults.monthlyCard.purchaseCount, 0);
assert.equal(defaults.monthlyCard.dailyDiamonds, 0);
assert.equal(defaults.monthlyCard.purchaseDiamonds, 0);
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
    monthlyCardRemainingDays: 1,
  },
);
assert.equal(selectedMonthlyCard.monthlyCard.monthlyIncomeDays, 31);
assert.equal(selectedMonthlyCard.monthlyCard.existingCoveredDays, 1);
assert.equal(selectedMonthlyCard.monthlyCard.requiredPurchases, 1);
assert.equal(selectedMonthlyCard.monthlyCard.purchaseCount, 1);
assert.equal(selectedMonthlyCard.monthlyCard.dailyDiamonds, 1550);
assert.equal(selectedMonthlyCard.monthlyCard.purchaseDiamonds, 300);
assert.equal(selectedMonthlyCard.monthlyCard.purchaseAmountRmb, 30);
assert.equal(
  selectedMonthlyCard.monthlyCard.countsTowardLimitedRecharge,
  true,
);
assert.equal(selectedMonthlyCard.monthlyCard.totalDiamonds, 1850);
assert.equal(selectedMonthlyCard.monthlySignInDiamonds, 630);

const zeroRemainingDoesNotCoverToday = calculateIncomeCards(
  "2026-07-01",
  "2026-07-01",
  0,
  rules,
  {
    ...defaultSelections,
    monthlyCardSelected: true,
    monthlyCardRemainingDays: 0,
  },
  false,
);
assert.equal(zeroRemainingDoesNotCoverToday.monthlyCard.monthlyIncomeDays, 1);
assert.equal(zeroRemainingDoesNotCoverToday.monthlyCard.existingCoveredDays, 0);
assert.equal(zeroRemainingDoesNotCoverToday.monthlyCard.requiredPurchases, 1);

const claimedPositiveRemaining = calculateIncomeCards(
  "2026-07-01",
  "2026-07-11",
  0,
  rules,
  {
    ...defaultSelections,
    monthlyCardSelected: true,
    monthlyCardRemainingDays: 5,
  },
  true,
);
assert.equal(claimedPositiveRemaining.monthlyCard.monthlyIncomeDays, 10);
assert.equal(claimedPositiveRemaining.monthlyCard.existingCoveredDays, 5);
assert.equal(claimedPositiveRemaining.monthlyCard.requiredPurchases, 1);

const unclaimedPositiveRemaining = calculateIncomeCards(
  "2026-07-01",
  "2026-07-11",
  0,
  rules,
  {
    ...defaultSelections,
    monthlyCardSelected: true,
    monthlyCardRemainingDays: 10,
  },
  false,
);
assert.equal(unclaimedPositiveRemaining.monthlyCard.monthlyIncomeDays, 11);
assert.equal(unclaimedPositiveRemaining.monthlyCard.existingCoveredDays, 11);
assert.equal(unclaimedPositiveRemaining.monthlyCard.requiredPurchases, 0);

const enoughRemainingDays = calculateIncomeCards(
  "2026-07-01",
  "2026-07-31",
  315,
  rules,
  {
    ...defaultSelections,
    monthlyCardSelected: true,
    monthlyCardRemainingDays: 30,
  },
);
assert.equal(enoughRemainingDays.monthlyCard.requiredPurchases, 0);
assert.equal(enoughRemainingDays.monthlyCard.purchaseCount, 0);
assert.equal(enoughRemainingDays.monthlyCard.purchaseDiamonds, 0);
assert.equal(enoughRemainingDays.monthlyCard.purchaseAmountRmb, 0);

const lessThanThirtyDaysUncovered = calculateIncomeCards(
  "2026-07-01",
  "2026-07-31",
  0,
  rules,
  {
    ...defaultSelections,
    monthlyCardSelected: true,
    monthlyCardRemainingDays: 1,
  },
);
assert.equal(lessThanThirtyDaysUncovered.monthlyCard.requiredPurchases, 1);

const multipleRequiredPurchases = calculateIncomeCards(
  "2026-07-01",
  "2026-09-15",
  0,
  rules,
  {
    ...defaultSelections,
    monthlyCardSelected: true,
    monthlyCardRemainingDays: 1,
  },
);
assert.equal(multipleRequiredPurchases.monthlyCard.monthlyIncomeDays, 76);
assert.equal(multipleRequiredPurchases.monthlyCard.requiredPurchases, 3);

const extraPurchases = calculateIncomeCards(
  "2026-07-01",
  "2026-07-31",
  0,
  rules,
  {
    ...defaultSelections,
    monthlyCardSelected: true,
    monthlyCardRemainingDays: 30,
    monthlyCardExtraPurchases: 2,
  },
);
assert.equal(extraPurchases.monthlyCard.requiredPurchases, 0);
assert.equal(extraPurchases.monthlyCard.extraPurchases, 2);
assert.equal(extraPurchases.monthlyCard.purchaseCount, 2);
assert.equal(extraPurchases.monthlyCard.purchaseDiamonds, 600);
assert.equal(extraPurchases.monthlyCard.purchaseAmountRmb, 60);

const unselectedExtraPurchases = calculateIncomeCards(
  "2026-07-01",
  "2026-07-31",
  0,
  rules,
  {
    ...defaultSelections,
    monthlyCardExtraPurchases: 2,
  },
);
assert.equal(unselectedExtraPurchases.monthlyCard.requiredPurchases, 0);
assert.equal(unselectedExtraPurchases.monthlyCard.extraPurchases, 0);
assert.equal(unselectedExtraPurchases.monthlyCard.purchaseCount, 0);
assert.equal(unselectedExtraPurchases.monthlyCard.purchaseDiamonds, 0);
assert.equal(unselectedExtraPurchases.monthlyCard.purchaseAmountRmb, 0);

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

const includesCurrentTwentyThird = calculateIncomeCards(
  "2026-07-23",
  "2026-08-22",
  0,
  rules,
  {
    ...defaultSelections,
    annualCardSelected: true,
    catTreatSelected: true,
  },
  false,
);
assert.equal(includesCurrentTwentyThird.annualCard.rewardCount, 1);
assert.equal(includesCurrentTwentyThird.annualCard.commonPaint, 5);
assert.equal(includesCurrentTwentyThird.catTreat.rewardCount, 1);
assert.equal(includesCurrentTwentyThird.catTreat.commonPaint, 1);

const sameDayCardsClaimed = calculateIncomeCards(
  "2026-07-01",
  "2026-07-01",
  0,
  rules,
  {
    ...defaultSelections,
    monthlyCardSelected: true,
    seasonalCardSelected: true,
  },
  true,
);
const sameDayCardsUnclaimed = calculateIncomeCards(
  "2026-07-01",
  "2026-07-01",
  30,
  rules,
  {
    ...defaultSelections,
    monthlyCardSelected: true,
    seasonalCardSelected: true,
  },
  false,
);
assert.equal(sameDayCardsClaimed.monthlyCard.dailyDiamonds, 0);
assert.equal(sameDayCardsClaimed.seasonalCard.dailyDiamonds, 0);
assert.equal(sameDayCardsUnclaimed.monthlyCard.dailyDiamonds, 50);
assert.equal(sameDayCardsUnclaimed.seasonalCard.dailyDiamonds, 50);
assert.equal(sameDayCardsUnclaimed.monthlySignInDiamonds, 60);

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

const invalidExtraPurchases = calculateIncomeCards(
  "2026-07-01",
  "2026-07-31",
  0,
  rules,
  {
    ...defaultSelections,
    monthlyCardExtraPurchases: -1,
  },
);
assert.equal(invalidExtraPurchases.valid, false);

const invalidRemainingDays = calculateIncomeCards(
  "2026-07-01",
  "2026-07-31",
  0,
  rules,
  {
    ...defaultSelections,
    monthlyCardRemainingDays: -1,
  },
);
assert.equal(invalidRemainingDays.valid, false);

const appContext = vm.createContext({ parseInventoryAmount });
vm.runInContext(readProjectFile(path.join("js", "app.js")), appContext);
const updateMonthlyCardInputState = vm.runInContext(
  "updateMonthlyCardInputState",
  appContext,
);
const incomeCardSelections = vm.runInContext(
  "incomeCardSelections",
  appContext,
);
assert.equal(
  updateMonthlyCardInputState("monthlyCardExtraPurchases", "2").valid,
  true,
);
assert.equal(incomeCardSelections.monthlyCardExtraPurchases, 2);
assert.equal(
  updateMonthlyCardInputState("monthlyCardExtraPurchases", "-1").valid,
  false,
);
assert.equal(incomeCardSelections.monthlyCardExtraPurchases, 2);

assert.match(indexHtml, /id="monthly-card-remaining-days"[^>]*min="0"/);
assert.match(indexHtml, /id="monthly-card-extra-purchases"[^>]*min="0"/);
assert.match(indexHtml, /额外购买一张月卡可提前拿到300钻石/);
assert.doesNotMatch(
  indexHtml,
  /基础购买张数|实际购买张数|monthly-card-adjustment/,
);

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
