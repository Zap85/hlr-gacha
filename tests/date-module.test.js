"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

const banners = JSON.parse(
  readProjectFile(path.join("data", "banners", "sample-banner.json")),
);
const banner = banners.find((item) => item.id === "六周年庆典");
const appContext = vm.createContext({});

vm.runInContext(readProjectFile(path.join("js", "app.js")), appContext);

const resolveTargetDate = vm.runInContext("resolveTargetDate", appContext);

assert.equal(banner.name, "6周年庆典");
assert.equal(resolveTargetDate("banner", banner, "start", ""), "2026-09-26");
assert.equal(resolveTargetDate("banner", banner, "end", ""), "2026-10-12");

assert.equal(
  resolveTargetDate("custom", banner, "start", "2026-11-01"),
  "2026-11-01",
);
assert.equal(
  resolveTargetDate("banner", banner, "start", "2026-11-01"),
  "2026-09-26",
);

const requestedPaths = [];
const loaderContext = vm.createContext({
  Date,
  fetch: async (requestedPath) => {
    requestedPaths.push(requestedPath);

    return {
      ok: true,
      json: async () =>
        requestedPath !== "invalid-banner.json"
          ? banners
          : {
              id: "invalid-banner",
              name: "无效卡池",
              startDate: null,
              endDate: "2026-10-12",
              tags: [],
            },
    };
  },
});

vm.runInContext(
  readProjectFile(path.join("js", "data-loader.js")),
  loaderContext,
);

const loadBanners = vm.runInContext("loadBanners", loaderContext);

(async () => {
  const validBanners = await loadBanners();
  const invalidBanners = await loadBanners(["invalid-banner.json"]);

  assert.equal(requestedPaths[0], "data/banners/sample-banner.json");
  assert.equal(validBanners.length, 5);
  assert.equal(validBanners[0].id, "六周年庆典");
  assert.deepEqual(Array.from(validBanners[2].tags), ["birthday"]);
  assert.equal(invalidBanners.length, 0);
  console.log("date module: 5 banner target tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
