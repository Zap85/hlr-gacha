"use strict";

const BANNER_PATHS = ["data/banners/banners.json"];
const RESOURCE_TYPES_PATH = "data/resources/resource-types.json";
const RESOURCE_INSTANCES_PATH = "data/resources/resources.json";
const CONSTANTS_PATH = "data/constants.json";
const EVENT_TYPES_PATH = "data/events/event-types.json";
const EVENTS_PATH = "data/events/events.json";
const RECHARGE_EVENTS_PATH =
  "data/recharge-events/recharge-events.json";
const PERMANENT_PACKS_PATH = "data/packs/permanent-packs.json";
const EVENT_PACK_PATHS = [
  "data/packs/event-packs/庄园诡戏.json",
  "data/packs/event-packs/怪谈活动.json",
];
const CURRENCY_PACK_PATHS = [
  "data/packs/currency-packs/庄园诡戏.json",
];

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

function isValidMonthlyCardWeeklyDiscountPack(config) {
  const pack = config?.pack;

  return (
    typeof config?.id === "string" &&
    config.id.trim() !== "" &&
    typeof config.name === "string" &&
    config.name.trim() !== "" &&
    typeof pack?.id === "string" &&
    pack.id.trim() !== "" &&
    typeof pack.name === "string" &&
    pack.name.trim() !== "" &&
    pack.cost?.resourceId === "diamond" &&
    pack.cost.amount === 1200 &&
    pack.purchaseRule?.type === "weekly" &&
    pack.purchaseRule.limit === 1 &&
    Array.isArray(pack.contents) &&
    pack.contents.length === 1 &&
    pack.contents[0]?.resourceId === "common_paint" &&
    pack.contents[0].amount === 10 &&
    Array.isArray(pack.otherContents) &&
    Array.isArray(pack.prerequisites) &&
    pack.trigger === null &&
    Array.isArray(pack.deferredRewards)
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
    isValidMonthlyCardWeeklyDiscountPack(
      rules.monthlyCard.weeklyDiscountCurrencyPack,
    ) &&
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

function isValidResourceAmountMap(resources, allowNegative) {
  return (
    resources !== null &&
    typeof resources === "object" &&
    !Array.isArray(resources) &&
    Object.entries(resources).every(
      ([resourceId, amount]) =>
        resourceId.trim() !== "" &&
        Number.isSafeInteger(amount) &&
        (allowNegative || amount >= 0),
    )
  );
}

function isValidEventType(eventType) {
  return (
    eventType !== null &&
    typeof eventType === "object" &&
    typeof eventType.id === "string" &&
    eventType.id.trim() !== "" &&
    isValidResourceAmountMap(eventType.available, false) &&
    isValidResourceAmountMap(eventType.complete, false)
  );
}

function isValidEventIncomeRule(incomeRule) {
  if (incomeRule === undefined) {
    return true;
  }

  return (
    incomeRule !== null &&
    typeof incomeRule === "object" &&
    incomeRule.type === "claim_then_daily" &&
    Number.isSafeInteger(incomeRule.maxDays) &&
    incomeRule.maxDays >= 0 &&
    isValidResourceAmountMap(incomeRule.initialReward, false) &&
    isValidResourceAmountMap(incomeRule.dailyReward, false)
  );
}

async function loadEventTypes(path = EVENT_TYPES_PATH) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`无法读取活动类型数据：${path}`);
  }

  const data = await response.json();
  const eventTypes = Array.isArray(data.eventTypes)
    ? data.eventTypes.filter(isValidEventType)
    : [];
  const eventTypeIds = new Set();

  return eventTypes.filter((eventType) => {
    if (eventTypeIds.has(eventType.id)) {
      return false;
    }

    eventTypeIds.add(eventType.id);
    return true;
  });
}

