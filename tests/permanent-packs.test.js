"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

const packData = JSON.parse(
  readProjectFile(path.join("data", "packs", "permanent-packs.json")),
);
const constantsData = JSON.parse(
  readProjectFile(path.join("data", "constants.json")),
);
const packs = packData.packs;
const rules = constantsData.constants.permanentPackCalculation;
const indexHtml = readProjectFile("index.html");
const calculatorContext = vm.createContext({});

vm.runInContext(
  readProjectFile(path.join("js", "calculator.js")),
  calculatorContext,
);

const calculatePermanentPackValue = vm.runInContext(
  "calculatePermanentPackValue",
  calculatorContext,
);
const getDisplayablePermanentPacks = vm.runInContext(
  "getDisplayablePermanentPacks",
  calculatorContext,
);
const calculatePermanentPackPurchases = vm.runInContext(
  "calculatePermanentPackPurchases",
  calculatorContext,
);

assert.equal(packs.length, 25);
assert.equal(new Set(packs.map((pack) => pack.id)).size, 25);
assert.equal(
  packs.every((pack) => pack.countsTowardLimitedRecharge === true),
  true,
);
assert.equal(
  packs.every(
    (pack) =>
      !("theoreticalPulls" in pack) && !("pricePerPull" in pack),
  ),
  true,
);
assert.match(indexHtml, /<summary[^>]*>新人和等级礼包<\/summary>/);
assert.match(indexHtml, /<details class="pack-disclosure">/);
assert.doesNotMatch(indexHtml, /<details class="pack-disclosure" open>/);

const continuousPack = packs.find((pack) => pack.id === "颜料连续礼包");
assert.equal(continuousPack.contents.diamond, 60);
assert.equal(continuousPack.contents.common_paint, 7);
assert.match(continuousPack.note, /连续7天/);

const storagePack = packs.find((pack) => pack.id === "颜料收纳箱");
const combinationPack = packs.find((pack) => pack.id === "颜料组合");
const weeklyPack = packs.find((pack) => pack.id === "颜料周礼包");
assert.equal(storagePack.purchaseLimit, 2);
assert.equal(combinationPack.purchaseLimit, 3);
assert.equal("purchaseLimit" in weeklyPack, false);
assert.deepEqual(weeklyPack.purchaseRule, { type: "weekly", limit: 1 });

const continuousValue = calculatePermanentPackValue(
  continuousPack,
  rules.defaultRedDiamondPerPull,
  rules,
);
assert.equal(continuousValue.theoreticalPulls, 7.4);
assert.ok(Math.abs(continuousValue.pricePerPull - 12 / 7.4) < 1e-12);

const combinationValue = calculatePermanentPackValue(
  combinationPack,
  rules.defaultRedDiamondPerPull,
  rules,
);
assert.ok(
  Math.abs(combinationValue.theoreticalPulls - (14 + 80 / 150)) < 1e-12,
);
assert.ok(
  Math.abs(
    combinationValue.pricePerPull - 98 / (14 + 80 / 150),
  ) < 1e-12,
);

const redDiamondValue = calculatePermanentPackValue(
  {
    id: "red-diamond-test-pack",
    name: "红钻测试礼包",
    price: 5,
    contents: { red_diamond: 70.71 },
  },
  70.71,
  rules,
);
assert.equal(redDiamondValue.theoreticalPulls, 1);
assert.equal(redDiamondValue.pricePerPull, 5);
assert.equal(
  calculatePermanentPackValue(
    continuousPack,
    0,
    rules,
  ).valid,
  false,
);

const displayResult = getDisplayablePermanentPacks(
  packs,
  rules.defaultRedDiamondPerPull,
  rules,
);
assert.equal(displayResult.valid, true);
assert.equal(displayResult.packs.length, 25);
assert.equal(displayResult.packs[0].pack.id, "颜料连续礼包");
assert.equal(displayResult.packs[1].pack.id, "新手限定礼包");
assert.equal(
  displayResult.packs[displayResult.packs.length - 1].pack.id,
  "艺术家画材礼盒",
);
assert.equal(
  displayResult.packs.every(
    (result) => result.pricePerPull < rules.maximumDisplayedPricePerPull,
  ),
  true,
);
assert.equal(
  displayResult.packs.every(
    (result, index, results) =>
      index === 0 || results[index - 1].pricePerPull <= result.pricePerPull,
  ),
  true,
);

const filteredResult = getDisplayablePermanentPacks(
  [
    ...packs,
    {
      id: "expensive-test-pack",
      name: "高价测试礼包",
      price: 11,
      purchaseLimit: 1,
      countsTowardLimitedRecharge: true,
      contents: { common_paint: 1 },
    },
  ],
  rules.defaultRedDiamondPerPull,
  rules,
);
assert.equal(
  filteredResult.packs.some(
    (result) => result.pack.id === "expensive-test-pack",
  ),
  false,
);

const purchaseResult = calculatePermanentPackPurchases(packs, {
  "颜料连续礼包": 1,
  "颜料收纳箱": 2,
  "颜料组合": 3,
});
assert.equal(purchaseResult.valid, true);
assert.equal(purchaseResult.totalPrice, 702);
assert.equal(purchaseResult.resources.diamond, 300);
assert.equal(purchaseResult.resources.common_paint, 109);
assert.equal(purchaseResult.purchases.length, 3);
assert.equal(
  purchaseResult.purchases.every(
    (purchase) => purchase.countsTowardLimitedRecharge === true,
  ),
  true,
);
assert.equal(
  calculatePermanentPackPurchases(packs, { "颜料收纳箱": 3 }).valid,
  false,
);
assert.equal(
  calculatePermanentPackPurchases(packs, { "颜料组合": 1.5 }).valid,
  false,
);

const requestedPaths = [];
const loaderContext = vm.createContext({
  fetch: async (requestedPath) => {
    requestedPaths.push(requestedPath);

    return {
      ok: true,
      json: async () =>
        requestedPath === "data/packs/permanent-packs.json"
          ? packData
          : constantsData,
    };
  },
});

vm.runInContext(
  readProjectFile(path.join("js", "data-loader.js")),
  loaderContext,
);

const loadPermanentPacks = vm.runInContext(
  "loadPermanentPacks",
  loaderContext,
);
const loadPermanentPackRules = vm.runInContext(
  "loadPermanentPackRules",
  loaderContext,
);

(async () => {
  const loadedPacks = await loadPermanentPacks();
  const loadedRules = await loadPermanentPackRules();

  assert.equal(loadedPacks.length, 25);
  assert.equal(loadedRules.defaultRedDiamondPerPull, 70.71);
  assert.deepEqual(requestedPaths, [
    "data/packs/permanent-packs.json",
    "data/constants.json",
  ]);
  console.log("permanent packs: data, value, and purchase tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
