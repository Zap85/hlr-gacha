"use strict";

const BANNER_PATHS = ["data/banners/sample-banner.json"];

function isValidBannerDate(value) {
  if (typeof value !== "string") {
    return false;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);

  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidBanner(banner) {
  return (
    banner !== null &&
    typeof banner === "object" &&
    typeof banner.id === "string" &&
    banner.id.trim() !== "" &&
    typeof banner.name === "string" &&
    banner.name.trim() !== "" &&
    isValidBannerDate(banner.startDate) &&
    isValidBannerDate(banner.endDate) &&
    banner.startDate <= banner.endDate
  );
}

async function loadBanners(paths = BANNER_PATHS) {
  const banners = await Promise.all(
    paths.map(async (path) => {
      const response = await fetch(path);

      if (!response.ok) {
        throw new Error(`无法读取卡池数据：${path}`);
      }

      const banner = await response.json();
      return isValidBanner(banner) ? banner : null;
    }),
  );

  return banners.filter((banner) => banner !== null);
}
