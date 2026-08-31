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

const parseInventoryAmount = vm.runInContext(
  "parseInventoryAmount",
  calculatorContext,
);
const getApplicableLimitedPaintResources = vm.runInContext(
  "getApplicableLimitedPaintResources",
  calculatorContext,
);
const calculatePreConversionSummary = vm.runInContext(
  "calculatePreConversionSummary",
  calculatorContext,
);

assert.equal(parseInventoryAmount("").amount, 0);
assert.equal(parseInventoryAmount("0").amount, 0);
assert.equal(parseInventoryAmount("12").amount, 12);
assert.equal(parseInventoryAmount("-1").valid, false);
assert.equal(parseInventoryAmount("1.5").valid, false);
assert.equal(parseInventoryAmount("invalid").valid, false);

const resourceTypeData = JSON.parse(
  readProjectFile(path.join("data", "resources", "resource-types.json")),
);
const resourceInstanceData = JSON.parse(
  readProjectFile(path.join("data", "resources", "resources.json")),
);
const bannerData = JSON.parse(
  readProjectFile(path.join("data", "banners", "banners.json")),
);
const indexHtml = readProjectFile("index.html");
const appContext = vm.createContext({ parseInventoryAmount });

vm.runInContext(readProjectFile(path.join("js", "app.js")), appContext);

const initializeFixedInventoryState = vm.runInContext(
  "initializeFixedInventoryState",
  appContext,
);
const updateFixedInventoryAmount = vm.runInContext(
  "updateFixedInventoryAmount",
  appContext,
);
const initializeTimedInventoryState = vm.runInContext(
  "initializeTimedInventoryState",
  appContext,
);
const initializeLimitedInventoryState = vm.runInContext(
  "initializeLimitedInventoryState",
  appContext,
);
const updateInventoryAmount = vm.runInContext(
  "updateInventoryAmount",
  appContext,
);
const inventoryState = vm.runInContext("inventoryState", appContext);

initializeFixedInventoryState(resourceTypeData.resourceTypes);
initializeTimedInventoryState(resourceTypeData.resourceTypes);
initializeLimitedInventoryState(resourceInstanceData.resources);

assert.deepEqual(Object.keys(inventoryState.fixedResources), [
  "diamond",
  "red_diamond",
  "common_paint",
]);
assert.equal(inventoryState.fixedResources.diamond, 0);
assert.equal(inventoryState.fixedResources.red_diamond, 0);
assert.equal(inventoryState.fixedResources.common_paint, 0);
assert.deepEqual(Object.keys(inventoryState.timedPaintTotals), ["timed_paint"]);
assert.equal(inventoryState.timedPaintTotals.timed_paint, 0);
assert.deepEqual(Object.keys(inventoryState.limitedPaintResources), [
  "通票老荷兰",
  "灵魂老荷兰",
  "甜蜜老荷兰",
]);
assert.equal(inventoryState.limitedPaintResources["通票老荷兰"], 0);
assert.equal(inventoryState.limitedPaintResources["灵魂老荷兰"], 0);
assert.equal(inventoryState.limitedPaintResources["甜蜜老荷兰"], 0);

updateFixedInventoryAmount("diamond", "120");
updateFixedInventoryAmount("red_diamond", "30");
updateFixedInventoryAmount("common_paint", "8");

assert.equal(inventoryState.fixedResources.diamond, 120);
assert.equal(inventoryState.fixedResources.red_diamond, 30);
assert.equal(inventoryState.fixedResources.common_paint, 8);

updateFixedInventoryAmount("red_diamond", "");
assert.equal(inventoryState.fixedResources.red_diamond, 0);
assert.equal(inventoryState.fixedResources.diamond, 120);

updateFixedInventoryAmount("common_paint", "-1");
assert.equal(inventoryState.fixedResources.common_paint, 8);

updateInventoryAmount("timedPaintTotals", "timed_paint", "6");
const limitedResult = updateInventoryAmount(
  "limitedPaintResources",
  "通票老荷兰",
  "3",
);
const invalidLimitedResult = updateInventoryAmount(
  "limitedPaintResources",
  "灵魂老荷兰",
  "-1",
);

assert.equal(inventoryState.timedPaintTotals.timed_paint, 6);
assert.equal(limitedResult.valid, true);
assert.equal(invalidLimitedResult.valid, false);
assert.equal(inventoryState.limitedPaintResources["通票老荷兰"], 3);
assert.equal(inventoryState.limitedPaintResources["灵魂老荷兰"], 0);
assert.equal(inventoryState.fixedResources.diamond, 120);

updateInventoryAmount("limitedPaintResources", "通票老荷兰", "5");
updateInventoryAmount("limitedPaintResources", "灵魂老荷兰", "2");
updateInventoryAmount("limitedPaintResources", "甜蜜老荷兰", "3");
updateInventoryAmount("limitedPaintResources", "灵魂老荷兰", "invalid");
updateInventoryAmount("timedPaintTotals", "timed_paint", "1.5");

