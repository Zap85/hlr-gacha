"use strict";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function parseCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);

  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date.getTime();
}

function calculateDateRange(currentDate, targetDate) {
  if (!currentDate) {
    return { valid: false, days: null, error: "请输入当前日期。" };
  }

  if (!targetDate) {
    return { valid: false, days: null, error: "请输入目标日期。" };
  }

  const currentTimestamp = parseCalendarDate(currentDate);
  const targetTimestamp = parseCalendarDate(targetDate);

  if (currentTimestamp === null) {
    return { valid: false, days: null, error: "当前日期格式无效。" };
  }

  if (targetTimestamp === null) {
    return { valid: false, days: null, error: "目标日期格式无效。" };
  }

  const days =
    (targetTimestamp - currentTimestamp) / MILLISECONDS_PER_DAY + 1;

  if (days <= 0) {
    return {
      valid: false,
      days: null,
      error: "目标日期不得早于当前日期。",
    };
  }

  return { valid: true, days, error: null };
}

function parseInventoryAmount(value) {
  if (value === "") {
    return { valid: true, amount: 0, error: null };
  }

  const text = String(value);

  if (!/^\d+$/.test(text)) {
    return { valid: false, amount: null, error: "请输入非负整数。" };
  }

  const amount = Number(text);

  if (!Number.isSafeInteger(amount)) {
    return { valid: false, amount: null, error: "请输入非负整数。" };
  }

  return { valid: true, amount, error: null };
}

function calculateFreeDailyAccumulation(
  currentDate,
  targetDate,
  rules,
  todayIncomeClaimed = true,
) {
  const dateRange = calculateDateRange(currentDate, targetDate);

  if (!dateRange.valid) {
    return { valid: false, error: dateRange.error };
  }

  const incomeDays = Math.max(
    0,
    dateRange.days - (todayIncomeClaimed ? 1 : 0),
  );
  const dailyTaskDiamonds = incomeDays * rules.dailyTaskDiamonds;
  let weeklyShareCount = 0;
  let monthlySignInCount = 0;
  let monthlySignInDiamonds = 0;
  let monthEndCount = 0;
  const targetTimestamp = parseCalendarDate(targetDate);

  for (
    let timestamp =
      parseCalendarDate(currentDate) +
      (todayIncomeClaimed ? MILLISECONDS_PER_DAY : 0);
    timestamp <= targetTimestamp;
    timestamp += MILLISECONDS_PER_DAY
  ) {
    const date = new Date(timestamp);
    const dayOfMonth = date.getUTCDate();
    const signInDiamonds = rules.monthlySignInDiamonds[dayOfMonth] ?? 0;

    if (date.getUTCDay() === rules.weeklyShare.weekday) {
      weeklyShareCount += 1;
    }

    if (signInDiamonds > 0) {
      monthlySignInCount += 1;
      monthlySignInDiamonds += signInDiamonds;
    }

    const nextDate = new Date(timestamp + MILLISECONDS_PER_DAY);

    if (nextDate.getUTCDate() === 1) {
      monthEndCount += 1;
    }
  }

  const weeklyShareDiamonds =
    weeklyShareCount * rules.weeklyShare.diamonds;
  const monthEndCommonPaint = monthEndCount * rules.monthEndCommonPaint;

  return {
    valid: true,
    error: null,
    days: incomeDays,
    dailyTasks: {
      days: incomeDays,
      diamonds: dailyTaskDiamonds,
    },
    weeklyShares: {
      count: weeklyShareCount,
      diamonds: weeklyShareDiamonds,
    },
    monthlySignIns: {
      count: monthlySignInCount,
      diamonds: monthlySignInDiamonds,
    },
    monthEndRewards: {
      count: monthEndCount,
      commonPaint: monthEndCommonPaint,
    },
    totals: {
      diamonds:
        dailyTaskDiamonds + weeklyShareDiamonds + monthlySignInDiamonds,
      commonPaint: monthEndCommonPaint,
    },
  };
}