function isValidEvent(event) {
  return (
    event !== null &&
    typeof event === "object" &&
    typeof event.id === "string" &&
    event.id.trim() !== "" &&
    typeof event.name === "string" &&
    event.name.trim() !== "" &&
    typeof event.type === "string" &&
    event.type.trim() !== "" &&
    isValidCalendarDate(event.startDate) &&
    isValidCalendarDate(event.endDate) &&
    event.startDate <= event.endDate &&
    ["current", "future"].includes(event.status) &&
    typeof event.isRerun === "boolean" &&
    event.incomeAdjustment !== null &&
    typeof event.incomeAdjustment === "object" &&
    isValidResourceAmountMap(event.incomeAdjustment.available, true) &&
    isValidResourceAmountMap(event.incomeAdjustment.complete, true) &&
    isValidEventIncomeRule(event.incomeRule) &&
    Array.isArray(event.exchanges)
  );
}

async function loadEvents(path = EVENTS_PATH) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`无法读取活动数据：${path}`);
  }

  const data = await response.json();
  const events = Array.isArray(data.events)
    ? data.events.filter(isValidEvent)
    : [];
  const eventIds = new Set();

  return events.filter((event) => {
    if (eventIds.has(event.id)) {
      return false;
    }

    eventIds.add(event.id);
    return true;
  });
}

function isValidRechargeEvent(rechargeEvent) {
  return (
    rechargeEvent !== null &&
    typeof rechargeEvent === "object" &&
    typeof rechargeEvent.id === "string" &&
    rechargeEvent.id.trim() !== "" &&
    typeof rechargeEvent.name === "string" &&
    rechargeEvent.name.trim() !== "" &&
    isValidCalendarDate(rechargeEvent.startDate) &&
    isValidCalendarDate(rechargeEvent.endDate) &&
    rechargeEvent.startDate <= rechargeEvent.endDate
  );
}

async function loadRechargeEvents(path = RECHARGE_EVENTS_PATH) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`无法读取限时累充数据：${path}`);
  }

  const data = await response.json();
  const rechargeEvents = Array.isArray(data)
    ? data.filter(isValidRechargeEvent)
    : [];
  const rechargeEventIds = new Set();

  return rechargeEvents.filter((rechargeEvent) => {
    if (rechargeEventIds.has(rechargeEvent.id)) {
      return false;
    }

    rechargeEventIds.add(rechargeEvent.id);
    return true;
  });
}

function isValidPermanentPack(pack) {
  const hasFixedPurchaseLimit =
    Number.isSafeInteger(pack?.purchaseLimit) && pack.purchaseLimit >= 1;
  const hasWeeklyPurchaseRule =
    pack?.purchaseRule !== null &&
    typeof pack?.purchaseRule === "object" &&
    pack.purchaseRule.type === "weekly" &&
    Number.isSafeInteger(pack.purchaseRule.limit) &&
    pack.purchaseRule.limit >= 1;

  return (
    pack !== null &&
    typeof pack === "object" &&
    typeof pack.id === "string" &&
    pack.id.trim() !== "" &&
    typeof pack.name === "string" &&
    pack.name.trim() !== "" &&
    typeof pack.price === "number" &&
    Number.isFinite(pack.price) &&
    pack.price > 0 &&
    typeof pack.countsTowardLimitedRecharge === "boolean" &&
    hasFixedPurchaseLimit !== hasWeeklyPurchaseRule &&
    pack.contents !== null &&
    typeof pack.contents === "object" &&
    !Array.isArray(pack.contents) &&
    Object.keys(pack.contents).length > 0 &&
    Object.entries(pack.contents).every(
      ([resourceId, amount]) =>
        resourceId.trim() !== "" &&
        Number.isSafeInteger(amount) &&
        amount > 0,
    ) &&
    (pack.note === undefined || typeof pack.note === "string")
  );
}

