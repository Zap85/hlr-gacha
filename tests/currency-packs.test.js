"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

const currencyPackData = JSON.parse(
  readProjectFile(
    path.join("data", "packs", "currency-packs", "庄园诡戏.json"),
  ),
);
const anniversaryCurrencyPackData = JSON.parse(
  readProjectFile(
    path.join("data", "packs", "currency-packs", "六周年.json"),
  ),
);
const resourceTypeData = JSON.parse(
  readProjectFile(path.join("data", "resources", "resource-types.json")),
);
const resourceInstanceData = JSON.parse(
  readProjectFile(path.join("data", "resources", "resources.json")),
);
const eventData = JSON.parse(
  readProjectFile(path.join("data", "events", "events.json")),
);
const constantsData = JSON.parse(
  readProjectFile(path.join("data", "constants.json")),
);
const indexHtml = readProjectFile("index.html");
const appJavaScript = readProjectFile(path.join("js", "app.js"));
const dateRangeFormatterSource = appJavaScript.match(
  /function formatEventPackGroupDateRange[\s\S]*?\n}/,
)[0];
const calculatorContext = vm.createContext({});
const displayGroupingSource = appJavaScript.match(
  /function getCurrencyPackDisplayGroupName[\s\S]*?\n}\n\nfunction formatCurrencyPackTypeHeading[\s\S]*?\n}/,
)[0];
const displayGroupingContext = vm.createContext({});

vm.runInContext(
  `${dateRangeFormatterSource}\n${displayGroupingSource}`,
  displayGroupingContext,
);

vm.runInContext(
  readProjectFile(path.join("js", "calculator.js")),
  calculatorContext,
);

const isCurrencyPackVisible = vm.runInContext(
  "isCurrencyPackVisible",
  calculatorContext,
);
const getDisplayableCurrencyPacks = vm.runInContext(
  "getDisplayableCurrencyPacks",
  calculatorContext,
);
const groupCurrencyPackItems = vm.runInContext(
  "groupCurrencyPackItems",
  calculatorContext,
);
const createCurrencyPackPurchaseState = vm.runInContext(
  "createCurrencyPackPurchaseState",
  calculatorContext,
);
const updateCurrencyPackPurchase = vm.runInContext(
  "updateCurrencyPackPurchase",
  calculatorContext,
);
const calculateCurrencyPackPurchaseSummary = vm.runInContext(
  "calculateCurrencyPackPurchaseSummary",
  calculatorContext,
);
const calculateFinalResourceTotals = vm.runInContext(
  "calculateFinalResourceTotals",
  calculatorContext,
);
const calculateCurrencyPackWeeklyAvailability = vm.runInContext(
  "calculateCurrencyPackWeeklyAvailability",
  calculatorContext,
);
const getCurrencyPacksForMonthlyCard = vm.runInContext(
  "getCurrencyPacksForMonthlyCard",
  calculatorContext,
);
const getCurrencyPackMaximumQuantity = vm.runInContext(
  "getCurrencyPackMaximumQuantity",
  calculatorContext,
);
const synchronizeCurrencyPackPurchaseState = vm.runInContext(
  "synchronizeCurrencyPackPurchaseState",
  calculatorContext,
);
const groupCurrencyPacksForDisplay = vm.runInContext(
  "groupCurrencyPacksForDisplay",
  displayGroupingContext,
);
const formatCurrencyPackDisplayGroupHeading = vm.runInContext(
  "formatCurrencyPackDisplayGroupHeading",
  displayGroupingContext,
);
const formatCurrencyPackTypeHeading = vm.runInContext(
  "formatCurrencyPackTypeHeading",
  displayGroupingContext,
);
const packs = currencyPackData.packs;
const resourceInstances = resourceInstanceData.resources;
const monthlyCardConfig =
  constantsData.constants.incomeCards.monthlyCard.weeklyDiscountCurrencyPack;
const manorBanner = { id: "庄园诡戏", tags: [] };
const otherBanner = { id: "六周年庆典", tags: [] };
const anniversaryBanner = { id: "六周年庆典", tags: [] };
const anniversaryPreheatPack = anniversaryCurrencyPackData.find(
  (currencyPack) => currencyPack.id === "六周年预热钻石红钻礼包",
);
const anniversaryDiamondPack = anniversaryCurrencyPackData.find(
  (currencyPack) => currencyPack.id === "六周年钻石礼包",
);
const anniversaryRedDiamondPack = anniversaryCurrencyPackData.find(
  (currencyPack) => currencyPack.id === "六周年红钻礼包",
);