function calculateIncomeCards(
  currentDate,
  targetDate,
  monthlySignInDiamonds,
  rules,
  selections,
  todayIncomeClaimed = true,
) {
  const dateRange = calculateDateRange(currentDate, targetDate);

  if (!dateRange.valid) {
    return { valid: false, error: dateRange.error };
  }

  if (!Number.isInteger(selections.monthlyCardAdjustment)) {
    return { valid: false, error: "月卡调整值必须是整数。" };
  }

  const incomeDays = Math.max(
    0,
    dateRange.days - (todayIncomeClaimed ? 1 : 0),
  );
  const monthlyCardBasePurchases = Math.ceil(
    incomeDays / rules.monthlyCard.durationDays,
  );
  const monthlyCardActualPurchases = Math.max(
    0,
    monthlyCardBasePurchases + selections.monthlyCardAdjustment,
  );
  const monthlyCardDailyDiamonds = selections.monthlyCardSelected
    ? incomeDays * rules.monthlyCard.dailyDiamonds
    : 0;
  const monthlyCardPurchaseDiamonds = selections.monthlyCardSelected
    ? monthlyCardActualPurchases * rules.monthlyCard.purchaseDiamonds
    : 0;
  const monthlyCardPurchaseAmountRmb = selections.monthlyCardSelected
    ? monthlyCardActualPurchases * rules.monthlyCard.priceRmb
    : 0;
  const seasonalCardDailyDiamonds = selections.seasonalCardSelected
    ? incomeDays * rules.seasonalCard.dailyDiamonds
    : 0;
  let annualCardRewardCount = 0;
  let catTreatRewardCount = 0;
  const targetTimestamp = parseCalendarDate(targetDate);

  for (
    let timestamp =
      parseCalendarDate(currentDate) +
      (todayIncomeClaimed ? MILLISECONDS_PER_DAY : 0);
    timestamp <= targetTimestamp;
    timestamp += MILLISECONDS_PER_DAY
  ) {
    const dayOfMonth = new Date(timestamp).getUTCDate();

    if (dayOfMonth === rules.annualCard.rewardDay) {
      annualCardRewardCount += 1;
    }

    if (dayOfMonth === rules.catTreat.rewardDay) {
      catTreatRewardCount += 1;
    }
  }

  return {
    valid: true,
    error: null,
    monthlySignInDiamonds: selections.monthlyCardSelected
      ? monthlySignInDiamonds * 2
      : monthlySignInDiamonds,
    monthlyCard: {
      selected: selections.monthlyCardSelected,
      basePurchases: monthlyCardBasePurchases,
      adjustment: selections.monthlyCardAdjustment,
      actualPurchases: monthlyCardActualPurchases,
      dailyDiamonds: monthlyCardDailyDiamonds,
      purchaseDiamonds: monthlyCardPurchaseDiamonds,
      purchaseAmountRmb: monthlyCardPurchaseAmountRmb,
      countsTowardLimitedRecharge:
        rules.monthlyCard.countsTowardLimitedRecharge,
      totalDiamonds:
        monthlyCardDailyDiamonds + monthlyCardPurchaseDiamonds,
    },
    seasonalCard: {
      selected: selections.seasonalCardSelected,
      dailyDiamonds: seasonalCardDailyDiamonds,
      totalDiamonds: seasonalCardDailyDiamonds,
    },
    annualCard: {
      selected: selections.annualCardSelected,
      rewardCount: annualCardRewardCount,
      commonPaint: selections.annualCardSelected
        ? annualCardRewardCount * rules.annualCard.commonPaint
        : 0,
    },
    catTreat: {
      selected: selections.catTreatSelected,
      rewardCount: catTreatRewardCount,
      commonPaint: selections.catTreatSelected
        ? catTreatRewardCount * rules.catTreat.commonPaint
        : 0,
    },
  };
}

function addResourceAmounts(baseResources, adjustments = {}) {
  const resourceIds = new Set([
    ...Object.keys(baseResources),
    ...Object.keys(adjustments),
  ]);
  const resources = {};

  resourceIds.forEach((resourceId) => {
    resources[resourceId] =
      (baseResources[resourceId] ?? 0) +
      (adjustments[resourceId] ?? 0);
  });

  return resources;
}

