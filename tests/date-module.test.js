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
  "六周年庆典 2026-09-26 ～ 2026-10-12",
);
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

(async () => {
  const validBanners = await loadBanners();
  const invalidBanners = await loadBanners(["invalid-banner.json"]);

  assert.equal(requestedPaths[0], "data/banners/banners.json");
  assert.equal(validBanners.length, 7);
  assert.equal(validBanners.some((banner) => banner.id === "怪谈活动"), true);
  assert.deepEqual(
    Array.from(
      validBanners.find((banner) => banner.id === "司岚生日").tags,
    ),
    ["birthday"],
  );
  assert.equal(invalidBanners.length, 0);
  console.log("date module: 7 banner target tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