assert.equal(anniversaryCurrencyPackData.length, 3);
assert.ok(anniversaryPreheatPack);
assert.ok(anniversaryDiamondPack);
assert.ok(anniversaryRedDiamondPack);
assert.deepEqual(
  Array.from(
    groupCurrencyPacksForDisplay(anniversaryCurrencyPackData),
    (group) => ({
      name: group.name,
      currencyPackIds: Array.from(
        group.currencyPacks,
        (currencyPack) => currencyPack.id,
      ),
    }),
  ),
  [
    {
      name: "六周年预热",
      currencyPackIds: ["六周年预热钻石红钻礼包"],
    },
    {
      name: "六周年活动",
      currencyPackIds: ["六周年钻石礼包", "六周年红钻礼包"],
    },
  ],
);
const fullAnniversaryDisplayGroups = groupCurrencyPacksForDisplay(
  anniversaryCurrencyPackData,
);
assert.equal(
  formatCurrencyPackDisplayGroupHeading(fullAnniversaryDisplayGroups[0]),
  "六周年预热（09.17-09.23）",
);
assert.equal(
  formatCurrencyPackDisplayGroupHeading(fullAnniversaryDisplayGroups[1]),
  "六周年活动",
);
assert.equal(
  formatCurrencyPackTypeHeading(
    "钻石礼包",
    anniversaryDiamondPack,
    true,
  ),
  "钻石礼包（09.19-10.12）",
);
assert.equal(
  formatCurrencyPackTypeHeading(
    "红钻礼包",
    anniversaryRedDiamondPack,
    true,
  ),
  "红钻礼包（09.24-10.12）",
);

const anniversaryGroupsOnSeptember19 = groupCurrencyPacksForDisplay(
  getDisplayableCurrencyPacks(
    anniversaryCurrencyPackData,
    "2026-09-19",
    "2026-09-19",
  ),
);
assert.deepEqual(
  Array.from(anniversaryGroupsOnSeptember19, (group) => group.name),
  ["六周年预热", "六周年活动"],
);
assert.deepEqual(
  Array.from(
    groupCurrencyPackItems(
      anniversaryGroupsOnSeptember19.find(
        (group) => group.name === "六周年活动",
      ).currencyPacks[0],
      "2026-09-19",
      anniversaryBanner,
      resourceInstances,
    ).red_diamond,
  ),
  [],
);

const anniversaryGroupsOnSeptember24 = groupCurrencyPacksForDisplay(
  getDisplayableCurrencyPacks(
    anniversaryCurrencyPackData,
    "2026-09-24",
    "2026-09-24",
  ),
);
assert.deepEqual(
  Array.from(anniversaryGroupsOnSeptember24, (group) => ({
    name: group.name,
    currencyPackIds: Array.from(
      group.currencyPacks,
      (currencyPack) => currencyPack.id,
    ),
  })),
  [
    {
      name: "六周年活动",
      currencyPackIds: ["六周年钻石礼包", "六周年红钻礼包"],
    },
  ],
);

const singleCharacterPack = anniversaryPreheatPack.packs.find(
  (pack) => pack.id === "一杯一杯单人包",
);
assert.deepEqual(singleCharacterPack.purchaseRule, {
  type: "total",
  limit: 5,
});

const anniversaryGiftPacks = anniversaryDiamondPack.packs.filter(
  (pack) => pack.id === "六周年礼物包",
);
assert.equal(anniversaryGiftPacks.length, 1);
assert.deepEqual(anniversaryGiftPacks[0].purchaseRule, {
  type: "total",
  limit: 5,
});

const blindBox = anniversaryPreheatPack.packs.find(
  (pack) => pack.id === "快乐收藏盲盒",
);
const coffeeDelivery = anniversaryRedDiamondPack.packs.find(
  (pack) => pack.id === "咖啡外送订单",
);
assert.deepEqual(blindBox.purchaseRule, { type: "daily", limit: 30 });
assert.deepEqual(coffeeDelivery.purchaseRule, { type: "daily", limit: 3 });
assert.equal(
  getCurrencyPackMaximumQuantity(
    blindBox,
    anniversaryPreheatPack,
    "2026-09-20",
    "2026-09-23",
  ),
  120,
);
assert.equal(
  getCurrencyPackMaximumQuantity(
    coffeeDelivery,
    anniversaryRedDiamondPack,
    "2026-09-24",
    "2026-09-26",
  ),
  9,
);
assert.deepEqual(
  anniversaryPreheatPack.packs.find(
    (pack) => pack.id === "旅途伙伴贴纸包",
  ).prerequisites,
  ["仅售五钻海螺肉"],
);
assert.deepEqual(
  anniversaryPreheatPack.packs.find(
    (pack) => pack.id === "日常伙伴贴纸包",
  ).prerequisites,
  ["仅售五钻海螺肉"],
);

assert.equal(monthlyCardConfig.name, "月卡");
assert.equal(monthlyCardConfig.pack.name, "每周优惠十连");
assert.deepEqual(monthlyCardConfig.pack.cost, {
  resourceId: "diamond",
  amount: 1200,
});
assert.deepEqual(monthlyCardConfig.pack.contents, [
  { resourceId: "common_paint", amount: 10 },
]);
assert.deepEqual(monthlyCardConfig.pack.purchaseRule, {
  type: "weekly",
  limit: 1,
});