async function loadPermanentPacks(path = PERMANENT_PACKS_PATH) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`无法读取新人和等级礼包数据：${path}`);
  }

  const data = await response.json();
  const packs = Array.isArray(data.packs)
    ? data.packs.filter(isValidPermanentPack)
    : [];
  const packIds = new Set();

  return packs.filter((pack) => {
    if (packIds.has(pack.id)) {
      return false;
    }

    packIds.add(pack.id);
    return true;
  });
}

function isValidPermanentPackRules(rules) {
  return (
    rules !== null &&
    typeof rules === "object" &&
    Number.isFinite(rules.diamondPerPull) &&
    rules.diamondPerPull > 0 &&
    Number.isFinite(rules.commonPaintPerPull) &&
    rules.commonPaintPerPull > 0 &&
    Number.isFinite(rules.defaultRedDiamondPerPull) &&
    rules.defaultRedDiamondPerPull > 0 &&
    Number.isFinite(rules.maximumDisplayedPricePerPull) &&
    rules.maximumDisplayedPricePerPull > 0
  );
}

async function loadPermanentPackRules(path = CONSTANTS_PATH) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`无法读取常量数据：${path}`);
  }

  const data = await response.json();
  const rules = data.constants?.permanentPackCalculation;

  if (!isValidPermanentPackRules(rules)) {
    throw new Error("新人和等级礼包计算规则无效。");
  }

  return rules;
}

function isValidEventPackContent(content, validResourceIds) {
  return (
    content !== null &&
    typeof content === "object" &&
    typeof content.resourceId === "string" &&
    validResourceIds.has(content.resourceId) &&
    Number.isSafeInteger(content.amount) &&
    content.amount > 0
  );
}

function isValidEventPackOtherContent(content) {
  return (
    content !== null &&
    typeof content === "object" &&
    typeof content.name === "string" &&
    content.name.trim() !== "" &&
    Number.isSafeInteger(content.amount) &&
    content.amount > 0
  );
}

function isValidFixedDateDeferredReward(reward) {
  return (
    isValidEventPackOtherContent(reward) &&
    isValidCalendarDate(reward.availableDate) &&
    (reward.note === undefined || typeof reward.note === "string")
  );
}

function isValidEventPackDeferredReward(reward, validResourceIds) {
  if (reward?.type !== "relative_daily") {
    return isValidFixedDateDeferredReward(reward);
  }

  if (
    !Number.isSafeInteger(reward.startOffsetDays) ||
    reward.startOffsetDays < 0 ||
    !Number.isSafeInteger(reward.days) ||
    reward.days <= 0 ||
    !Number.isSafeInteger(reward.intervalDays) ||
    reward.intervalDays <= 0 ||
    !Array.isArray(reward.contents) ||
    reward.contents.length === 0 ||
    !reward.contents.every((content) =>
      isValidEventPackContent(content, validResourceIds),
    ) ||
    (reward.note !== undefined && typeof reward.note !== "string")
  ) {
    return false;
  }

  const resourceIds = new Set(
    reward.contents.map((content) => content.resourceId),
  );
  return resourceIds.size === reward.contents.length;
}

function isValidEventPackPurchaseRule(purchaseRule) {
  return (
    purchaseRule !== null &&
    typeof purchaseRule === "object" &&
    ["total", "daily"].includes(purchaseRule.type) &&
    Number.isSafeInteger(purchaseRule.limit) &&
    purchaseRule.limit > 0
  );
}

function isValidEventPackTrigger(trigger) {
  return (
    trigger === null ||
    (typeof trigger === "object" &&
      trigger.type === "pull_count" &&
      Number.isSafeInteger(trigger.value) &&
      trigger.value >= 0)
  );
}

