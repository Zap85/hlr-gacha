"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

const eventPackData = JSON.parse(
  readProjectFile(
    path.join("data", "packs", "event-packs", "庄园诡戏.json"),
  ),
);
const strangeEventPackData = JSON.parse(
  readProjectFile(
    path.join("data", "packs", "event-packs", "怪谈活动.json"),
  ),
);
const anniversaryEventPackData = JSON.parse(
  readProjectFile(
    path.join("data", "packs", "event-packs", "六周年.json"),
  ),
);
const eventPackTemplate = JSON.parse(
  readProjectFile(
    path.join(
      "data",
      "packs",
      "event-packs",
      "event-pack.template.json",
    ),
  ),
);
const resourceTypeData = JSON.parse(
  readProjectFile(path.join("data", "resources", "resource-types.json")),
);
const resourceInstanceData = JSON.parse(
  readProjectFile(path.join("data", "resources", "resources.json")),
);
const constantsData = JSON.parse(
  readProjectFile(path.join("data", "constants.json")),
);
const eventData = JSON.parse(
  readProjectFile(path.join("data", "events", "events.json")),
);
const packs = eventPackData.packs;
const strangePacks = strangeEventPackData.packs;
const anniversaryPacks = anniversaryEventPackData.flatMap(
  (eventPack) => eventPack.packs,
);
const indexHtml = readProjectFile("index.html");
const appSource = readProjectFile(path.join("js", "app.js"));