assert.equal(inventoryState.limitedPaintResources["通票老荷兰"], 5);
assert.equal(inventoryState.limitedPaintResources["灵魂老荷兰"], 2);
assert.equal(inventoryState.limitedPaintResources["甜蜜老荷兰"], 3);
assert.equal(inventoryState.timedPaintTotals.timed_paint, 6);

const limitedResources = resourceInstanceData.resources.filter(
  (resource) => resource.category === "limited_paint",
);
const manorBanner = bannerData.find((banner) => banner.id === "庄园诡戏");
const birthdayBanner = bannerData.find((banner) => banner.id === "罗夏生日");
const noLimitedPaintBanner = bannerData.find(
  (banner) => banner.id === "六周年庆典",
);

assert.deepEqual(
  Array.from(
    getApplicableLimitedPaintResources(
      limitedResources,
      "banner",
      manorBanner,
    ),
    (resource) => resource.id,
  ),
  ["灵魂老荷兰"],
);
assert.deepEqual(
  Array.from(
    getApplicableLimitedPaintResources(
      limitedResources,
      "banner",
      birthdayBanner,
    ),
    (resource) => resource.id,
  ),
  ["甜蜜老荷兰"],
);
assert.equal(
  getApplicableLimitedPaintResources(
    limitedResources,
    "banner",
    noLimitedPaintBanner,
  ).length,
  0,
);
assert.equal(
  getApplicableLimitedPaintResources(
    limitedResources,
    "custom",
    birthdayBanner,
  ).length,
  0,
);
assert.equal(
  getApplicableLimitedPaintResources(
    limitedResources,
    "banner",
    { id: "其他卡池", name: "庄园诡戏", tags: [] },
  ).length,
  0,
  "不得使用显示名称匹配",
);

const multipleMatches = getApplicableLimitedPaintResources(
  [
    ...limitedResources,
    {
      id: "生日限定测试资源",
      name: "生日限定测试资源",
      category: "limited_paint",
      applicability: { type: "banner_tag", values: ["birthday"] },
    },
  ],
  "banner",
  birthdayBanner,
);
assert.equal(multipleMatches.length, 2);

const summaryOptions = {
  resourceSources: [inventoryState.limitedPaintResources],
  resourceInstances: resourceInstanceData.resources,
  targetDate: "2026-09-02",
};
assert.equal(
  calculatePreConversionSummary({
    ...summaryOptions,
    targetBanner: manorBanner,
  }).resources.limited_paint,
  2,
);
assert.equal(
  calculatePreConversionSummary({
    ...summaryOptions,
    targetBanner: birthdayBanner,
  }).resources.limited_paint,
  3,
);
assert.equal(
  calculatePreConversionSummary({
    ...summaryOptions,
    targetBanner: noLimitedPaintBanner,
  }).resources.limited_paint,
  0,
);
assert.equal(
  calculatePreConversionSummary({
    ...summaryOptions,
    targetBanner: null,
  }).resources.limited_paint,
  0,
);

assert.match(indexHtml, /id="limited-inventory-list"/);
assert.match(
  indexHtml,
  /id="limited-inventory-heading"[^>]*>限定老荷兰<\/div>/,
);
assert.match(
  indexHtml,
  /id="limited-inventory-message" class="limited-inventory-status"/,
);
assert.doesNotMatch(
  indexHtml,
  /limited-resource-select|add-limited-resource|limited-add-error/,
);

const requestedPaths = [];
const loaderContext = vm.createContext({
  Date,
  fetch: async (requestedPath) => {
    requestedPaths.push(requestedPath);

    return {
      ok: true,
      json: async () =>
        requestedPath === "data/resources/resources.json"
          ? resourceInstanceData
          : resourceTypeData,
    };
  },
});

vm.runInContext(
  readProjectFile(path.join("js", "data-loader.js")),
  loaderContext,
);

const loadResourceTypes = vm.runInContext("loadResourceTypes", loaderContext);
const loadResourceInstances = vm.runInContext(
  "loadResourceInstances",
  loaderContext,
);

(async () => {
  const resourceTypes = await loadResourceTypes();
  const resources = await loadResourceInstances();
  const timedPaintBatches = resources.filter(
    (resource) => resource.category === "timed_paint",
  );
  const limitedPaintResources = resources.filter(
    (resource) => resource.category === "limited_paint",
  );

  assert.equal(requestedPaths[0], "data/resources/resource-types.json");
  assert.equal(requestedPaths[1], "data/resources/resources.json");
  assert.equal(resourceTypes.length, 5);
  assert.equal(timedPaintBatches.length, 3);
  assert.equal(
    timedPaintBatches.some(
      (resource) => resource.id === "timed-paint-怪谈活动",
    ),
    true,
  );
  assert.equal(limitedPaintResources.length, 3);
  console.log("inventory module: fixed and dynamic resource tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