function calculateEventIncome(targetDate, event, eventTypes) {
  const targetTimestamp = parseCalendarDate(targetDate);
  const startTimestamp = parseCalendarDate(event.startDate);
  const endTimestamp = parseCalendarDate(event.endDate);
  const eventType = eventTypes.find(
    (candidate) => candidate.id === event.type,
  );

  if (targetTimestamp === null) {
    return { valid: false, error: "目标日期格式无效。" };
  }

  if (startTimestamp === null || endTimestamp === null) {
    return { valid: false, error: `活动“${event.name}”日期无效。` };
  }

  if (!eventType) {
    return { valid: false, error: `活动“${event.name}”类型无效。` };
  }

  if (targetTimestamp < startTimestamp) {
    return {
      valid: true,
      error: null,
      eventId: event.id,
      eventName: event.name,
      status: event.status,
      eligible: false,
      phase: null,
      resources: {},
    };
  }

  const phase = targetTimestamp < endTimestamp
    ? "available"
    : "complete";

  return {
    valid: true,
    error: null,
    eventId: event.id,
    eventName: event.name,
    status: event.status,
    eligible: true,
    phase,
    resources: addResourceAmounts(
      eventType[phase],
      event.incomeAdjustment?.[phase],
    ),
  };
}

function getDefaultSelectedEventIds(events) {
  return events
    .filter((event) => !event.isRerun)
    .map((event) => event.id);
}

function calculateSelectedEventIncome(
  targetMode,
  targetDate,
  events,
  eventTypes,
  selectedEventIds,
) {
  if (targetMode !== "banner") {
    return {
      valid: true,
      error: null,
      enabled: false,
      events: [],
      selectedResources: {},
    };
  }

  const selectedIds = new Set(selectedEventIds);
  const calculatedEvents = [];
  let selectedResources = {};

  for (const event of events) {
    const result = calculateEventIncome(targetDate, event, eventTypes);

    if (!result.valid) {
      return result;
    }

    const selected = selectedIds.has(event.id);
    calculatedEvents.push({ ...result, selected });

    if (result.eligible && selected) {
      selectedResources = addResourceAmounts(
        selectedResources,
        result.resources,
      );
    }
  }

  return {
    valid: true,
    error: null,
    enabled: true,
    events: calculatedEvents,
    selectedResources,
  };
}

function calculatePermanentPackValue(pack, redDiamondPerPull, rules) {
  if (
    typeof redDiamondPerPull !== "number" ||
    !Number.isFinite(redDiamondPerPull) ||
    redDiamondPerPull <= 0
  ) {
    return { valid: false, error: "红钻理论折算率必须大于 0。" };
  }

  const theoreticalPulls =
    (pack.contents.diamond ?? 0) / rules.diamondPerPull +
    (pack.contents.common_paint ?? 0) / rules.commonPaintPerPull +
    (pack.contents.red_diamond ?? 0) / redDiamondPerPull;

  if (theoreticalPulls <= 0) {
    return { valid: false, error: `礼包“${pack.name}”没有抽卡资源。` };
  }

  return {
    valid: true,
    error: null,
    pack,
    theoreticalPulls,
    pricePerPull: pack.price / theoreticalPulls,
  };
}

function getPermanentPackPurchaseLimit(pack) {
  return pack.purchaseLimit ?? pack.purchaseRule?.limit ?? 0;
}

function getDisplayablePermanentPacks(packs, redDiamondPerPull, rules) {
  const calculatedPacks = [];

  for (const pack of packs) {
    const result = calculatePermanentPackValue(
      pack,
      redDiamondPerPull,
      rules,
    );

    if (!result.valid) {
      return { valid: false, error: result.error, packs: [] };
    }

    if (result.pricePerPull < rules.maximumDisplayedPricePerPull) {
      calculatedPacks.push(result);
    }
  }

  calculatedPacks.sort(
    (left, right) => left.pricePerPull - right.pricePerPull,
  );

  return {
    valid: true,
    error: null,
    packs: calculatedPacks,
  };
}