assert.equal(eventPackData.id, "庄园诡戏礼包");
assert.equal(eventPackData.name, "庄园诡戏礼包");
assert.equal(eventPackData.eventId, "庄园诡戏");
assert.equal(
  eventData.events.some((event) => event.id === eventPackData.eventId),
  true,
);
assert.equal(eventPackData.startDate, "2026-08-26");
assert.equal(eventPackData.endDate, "2026-09-02");
assert.equal(new Set(packs.map((pack) => pack.id)).size, packs.length);
assert.equal(
  packs.every((pack) => pack.countsTowardLimitedRecharge === true),
  true,
);
assert.equal(strangeEventPackData.id, "怪谈活动");
assert.equal(strangeEventPackData.name, "怪谈活动");
assert.equal(strangeEventPackData.eventId, "怪谈活动");
assert.equal(
  eventData.events.some((event) => event.id === strangeEventPackData.eventId),
  true,
);
assert.equal(strangeEventPackData.startDate, "2026-09-03");
assert.equal(strangeEventPackData.endDate, "2026-09-09");
assert.equal(
  new Set(strangePacks.map((pack) => pack.id)).size,
  strangePacks.length,
);
assert.equal(
  strangePacks.every(
    (pack) => pack.countsTowardLimitedRecharge === true,
  ),
  true,
);
assert.deepEqual(
  anniversaryEventPackData.map((eventPack) => eventPack.id),
  [
    "年卡",
    "六周年预热礼包",
    "六周年活动礼包1",
    "往昔回顾画廊触发礼包",
    "绘忆时光",
    "六周年活动礼包2",
    "六周年福袋",
  ],
);
assert.equal(
  anniversaryPacks.every(
    (pack) => pack.countsTowardLimitedRecharge === true,
  ),
  true,
);
assert.equal(
  anniversaryEventPackData.every((eventPack) =>
    eventData.events.some((event) => event.id === eventPack.eventId),
  ),
  true,
);
assert.match(
  appSource,
  /formatEventPackGroupDateRange\(\s*eventPack\.startDate,\s*eventPack\.endDate,/,
);
assert.match(appSource, /期望抽数/);
assert.match(appSource, /期望单抽价格/);
assert.match(
  appSource,
  /exclusiveGroupOccupied[\s\S]*?is-disabled/,
);
const dateRangeFormatterSource = appSource.match(
  /function formatEventPackGroupDateRange\([\s\S]*?\n}/,
)?.[0];
assert.notEqual(dateRangeFormatterSource, undefined);
const dateRangeFormatterContext = vm.createContext({});
vm.runInContext(dateRangeFormatterSource, dateRangeFormatterContext);
assert.equal(
  vm.runInContext(
    'formatEventPackGroupDateRange("2026-09-19", "2026-10-12")',
    dateRangeFormatterContext,
  ),
  "09.19-10.12",
);
const exclusiveMessageFormatterSource = appSource.match(
  /function formatEventPackExclusiveGroupMessage\([\s\S]*?\n}/,
)?.[0];
assert.notEqual(exclusiveMessageFormatterSource, undefined);
const exclusiveMessageFormatterContext = vm.createContext({});
vm.runInContext(
  exclusiveMessageFormatterSource,
  exclusiveMessageFormatterContext,
);
assert.equal(
  vm.runInContext(
    `formatEventPackExclusiveGroupMessage(
      {
        packs: [
          { id: "a", name: "礼包A", exclusiveGroup: "internal-id" },
          { id: "b", name: "礼包B", exclusiveGroup: "internal-id" }
        ]
      },
      { id: "a", name: "礼包A", exclusiveGroup: "internal-id" }
    )`,
    exclusiveMessageFormatterContext,
  ),
  "互斥购买：与「礼包B」仅可购买其一",
);
assert.equal(
  vm.runInContext(
    `formatEventPackExclusiveGroupMessage(
      {
        packs: [
          { id: "a", name: "礼包A", exclusiveGroup: "internal-id" },
          { id: "b", name: "礼包B", exclusiveGroup: "internal-id" },
          { id: "c", name: "礼包C", exclusiveGroup: "internal-id" }
        ]
      },
      { id: "a", name: "礼包A", exclusiveGroup: "internal-id" }
    )`,
    exclusiveMessageFormatterContext,
  ),
  "互斥购买：与「礼包B」「礼包C」仅可购买其一",
);
assert.match(indexHtml, /<summary[^>]*>活动礼包<\/summary>/);
assert.match(indexHtml, /<details class="pack-disclosure event-packs-disclosure">/);
assert.doesNotMatch(
  indexHtml,
  /<details class="pack-disclosure event-packs-disclosure" open>/,
);
assert.match(
  indexHtml,
  /id="event-pack-red-diamond-per-pull"[^>]*value="70\.71"/,
);
assert.doesNotMatch(indexHtml, /id="event-pack-summary"/);
assert.doesNotMatch(indexHtml, /id="event-pack-total-price"/);
assert.doesNotMatch(indexHtml, /id="event-pack-resource-summary"/);

const findPack = (id) => packs.find((pack) => pack.id === id);
const findContent = (pack, resourceId) =>
  pack.contents.find((content) => content.resourceId === resourceId);

assert.equal(findPack("咖啡外送订单").purchaseRule.type, "daily");
assert.equal(findPack("庄园每日礼包").purchaseRule.type, "daily");
assert.equal(findPack("庄园大型颜料箱").purchaseRule.type, "total");
assert.equal(findPack("庄园大型颜料箱").purchaseRule.limit, 2);

assert.deepEqual(findPack("庄园诡戏颜料包I").prerequisites, []);
assert.deepEqual(findPack("庄园诡戏颜料包II").prerequisites, [
  "庄园诡戏颜料包I",
]);
assert.deepEqual(findPack("庄园诡戏颜料包III").prerequisites, [
  "庄园诡戏颜料包II",
]);

const pushPacks = [1, 2, 3, 4, 5].map((number) =>
  findPack(`庄园推送礼·第${number}`),
);
assert.deepEqual(
  pushPacks.map((pack) => pack.trigger.value),
  [10, 30, 80, 180, 380],
);
assert.equal(
  pushPacks.every(
    (pack) =>
      pack.trigger.type === "pull_count" && pack.prerequisites.length === 0,
  ),
  true,
);
assert.equal(findContent(pushPacks[3], "灵魂老荷兰").amount, 25);
assert.equal(findContent(pushPacks[4], "灵魂老荷兰").amount, 33);

const manorPack = findPack("莱顿庄园礼包");
assert.equal(manorPack.deferredRewards.length, 1);
assert.equal(manorPack.deferredRewards[0].availableDate, "2026-09-05");
assert.equal(
  manorPack.contents.some(
    (content) => content.resourceId === "莱顿庄园-初融",
  ),
  false,
);
const coffeePack = findPack("咖啡外送订单");
assert.equal(coffeePack.contents.length, 0);
assert.equal(coffeePack.otherContents.some((item) => item.name === "金币"), true);

const findStrangePack = (id) =>
  strangePacks.find((pack) => pack.id === id);
assert.equal(findStrangePack("怪谈每日好感包").purchaseRule.type, "daily");
assert.equal(findStrangePack("咖啡外送订单").purchaseRule.type, "daily");
assert.equal(findStrangePack("怪谈大型颜料箱").purchaseRule.limit, 2);
assert.equal(findStrangePack("怪谈颜料套装").purchaseRule.limit, 4);
assert.deepEqual(findStrangePack("怪谈3元礼包").contents, [
  { resourceId: "timed-paint-怪谈活动", amount: 1 },
]);
assert.deepEqual(findStrangePack("怪谈像素盒").contents, [
  { resourceId: "timed-paint-怪谈活动", amount: 8 },
]);
const strangeContinuousPack = findStrangePack("怪谈特惠连续包");
assert.equal(
  strangeContinuousPack.contents.some(
    (content) => content.resourceId === "common_paint",
  ),
  false,
);
assert.equal(strangeContinuousPack.deferredRewards.length, 1);
assert.deepEqual(strangeContinuousPack.deferredRewards[0], {
  type: "relative_daily",
  startOffsetDays: 1,
  days: 5,
  intervalDays: 1,
  contents: [{ resourceId: "common_paint", amount: 1 }],
});
assert.equal(
  eventPackTemplate.packs[0].deferredRewards[0].type,
  "relative_daily",
);
assert.equal(
  strangePacks.some(
    (pack) =>
      Object.hasOwn(pack, "theoreticalPulls") ||
      Object.hasOwn(pack, "pricePerPull"),
  ),
  false,
);

const calculatorContext = vm.createContext({ Date });
vm.runInContext(
  readProjectFile(path.join("js", "calculator.js")),
  calculatorContext,
);
const getDisplayableEventPacks = vm.runInContext(
  "getDisplayableEventPacks",
  calculatorContext,
);
const calculateEventPackDailyAvailability = vm.runInContext(
  "calculateEventPackDailyAvailability",
  calculatorContext,
);
const getEventPackMaximumQuantity = vm.runInContext(
  "getEventPackMaximumQuantity",
  calculatorContext,
);
const createEventPackPurchaseState = vm.runInContext(
  "createEventPackPurchaseState",
  calculatorContext,
);
const updateEventPackPurchase = vm.runInContext(
  "updateEventPackPurchase",
  calculatorContext,
);
const isEventPackExclusiveGroupOccupied = vm.runInContext(
  "isEventPackExclusiveGroupOccupied",
  calculatorContext,
);
const calculateEventPackPurchaseSummary = vm.runInContext(
  "calculateEventPackPurchaseSummary",
  calculatorContext,
);
const calculateEventPackLimitedRechargeRmb = vm.runInContext(
  "calculateEventPackLimitedRechargeRmb",
  calculatorContext,
);
const calculateEventPackDeferredRewards = vm.runInContext(
  "calculateEventPackDeferredRewards",
  calculatorContext,
);
const calculatePackValue = vm.runInContext(
  "calculatePackValue",
  calculatorContext,
);
const sortPackValuesByPricePerPull = vm.runInContext(
  "sortPackValuesByPricePerPull",
  calculatorContext,
);

const sortablePackValues = [
  { pack: { id: "original-first" }, pricePerPull: 5 },
  { pack: { id: "equal-price-first" }, pricePerPull: 2 },
  { pack: { id: "no-price-first" }, pricePerPull: null },
  { pack: { id: "equal-price-second" }, pricePerPull: 2 },
  { pack: { id: "no-price-second" }, pricePerPull: null },
];
assert.deepEqual(
  Array.from(
    sortPackValuesByPricePerPull(sortablePackValues),
    (value) => value.pack.id,
  ),
  [
    "equal-price-first",
    "equal-price-second",
    "original-first",
    "no-price-first",
    "no-price-second",
  ],
);
assert.deepEqual(
  sortablePackValues.map((value) => value.pack.id),
  [
    "original-first",
    "equal-price-first",
    "no-price-first",
    "equal-price-second",
    "no-price-second",
  ],
);

const valuationRules = constantsData.constants.permanentPackCalculation;
const valuationPack = {
  id: "event-pack-valuation-test",
  name: "活动礼包估值测试",
  price: 110,
  contents: [
    { resourceId: "diamond", amount: 150 },
    { resourceId: "red_diamond", amount: 70.71 },
    { resourceId: "common_paint", amount: 2 },
    { resourceId: "timed-paint-sample-2", amount: 3 },
    { resourceId: "灵魂老荷兰", amount: 4 },
    { resourceId: "not-a-pull-resource", amount: 999 },
  ],
};
const activeValuation = calculatePackValue(
  valuationPack,
  70.71,
  valuationRules,
  {
    targetDate: "2026-08-12",
    targetBanner: { id: "庄园诡戏", tags: [] },
    resourceInstances: resourceInstanceData.resources,
  },
);
assert.equal(activeValuation.valid, true);
assert.equal(activeValuation.theoreticalPulls, 11);
assert.equal(activeValuation.pricePerPull, 10);

const expiredTimedPaintValuation = calculatePackValue(
  valuationPack,
  70.71,
  valuationRules,
  {
    targetDate: "2026-08-17",
    targetBanner: { id: "庄园诡戏", tags: [] },
    resourceInstances: resourceInstanceData.resources,
  },
);
assert.equal(expiredTimedPaintValuation.theoreticalPulls, 8);

const mismatchedLimitedPaintValuation = calculatePackValue(
  valuationPack,
  70.71,
  valuationRules,
  {
    targetDate: "2026-08-12",
    targetBanner: { id: "下一站世界与你", tags: [] },
    resourceInstances: resourceInstanceData.resources,
  },
);
assert.equal(mismatchedLimitedPaintValuation.theoreticalPulls, 11);
assert.equal(mismatchedLimitedPaintValuation.pricePerPull, 10);
assert.equal(
  mismatchedLimitedPaintValuation.theoreticalPulls,
  activeValuation.theoreticalPulls,
);
assert.equal(
  mismatchedLimitedPaintValuation.pricePerPull,
  activeValuation.pricePerPull,
);

const birthdayPaintValuation = calculatePackValue(
  {
    id: "birthday-paint-valuation-test",
    name: "生日限定估值测试",
    price: 10,
    contents: [{ resourceId: "甜蜜老荷兰", amount: 2 }],
  },
  70.71,
  valuationRules,
  {
    targetDate: "2026-08-01",
    targetBanner: { id: "罗夏生日", tags: ["birthday"] },
    resourceInstances: resourceInstanceData.resources,
  },
);
assert.equal(birthdayPaintValuation.theoreticalPulls, 2);

const zeroPullValuation = calculatePackValue(
  {
    id: "zero-pull-valuation-test",
    name: "零抽估值测试",
    price: 3,
    contents: [{ resourceId: "not-a-pull-resource", amount: 1 }],
  },
  70.71,
  valuationRules,
);
assert.equal(zeroPullValuation.valid, true);
assert.equal(zeroPullValuation.theoreticalPulls, 0);
assert.equal(zeroPullValuation.pricePerPull, null);

const strangeContinuousValue = calculatePackValue(
  strangeContinuousPack,
  70.71,
  valuationRules,
  {
    targetDate: "2026-09-03",
    targetBanner: { id: "怪谈系列（司岚or叶瑄）", tags: [] },
    resourceInstances: resourceInstanceData.resources,
  },
);
assert.equal(strangeContinuousValue.valid, true);
assert.ok(
  Math.abs(strangeContinuousValue.theoreticalPulls - 6.8666666667) <
    1e-9,
);
assert.ok(
  Math.abs(strangeContinuousValue.pricePerPull - 28 / 6.8666666667) <
    1e-9,
);

const anniversaryWarmupGroup = anniversaryEventPackData.find(
  (eventPack) => eventPack.id === "六周年预热礼包",
);
const luckyBox = anniversaryWarmupGroup.packs.find(
  (pack) => pack.id === "周年幸运盒子",
);
const luckyValuePack = anniversaryWarmupGroup.packs.find(
  (pack) => pack.id === "周年幸运超值包",
);
const luckyBoxValue = calculatePackValue(
  luckyBox,
  70.71,
  valuationRules,
  {
    targetDate: "2026-09-23",
    targetBanner: { id: "六周年庆典", tags: [] },
    resourceInstances: resourceInstanceData.resources,
  },
);
const luckyValuePackValue = calculatePackValue(
  luckyValuePack,
  70.71,
  valuationRules,
  {
    targetDate: "2026-09-23",
    targetBanner: { id: "六周年庆典", tags: [] },
    resourceInstances: resourceInstanceData.resources,
  },
);
assert.ok(
  Math.abs(luckyBoxValue.theoreticalPulls - 0.8426666667) < 1e-9,
);
assert.ok(Math.abs(luckyBoxValue.pricePerPull - 7.1202531643) < 1e-9);
assert.ok(
  Math.abs(luckyValuePackValue.theoreticalPulls - 2.8426666667) <
    1e-9,
);
assert.ok(
  Math.abs(luckyValuePackValue.pricePerPull - 4.2213883677) < 1e-9,
);

const anniversaryContinuousPack = anniversaryWarmupGroup.packs.find(
  (pack) => pack.id === "周年连续颜料箱",
);
const anniversaryContinuousValue = calculatePackValue(
  anniversaryContinuousPack,
  70.71,
  valuationRules,
  {
    targetDate: "2026-09-23",
    targetBanner: { id: "六周年庆典", tags: [] },
    resourceInstances: resourceInstanceData.resources,
  },
);
assert.equal(anniversaryContinuousValue.theoreticalPulls, 55);

const anniversarySecondGroup = anniversaryEventPackData.find(
  (eventPack) => eventPack.id === "六周年活动礼包2",
);
const anniversaryLuckyBagGroup = anniversaryEventPackData.find(
  (eventPack) => eventPack.id === "六周年福袋",
);
const findAnniversarySecondPack = (id) =>
  anniversarySecondGroup.packs.find((pack) => pack.id === id);
const dailyPack = findAnniversarySecondPack("永夜每日礼包");
const bundledDailyPack = findAnniversarySecondPack(
  "永夜每日礼包首日打包",
);
assert.equal(dailyPack.purchaseRule.type, "daily");
assert.equal(dailyPack.purchaseRule.limit, 1);
assert.equal(bundledDailyPack.purchaseRule.type, "total");
assert.equal(bundledDailyPack.purchaseRule.limit, 1);
assert.equal(
  dailyPack.exclusiveGroup,
  "六周年-永夜每日礼包购买方式",
);
assert.equal(bundledDailyPack.exclusiveGroup, dailyPack.exclusiveGroup);
assert.deepEqual(bundledDailyPack.deferredRewards, [
  {
    type: "relative_daily",
    startOffsetDays: 0,
    days: 19,
    intervalDays: 1,
    contents: [
      { resourceId: "common_paint", amount: 1 },
      { resourceId: "diamond", amount: 20 },
    ],
  },
]);

const bundledDailyValue = calculatePackValue(
  bundledDailyPack,
  70.71,
  valuationRules,
);
assert.ok(
  Math.abs(bundledDailyValue.theoreticalPulls - 21.5333333333) <
    1e-9,
);
assert.ok(
  Math.abs(bundledDailyValue.pricePerPull - 108 / 21.5333333333) <
    1e-9,
);

const diamondBundleValue = calculatePackValue(
  findAnniversarySecondPack("周年钻石精品包"),
  70.71,
  valuationRules,
);
const continuousValue = calculatePackValue(
  findAnniversarySecondPack("周年连续特惠包"),
  70.71,
  valuationRules,
);
const paintContinuousValue = calculatePackValue(
  findAnniversarySecondPack("周年颜料连续包"),
  70.71,
  valuationRules,
);
assert.ok(
  Math.abs(diamondBundleValue.theoreticalPulls - 6.5333333333) <
    1e-9,
);
assert.equal(continuousValue.theoreticalPulls, 10);
assert.ok(
  Math.abs(paintContinuousValue.theoreticalPulls - 22.8666666667) <
    1e-9,
);

assert.deepEqual(
  [
    "永夜推送礼",
    "永夜推送礼II",
    "永夜推送礼III",
    "永夜推送礼IV",
    "永夜推送礼V",
  ].map((id) => findAnniversarySecondPack(id).trigger.value),
  [10, 30, 80, 180, 380],
);
assert.deepEqual(
  findAnniversarySecondPack("永夜档案颜料包II").prerequisites,
  ["永夜档案颜料包"],
);
assert.deepEqual(
  findAnniversarySecondPack("永夜档案颜料包III").prerequisites,
  ["永夜档案颜料包II"],
);
const cityChoicePack = findAnniversarySecondPack("永夜之城自选包");
const cityRedDiamondPack = findAnniversarySecondPack("永夜之城红钻包");
assert.deepEqual(cityChoicePack.contents, [
  { resourceId: "common_paint", amount: 10 },
  { resourceId: "limited-paint-永夜老荷兰", amount: 10 },
]);
assert.equal(
  cityChoicePack.note,
  "礼包内容可自选 永夜老荷兰 ×10 或 红钻 ×980",
);
const cityChoiceValue = calculatePackValue(
  cityChoicePack,
  70.71,
  valuationRules,
  {
    targetDate: "2026-09-24",
    targetBanner: { id: "六周年庆典", tags: [] },
    resourceInstances: resourceInstanceData.resources,
  },
);
assert.equal(cityChoiceValue.theoreticalPulls, 20);
assert.equal(cityChoiceValue.pricePerPull, 4.9);
assert.deepEqual(cityChoicePack.prerequisites, [cityRedDiamondPack.id]);

assert.equal(anniversaryLuckyBagGroup.packs.length, 2);
assert.equal(
  anniversaryLuckyBagGroup.packs.every(
    (pack) => pack.exclusiveGroup === "六周年-福袋",
  ),
  true,
);
const regularLuckyBag = anniversaryLuckyBagGroup.packs.find(
  (pack) => pack.id === "六周年福袋·常规",
);
const premiumLuckyBag = anniversaryLuckyBagGroup.packs.find(
  (pack) => pack.id === "六周年福袋·高阶",
);
assert.equal(
  calculatePackValue(regularLuckyBag, 70.71, valuationRules)
    .theoreticalPulls,
  0,
);
assert.equal(
  calculatePackValue(premiumLuckyBag, 70.71, valuationRules)
    .theoreticalPulls,
  12,
);

const deferredTestEventPack = {
  ...strangeEventPackData,
  startDate: "2026-09-02",
  endDate: "2026-09-09",
};
const earlyRangeDeferred = calculateEventPackDeferredRewards(
  deferredTestEventPack,
  strangeContinuousPack,
  1,
  "2026-09-01",
  "2026-09-10",
);
assert.equal(earlyRangeDeferred.assumedPurchaseDate, "2026-09-02");
assert.equal(earlyRangeDeferred.deliveredOccurrences, 5);
assert.equal(earlyRangeDeferred.resources.common_paint, 5);

const lateRangeDeferred = calculateEventPackDeferredRewards(
  deferredTestEventPack,
  strangeContinuousPack,
  1,
  "2026-09-03",
  "2026-09-08",
);
assert.equal(lateRangeDeferred.assumedPurchaseDate, "2026-09-03");
assert.equal(lateRangeDeferred.deliveredOccurrences, 5);

const purchaseDayDeferred = calculateEventPackDeferredRewards(
  deferredTestEventPack,
  strangeContinuousPack,
  1,
  "2026-09-03",
  "2026-09-03",
);
assert.equal(purchaseDayDeferred.assumedPurchaseDate, "2026-09-03");
assert.equal(purchaseDayDeferred.deliveredOccurrences, 0);
assert.deepEqual(
  Object.fromEntries(Object.entries(purchaseDayDeferred.resources)),
  {},
);

const partialDeferred = calculateEventPackDeferredRewards(
  deferredTestEventPack,
  strangeContinuousPack,
  1,
  "2026-09-03",
  "2026-09-05",
);
assert.equal(partialDeferred.deliveredOccurrences, 2);
assert.equal(partialDeferred.resources.common_paint, 2);

const fullDeferred = calculateEventPackDeferredRewards(
  deferredTestEventPack,
  strangeContinuousPack,
  1,
  "2026-09-03",
  "2026-09-08",
);
assert.equal(fullDeferred.deliveredOccurrences, 5);
assert.equal(fullDeferred.resources.common_paint, 5);

const shortEventPack = {
  ...deferredTestEventPack,
  endDate: "2026-09-04",
};
const afterEventEndDeferred = calculateEventPackDeferredRewards(
  shortEventPack,
  strangeContinuousPack,
  1,
  "2026-09-03",
  "2026-09-08",
);
assert.equal(afterEventEndDeferred.assumedPurchaseDate, "2026-09-03");
assert.equal(afterEventEndDeferred.deliveredOccurrences, 5);
assert.equal(afterEventEndDeferred.resources.common_paint, 5);

const bundledPurchaseDayDeferred = calculateEventPackDeferredRewards(
  anniversarySecondGroup,
  bundledDailyPack,
  1,
  "2026-09-24",
  "2026-09-24",
);
assert.equal(bundledPurchaseDayDeferred.deliveredOccurrences, 1);
assert.equal(bundledPurchaseDayDeferred.resources.common_paint, 1);
assert.equal(bundledPurchaseDayDeferred.resources.diamond, 20);
const bundledPartialDeferred = calculateEventPackDeferredRewards(
  anniversarySecondGroup,
  bundledDailyPack,
  1,
  "2026-09-24",
  "2026-09-26",
);
assert.equal(bundledPartialDeferred.deliveredOccurrences, 3);
assert.equal(bundledPartialDeferred.resources.common_paint, 3);
assert.equal(bundledPartialDeferred.resources.diamond, 60);
const bundledFullDeferred = calculateEventPackDeferredRewards(
  anniversarySecondGroup,
  bundledDailyPack,
  1,
  "2026-09-24",
  "2026-10-13",
);
assert.equal(bundledFullDeferred.deliveredOccurrences, 19);
assert.equal(bundledFullDeferred.resources.common_paint, 19);
assert.equal(bundledFullDeferred.resources.diamond, 380);

const secondDisplayPack = {
  ...eventPackData,
  id: "sample-second-display-pack",
  name: "第二个测试活动礼包",
};
assert.equal(
  getDisplayableEventPacks([eventPackData], "2026-09-01").length,
  1,
);
assert.equal(
  getDisplayableEventPacks([eventPackData], "2026-09-02").length,
  1,
);
assert.equal(
  getDisplayableEventPacks([eventPackData], "2026-09-03").length,
  0,
);
assert.equal(
  getDisplayableEventPacks([eventPackData], "2026-08-25").length,
  1,
);
assert.equal(
  getDisplayableEventPacks(
    [eventPackData, secondDisplayPack],
    "2026-09-02",
  ).length,
  2,
);
assert.match(
  appSource,
  /getDisplayableEventPacks\(\s*eventPacks,\s*dateSelectionState\.currentDate,\s*\)/,
);

const dailyAvailability = calculateEventPackDailyAvailability(
  "2026-08-25",
  "2026-08-30",
  eventPackData,
  1,
);
assert.equal(dailyAvailability.days, 5);
assert.equal(dailyAvailability.maximumQuantity, 5);
assert.equal(
  calculateEventPackDailyAvailability(
    "2026-08-25",
    "2026-08-26",
    eventPackData,
    1,
  ).days,
  1,
);
assert.equal(
  calculateEventPackDailyAvailability(
    "2026-08-26",
    "2026-08-27",
    eventPackData,
    1,
  ).days,
  2,
);
assert.equal(
  calculateEventPackDailyAvailability(
    "2026-08-28",
    "2026-09-02",
    eventPackData,
    1,
  ).maximumQuantity,
  6,
);
assert.equal(
  calculateEventPackDailyAvailability(
    "2026-08-30",
    "2026-09-10",
    eventPackData,
    1,
  ).days,
  4,
);
assert.equal(
  getEventPackMaximumQuantity(
    findPack("庄园大型颜料箱"),
    eventPackData,
    "2026-08-25",
    "2026-09-02",
  ),
  2,
);
assert.equal(
  getEventPackMaximumQuantity(
    findPack("庄园颜料觉悟礼包"),
    eventPackData,
    "2026-08-25",
    "2026-09-02",
  ),
  3,
);

function updatePurchase(purchases, packId, selected, quantity = 1) {
  return updateEventPackPurchase(
    eventPackData,
    purchases,
    packId,
    selected,
    quantity,
    "2026-08-25",
    "2026-09-02",
  );
}

let interactionState = createEventPackPurchaseState([eventPackData])[
  eventPackData.id
];
let interactionResult = updatePurchase(
  interactionState,
  "庄园画材大礼包",
  true,
);
assert.equal(interactionResult.valid, true);
assert.equal(interactionResult.purchases["庄园画材大礼包"].quantity, 1);
interactionResult = updatePurchase(
  interactionResult.purchases,
  "庄园画材大礼包",
  false,
  0,
);
assert.equal(interactionResult.purchases["庄园画材大礼包"].selected, false);

interactionResult = updatePurchase(
  interactionResult.purchases,
  "庄园大型颜料箱",
  true,
  2,
);
assert.equal(interactionResult.valid, true);
assert.equal(interactionResult.purchases["庄园大型颜料箱"].quantity, 2);
interactionResult = updatePurchase(
  interactionResult.purchases,
  "庄园颜料觉悟礼包",
  true,
  3,
);
assert.equal(interactionResult.valid, true);
assert.equal(interactionResult.purchases["庄园颜料觉悟礼包"].quantity, 3);

interactionState = createEventPackPurchaseState([eventPackData])[
  eventPackData.id
];
assert.equal(
  updatePurchase(interactionState, "庄园诡戏颜料包II", true).valid,
  false,
);
interactionResult = updatePurchase(
  interactionState,
  "庄园诡戏颜料包I",
  true,
);
interactionResult = updatePurchase(
  interactionResult.purchases,
  "庄园诡戏颜料包II",
  true,
);
assert.equal(interactionResult.valid, true);
interactionResult = updatePurchase(
  interactionResult.purchases,
  "庄园诡戏颜料包III",
  true,
);
assert.equal(interactionResult.valid, true);
interactionResult = updatePurchase(
  interactionResult.purchases,
  "庄园诡戏颜料包I",
  false,
  0,
);
assert.equal(interactionResult.purchases["庄园诡戏颜料包II"].selected, false);
assert.equal(interactionResult.purchases["庄园诡戏颜料包III"].selected, false);

interactionResult = updatePurchase(
  interactionState,
  "庄园诡戏颜料包I",
  true,
);
interactionResult = updatePurchase(
  interactionResult.purchases,
  "庄园诡戏颜料包II",
  true,
);
interactionResult = updatePurchase(
  interactionResult.purchases,
  "庄园诡戏颜料包III",
  true,
);
interactionResult = updatePurchase(
  interactionResult.purchases,
  "庄园诡戏颜料包II",
  false,
  0,
);
assert.equal(interactionResult.purchases["庄园诡戏颜料包I"].selected, true);
assert.equal(interactionResult.purchases["庄园诡戏颜料包III"].selected, false);

const triggerPurchase = updatePurchase(
  interactionState,
  "庄园推送礼·第5",
  true,
);
assert.equal(triggerPurchase.valid, true);
assert.equal(triggerPurchase.purchases["庄园推送礼·第5"].selected, true);

const exclusiveBasePack = {
  price: 1,
  countsTowardLimitedRecharge: true,
  purchaseRule: { type: "total", limit: 1 },
  contents: [{ resourceId: "diamond", amount: 1 }],
  otherContents: [],
  prerequisites: [],
  trigger: null,
  deferredRewards: [],
};
const exclusiveFixture = {
  id: "exclusive-fixture",
  name: "互斥测试分组",
  eventId: "exclusive-fixture-event",
  startDate: "2026-09-24",
  endDate: "2026-10-12",
  packs: [
    {
      ...exclusiveBasePack,
      id: "exclusive-a",
      name: "互斥 A",
      exclusiveGroup: "group-one",
    },
    {
      ...exclusiveBasePack,
      id: "exclusive-b",
      name: "互斥 B",
      exclusiveGroup: "group-one",
    },
    {
      ...exclusiveBasePack,
      id: "exclusive-c",
      name: "互斥 C",
      exclusiveGroup: "group-two",
    },
  ],
};
let exclusivePurchases = createEventPackPurchaseState([
  exclusiveFixture,
])[exclusiveFixture.id];
let exclusiveUpdate = updateEventPackPurchase(
  exclusiveFixture,
  exclusivePurchases,
  "exclusive-a",
  true,
  1,
  "2026-09-24",
  "2026-09-24",
);
assert.equal(exclusiveUpdate.valid, true);
exclusivePurchases = exclusiveUpdate.purchases;
assert.equal(
  isEventPackExclusiveGroupOccupied(
    exclusiveFixture,
    exclusivePurchases,
    "exclusive-a",
  ),
  false,
);
assert.equal(
  isEventPackExclusiveGroupOccupied(
    exclusiveFixture,
    exclusivePurchases,
    "exclusive-b",
  ),
  true,
);
assert.equal(
  isEventPackExclusiveGroupOccupied(
    exclusiveFixture,
    exclusivePurchases,
    "exclusive-c",
  ),
  false,
);
const blockedExclusiveUpdate = updateEventPackPurchase(
  exclusiveFixture,
  exclusivePurchases,
  "exclusive-b",
  true,
  1,
  "2026-09-24",
  "2026-09-24",
);
assert.equal(blockedExclusiveUpdate.valid, false);
assert.equal(blockedExclusiveUpdate.purchases["exclusive-a"].selected, true);
assert.equal(blockedExclusiveUpdate.purchases["exclusive-b"].selected, false);
exclusiveUpdate = updateEventPackPurchase(
  exclusiveFixture,
  exclusivePurchases,
  "exclusive-c",
  true,
  1,
  "2026-09-24",
  "2026-09-24",
);
assert.equal(exclusiveUpdate.valid, true);
exclusivePurchases = exclusiveUpdate.purchases;
exclusiveUpdate = updateEventPackPurchase(
  exclusiveFixture,
  exclusivePurchases,
  "exclusive-a",
  false,
  0,
  "2026-09-24",
  "2026-09-24",
);
assert.equal(exclusiveUpdate.valid, true);
exclusivePurchases = exclusiveUpdate.purchases;
assert.equal(
  isEventPackExclusiveGroupOccupied(
    exclusiveFixture,
    exclusivePurchases,
    "exclusive-b",
  ),
  false,
);
exclusiveUpdate = updateEventPackPurchase(
  exclusiveFixture,
  exclusivePurchases,
  "exclusive-b",
  true,
  1,
  "2026-09-24",
  "2026-09-24",
);
assert.equal(exclusiveUpdate.valid, true);

assert.equal(
  isEventPackExclusiveGroupOccupied(
    eventPackData,
    createEventPackPurchaseState([eventPackData])[eventPackData.id],
    "庄园画材大礼包",
  ),
  false,
);
assert.equal(
  getEventPackMaximumQuantity(
    dailyPack,
    anniversarySecondGroup,
    "2026-09-24",
    "2026-10-12",
  ),
  19,
);
let actualDailyPurchases = createEventPackPurchaseState([
  anniversarySecondGroup,
])[anniversarySecondGroup.id];
const actualDailyUpdate = updateEventPackPurchase(
  anniversarySecondGroup,
  actualDailyPurchases,
  dailyPack.id,
  true,
  19,
  "2026-09-24",
  "2026-10-12",
);
assert.equal(actualDailyUpdate.valid, true);
actualDailyPurchases = actualDailyUpdate.purchases;
assert.equal(
  isEventPackExclusiveGroupOccupied(
    anniversarySecondGroup,
    actualDailyPurchases,
    bundledDailyPack.id,
  ),
  true,
);
assert.equal(
  updateEventPackPurchase(
    anniversarySecondGroup,
    actualDailyPurchases,
    bundledDailyPack.id,
    true,
    1,
    "2026-09-24",
    "2026-10-12",
  ).valid,
  false,
);

let luckyBagPurchases = createEventPackPurchaseState([
  anniversaryLuckyBagGroup,
])[anniversaryLuckyBagGroup.id];
const luckyBagUpdate = updateEventPackPurchase(
  anniversaryLuckyBagGroup,
  luckyBagPurchases,
  regularLuckyBag.id,
  true,
  1,
  "2026-09-17",
  "2026-10-12",
);
assert.equal(luckyBagUpdate.valid, true);
luckyBagPurchases = luckyBagUpdate.purchases;
assert.equal(
  isEventPackExclusiveGroupOccupied(
    anniversaryLuckyBagGroup,
    luckyBagPurchases,
    premiumLuckyBag.id,
  ),
  true,
);

let cityChoicePurchases = createEventPackPurchaseState([
  anniversarySecondGroup,
])[anniversarySecondGroup.id];
assert.equal(
  updateEventPackPurchase(
    anniversarySecondGroup,
    cityChoicePurchases,
    cityChoicePack.id,
    true,
    1,
    "2026-09-24",
    "2026-10-12",
  ).valid,
  false,
);
const cityRedDiamondUpdate = updateEventPackPurchase(
  anniversarySecondGroup,
  cityChoicePurchases,
  cityRedDiamondPack.id,
  true,
  1,
  "2026-09-24",
  "2026-10-12",
);
assert.equal(cityRedDiamondUpdate.valid, true);
cityChoicePurchases = cityRedDiamondUpdate.purchases;
const cityChoiceUpdate = updateEventPackPurchase(
  anniversarySecondGroup,
  cityChoicePurchases,
  cityChoicePack.id,
  true,
  1,
  "2026-09-24",
  "2026-10-12",
);
assert.equal(cityChoiceUpdate.valid, true);
cityChoicePurchases = cityChoiceUpdate.purchases;
const cityChoiceSummary = calculateEventPackPurchaseSummary(
  [anniversarySecondGroup],
  { [anniversarySecondGroup.id]: cityChoicePurchases },
  "2026-09-24",
  "2026-10-12",
);
assert.equal(cityChoiceSummary.valid, true);
assert.equal(cityChoiceSummary.resources.common_paint, 10);
assert.equal(
  cityChoiceSummary.resources["limited-paint-永夜老荷兰"],
  10,
);

const invalidExclusiveSummary = calculateEventPackPurchaseSummary(
  [exclusiveFixture],
  {
    [exclusiveFixture.id]: {
      "exclusive-a": { selected: true, quantity: 1 },
      "exclusive-b": { selected: true, quantity: 1 },
      "exclusive-c": { selected: false, quantity: 0 },
    },
  },
  "2026-09-24",
  "2026-09-24",
);
assert.equal(invalidExclusiveSummary.valid, false);
assert.equal(invalidExclusiveSummary.totalPrice, 0);
assert.deepEqual(
  Object.fromEntries(Object.entries(invalidExclusiveSummary.resources)),
  {},
);
const invalidExclusiveRecharge = calculateEventPackLimitedRechargeRmb(
  [exclusiveFixture],
  {
    [exclusiveFixture.id]: {
      "exclusive-a": { selected: true, quantity: 1 },
      "exclusive-b": { selected: true, quantity: 1 },
      "exclusive-c": { selected: false, quantity: 0 },
    },
  },
  "2026-09-24",
  "2026-09-24",
  {
    id: "test-recharge",
    startDate: "2026-09-24",
    endDate: "2026-09-24",
  },
);
assert.equal(invalidExclusiveRecharge.valid, false);
assert.equal(invalidExclusiveRecharge.amount, 0);

let summaryState = createEventPackPurchaseState([eventPackData]);
let summaryUpdate = updatePurchase(
  summaryState[eventPackData.id],
  "庄园大型颜料箱",
  true,
  2,
);
summaryState[eventPackData.id] = summaryUpdate.purchases;
summaryUpdate = updatePurchase(
  summaryState[eventPackData.id],
  "庄园画材大礼包",
  true,
);
summaryState[eventPackData.id] = summaryUpdate.purchases;
summaryUpdate = updatePurchase(
  summaryState[eventPackData.id],
  "莱顿庄园礼包",
  true,
);
summaryState[eventPackData.id] = summaryUpdate.purchases;
const purchaseSummary = calculateEventPackPurchaseSummary(
  [eventPackData],
  summaryState,
  "2026-08-25",
  "2026-09-02",
);
assert.equal(purchaseSummary.totalPrice, 749);
assert.equal(purchaseSummary.resources.common_paint, 109);
assert.equal(purchaseSummary.resources.diamond, 68);
assert.equal("金币" in purchaseSummary.resources, false);
assert.equal("莱顿庄园-初融" in purchaseSummary.resources, false);

let strangeSummaryState = createEventPackPurchaseState([
  strangeEventPackData,
]);
const strangeContinuousUpdate = updateEventPackPurchase(
  strangeEventPackData,
  strangeSummaryState[strangeEventPackData.id],
  strangeContinuousPack.id,
  true,
  1,
  "2026-09-01",
  "2026-09-10",
);
assert.equal(strangeContinuousUpdate.valid, true);
strangeSummaryState[strangeEventPackData.id] =
  strangeContinuousUpdate.purchases;
const strangePurchaseSummary = calculateEventPackPurchaseSummary(
  [strangeEventPackData],
  strangeSummaryState,
  "2026-09-01",
  "2026-09-10",
);
assert.equal(strangePurchaseSummary.resources.diamond, 280);
assert.equal(strangePurchaseSummary.resources.common_paint, 5);

const partialStrangePurchaseSummary =
  calculateEventPackPurchaseSummary(
    [strangeEventPackData],
    strangeSummaryState,
    "2026-09-03",
    "2026-09-05",
  );
assert.equal(partialStrangePurchaseSummary.resources.diamond, 280);
assert.equal(partialStrangePurchaseSummary.resources.common_paint, 2);

let anniversarySummaryState = createEventPackPurchaseState([
  anniversaryWarmupGroup,
]);
const luckyBoxUpdate = updateEventPackPurchase(
  anniversaryWarmupGroup,
  anniversarySummaryState[anniversaryWarmupGroup.id],
  luckyBox.id,
  true,
  1,
  "2026-09-17",
  "2026-09-17",
);
assert.equal(luckyBoxUpdate.valid, true);
anniversarySummaryState[anniversaryWarmupGroup.id] =
  luckyBoxUpdate.purchases;
const luckyBoxPurchaseSummary = calculateEventPackPurchaseSummary(
  [anniversaryWarmupGroup],
  anniversarySummaryState,
  "2026-09-17",
  "2026-09-17",
);
assert.equal(luckyBoxPurchaseSummary.totalPrice, 6);
assert.deepEqual(
  Object.fromEntries(Object.entries(luckyBoxPurchaseSummary.resources)),
  {},
);

const loaderContext = vm.createContext({ Date });
vm.runInContext(
  readProjectFile(path.join("js", "data-loader.js")),
  loaderContext,
);

const loadEventPacks = vm.runInContext("loadEventPacks", loaderContext);
const sanitizeEventPack = vm.runInContext(
  "sanitizeEventPack",
  loaderContext,
);
const isValidEventPackItem = vm.runInContext(
  "isValidEventPackItem",
  loaderContext,
);
const validResourceIds = new Set([
  ...resourceTypeData.resourceTypes.map((resourceType) => resourceType.id),
  ...resourceInstanceData.resources.map((resource) => resource.id),
]);

assert.equal(
  packs.every((pack) => isValidEventPackItem(pack, validResourceIds)),
  true,
);
assert.equal(
  strangePacks.every((pack) =>
    isValidEventPackItem(pack, validResourceIds),
  ),
  true,
);
assert.equal(
  anniversaryPacks.every((pack) =>
    isValidEventPackItem(pack, validResourceIds),
  ),
  true,
);

const validTestPack = {
  id: "valid-test-pack",
  name: "有效测试礼包",
  price: 0,
  countsTowardLimitedRecharge: true,
  purchaseRule: { type: "total", limit: 1 },
  contents: [{ resourceId: "diamond", amount: 1 }],
  otherContents: [{ name: "测试素材", amount: 1 }],
  prerequisites: [],
  trigger: null,
  deferredRewards: [],
};
assert.equal(isValidEventPackItem(validTestPack, validResourceIds), true);
assert.equal(
  isValidEventPackItem(
    { ...validTestPack, exclusiveGroup: "test-group" },
    validResourceIds,
  ),
  true,
);
assert.equal(
  isValidEventPackItem(
    { ...validTestPack, exclusiveGroup: "" },
    validResourceIds,
  ),
  false,
);
assert.equal(
  isValidEventPackItem(
    { ...validTestPack, exclusiveGroup: 1 },
    validResourceIds,
  ),
  false,
);
const validRandomContents = [
  {
    probability: 0.5,
    contents: [{ resourceId: "diamond", amount: 60 }],
  },
  {
    probability: 0.5,
    contents: [{ resourceId: "common_paint", amount: 1 }],
  },
];
assert.equal(
  isValidEventPackItem(
    { ...validTestPack, randomContents: validRandomContents },
    validResourceIds,
  ),
  true,
);
assert.equal(
  isValidEventPackItem(
    {
      ...validTestPack,
      randomContents: validRandomContents.map((outcome, index) => ({
        ...outcome,
        probability: index === 0 ? 0.4 : 0.5,
      })),
    },
    validResourceIds,
  ),
  false,
);
assert.equal(
  isValidEventPackItem(
    {
      ...validTestPack,
      randomContents: [
        { probability: 0, contents: validRandomContents[0].contents },
        validRandomContents[1],
      ],
    },
    validResourceIds,
  ),
  false,
);
assert.equal(
  isValidEventPackItem(
    {
      ...validTestPack,
      randomContents: [{ probability: 1, contents: [] }],
    },
    validResourceIds,
  ),
  false,
);
assert.equal(
  isValidEventPackItem(
    {
      ...validTestPack,
      randomContents: [
        {
          probability: 1,
          contents: [
            { resourceId: "diamond", amount: 1 },
            { resourceId: "diamond", amount: 2 },
          ],
        },
      ],
    },
    validResourceIds,
  ),
  false,
);
const invalidEventPack = {
  id: "invalid-items-test",
  name: "无效单项测试",
  eventId: "庄园诡戏",
  startDate: "2026-08-26",
  endDate: "2026-09-02",
  packs: [
    validTestPack,
    { ...validTestPack, name: "重复 ID" },
    {
      ...validTestPack,
      id: "invalid-rule",
      purchaseRule: { type: "weekly", limit: 1 },
    },
    {
      ...validTestPack,
      id: "invalid-prerequisite",
      prerequisites: ["missing-pack"],
    },
    {
      ...validTestPack,
      id: "invalid-resource",
      contents: [{ resourceId: "unknown-resource", amount: 1 }],
    },
    {
      ...validTestPack,
      id: "duplicate-content",
      contents: [
        { resourceId: "diamond", amount: 1 },
        { resourceId: "diamond", amount: 2 },
      ],
    },
  ],
};
const sanitized = sanitizeEventPack(invalidEventPack, validResourceIds);
assert.equal(sanitized.packs.length, 1);
assert.equal(sanitized.packs[0].id, "valid-test-pack");

const secondEventPack = {
  ...eventPackData,
  id: "sample-second-event-pack",
  name: "第二个测试活动礼包",
  eventId: "sample-second-event",
  packs: [],
};
const duplicateSecondEventPack = {
  ...secondEventPack,
  name: "重复活动礼包分组",
};
const requestedPaths = [];
loaderContext.fetch = async (requestedPath) => {
  requestedPaths.push(requestedPath);

  const dataByPath = {
    "data/resources/resource-types.json": resourceTypeData,
    "data/resources/resources.json": resourceInstanceData,
    "data/packs/event-packs/庄园诡戏.json": eventPackData,
    "data/packs/event-packs/怪谈活动.json": strangeEventPackData,
    "data/packs/event-packs/六周年.json": anniversaryEventPackData,
    "event-pack-one.json": eventPackData,
    "event-pack-two.json": secondEventPack,
    "event-pack-array.json": [
      secondEventPack,
      duplicateSecondEventPack,
      ...anniversaryEventPackData,
    ],
  };

  return {
    ok: Object.prototype.hasOwnProperty.call(dataByPath, requestedPath),
    json: async () => dataByPath[requestedPath],
  };
};

(async () => {
  const defaultLoaded = await loadEventPacks();
  const loaded = await loadEventPacks([
    "event-pack-one.json",
    "event-pack-two.json",
  ]);
  const arrayLoaded = await loadEventPacks(["event-pack-array.json"]);

  const defaultLoadedIds = new Set(defaultLoaded.map(({ id }) => id));
  assert.equal(defaultLoadedIds.has("庄园诡戏礼包"), true);
  assert.equal(defaultLoadedIds.has("怪谈活动"), true);
  anniversaryEventPackData.forEach(({ id }) => {
    assert.equal(defaultLoadedIds.has(id), true);
  });
  assert.equal(loaded.length, 2);
  assert.equal(
    loaded.some(({ id }) => id === eventPackData.id),
    true,
  );
  assert.equal(
    loaded.some(({ id }) => id === secondEventPack.id),
    true,
  );
  assert.equal(
    arrayLoaded.filter(({ id }) => id === secondEventPack.id).length,
    1,
  );
  anniversaryEventPackData.forEach(({ id }) => {
    assert.equal(arrayLoaded.some((eventPack) => eventPack.id === id), true);
  });
  assert.equal(requestedPaths.includes("event-pack-one.json"), true);
  assert.equal(requestedPaths.includes("event-pack-two.json"), true);
  assert.equal(requestedPaths.includes("event-pack-array.json"), true);
  console.log("event packs: data and loader validation tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