const monthlyCardCurrencyPacks = getCurrencyPacksForMonthlyCard(
  [currencyPackData],
  monthlyCardConfig,
  true,
  "2026-08-30",
  "2026-09-02",
);
assert.equal(monthlyCardCurrencyPacks[0].name, "月卡");
assert.equal(monthlyCardCurrencyPacks[1].id, currencyPackData.id);
assert.equal(
  getCurrencyPacksForMonthlyCard(
    [currencyPackData],
    monthlyCardConfig,
    false,
    "2026-08-30",
    "2026-09-02",
  ).some((currencyPack) => currencyPack.source === "monthly_card"),
  false,
);
assert.equal(
  calculateCurrencyPackWeeklyAvailability(
    "2026-08-24",
    "2026-08-30",
    {
      startDate: "2026-08-24",
      endDate: "2026-08-30",
    },
    1,
  ).maximumQuantity,
  1,
);
assert.equal(
  calculateCurrencyPackWeeklyAvailability(
    "2026-08-30",
    "2026-08-31",
    {
      startDate: "2026-08-30",
      endDate: "2026-08-31",
    },
    1,
  ).maximumQuantity,
  2,
);
assert.equal(
  getCurrencyPackMaximumQuantity(
    monthlyCardConfig.pack,
    monthlyCardCurrencyPacks[0],
    "2026-08-30",
    "2026-09-02",
  ),
  2,
);

const defaultMonthlyPurchaseState = synchronizeCurrencyPackPurchaseState(
  monthlyCardCurrencyPacks,
  createCurrencyPackPurchaseState([currencyPackData]),
  "2026-08-30",
  "2026-09-02",
);
assert.deepEqual(
  {
    ...defaultMonthlyPurchaseState[monthlyCardCurrencyPacks[0].id][
      monthlyCardConfig.pack.id
    ],
  },
  { selected: true, quantity: 2 },
);

defaultMonthlyPurchaseState[monthlyCardCurrencyPacks[0].id][
  monthlyCardConfig.pack.id
] = { selected: true, quantity: 1 };
const preservedMonthlyQuantity = synchronizeCurrencyPackPurchaseState(
  monthlyCardCurrencyPacks,
  defaultMonthlyPurchaseState,
  "2026-08-30",
  "2026-09-02",
);
assert.deepEqual(
  {
    ...preservedMonthlyQuantity[monthlyCardCurrencyPacks[0].id][
      monthlyCardConfig.pack.id
    ],
  },
  { selected: true, quantity: 1 },
);

preservedMonthlyQuantity[monthlyCardCurrencyPacks[0].id][
  monthlyCardConfig.pack.id
] = { selected: false, quantity: 0 };
const preservedMonthlyCancellation = synchronizeCurrencyPackPurchaseState(
  monthlyCardCurrencyPacks,
  preservedMonthlyQuantity,
  "2026-08-30",
  "2026-09-02",
);
assert.deepEqual(
  {
    ...preservedMonthlyCancellation[monthlyCardCurrencyPacks[0].id][
      monthlyCardConfig.pack.id
    ],
  },
  { selected: false, quantity: 0 },
);

const stateAfterMonthlyCardDisabled =
  synchronizeCurrencyPackPurchaseState(
    [currencyPackData],
    preservedMonthlyCancellation,
    "2026-08-30",
    "2026-09-02",
  );
assert.equal(
  monthlyCardCurrencyPacks[0].id in stateAfterMonthlyCardDisabled,
  false,
);
const reenabledMonthlyPurchaseState = synchronizeCurrencyPackPurchaseState(
  monthlyCardCurrencyPacks,
  stateAfterMonthlyCardDisabled,
  "2026-08-30",
  "2026-09-02",
);
assert.deepEqual(
  {
    ...reenabledMonthlyPurchaseState[monthlyCardCurrencyPacks[0].id][
      monthlyCardConfig.pack.id
    ],
  },
  { selected: true, quantity: 2 },
);

assert.equal(currencyPackData.id, "庄园诡戏钻石红钻礼包");
assert.equal(currencyPackData.eventId, "庄园诡戏");
assert.equal(
  eventData.events.some((event) => event.id === currencyPackData.eventId),
  true,
);
assert.equal(packs.length, 6);
assert.equal(new Set(packs.map((pack) => pack.id)).size, 6);
assert.equal(
  packs.every(
    (pack) =>
      !("price" in pack) && !("countsTowardLimitedRecharge" in pack),
  ),
  true,
);

