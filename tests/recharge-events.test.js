"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

const calculatorContext = vm.createContext({ Date });
vm.runInContext(
  readProjectFile(path.join("js", "calculator.js")),
  calculatorContext,
);

const calculateIncomeCards = vm.runInContext(
  "calculateIncomeCards",
  calculatorContext,
);
const getIntersectingRechargeEvents = vm.runInContext(
  "getIntersectingRechargeEvents",
  calculatorContext,
);
const calculateEventPackLimitedRechargeRmb = vm.runInContext(
  "calculateEventPackLimitedRechargeRmb",
  calculatorContext,
);
const calculateMonthlyCardRechargeEligibility = vm.runInContext(
  "calculateMonthlyCardRechargeEligibility",
  calculatorContext,
);
const calculateLimitedRechargeSummary = vm.runInContext(
  "calculateLimitedRechargeSummary",
  calculatorContext,
);

const constants = JSON.parse(
  readProjectFile(path.join("data", "constants.json")),
).constants;
const rechargeEvents = JSON.parse(
  readProjectFile(
    path.join("data", "recharge-events", "recharge-events.json"),
  ),
);
const indexHtml = readProjectFile("index.html");

function isValidCalendarDate(value) {
  if (typeof value !== "string") {
    return false;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);

  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

assert.equal(
  new Set(rechargeEvents.map((event) => event.id)).size,
  rechargeEvents.length,
);
assert.equal(
  rechargeEvents.every(
    (event) =>
      typeof event.id === "string" &&
      event.id.trim() !== "" &&
      typeof event.name === "string" &&
      event.name.trim() !== "" &&
      isValidCalendarDate(event.startDate) &&
      isValidCalendarDate(event.endDate) &&
      event.startDate <= event.endDate,
  ),
  true,
);
assert.match(indexHtml, /<h2[^>]*>资源总计<\/h2>/);
assert.match(indexHtml, /<h2[^>]*>氪金总计<\/h2>/);
assert.ok(indexHtml.indexOf("资源总计") < indexHtml.indexOf("氪金总计"));
assert.match(indexHtml, /id="recharge-event-select"/);
assert.match(indexHtml, /id="monthly-card-recharge-quantity"/);
assert.match(indexHtml, /id="limited-recharge-rmb">¥0<\/output>/);
assert.doesNotMatch(indexHtml, /id="pre-conversion-rmb-total"/);
assert.doesNotMatch(
  indexHtml,
  /id="pre-conversion-limited-recharge-rmb"/,
);

const earlyRecharge = {
  id: "early",
  name: "较早累充",
  startDate: "2026-01-10",
  endDate: "2026-01-20",
};
const lateRecharge = {
  id: "late",
  name: "较晚累充",
  startDate: "2026-03-21",
  endDate: "2026-03-30",
};
const outsideRecharge = {
  id: "outside",
  name: "区间外累充",
  startDate: "2026-05-01",
  endDate: "2026-05-05",
};

const oneAvailable = getIntersectingRechargeEvents(
  [outsideRecharge, lateRecharge],
  "2026-03-01",
  "2026-04-10",
);
assert.equal(oneAvailable.valid, true);
assert.deepEqual(
  Array.from(oneAvailable.events, (event) => event.id),
  ["late"],
);

const multipleAvailable = getIntersectingRechargeEvents(
  [lateRecharge, earlyRecharge],
  "2026-01-01",
  "2026-04-10",
);
assert.deepEqual(
  Array.from(multipleAvailable.events, (event) => event.id),
  ["early", "late"],
);

const noRechargeSummary = calculateLimitedRechargeSummary();
assert.equal(noRechargeSummary.valid, true);
assert.equal(noRechargeSummary.limitedRechargeRmb, 0);

const eventPack = {
  id: "测试活动礼包",
  startDate: "2026-09-03",
  endDate: "2026-09-09",
  packs: [
    {
      id: "总限购礼包",
      price: 10,
      countsTowardLimitedRecharge: true,
      purchaseRule: { type: "total", limit: 2 },
    },
    {
      id: "每日礼包",
      price: 6,
      countsTowardLimitedRecharge: true,
      purchaseRule: { type: "daily", limit: 1 },
    },
  ],
};
const eventPackPurchases = {
  "测试活动礼包": {
    "总限购礼包": { selected: true, quantity: 2 },
    "每日礼包": { selected: true, quantity: 5 },
  },
};
const overlappingRecharge = {
  id: "活动累充",
  name: "活动累充",
  startDate: "2026-09-05",
  endDate: "2026-09-07",
};

const eventPackRecharge = calculateEventPackLimitedRechargeRmb(
  [eventPack],
  eventPackPurchases,
  "2026-09-01",
  "2026-09-10",
  overlappingRecharge,
);
assert.equal(eventPackRecharge.valid, true);
assert.equal(eventPackRecharge.amount, 38);

const nonOverlappingEventPackRecharge =
  calculateEventPackLimitedRechargeRmb(
    [eventPack],
    eventPackPurchases,
    "2026-09-01",
    "2026-10-10",
    {
      id: "十月累充",
      name: "十月累充",
      startDate: "2026-10-01",
      endDate: "2026-10-05",
    },
  );
assert.equal(nonOverlappingEventPackRecharge.amount, 0);

const monthlyCardResult = calculateIncomeCards(
  "2026-01-01",
  "2026-04-10",
  0,
  constants.incomeCards,
  {
    monthlyCardSelected: true,
    monthlyCardRemainingDays: 0,
    monthlyCardExtraPurchases: 3,
    seasonalCardSelected: false,
    annualCardSelected: false,
    catTreatSelected: false,
  },
  false,
);
assert.equal(monthlyCardResult.monthlyCard.monthlyIncomeDays, 100);
assert.equal(monthlyCardResult.monthlyCard.requiredPurchases, 4);
assert.equal(monthlyCardResult.monthlyCard.extraPurchases, 3);

const lateMonthlyEligibility =
  calculateMonthlyCardRechargeEligibility({
    currentDate: "2026-01-01",
    targetDate: "2026-04-10",
    rechargeEvent: lateRecharge,
    monthlyCard: monthlyCardResult.monthlyCard,
    todayIncomeClaimed: false,
    durationDays: 30,
  });
assert.equal(lateMonthlyEligibility.valid, true);
assert.equal(lateMonthlyEligibility.eligibleRequiredPurchases, 1);
assert.equal(lateMonthlyEligibility.extraPurchases, 3);
assert.equal(lateMonthlyEligibility.maximumQuantity, 4);

const laterMonthlyEligibility =
  calculateMonthlyCardRechargeEligibility({
    currentDate: "2026-01-01",
    targetDate: "2026-04-10",
    rechargeEvent: {
      id: "later",
      name: "更晚累充",
      startDate: "2026-04-05",
      endDate: "2026-04-08",
    },
    monthlyCard: monthlyCardResult.monthlyCard,
    todayIncomeClaimed: false,
    durationDays: 30,
  });
assert.equal(laterMonthlyEligibility.eligibleRequiredPurchases, 0);
assert.equal(laterMonthlyEligibility.maximumQuantity, 3);

const combinedSummary = calculateLimitedRechargeSummary({
  rechargeEvent: overlappingRecharge,
  currentDate: "2026-09-01",
  targetDate: "2026-09-10",
  permanentPackPurchases: [
    { price: 12, countsTowardLimitedRecharge: true },
    { price: 6, countsTowardLimitedRecharge: false },
  ],
  eventPacks: [eventPack],
  eventPackPurchaseState: eventPackPurchases,
  monthlyCardRechargeQuantity: 4,
  monthlyCardRechargeMaximum: 4,
  monthlyCardPrice: 30,
});
assert.equal(combinedSummary.permanentPackRmb, 12);
assert.equal(combinedSummary.eventPackRmb, 38);
assert.equal(combinedSummary.monthlyCardRmb, 120);
assert.equal(combinedSummary.limitedRechargeRmb, 170);

assert.equal(
  calculateLimitedRechargeSummary({
    rechargeEvent: overlappingRecharge,
    monthlyCardRechargeQuantity: 5,
    monthlyCardRechargeMaximum: 4,
    monthlyCardPrice: 30,
  }).valid,
  false,
);

const loaderContext = vm.createContext({ Date });
vm.runInContext(
  readProjectFile(path.join("js", "data-loader.js")),
  loaderContext,
);
const loadRechargeEvents = vm.runInContext(
  "loadRechargeEvents",
  loaderContext,
);
const isValidRechargeEvent = vm.runInContext(
  "isValidRechargeEvent",
  loaderContext,
);

assert.equal(isValidRechargeEvent(earlyRecharge), true);
assert.equal(
  isValidRechargeEvent({ ...earlyRecharge, startDate: "invalid" }),
  false,
);

const requestedPaths = [];
loaderContext.fetch = async (requestedPath) => {
  requestedPaths.push(requestedPath);
  return {
    ok: true,
    json: async () => [
      lateRecharge,
      earlyRecharge,
      { ...earlyRecharge, name: "重复 ID" },
      { ...outsideRecharge, endDate: "invalid" },
    ],
  };
};

(async () => {
  const loaded = await loadRechargeEvents();
  assert.deepEqual(
    Array.from(loaded, (rechargeEvent) => rechargeEvent.id),
    ["late", "early"],
  );
  assert.deepEqual(requestedPaths, [
    "data/recharge-events/recharge-events.json",
  ]);
  console.log("recharge events: data, calculation, and UI structure tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