function calculatePermanentPackPurchases(packs, quantities) {
  const resources = {};
  const purchases = [];
  let totalPrice = 0;

  for (const pack of packs) {
    const quantity = quantities[pack.id] ?? 0;
    const purchaseLimit = getPermanentPackPurchaseLimit(pack);

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 0 ||
      quantity > purchaseLimit
    ) {
      return {
        valid: false,
        error: `礼包“${pack.name}”购买数量无效。`,
      };
    }

    if (quantity === 0) {
      continue;
    }

    const purchasedContents = {};

    Object.entries(pack.contents).forEach(([resourceId, amount]) => {
      const totalAmount = amount * quantity;
      purchasedContents[resourceId] = totalAmount;
      resources[resourceId] = (resources[resourceId] ?? 0) + totalAmount;
    });

    const purchasePrice = pack.price * quantity;
    totalPrice += purchasePrice;
    purchases.push({
      id: pack.id,
      quantity,
      price: purchasePrice,
      contents: purchasedContents,
      countsTowardLimitedRecharge: pack.countsTowardLimitedRecharge,
    });
  }

  return {
    valid: true,
    error: null,
    totalPrice,
    resources,
    purchases,
  };
}

function isEventPackVisible(targetDate, eventPack) {
  const targetTimestamp = parseCalendarDate(targetDate);
  const startTimestamp = parseCalendarDate(eventPack.startDate);

  return (
    targetTimestamp !== null &&
    startTimestamp !== null &&
    targetTimestamp >= startTimestamp
  );
}

function getDisplayableEventPacks(eventPacks, targetDate) {
  return eventPacks.filter((eventPack) =>
    isEventPackVisible(targetDate, eventPack),
  );
}

function calculateEventPackDailyAvailability(
  currentDate,
  targetDate,
  eventPack,
  dailyLimit,
) {
  const currentTimestamp = parseCalendarDate(currentDate);
  const targetTimestamp = parseCalendarDate(targetDate);
  const startTimestamp = parseCalendarDate(eventPack.startDate);
  const endTimestamp = parseCalendarDate(eventPack.endDate);

  if (
    currentTimestamp === null ||
    targetTimestamp === null ||
    startTimestamp === null ||
    endTimestamp === null ||
    targetTimestamp < currentTimestamp ||
    endTimestamp < startTimestamp ||
    !Number.isSafeInteger(dailyLimit) ||
    dailyLimit <= 0
  ) {
    return {
      valid: false,
      days: 0,
      maximumQuantity: 0,
      error: "活动礼包日期或每日限购规则无效。",
    };
  }

  const firstAvailableTimestamp = Math.max(
    currentTimestamp,
    startTimestamp,
  );
  const lastAvailableTimestamp = Math.min(targetTimestamp, endTimestamp);
  const days =
    firstAvailableTimestamp > lastAvailableTimestamp
      ? 0
      : (lastAvailableTimestamp - firstAvailableTimestamp) /
          MILLISECONDS_PER_DAY +
        1;

  return {
    valid: true,
    days,
    maximumQuantity: days * dailyLimit,
    error: null,
  };
}

function getEventPackMaximumQuantity(
  pack,
  eventPack,
  currentDate,
  targetDate,
) {
  if (!isEventPackVisible(targetDate, eventPack)) {
    return 0;
  }

  if (pack.purchaseRule.type === "daily") {
    return calculateEventPackDailyAvailability(
      currentDate,
      targetDate,
      eventPack,
      pack.purchaseRule.limit,
    ).maximumQuantity;
  }

  return pack.purchaseRule.limit;
}

function createEventPackPurchaseState(eventPacks) {
  return Object.fromEntries(
    eventPacks.map((eventPack) => [
      eventPack.id,
      Object.fromEntries(
        eventPack.packs.map((pack) => [
          pack.id,
          { selected: false, quantity: 0 },
        ]),
      ),
    ]),
  );
}

function normalizeEventPackPurchases(
  eventPack,
  purchases,
  currentDate,
  targetDate,
) {
  const normalized = Object.fromEntries(
    eventPack.packs.map((pack) => {
      const purchase = purchases?.[pack.id];
      const maximumQuantity = getEventPackMaximumQuantity(
        pack,
        eventPack,
        currentDate,
        targetDate,
      );
      const requestedQuantity = Number.isSafeInteger(purchase?.quantity)
        ? purchase.quantity
        : 0;
      const quantity = purchase?.selected
        ? Math.min(Math.max(requestedQuantity, 1), maximumQuantity)
        : 0;

      return [
        pack.id,
        { selected: quantity > 0, quantity },
      ];
    }),
  );

  let changed;

  do {
    changed = false;

    eventPack.packs.forEach((pack) => {
      const purchase = normalized[pack.id];
      const prerequisitesSatisfied = pack.prerequisites.every(
        (prerequisiteId) => normalized[prerequisiteId]?.selected,
      );

      if (purchase.selected && !prerequisitesSatisfied) {
        normalized[pack.id] = { selected: false, quantity: 0 };
        changed = true;
      }
    });
  } while (changed);

  return normalized;
}