const diamondPacks = packs.filter(
  (pack) => pack.cost.resourceId === "diamond",
);
const redDiamondPacks = packs.filter(
  (pack) => pack.cost.resourceId === "red_diamond",
);
assert.equal(diamondPacks.length, 2);
assert.equal(redDiamondPacks.length, 4);
assert.equal(
  packs.find((pack) => pack.id === "星空溯尘礼包").purchaseRule.limit,
  10,
);
assert.equal(
  packs
    .filter((pack) => pack.id !== "星空溯尘礼包")
    .every((pack) => pack.purchaseRule.limit === 1),
  true,
);

assert.match(indexHtml, /<summary[^>]*>钻石 \/ 红钻礼包<\/summary>/);
assert.match(indexHtml, /<details class="pack-disclosure currency-packs-disclosure">/);
assert.doesNotMatch(
  indexHtml,
  /<details class="pack-disclosure currency-packs-disclosure" open>/,
);
assert.doesNotMatch(
  indexHtml,
  /currency-pack-summary|currency-pack-diamond-cost|currency-pack-red-diamond-cost|after-currency-pack-/,
);
assert.ok(
  indexHtml.indexOf('id="currency-packs-error"') <
    indexHtml.indexOf('id="currency-pack-groups"'),
);
assert.match(appJavaScript, /随机奖励：/);
assert.match(appJavaScript, /期望抽数/);
assert.match(appJavaScript, /期望单抽红钻价/);
assert.match(appJavaScript, /if \(packEntries\.length === 0\) \{/);

assert.equal(
  isCurrencyPackVisible("2026-08-28", "2026-09-10", currencyPackData),
  true,
);
assert.equal(
  isCurrencyPackVisible("2026-08-01", "2026-08-25", currencyPackData),
  false,
);
assert.equal(
  isCurrencyPackVisible("2026-09-03", "2026-09-10", currencyPackData),
  false,
);
assert.equal(
  isCurrencyPackVisible("2026-08-20", "2026-08-26", currencyPackData),
  true,
);
assert.equal(
  isCurrencyPackVisible("2026-09-02", "2026-09-02", currencyPackData),
  true,
);
assert.equal(
  getDisplayableCurrencyPacks(
    [currencyPackData],
    "2026-08-28",
    "2026-09-10",
  ).length,
  1,
);

const grouped = groupCurrencyPackItems(
  currencyPackData,
  "2026-09-02",
  manorBanner,
  resourceInstances,
);
assert.equal(grouped.diamond.length, 2);
assert.equal(grouped.red_diamond.length, 4);
assert.equal(
  grouped.diamond.every(
    (result) =>
      result.theoreticalPulls === null &&
      result.redDiamondPerPull === null,
  ),
  true,
);
assert.deepEqual(
  Array.from(grouped.red_diamond, (result) => result.pack.id),
  [
    "庄园颜料特惠包",
    "庄园颜料大礼包",
    "庄园特殊颜料盒I",
    "庄园颜料套装",
  ],
);
assert.deepEqual(
  Array.from(grouped.red_diamond, (result) => result.theoreticalPulls),
  [12, 15, 28, 6],
);
const expectedPrices = [680 / 12, 880 / 15, 1980 / 28, 450 / 6];
grouped.red_diamond.forEach((result, index) => {
  assert.ok(
    Math.abs(result.redDiamondPerPull - expectedPrices[index]) < 1e-10,
  );
});

const nonApplicableGrouped = groupCurrencyPackItems(
  currencyPackData,
  "2026-09-02",
  otherBanner,
  resourceInstances,
);
assert.deepEqual(
  Array.from(
    nonApplicableGrouped.red_diamond,
    (result) => result.theoreticalPulls,
  ),
  [12, 15, 28, 6],
);
nonApplicableGrouped.red_diamond.forEach((result, index) => {
  assert.equal(
    result.theoreticalPulls,
    grouped.red_diamond[index].theoreticalPulls,
  );
  assert.equal(
    result.redDiamondPerPull,
    grouped.red_diamond[index].redDiamondPerPull,
  );
});
assert.equal(nonApplicableGrouped.red_diamond.length, 4);

const anniversaryPreheatGrouped = groupCurrencyPackItems(
  anniversaryPreheatPack,
  "2026-09-23",
  anniversaryBanner,
  resourceInstances,
);
const blindBoxValue = anniversaryPreheatGrouped.red_diamond.find(
  (result) => result.pack.id === "快乐收藏盲盒",
);
const expectedBlindBoxDiamond =
  58 * 0.2 + 68 * 0.7 + 138 * 0.1;
assert.equal(expectedBlindBoxDiamond, 73);
assert.ok(
  Math.abs(blindBoxValue.theoreticalPulls - 73 / 150) < 1e-10,
);
assert.ok(
  Math.abs(blindBoxValue.redDiamondPerPull - 30 / (73 / 150)) < 1e-10,
);

function selectPack(
  purchaseState,
  packId,
  quantity,
  preConversionResources,
  targetBanner = manorBanner,
) {
  return updateCurrencyPackPurchase(
    [currencyPackData],
    purchaseState,
    currencyPackData.id,
    packId,
    true,
    quantity,
    preConversionResources,
    "2026-08-28",
    "2026-09-02",
    targetBanner,
    resourceInstances,
  );
}

const baseResources = {
  diamond: 1000,
  red_diamond: 4000,
  common_paint: 2,
  timed_paint: 1,
  limited_paint: 3,
};
const unchangedBaseResources = { ...baseResources };

let anniversaryPreheatState = createCurrencyPackPurchaseState([
  anniversaryPreheatPack,
]);
const rejectedStickerPack = updateCurrencyPackPurchase(
  [anniversaryPreheatPack],
  anniversaryPreheatState,
  anniversaryPreheatPack.id,
  "旅途伙伴贴纸包",
  true,
  1,
  baseResources,
  "2026-09-17",
  "2026-09-23",
  anniversaryBanner,
  resourceInstances,
);
assert.equal(rejectedStickerPack.valid, false);
assert.match(rejectedStickerPack.error, /仅售五钻海螺肉/);

const selectedPrerequisite = updateCurrencyPackPurchase(
  [anniversaryPreheatPack],
  anniversaryPreheatState,
  anniversaryPreheatPack.id,
  "仅售五钻海螺肉",
  true,
  1,
  baseResources,
  "2026-09-17",
  "2026-09-23",
  anniversaryBanner,
  resourceInstances,
);
assert.equal(selectedPrerequisite.valid, true);
anniversaryPreheatState = selectedPrerequisite.purchaseState;
const selectedStickerPack = updateCurrencyPackPurchase(
  [anniversaryPreheatPack],
  anniversaryPreheatState,
  anniversaryPreheatPack.id,
  "旅途伙伴贴纸包",
  true,
  1,
  baseResources,
  "2026-09-17",
  "2026-09-23",
  anniversaryBanner,
  resourceInstances,
);
assert.equal(selectedStickerPack.valid, true);

const blindBoxState = createCurrencyPackPurchaseState([
  anniversaryPreheatPack,
]);
blindBoxState[anniversaryPreheatPack.id][blindBox.id] = {
  selected: true,
  quantity: 1,
};
const blindBoxSummary = calculateCurrencyPackPurchaseSummary(
  [anniversaryPreheatPack],
  blindBoxState,
  baseResources,
  "2026-09-17",
  "2026-09-23",
  anniversaryBanner,
  resourceInstances,
);
assert.equal(blindBoxSummary.valid, true);
assert.equal(blindBoxSummary.costs.red_diamond, 30);
assert.equal(blindBoxSummary.resources.red_diamond, 3970);
assert.equal(blindBoxSummary.resources.diamond, baseResources.diamond);
assert.equal(blindBoxSummary.rewards.diamond ?? 0, 0);

let monthlyPurchaseState = createCurrencyPackPurchaseState(
  monthlyCardCurrencyPacks,
);
let monthlyUpdate = updateCurrencyPackPurchase(
  monthlyCardCurrencyPacks,
  monthlyPurchaseState,
  monthlyCardCurrencyPacks[0].id,
  monthlyCardConfig.pack.id,
  true,
  2,
  { ...baseResources, diamond: 5000 },
  "2026-08-30",
  "2026-09-02",
  manorBanner,
  resourceInstances,
);
assert.equal(monthlyUpdate.valid, true);
assert.equal(monthlyUpdate.summary.costs.diamond, 2400);
assert.equal(monthlyUpdate.summary.rewards.common_paint, 20);
assert.equal(monthlyUpdate.summary.resources.diamond, 2600);
assert.equal(monthlyUpdate.summary.resources.common_paint, 22);

monthlyPurchaseState = monthlyUpdate.purchaseState;
monthlyUpdate = updateCurrencyPackPurchase(
  monthlyCardCurrencyPacks,
  monthlyPurchaseState,
  monthlyCardCurrencyPacks[0].id,
  monthlyCardConfig.pack.id,
  false,
  0,
  { ...baseResources, diamond: 5000 },
  "2026-08-30",
  "2026-09-02",
  manorBanner,
  resourceInstances,
);
assert.equal(monthlyUpdate.valid, true);
assert.equal(monthlyUpdate.summary.costs.diamond, 0);
assert.equal(monthlyUpdate.summary.rewards.common_paint ?? 0, 0);

const rejectedMonthlyPurchase = updateCurrencyPackPurchase(
  monthlyCardCurrencyPacks,
  createCurrencyPackPurchaseState(monthlyCardCurrencyPacks),
  monthlyCardCurrencyPacks[0].id,
  monthlyCardConfig.pack.id,
  true,
  2,
  { ...baseResources, diamond: 2000 },
  "2026-08-30",
  "2026-09-02",
  manorBanner,
  resourceInstances,
);
assert.equal(rejectedMonthlyPurchase.valid, false);
assert.match(rejectedMonthlyPurchase.error, /钻石余额不足/);

let purchaseState = createCurrencyPackPurchaseState([currencyPackData]);
const noPurchaseSummary = calculateCurrencyPackPurchaseSummary(
  [currencyPackData],
  purchaseState,
  baseResources,
  "2026-08-28",
  "2026-09-02",
  manorBanner,
  resourceInstances,
);
Object.entries(baseResources).forEach(([resourceId, amount]) => {
  assert.equal(noPurchaseSummary.resources[resourceId], amount);
});
let update = selectPack(
  purchaseState,
  "星空溯尘礼包",
  2,
  baseResources,
);
assert.equal(update.valid, true);
purchaseState = update.purchaseState;
let summary = calculateCurrencyPackPurchaseSummary(
  [currencyPackData],
  purchaseState,
  baseResources,
  "2026-08-28",
  "2026-09-02",
  manorBanner,
  resourceInstances,
);
assert.equal(summary.costs.diamond, 96);
assert.equal(summary.resources.diamond, 904);
assert.equal(Object.keys(summary.rewards).length, 0);
assert.equal("rmbTotal" in summary, false);
assert.equal("limitedRechargeRmb" in summary, false);

update = selectPack(
  purchaseState,
  "庄园特殊颜料盒I",
  1,
  baseResources,
);
assert.equal(update.valid, true);
purchaseState = update.purchaseState;
summary = update.summary;
assert.equal(summary.costs.red_diamond, 1980);
assert.equal(summary.resources.red_diamond, 2020);
assert.equal(summary.rewards.common_paint, 28);
assert.equal(summary.resources.common_paint, 30);
assert.deepEqual(baseResources, unchangedBaseResources);

const sevenWeekCurrencyPacks = getCurrencyPacksForMonthlyCard(
  [currencyPackData],
  monthlyCardConfig,
  true,
  "2026-08-24",
  "2026-10-11",
);
const sevenWeekPurchaseState = createCurrencyPackPurchaseState(
  sevenWeekCurrencyPacks,
);
sevenWeekPurchaseState[monthlyCardConfig.id][monthlyCardConfig.pack.id] = {
  selected: true,
  quantity: 7,
};
sevenWeekPurchaseState[currencyPackData.id]["庄园特殊颜料盒I"] = {
  selected: true,
  quantity: 1,
};
const resourcesBeforeCurrencyPacks = {
  diamond: 8410,
  red_diamond: 1990,
  common_paint: 0,
  timed_paint: 0,
  limited_paint: 0,
};
const successfulCurrencyPackSummary =
  calculateCurrencyPackPurchaseSummary(
    sevenWeekCurrencyPacks,
    sevenWeekPurchaseState,
    resourcesBeforeCurrencyPacks,
    "2026-08-24",
    "2026-10-11",
    manorBanner,
    resourceInstances,
  );

assert.equal(successfulCurrencyPackSummary.valid, true);
assert.equal(successfulCurrencyPackSummary.costs.diamond, 8400);
assert.equal(successfulCurrencyPackSummary.costs.red_diamond, 1980);
assert.equal(successfulCurrencyPackSummary.rewards.common_paint, 98);
assert.equal(successfulCurrencyPackSummary.resources.diamond, 10);
assert.equal(successfulCurrencyPackSummary.resources.red_diamond, 10);

const finalWithNegativeAdjustments = calculateFinalResourceTotals(
  successfulCurrencyPackSummary.resources,
  { diamond: -20, red_diamond: -20 },
);
assert.equal(finalWithNegativeAdjustments.valid, true);
assert.equal(finalWithNegativeAdjustments.resources.diamond, -10);
assert.equal(finalWithNegativeAdjustments.resources.red_diamond, -10);
assert.equal(
  successfulCurrencyPackSummary.purchaseState[monthlyCardConfig.id][
    monthlyCardConfig.pack.id
  ].quantity,
  7,
);
assert.equal(
  successfulCurrencyPackSummary.purchaseState[currencyPackData.id][
    "庄园特殊颜料盒I"
  ].selected,
  true,
);

const insufficientCurrencyResources = {
  ...resourcesBeforeCurrencyPacks,
  diamond: 8390,
};
const insufficientCurrencySummary = calculateCurrencyPackPurchaseSummary(
  sevenWeekCurrencyPacks,
  sevenWeekPurchaseState,
  insufficientCurrencyResources,
  "2026-08-24",
  "2026-10-11",
  manorBanner,
  resourceInstances,
);
assert.equal(insufficientCurrencySummary.valid, false);
assert.match(insufficientCurrencySummary.error, /钻石余额不足/);
assert.equal(insufficientCurrencySummary.resources.diamond, 8390);

const insufficientFinalWithPositiveAdjustment =
  calculateFinalResourceTotals(insufficientCurrencySummary.resources, {
    diamond: 100,
  });
assert.equal(
  insufficientFinalWithPositiveAdjustment.resources.diamond,
  8490,
);
assert.equal(insufficientCurrencySummary.valid, false);

const finalWithPositiveAdjustments = calculateFinalResourceTotals(
  successfulCurrencyPackSummary.resources,
  { diamond: 100, red_diamond: 50 },
);
assert.equal(finalWithPositiveAdjustments.resources.diamond, 110);
assert.equal(finalWithPositiveAdjustments.resources.red_diamond, 60);
assert.equal(successfulCurrencyPackSummary.resources.diamond, 10);
assert.equal(successfulCurrencyPackSummary.resources.red_diamond, 10);
assert.equal(successfulCurrencyPackSummary.costs.diamond, 8400);
assert.equal(successfulCurrencyPackSummary.costs.red_diamond, 1980);

let limitedPurchaseState = createCurrencyPackPurchaseState([
  currencyPackData,
]);
update = selectPack(
  limitedPurchaseState,
  "庄园颜料特惠包",
  1,
  baseResources,
);
limitedPurchaseState = update.purchaseState;
assert.equal(update.summary.rewards.limited_paint, 12);
assert.equal(update.summary.resources.limited_paint, 15);
const nonApplicableLimitedPurchase = updateCurrencyPackPurchase(
  [currencyPackData],
  createCurrencyPackPurchaseState([currencyPackData]),
  currencyPackData.id,
  "庄园颜料特惠包",
  true,
  1,
  baseResources,
  "2026-08-28",
  "2026-09-02",
  otherBanner,
  resourceInstances,
);
assert.equal(nonApplicableLimitedPurchase.valid, true);
assert.equal(
  nonApplicableLimitedPurchase.summary.rewards.limited_paint ?? 0,
  0,
);
assert.equal(
  nonApplicableLimitedPurchase.summary.resources.limited_paint,
  baseResources.limited_paint,
);
const cancelledLimitedPurchase = updateCurrencyPackPurchase(
  [currencyPackData],
  limitedPurchaseState,
  currencyPackData.id,
  "庄园颜料特惠包",
  false,
  0,
  baseResources,
  "2026-08-28",
  "2026-09-02",
  manorBanner,
  resourceInstances,
);
assert.equal(cancelledLimitedPurchase.valid, true);
Object.entries(baseResources).forEach(([resourceId, amount]) => {
  assert.equal(cancelledLimitedPurchase.summary.resources[resourceId], amount);
});

let sharedBalanceState = createCurrencyPackPurchaseState([
  currencyPackData,
]);
const lowRedDiamondResources = { ...baseResources, red_diamond: 2500 };
update = selectPack(
  sharedBalanceState,
  "庄园特殊颜料盒I",
  1,
  lowRedDiamondResources,
);
assert.equal(update.valid, true);
sharedBalanceState = update.purchaseState;
const rejected = selectPack(
  sharedBalanceState,
  "庄园颜料特惠包",
  1,
  lowRedDiamondResources,
);
assert.equal(rejected.valid, false);
assert.match(rejected.error, /红钻余额不足/);
assert.equal(
  rejected.purchaseState[currencyPackData.id]["庄园特殊颜料盒I"].selected,
  true,
);
assert.equal(
  rejected.purchaseState[currencyPackData.id]["庄园颜料特惠包"].selected,
  false,
);

let diamondBalanceState = createCurrencyPackPurchaseState([
  currencyPackData,
]);
const lowDiamondResources = { ...baseResources, diamond: 800 };
update = selectPack(
  diamondBalanceState,
  "星空溯尘礼包",
  10,
  lowDiamondResources,
);
assert.equal(update.valid, true);
diamondBalanceState = update.purchaseState;
const rejectedDiamondPurchase = selectPack(
  diamondBalanceState,
  "庄园诡戏贴纸包",
  1,
  lowDiamondResources,
);
assert.equal(rejectedDiamondPurchase.valid, false);
assert.match(rejectedDiamondPurchase.error, /钻石余额不足/);

const repeatableRewardPack = {
  ...currencyPackData,
  id: "repeatable-reward-test",
  packs: [
    {
      ...packs.find((pack) => pack.id === "庄园特殊颜料盒I"),
      purchaseRule: { type: "total", limit: 3 },
    },
  ],
};
const repeatableState = createCurrencyPackPurchaseState([
  repeatableRewardPack,
]);
repeatableState[repeatableRewardPack.id]["庄园特殊颜料盒I"] = {
  selected: true,
  quantity: 2,
};
const repeatedRewardSummary = calculateCurrencyPackPurchaseSummary(
  [repeatableRewardPack],
  repeatableState,
  { ...baseResources, red_diamond: 5000 },
  "2026-08-28",
  "2026-09-02",
  manorBanner,
  resourceInstances,
);
assert.equal(repeatedRewardSummary.costs.red_diamond, 3960);
assert.equal(repeatedRewardSummary.rewards.common_paint, 56);
assert.equal(repeatedRewardSummary.resources.common_paint, 58);

let multiplePurchaseState = createCurrencyPackPurchaseState([
  currencyPackData,
]);
update = selectPack(
  multiplePurchaseState,
  "庄园颜料特惠包",
  1,
  baseResources,
);
multiplePurchaseState = update.purchaseState;
update = selectPack(
  multiplePurchaseState,
  "庄园颜料套装",
  1,
  baseResources,
);
assert.equal(update.valid, true);
assert.equal(update.summary.costs.red_diamond, 1130);
assert.equal(update.summary.rewards.limited_paint, 12);
assert.equal(update.summary.rewards.common_paint, 6);
assert.equal(update.summary.resources.red_diamond, 2870);
assert.equal(update.summary.resources.limited_paint, 15);
assert.equal(update.summary.resources.common_paint, 8);
assert.deepEqual(baseResources, unchangedBaseResources);

const loaderContext = vm.createContext({ Date });
vm.runInContext(
  readProjectFile(path.join("js", "data-loader.js")),
  loaderContext,
);
const loadCurrencyPacks = vm.runInContext("loadCurrencyPacks", loaderContext);
const sanitizeCurrencyPack = vm.runInContext(
  "sanitizeCurrencyPack",
  loaderContext,
);
const isValidCurrencyPackItem = vm.runInContext(
  "isValidCurrencyPackItem",
  loaderContext,
);
const validResourceIds = new Set([
  ...resourceTypeData.resourceTypes.map((resourceType) => resourceType.id),
  ...resourceInstances.map((resource) => resource.id),
]);
assert.equal(
  packs.every((pack) => isValidCurrencyPackItem(pack, validResourceIds)),
  true,
);
assert.equal(
  anniversaryCurrencyPackData.every((currencyPack) =>
    currencyPack.packs.every((pack) =>
      isValidCurrencyPackItem(pack, validResourceIds),
    ),
  ),
  true,
);
assert.equal(
  isValidCurrencyPackItem(
    {
      ...blindBox,
      randomContents: blindBox.randomContents.map((outcome, index) => ({
        ...outcome,
        probability: index === 0 ? 0.1 : outcome.probability,
      })),
    },
    validResourceIds,
  ),
  false,
);
assert.equal(
  isValidCurrencyPackItem(
    {
      ...blindBox,
      randomContents: [
        {
          probability: 1,
          contents: [
            { resourceId: "diamond", amount: 58 },
            { resourceId: "diamond", amount: 68 },
          ],
        },
      ],
    },
    validResourceIds,
  ),
  false,
);

const invalidCurrencyPack = {
  ...currencyPackData,
  id: "invalid-currency-pack",
  packs: [
    packs[0],
    { ...packs[0], name: "重复 ID" },
    {
      ...packs[1],
      id: "invalid-cost",
      cost: { resourceId: "common_paint", amount: 10 },
    },
    {
      ...packs[1],
      id: "rmb-fields-not-allowed",
      price: 6,
    },
    {
      ...packs[2],
      id: "duplicate-contents",
      contents: [
        { resourceId: "灵魂老荷兰", amount: 1 },
        { resourceId: "灵魂老荷兰", amount: 2 },
      ],
    },
    {
      ...packs[1],
      id: "missing-prerequisite",
      prerequisites: ["not-found"],
    },
  ],
};
const sanitized = sanitizeCurrencyPack(
  invalidCurrencyPack,
  validResourceIds,
);
assert.equal(sanitized.packs.length, 1);
assert.equal(sanitized.packs[0].id, "星空溯尘礼包");

const requestedPaths = [];
loaderContext.fetch = async (requestedPath) => {
  requestedPaths.push(requestedPath);
  const dataByPath = {
    "data/resources/resource-types.json": resourceTypeData,
    "data/resources/resources.json": resourceInstanceData,
    "data/packs/currency-packs/庄园诡戏.json": currencyPackData,
    "data/packs/currency-packs/六周年.json": anniversaryCurrencyPackData,
  };

  return {
    ok: Object.prototype.hasOwnProperty.call(dataByPath, requestedPath),
    json: async () => dataByPath[requestedPath],
  };
};

(async () => {
  const loaded = await loadCurrencyPacks();

  assert.equal(loaded.length, 4);
  assert.equal(loaded[0].packs.length, 6);
  assert.deepEqual(
    Array.from(loaded, (currencyPack) => currencyPack.id),
    [
      "庄园诡戏钻石红钻礼包",
      "六周年预热钻石红钻礼包",
      "六周年钻石礼包",
      "六周年红钻礼包",
    ],
  );
  assert.equal(
    requestedPaths.includes(
      "data/packs/currency-packs/currency-pack.template.json",
    ),
    false,
  );
  console.log("currency packs: data, value, balance, and loader tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
