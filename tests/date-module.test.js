"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

const banners = JSON.parse(
  readProjectFile(path.join("data", "banners", "banners.json")),
);
const banner = banners.find((item) => item.id === "六周年庆典");
const appContext = vm.createContext({});

vm.runInContext(readProjectFile(path.join("js", "app.js")), appContext);

const resolveTargetDate = vm.runInContext("resolveTargetDate", appContext);
const formatBannerOptionLabel = vm.runInContext(
  "formatBannerOptionLabel",
  appContext,
);
const indexHtml = readProjectFile("index.html");

assert.equal(banner.name, "六周年庆典");
assert.equal(
  formatBannerOptionLabel(banner),
  "六周年庆典 2026-09-24 ～ 2026-10-12",
);
assert.equal(resolveTargetDate("banner", banner, "start", ""), "2026-09-24");
assert.equal(resolveTargetDate("banner", banner, "end", ""), "2026-10-12");

assert.equal(
  resolveTargetDate("custom", banner, "start", "2026-11-01"),
  "2026-11-01",
);
assert.equal(
  resolveTargetDate("banner", banner, "start", "2026-11-01"),
  "2026-09-24",
);
assert.doesNotMatch(
  indexHtml,
  /卡池日期范围|实际目标日期|计算天数|banner-date-range|actual-target-date|calculated-days/,
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
const isValidBanner = vm.runInContext("isValidBanner", loaderContext);

(async () => {
  const validBanners = await loadBanners();
  const invalidBanners = await loadBanners(["invalid-banner.json"]);

  assert.equal(requestedPaths[0], "data/banners/banners.json");
  assert.equal(validBanners.length, banners.length);
  assert.equal(
    new Set(validBanners.map((loadedBanner) => loadedBanner.id)).size,
    validBanners.length,
  );
  assert.equal(
    validBanners.every(
      (loadedBanner) =>
        isValidBanner(loadedBanner) &&
        typeof loadedBanner.name === "string" &&
        loadedBanner.name.trim() !== "" &&
        loadedBanner.startDate <= loadedBanner.endDate &&
        Array.isArray(loadedBanner.tags),
    ),
    true,
  );
  assert.equal(invalidBanners.length, 0);
  console.log("date module: banner target and schema tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