function updateEventPackPurchase(
  eventPack,
  purchases,
  packId,
  selected,
  quantity,
  currentDate,
  targetDate,
) {
  const pack = eventPack.packs.find((item) => item.id === packId);

  if (!pack) {
    return { valid: false, error: "未知的活动礼包。", purchases };
  }

  const currentPurchases = normalizeEventPackPurchases(
    eventPack,
    purchases,
    currentDate,
    targetDate,
  );

  if (!selected) {
    currentPurchases[packId] = { selected: false, quantity: 0 };
    return {
      valid: true,
      error: null,
      purchases: normalizeEventPackPurchases(
        eventPack,
        currentPurchases,
        currentDate,
        targetDate,
      ),
    };
  }

  const prerequisitesSatisfied = pack.prerequisites.every(
    (prerequisiteId) => currentPurchases[prerequisiteId]?.selected,
  );
  const maximumQuantity = getEventPackMaximumQuantity(
    pack,
    eventPack,
    currentDate,
    targetDate,
  );

  if (!prerequisitesSatisfied) {
    return {
      valid: false,
      error: `需先购买：${pack.prerequisites.join("、")}`,
      purchases: currentPurchases,
    };
  }

  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > maximumQuantity
  ) {
    return {
      valid: false,
      error: `购买数量必须为 1～${maximumQuantity}。`,
      purchases: currentPurchases,
    };
  }

  currentPurchases[packId] = { selected: true, quantity };
  return { valid: true, error: null, purchases: currentPurchases };
}

function calculateEventPackPurchaseSummary(
  eventPacks,
  purchaseState,
  currentDate,
  targetDate,
) {
  const resources = {};
  const normalizedState = {};
  let totalPrice = 0;
  let limitedRechargePrice = 0;

  eventPacks.forEach((eventPack) => {
    const purchases = normalizeEventPackPurchases(
      eventPack,
      purchaseState?.[eventPack.id],
      currentDate,
      targetDate,
    );
    normalizedState[eventPack.id] = purchases;

    eventPack.packs.forEach((pack) => {
      const quantity = purchases[pack.id].quantity;

      if (quantity === 0) {
        return;
      }

      const purchasePrice = pack.price * quantity;
      totalPrice += purchasePrice;

      if (pack.countsTowardLimitedRecharge) {
        limitedRechargePrice += purchasePrice;
      }

      pack.contents.forEach(({ resourceId, amount }) => {
        resources[resourceId] =
          (resources[resourceId] ?? 0) + amount * quantity;
      });
    });
  });

  return {
    totalPrice,
    limitedRechargePrice,
    resources,
    purchaseState: normalizedState,
  };
}

const PRE_CONVERSION_RESOURCE_IDS = [
  "diamond",
  "red_diamond",
  "common_paint",
  "timed_paint",
  "limited_paint",
];

function parseResourceAdjustment(value) {
  if (value === "") {
    return { valid: true, amount: 0, error: null };
  }

  const text = String(value);

  if (!/^-?\d+$/.test(text)) {
    return { valid: false, amount: null, error: "请输入整数。" };
  }

  const amount = Number(text);

  if (!Number.isSafeInteger(amount)) {
    return { valid: false, amount: null, error: "请输入整数。" };
  }

  return { valid: true, amount, error: null };
}

function isResourceInstanceAvailable(resource, targetDate, targetBanner) {
  if (resource.category === "timed_paint") {
    const targetTimestamp = parseCalendarDate(targetDate);
    const availableTimestamp = parseCalendarDate(resource.availableFrom);
    const expiresTimestamp = parseCalendarDate(resource.expiresAt);

    return (
      targetTimestamp !== null &&
      availableTimestamp !== null &&
      expiresTimestamp !== null &&
      targetTimestamp >= availableTimestamp &&
      targetTimestamp <= expiresTimestamp
    );
  }

  if (resource.category !== "limited_paint" || !targetBanner) {
    return false;
  }

  const applicability = resource.applicability;

  if (applicability?.type === "banner_id") {
    return applicability.values.includes(targetBanner.id);
  }

  if (applicability?.type === "banner_tag") {
    const bannerTags = new Set(targetBanner.tags ?? []);
    return applicability.values.some((tag) => bannerTags.has(tag));
  }

  return false;
}

