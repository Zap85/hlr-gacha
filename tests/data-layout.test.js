"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const dataLoaderSource = fs.readFileSync(
  path.join(projectRoot, "js", "data-loader.js"),
  "utf8",
);
const activeDataPaths = [
  "data/banners/banners.json",
  "data/events/event-types.json",
  "data/events/events.json",
  "data/recharge-events/recharge-events.json",
  "data/packs/permanent-packs.json",
  "data/packs/event-packs/庄园诡戏.json",
  "data/packs/event-packs/怪谈活动.json",
  "data/packs/currency-packs/庄园诡戏.json",
  "data/resources/resource-types.json",
  "data/resources/resources.json",
  "data/constants.json",
];
const templatePaths = [
  "data/banners/banner.template.json",
  "data/events/event.template.json",
  "data/recharge-events/recharge-event.template.json",
  "data/packs/event-packs/event-pack.template.json",
  "data/packs/currency-packs/currency-pack.template.json",
  "data/resources/resource.template.json",
];

[...activeDataPaths, ...templatePaths].forEach((relativePath) => {
  const contents = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  assert.doesNotThrow(() => JSON.parse(contents), `${relativePath} 应为合法 JSON`);
});

templatePaths.forEach((relativePath) => {
  assert.equal(dataLoaderSource.includes(relativePath), false);
});
assert.doesNotMatch(dataLoaderSource, /\.template\.json/);

[
  "data/banners/sample-banner.json",
  "data/events/sample-event.json",
  "data/resources/sample-resources.json",
  "data/permanent-packs.json",
].forEach((relativePath) => {
  assert.equal(fs.existsSync(path.join(projectRoot, relativePath)), false);
});

console.log("data layout: active paths and template exclusions passed");