function isValidEventPackItem(pack, validResourceIds) {
  if (
    pack === null ||
    typeof pack !== "object" ||
    typeof pack.id !== "string" ||
    pack.id.trim() === "" ||
    typeof pack.name !== "string" ||
    pack.name.trim() === "" ||
    typeof pack.price !== "number" ||
    !Number.isFinite(pack.price) ||
    pack.price < 0 ||
    typeof pack.countsTowardLimitedRecharge !== "boolean" ||
    !isValidEventPackPurchaseRule(pack.purchaseRule) ||
    !Array.isArray(pack.contents) ||
    !pack.contents.every((content) =>
      isValidEventPackContent(content, validResourceIds),
    ) ||
    !Array.isArray(pack.otherContents) ||
    !pack.otherContents.every(isValidEventPackOtherContent) ||
    !Array.isArray(pack.prerequisites) ||
    !pack.prerequisites.every(
      (prerequisite) =>
        typeof prerequisite === "string" && prerequisite.trim() !== "",
    ) ||
    !isValidEventPackTrigger(pack.trigger) ||
    !Array.isArray(pack.deferredRewards) ||
    !pack.deferredRewards.every((reward) =>
      isValidEventPackDeferredReward(reward, validResourceIds),
    )
  ) {
    return false;
  }

  const contentResourceIds = new Set(
    pack.contents.map((content) => content.resourceId),
  );
  return contentResourceIds.size === pack.contents.length;
}

function sanitizeEventPack(eventPack, validResourceIds) {
  if (
    eventPack === null ||
    typeof eventPack !== "object" ||
    typeof eventPack.id !== "string" ||
    eventPack.id.trim() === "" ||
    typeof eventPack.name !== "string" ||
    eventPack.name.trim() === "" ||
    typeof eventPack.eventId !== "string" ||
    eventPack.eventId.trim() === "" ||
    !isValidCalendarDate(eventPack.startDate) ||
    !isValidCalendarDate(eventPack.endDate) ||
    eventPack.startDate > eventPack.endDate ||
    !Array.isArray(eventPack.packs)
  ) {
    return null;
  }

  const packIds = new Set();
  let packs = eventPack.packs.filter((pack) => {
    if (
      !isValidEventPackItem(pack, validResourceIds) ||
      packIds.has(pack.id)
    ) {
      return false;
    }

    packIds.add(pack.id);
    return true;
  });

  let previousLength;

  do {
    previousLength = packs.length;
    const validPackIds = new Set(packs.map((pack) => pack.id));
    packs = packs.filter((pack) =>
      pack.prerequisites.every(
        (prerequisite) =>
          prerequisite !== pack.id && validPackIds.has(prerequisite),
      ),
    );
  } while (packs.length !== previousLength);

  return { ...eventPack, packs };
}

async function loadEventPacks(
  paths = EVENT_PACK_PATHS,
  resourceTypePath = RESOURCE_TYPES_PATH,
  resourceInstancesPath = RESOURCE_INSTANCES_PATH,
) {
  const [resourceTypes, resourceInstances, eventPackData] = await Promise.all([
    loadResourceTypes(resourceTypePath),
    loadResourceInstances(resourceInstancesPath),
    Promise.all(
      paths.map(async (path) => {
        const response = await fetch(path);

        if (!response.ok) {
          throw new Error(`无法读取活动礼包数据：${path}`);
        }

        return response.json();
      }),
    ),
  ]);
  const validResourceIds = new Set([
    ...resourceTypes.map((resourceType) => resourceType.id),
    ...resourceInstances.map((resource) => resource.id),
  ]);
  const eventPackIds = new Set();

  return eventPackData
    .map((eventPack) => sanitizeEventPack(eventPack, validResourceIds))
    .filter((eventPack) => {
      if (eventPack === null || eventPackIds.has(eventPack.id)) {
        return false;
      }

      eventPackIds.add(eventPack.id);
      return true;
    });
}