function calculatePreConversionSummary({
  resourceSources = [],
  resourceAdjustments = {},
  paymentSources = [],
  resourceInstances = [],
  targetDate = "",
  targetBanner = null,
} = {}) {
  const resources = Object.fromEntries(
    PRE_CONVERSION_RESOURCE_IDS.map((resourceId) => [resourceId, 0]),
  );
  const resourceInstancesById = new Map(
    resourceInstances.map((resource) => [resource.id, resource]),
  );

  for (const source of resourceSources) {
    for (const [resourceId, amount] of Object.entries(source ?? {})) {
      if (
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount < 0
      ) {
        return { valid: false, error: "资源数量无效。" };
      }

      if (
        Object.prototype.hasOwnProperty.call(resources, resourceId)
      ) {
        resources[resourceId] += amount;
        continue;
      }

      const resource = resourceInstancesById.get(resourceId);

      if (
        resource &&
        isResourceInstanceAvailable(resource, targetDate, targetBanner)
      ) {
        resources[resource.category] += amount;
      }
    }
  }

  for (const [resourceId, amount] of Object.entries(resourceAdjustments)) {
    if (!Number.isSafeInteger(amount)) {
      return { valid: false, error: "资源调整量无效。" };
    }

    if (
      Object.prototype.hasOwnProperty.call(resources, resourceId)
    ) {
      resources[resourceId] += amount;
    }
  }

  let rmbTotal = 0;
  let limitedRechargeRmb = 0;

  for (const payment of paymentSources) {
    const amount = payment?.amount ?? 0;

    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      return { valid: false, error: "人民币金额无效。" };
    }

    rmbTotal += amount;

    if (payment.limitedRechargeAmount !== undefined) {
      const limitedRechargeAmount = payment.limitedRechargeAmount;

      if (
        typeof limitedRechargeAmount !== "number" ||
        !Number.isFinite(limitedRechargeAmount) ||
        limitedRechargeAmount < 0 ||
        limitedRechargeAmount > amount
      ) {
        return { valid: false, error: "限时累充金额无效。" };
      }

      limitedRechargeRmb += limitedRechargeAmount;
    } else if (payment.countsTowardLimitedRecharge !== false) {
      limitedRechargeRmb += amount;
    }
  }

  return {
    valid: true,
    error: null,
    resources,
    rmbTotal,
    limitedRechargeRmb,
  };
}

function isCurrencyPackVisible(currentDate, targetDate, currencyPack) {
  const currentTimestamp = parseCalendarDate(currentDate);
  const targetTimestamp = parseCalendarDate(targetDate);
  const startTimestamp = parseCalendarDate(currencyPack.startDate);
  const endTimestamp = parseCalendarDate(currencyPack.endDate);

  return (
    currentTimestamp !== null &&
    targetTimestamp !== null &&
    startTimestamp !== null &&
    endTimestamp !== null &&
    currentTimestamp <= targetTimestamp &&
    startTimestamp <= endTimestamp &&
    Math.max(currentTimestamp, startTimestamp) <=
      Math.min(targetTimestamp, endTimestamp)
  );
}

function getDisplayableCurrencyPacks(
  currencyPacks,
  currentDate,
  targetDate,
) {
  return currencyPacks.filter((currencyPack) =>
    isCurrencyPackVisible(currentDate, targetDate, currencyPack),
  );
}

