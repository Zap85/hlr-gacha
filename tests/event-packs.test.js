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
const resourceTypeData = JSON.parse(
  readProjectFile(path.join("data", "resources", "resource-types.json")),
);
const resourceInstanceData = JSON.parse(
  readProjectFile(path.join("data", "resources", "sample-resources.json")),
);
const eventData = JSON.parse(
  readProjectFile(path.join("data", "events", "sample-event.json")),
);
const packs = eventPackData.packs;
const indexHtml = readProjectFile("index.html");

assert.equal(eventPackData.id, "庄园诡戏礼包");
assert.equal(eventPackData.name, "庄园诡戏礼包");
assert.equal(eventPackData.eventId, "庄园诡戏");
assert.equal(
  eventData.events.some((event) => event.id === eventPackData.eventId),
  true,
);
assert.equal(eventPackData.startDate, "2026-08-26");
assert.equal(eventPackData.endDate, "2026-09-02");
assert.equal(packs.length, 17);
assert.equal(new Set(packs.map((pack) => pack.id)).size, 17);
assert.equal(
  packs.every((pack) => pack.countsTowardLimitedRecharge === true),
  true,
);
assert.match(indexHtml, /<summary[^>]*>六、活动礼包<\/summary>/);
assert.match(indexHtml, /<details class="pack-disclosure event-packs-disclosure">/);
assert.doesNotMatch(
  indexHtml,
  /<details class="pack-disclosure event-packs-disclosure" open>/,
);

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
const calculateEventPackPurchaseSummary = vm.runInContext(
  "calculateEventPackPurchaseSummary",
  calculatorContext,
);

const secondDisplayPack = {
  ...eventPackData,
  id: "sample-second-display-pack",
  name: "第二个测试活动礼包",
};
assert.equal(
  getDisplayableEventPacks(
    [eventPackData, secondDisplayPack],
    "2026-08-26",
  ).length,
  2,
);
assert.equal(
  getDisplayableEventPacks(
    [eventPackData, secondDisplayPack],
    "2026-08-25",
  ).length,
  0,
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
assert.equal(purchaseSummary.limitedRechargePrice, 749);
assert.equal(purchaseSummary.resources.common_paint, 109);
assert.equal(purchaseSummary.resources.diamond, 68);
assert.equal("金币" in purchaseSummary.resources, false);
assert.equal("莱顿庄园-初融" in purchaseSummary.resources, false);

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
const requestedPaths = [];
loaderContext.fetch = async (requestedPath) => {
  requestedPaths.push(requestedPath);

  const dataByPath = {
    "data/resources/resource-types.json": resourceTypeData,
    "data/resources/sample-resources.json": resourceInstanceData,
    "data/packs/event-packs/庄园诡戏.json": eventPackData,
    "event-pack-one.json": eventPackData,
    "event-pack-two.json": secondEventPack,
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

  assert.equal(defaultLoaded.length, 1);
  assert.equal(defaultLoaded[0].id, "庄园诡戏礼包");
  assert.equal(loaded.length, 2);
  assert.equal(loaded[0].packs.length, 17);
  assert.equal(loaded[1].id, "sample-second-event-pack");
  assert.equal(requestedPaths.includes("event-pack-one.json"), true);
  assert.equal(requestedPaths.includes("event-pack-two.json"), true);
  console.log("event packs: data and loader validation tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