function isValidCurrencyPackItem(pack, validResourceIds) {
  if (
    pack === null ||
    typeof pack !== "object" ||
    typeof pack.id !== "string" ||
    pack.id.trim() === "" ||
    typeof pack.name !== "string" ||
    pack.name.trim() === "" ||
    Object.prototype.hasOwnProperty.call(pack, "price") ||
    Object.prototype.hasOwnProperty.call(
      pack,
      "countsTowardLimitedRecharge",
    ) ||
    pack.cost === null ||
    typeof pack.cost !== "object" ||
    !["diamond", "red_diamond"].includes(pack.cost.resourceId) ||
    !Number.isSafeInteger(pack.cost.amount) ||
    pack.cost.amount <= 0 ||
    !isValidEventPackPurchaseRule(pack.purchaseRule) ||
    !Array.isArray(pack.contents) ||
    !pack.contents.every((content) =>
      isValidEventPackContent(content, validResourceIds),
    ) ||
    !Array.isArray(pack.otherContents) ||
    !pack.otherContents.every(isValidEventPackOtherContent) ||
    !Array.isArray(pack.prerequisites) ||
    !pack.prerequisites.every(
      (prerequisite) =>
        typeof prerequisite === "string" && prerequisite.trim() !== "",
    ) ||
    !isValidEventPackTrigger(pack.trigger) ||
    !Array.isArray(pack.deferredRewards) ||
    !pack.deferredRewards.every(isValidFixedDateDeferredReward)
  ) {
    return false;
  }

  const contentResourceIds = new Set(
    pack.contents.map((content) => content.resourceId),
  );
  return contentResourceIds.size === pack.contents.length;
}

function sanitizeCurrencyPack(currencyPack, validResourceIds) {
  if (
    currencyPack === null ||
    typeof currencyPack !== "object" ||
    typeof currencyPack.id !== "string" ||
    currencyPack.id.trim() === "" ||
    typeof currencyPack.name !== "string" ||
    currencyPack.name.trim() === "" ||
    typeof currencyPack.eventId !== "string" ||
    currencyPack.eventId.trim() === "" ||
    !isValidCalendarDate(currencyPack.startDate) ||
    !isValidCalendarDate(currencyPack.endDate) ||
    currencyPack.startDate > currencyPack.endDate ||
    !Array.isArray(currencyPack.packs)
  ) {
    return null;
  }

  const packIds = new Set();
  let packs = currencyPack.packs.filter((pack) => {
    if (
      !isValidCurrencyPackItem(pack, validResourceIds) ||
      packIds.has(pack.id)
    ) {
      return false;
    }

    packIds.add(pack.id);
    return true;
  });

  let previousLength;

  do {
    previousLength = packs.length;
    const validPackIds = new Set(packs.map((pack) => pack.id));
    packs = packs.filter((pack) =>
      pack.prerequisites.every(
        (prerequisite) =>
          prerequisite !== pack.id && validPackIds.has(prerequisite),
      ),
    );
  } while (packs.length !== previousLength);

  return { ...currencyPack, packs };
}

async function loadCurrencyPacks(
  paths = CURRENCY_PACK_PATHS,
  resourceTypePath = RESOURCE_TYPES_PATH,
  resourceInstancesPath = RESOURCE_INSTANCES_PATH,
) {
  const [resourceTypes, resourceInstances, currencyPackData] =
    await Promise.all([
      loadResourceTypes(resourceTypePath),
      loadResourceInstances(resourceInstancesPath),
      Promise.all(
        paths.map(async (path) => {
          const response = await fetch(path);

          if (!response.ok) {
            throw new Error(`无法读取钻石 / 红钻礼包数据：${path}`);
          }

          return response.json();
        }),
      ),
    ]);
  const validResourceIds = new Set([
    ...resourceTypes.map((resourceType) => resourceType.id),
    ...resourceInstances.map((resource) => resource.id),
  ]);
  const currencyPackIds = new Set();

  return currencyPackData
    .map((currencyPack) =>
      sanitizeCurrencyPack(currencyPack, validResourceIds),
    )
    .filter((currencyPack) => {
      if (
        currencyPack === null ||
        currencyPackIds.has(currencyPack.id)
      ) {
        return false;
      }

      currencyPackIds.add(currencyPack.id);
      return true;
    });
}