function calculateCurrencyPackValue(
  pack,
  targetDate,
  targetBanner,
  resourceInstances,
) {
  if (pack.cost.resourceId !== "red_diamond") {
    return {
      pack,
      theoreticalPulls: null,
      redDiamondPerPull: null,
    };
  }

  const resourceInstancesById = new Map(
    resourceInstances.map((resource) => [resource.id, resource]),
  );
  let theoreticalPulls = 0;

  pack.contents.forEach(({ resourceId, amount }) => {
    if (resourceId === "common_paint") {
      theoreticalPulls += amount;
      return;
    }

    const resource = resourceInstancesById.get(resourceId);

    if (
      resource?.category === "limited_paint" &&
      isResourceInstanceAvailable(resource, targetDate, targetBanner)
    ) {
      theoreticalPulls += amount;
    }
  });

  return {
    pack,
    theoreticalPulls,
    redDiamondPerPull:
      theoreticalPulls > 0
        ? pack.cost.amount / theoreticalPulls
        : null,
  };
}

function groupCurrencyPackItems(
  currencyPack,
  targetDate,
  targetBanner,
  resourceInstances,
) {
  const groups = {
    diamond: [],
    red_diamond: [],
  };

  currencyPack.packs.forEach((pack) => {
    groups[pack.cost.resourceId].push(
      calculateCurrencyPackValue(
        pack,
        targetDate,
        targetBanner,
        resourceInstances,
      ),
    );
  });
  groups.red_diamond.sort((left, right) => {
    if (left.redDiamondPerPull === null) {
      return right.redDiamondPerPull === null ? 0 : 1;
    }

    if (right.redDiamondPerPull === null) {
      return -1;
    }

    return left.redDiamondPerPull - right.redDiamondPerPull;
  });

  return groups;
}

function getCurrencyPackMaximumQuantity(
  pack,
  currencyPack,
  currentDate,
  targetDate,
) {
  if (!isCurrencyPackVisible(currentDate, targetDate, currencyPack)) {
    return 0;
  }

  if (pack.purchaseRule.type === "daily") {
    return calculateEventPackDailyAvailability(
      currentDate,
      targetDate,
      currencyPack,
      pack.purchaseRule.limit,
    ).maximumQuantity;
  }

  return pack.purchaseRule.limit;
}

function createCurrencyPackPurchaseState(currencyPacks) {
  return Object.fromEntries(
    currencyPacks.map((currencyPack) => [
      currencyPack.id,
      Object.fromEntries(
        currencyPack.packs.map((pack) => [
          pack.id,
          { selected: false, quantity: 0 },
        ]),
      ),
    ]),
  );
}

function normalizeCurrencyPackPurchases(
  currencyPack,
  purchases,
  currentDate,
  targetDate,
) {
  const normalized = Object.fromEntries(
    currencyPack.packs.map((pack) => {
      const purchase = purchases?.[pack.id];
      const maximumQuantity = getCurrencyPackMaximumQuantity(
        pack,
        currencyPack,
        currentDate,
        targetDate,
      );
      const requestedQuantity = Number.isSafeInteger(purchase?.quantity)
        ? purchase.quantity
        : 0;
      const quantity = purchase?.selected
        ? Math.min(Math.max(requestedQuantity, 1), maximumQuantity)
        : 0;

      return [pack.id, { selected: quantity > 0, quantity }];
    }),
  );
  let changed;

  do {
    changed = false;
    currencyPack.packs.forEach((pack) => {
      const purchase = normalized[pack.id];
      const prerequisitesSatisfied = pack.prerequisites.every(
        (prerequisiteId) => normalized[prerequisiteId]?.selected,
      );

      if (purchase.selected && !prerequisitesSatisfied) {
        normalized[pack.id] = { selected: false, quantity: 0 };
        changed = true;
      }
    });
  } while (changed);

  return normalized;
}

function normalizeCurrencyPackPurchaseState(
  currencyPacks,
  purchaseState,
  currentDate,
  targetDate,
) {
  return Object.fromEntries(
    currencyPacks.map((currencyPack) => [
      currencyPack.id,
      normalizeCurrencyPackPurchases(
        currencyPack,
        purchaseState?.[currencyPack.id],
        currentDate,
        targetDate,
      ),
    ]),
  );
}

