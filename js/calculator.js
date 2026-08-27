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

  const days = (targetTimestamp - currentTimestamp) / MILLISECONDS_PER_DAY;

  if (days <= 0) {
    return {
      valid: false,
      days: null,
      error: "目标日期必须晚于当前日期。",
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

function calculateFreeDailyAccumulation(currentDate, targetDate, rules) {
  const dateRange = calculateDateRange(currentDate, targetDate);

  if (!dateRange.valid) {
    return { valid: false, error: dateRange.error };
  }

  const dailyTaskDiamonds = dateRange.days * rules.dailyTaskDiamonds;
  let weeklyShareCount = 0;
  let monthlySignInCount = 0;
  let monthlySignInDiamonds = 0;
  let monthEndCount = 0;
  const targetTimestamp = parseCalendarDate(targetDate);

  for (
    let timestamp = parseCalendarDate(currentDate) + MILLISECONDS_PER_DAY;
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
    days: dateRange.days,
    dailyTasks: {
      days: dateRange.days,
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
) {
  const dateRange = calculateDateRange(currentDate, targetDate);

  if (!dateRange.valid) {
    return { valid: false, error: dateRange.error };
  }

  if (!Number.isInteger(selections.monthlyCardAdjustment)) {
    return { valid: false, error: "月卡调整值必须是整数。" };
  }

  const monthlyCardBasePurchases = Math.ceil(
    dateRange.days / rules.monthlyCard.durationDays,
  );
  const monthlyCardActualPurchases = Math.max(
    0,
    monthlyCardBasePurchases + selections.monthlyCardAdjustment,
  );
  const monthlyCardDailyDiamonds = selections.monthlyCardSelected
    ? dateRange.days * rules.monthlyCard.dailyDiamonds
    : 0;
  const monthlyCardPurchaseDiamonds = selections.monthlyCardSelected
    ? monthlyCardActualPurchases * rules.monthlyCard.purchaseDiamonds
    : 0;
  const monthlyCardPurchaseAmountRmb = selections.monthlyCardSelected
    ? monthlyCardActualPurchases * rules.monthlyCard.priceRmb
    : 0;
  const seasonalCardDailyDiamonds = selections.seasonalCardSelected
    ? dateRange.days * rules.seasonalCard.dailyDiamonds
    : 0;
  let annualCardRewardCount = 0;
  let catTreatRewardCount = 0;
  const targetTimestamp = parseCalendarDate(targetDate);

  for (
    let timestamp = parseCalendarDate(currentDate) + MILLISECONDS_PER_DAY;
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
