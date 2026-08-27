"use strict";

const BANNER_PATHS = ["data/banners/sample-banner.json"];
const RESOURCE_TYPES_PATH = "data/resources/resource-types.json";
const RESOURCE_INSTANCES_PATH = "data/resources/sample-resources.json";
const CONSTANTS_PATH = "data/constants.json";

function isValidCalendarDate(value) {
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
    isValidCalendarDate(banner.startDate) &&
    isValidCalendarDate(banner.endDate) &&
    banner.startDate <= banner.endDate &&
    Array.isArray(banner.tags) &&
    banner.tags.every(
      (tag) => typeof tag === "string" && tag.trim() !== "",
    )
  );
}

async function loadBanners(paths = BANNER_PATHS) {
  const bannerGroups = await Promise.all(
    paths.map(async (path) => {
      const response = await fetch(path);

      if (!response.ok) {
        throw new Error(`无法读取卡池数据：${path}`);
      }

      const data = await response.json();
      const banners = Array.isArray(data) ? data : [data];
      return banners.filter(isValidBanner);
    }),
  );

  const bannerIds = new Set();

  return bannerGroups.flat().filter((banner) => {
    if (bannerIds.has(banner.id)) {
      return false;
    }

    bannerIds.add(banner.id);
    return true;
  });
}

function isValidResourceType(resourceType) {
  return (
    resourceType !== null &&
    typeof resourceType === "object" &&
    typeof resourceType.id === "string" &&
    resourceType.id.trim() !== "" &&
    typeof resourceType.name === "string" &&
    resourceType.name.trim() !== "" &&
    typeof resourceType.management === "string" &&
    resourceType.management.trim() !== ""
  );
}

async function loadResourceTypes(path = RESOURCE_TYPES_PATH) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`无法读取资源类型数据：${path}`);
  }

  const data = await response.json();
  const resourceTypes = Array.isArray(data.resourceTypes)
    ? data.resourceTypes.filter(isValidResourceType)
    : [];
  const resourceTypeIds = new Set();

  return resourceTypes.filter((resourceType) => {
    if (resourceTypeIds.has(resourceType.id)) {
      return false;
    }

    resourceTypeIds.add(resourceType.id);
    return true;
  });
}

function isValidApplicability(applicability) {
  return (
    applicability !== null &&
    typeof applicability === "object" &&
    ["banner_id", "banner_tag"].includes(applicability.type) &&
    Array.isArray(applicability.values) &&
    applicability.values.length > 0 &&
    applicability.values.every(
      (value) => typeof value === "string" && value.trim() !== "",
    )
  );
}

function isValidResourceInstance(resource) {
  if (
    resource === null ||
    typeof resource !== "object" ||
    typeof resource.id !== "string" ||
    resource.id.trim() === "" ||
    typeof resource.category !== "string"
  ) {
    return false;
  }

  if (resource.category === "timed_paint") {
    return (
      isValidCalendarDate(resource.availableFrom) &&
      isValidCalendarDate(resource.expiresAt) &&
      resource.availableFrom <= resource.expiresAt
    );
  }

  if (resource.category === "limited_paint") {
    return (
      typeof resource.name === "string" &&
      resource.name.trim() !== "" &&
      isValidApplicability(resource.applicability)
    );
  }

  return false;
}

async function loadResourceInstances(path = RESOURCE_INSTANCES_PATH) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`无法读取资源实例数据：${path}`);
  }

  const data = await response.json();
  const resources = Array.isArray(data.resources)
    ? data.resources.filter(isValidResourceInstance)
    : [];
  const resourceIds = new Set();

  return resources.filter((resource) => {
    if (resourceIds.has(resource.id)) {
      return false;
    }

    resourceIds.add(resource.id);
    return true;
  });
}

function isValidFreeDailyAccumulationRules(rules) {
  return (
    rules !== null &&
    typeof rules === "object" &&
    Number.isSafeInteger(rules.dailyTaskDiamonds) &&
    rules.dailyTaskDiamonds >= 0 &&
    rules.weeklyShare !== null &&
    typeof rules.weeklyShare === "object" &&
    Number.isInteger(rules.weeklyShare.weekday) &&
    rules.weeklyShare.weekday >= 0 &&
    rules.weeklyShare.weekday <= 6 &&
    Number.isSafeInteger(rules.weeklyShare.diamonds) &&
    rules.weeklyShare.diamonds >= 0 &&
    rules.monthlySignInDiamonds !== null &&
    typeof rules.monthlySignInDiamonds === "object" &&
    Object.entries(rules.monthlySignInDiamonds).every(
      ([day, diamonds]) =>
        /^([1-9]|[12]\d|3[01])$/.test(day) &&
        Number.isSafeInteger(diamonds) &&
        diamonds >= 0,
    ) &&
    Number.isSafeInteger(rules.monthEndCommonPaint) &&
    rules.monthEndCommonPaint >= 0
  );
}

function isValidIncomeCardRules(rules) {
  return (
    rules !== null &&
    typeof rules === "object" &&
    Number.isSafeInteger(rules.monthlyCard?.durationDays) &&
    rules.monthlyCard.durationDays > 0 &&
    Number.isSafeInteger(rules.monthlyCard.dailyDiamonds) &&
    rules.monthlyCard.dailyDiamonds >= 0 &&
    Number.isSafeInteger(rules.monthlyCard.purchaseDiamonds) &&
    rules.monthlyCard.purchaseDiamonds >= 0 &&
    Number.isSafeInteger(rules.monthlyCard.priceRmb) &&
    rules.monthlyCard.priceRmb >= 0 &&
    rules.monthlyCard.countsTowardLimitedRecharge === true &&
    Number.isSafeInteger(rules.seasonalCard?.dailyDiamonds) &&
    rules.seasonalCard.dailyDiamonds >= 0 &&
    Number.isInteger(rules.annualCard?.rewardDay) &&
    rules.annualCard.rewardDay >= 1 &&
    rules.annualCard.rewardDay <= 31 &&
    Number.isSafeInteger(rules.annualCard.commonPaint) &&
    rules.annualCard.commonPaint >= 0 &&
    Number.isInteger(rules.catTreat?.rewardDay) &&
    rules.catTreat.rewardDay >= 1 &&
    rules.catTreat.rewardDay <= 31 &&
    Number.isSafeInteger(rules.catTreat.commonPaint) &&
    rules.catTreat.commonPaint >= 0
  );
}

async function loadFreeDailyAccumulationRules(path = CONSTANTS_PATH) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`无法读取常量数据：${path}`);
  }

  const data = await response.json();
  const rules = data.constants?.freeDailyAccumulation;

  if (!isValidFreeDailyAccumulationRules(rules)) {
    throw new Error("免费日常积累规则无效。");
  }

  return rules;
}

async function loadIncomeCardRules(path = CONSTANTS_PATH) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`无法读取常量数据：${path}`);
  }

  const data = await response.json();
  const rules = data.constants?.incomeCards;

  if (!isValidIncomeCardRules(rules)) {
    throw new Error("日常收入卡规则无效。");
  }

  return rules;
}