function calculateCurrencyPackPurchaseSummary(
  currencyPacks,
  purchaseState,
  preConversionResources,
  currentDate,
  targetDate,
  targetBanner,
  resourceInstances,
) {
  const normalizedState = normalizeCurrencyPackPurchaseState(
    currencyPacks,
    purchaseState,
    currentDate,
    targetDate,
  );
  const costs = { diamond: 0, red_diamond: 0 };
  const rewards = {};
  const resourceInstancesById = new Map(
    resourceInstances.map((resource) => [resource.id, resource]),
  );

  currencyPacks.forEach((currencyPack) => {
    currencyPack.packs.forEach((pack) => {
      const quantity = normalizedState[currencyPack.id][pack.id].quantity;

      if (quantity === 0) {
        return;
      }

      costs[pack.cost.resourceId] += pack.cost.amount * quantity;
      pack.contents.forEach(({ resourceId, amount }) => {
        let targetResourceId = resourceId;

        if (!PRE_CONVERSION_RESOURCE_IDS.includes(resourceId)) {
          const resource = resourceInstancesById.get(resourceId);

          if (
            !resource ||
            !isResourceInstanceAvailable(
              resource,
              targetDate,
              targetBanner,
            )
          ) {
            return;
          }

          targetResourceId = resource.category;
        }

        rewards[targetResourceId] =
          (rewards[targetResourceId] ?? 0) + amount * quantity;
      });
    });
  });

  for (const resourceId of ["diamond", "red_diamond"]) {
    if (
      costs[resourceId] > 0 &&
      (preConversionResources[resourceId] ?? 0) - costs[resourceId] < 0
    ) {
      const resourceName = resourceId === "diamond" ? "钻石" : "红钻";
      return {
        valid: false,
        error: `${resourceName}余额不足。`,
        costs,
        rewards,
        resources: { ...preConversionResources },
        purchaseState: normalizedState,
      };
    }
  }

  const resources = { ...preConversionResources };
  resources.diamond = (resources.diamond ?? 0) - costs.diamond;
  resources.red_diamond =
    (resources.red_diamond ?? 0) - costs.red_diamond;
  Object.entries(rewards).forEach(([resourceId, amount]) => {
    resources[resourceId] = (resources[resourceId] ?? 0) + amount;
  });

  return {
    valid: true,
    error: null,
    costs,
    rewards,
    resources,
    purchaseState: normalizedState,
  };
}

function updateCurrencyPackPurchase(
  currencyPacks,
  purchaseState,
  currencyPackId,
  packId,
  selected,
  quantity,
  preConversionResources,
  currentDate,
  targetDate,
  targetBanner,
  resourceInstances,
) {
  const currencyPack = currencyPacks.find(
    (item) => item.id === currencyPackId,
  );
  const pack = currencyPack?.packs.find((item) => item.id === packId);

  if (!currencyPack || !pack) {
    return { valid: false, error: "未知的钻石 / 红钻礼包。", purchaseState };
  }

  const currentState = normalizeCurrencyPackPurchaseState(
    currencyPacks,
    purchaseState,
    currentDate,
    targetDate,
  );
  const maximumQuantity = getCurrencyPackMaximumQuantity(
    pack,
    currencyPack,
    currentDate,
    targetDate,
  );

  if (
    selected &&
    (!Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > maximumQuantity)
  ) {
    return {
      valid: false,
      error: `购买数量必须为 1～${maximumQuantity}。`,
      purchaseState: currentState,
    };
  }

  if (
    selected &&
    !pack.prerequisites.every(
      (prerequisiteId) =>
        currentState[currencyPackId][prerequisiteId]?.selected,
    )
  ) {
    return {
      valid: false,
      error: `需先购买：${pack.prerequisites.join("、")}`,
      purchaseState: currentState,
    };
  }

  const candidateState = Object.fromEntries(
    Object.entries(currentState).map(([id, purchases]) => [
      id,
      Object.fromEntries(
        Object.entries(purchases).map(([id, purchase]) => [
          id,
          { ...purchase },
        ]),
      ),
    ]),
  );
  candidateState[currencyPackId][packId] = selected
    ? { selected: true, quantity }
    : { selected: false, quantity: 0 };
  const result = calculateCurrencyPackPurchaseSummary(
    currencyPacks,
    candidateState,
    preConversionResources,
    currentDate,
    targetDate,
    targetBanner,
    resourceInstances,
  );

  if (!result.valid) {
    return {
      valid: false,
      error: result.error,
      purchaseState: currentState,
    };
  }

  return {
    valid: true,
    error: null,
    purchaseState: result.purchaseState,
    summary: result,
  };
}
