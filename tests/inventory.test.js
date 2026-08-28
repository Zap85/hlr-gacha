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
  readProjectFile(path.join("data", "resources", "test-resources.json")),
);
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
const addLimitedInventoryResource = vm.runInContext(
  "addLimitedInventoryResource",
  appContext,
);
const removeLimitedInventoryResource = vm.runInContext(
  "removeLimitedInventoryResource",
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
assert.deepEqual(Object.keys(inventoryState.limitedPaintResources), []);

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
const addResult = addLimitedInventoryResource("通票老荷兰", "3");
const duplicateResult = addLimitedInventoryResource("通票老荷兰", "7");
const invalidAddResult = addLimitedInventoryResource("灵魂老荷兰", "-1");

assert.equal(inventoryState.timedPaintTotals.timed_paint, 6);
assert.equal(addResult.valid, true);
assert.equal(duplicateResult.valid, false);
assert.equal(invalidAddResult.valid, false);
assert.equal(inventoryState.limitedPaintResources["通票老荷兰"], 3);
assert.equal(inventoryState.limitedPaintResources["灵魂老荷兰"], undefined);
assert.equal(inventoryState.fixedResources.diamond, 120);

addLimitedInventoryResource("灵魂老荷兰", "2");
updateInventoryAmount("limitedPaintResources", "通票老荷兰", "5");
updateInventoryAmount("limitedPaintResources", "灵魂老荷兰", "invalid");
updateInventoryAmount("timedPaintTotals", "timed_paint", "1.5");

assert.equal(inventoryState.limitedPaintResources["通票老荷兰"], 5);
assert.equal(inventoryState.limitedPaintResources["灵魂老荷兰"], 2);
assert.equal(inventoryState.limitedPaintResources["甜蜜老荷兰"], undefined);
assert.equal(inventoryState.timedPaintTotals.timed_paint, 6);

assert.equal(removeLimitedInventoryResource("通票老荷兰"), true);
assert.equal(inventoryState.limitedPaintResources["通票老荷兰"], undefined);
assert.equal(inventoryState.limitedPaintResources["灵魂老荷兰"], 2);

const requestedPaths = [];
const loaderContext = vm.createContext({
  Date,
  fetch: async (requestedPath) => {
    requestedPaths.push(requestedPath);

    return {
      ok: true,
      json: async () =>
        requestedPath === "data/resources/test-resources.json"
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
  assert.equal(requestedPaths[1], "data/resources/test-resources.json");
  assert.equal(resourceTypes.length, 5);
  assert.equal(timedPaintBatches.length, 2);
  assert.equal(limitedPaintResources.length, 3);
  console.log("inventory module: fixed and dynamic resource tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
