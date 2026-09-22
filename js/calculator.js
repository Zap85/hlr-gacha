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

  if (
    !Number.isSafeInteger(selections.monthlyCardRemainingDays) ||
    selections.monthlyCardRemainingDays < 0
  ) {
    return { valid: false, error: "当前月卡剩余天数必须是非负整数。" };
  }

  if (
    !Number.isSafeInteger(selections.monthlyCardExtraPurchases) ||
    selections.monthlyCardExtraPurchases < 0
  ) {
    return { valid: false, error: "额外购买月卡数量必须是非负整数。" };
  }

  const incomeDays = Math.max(
    0,
    dateRange.days - (todayIncomeClaimed ? 1 : 0),
  );
  const monthlyCardExistingCoveredDays =
    selections.monthlyCardRemainingDays === 0
      ? 0
      : selections.monthlyCardRemainingDays +
        (todayIncomeClaimed ? 0 : 1);
  const monthlyCardUncoveredDays = Math.max(
    0,
    incomeDays - monthlyCardExistingCoveredDays,
  );
  const monthlyCardRequiredPurchases = selections.monthlyCardSelected
    ? Math.ceil(
        monthlyCardUncoveredDays / rules.monthlyCard.durationDays,
      )
    : 0;
  const monthlyCardExtraPurchases = selections.monthlyCardSelected
    ? selections.monthlyCardExtraPurchases
    : 0;
  const monthlyCardPurchaseCount =
    monthlyCardRequiredPurchases + monthlyCardExtraPurchases;
  const monthlyCardDailyDiamonds = selections.monthlyCardSelected
    ? incomeDays * rules.monthlyCard.dailyDiamonds
    : 0;
  const monthlyCardPurchaseDiamonds = selections.monthlyCardSelected
    ? monthlyCardPurchaseCount * rules.monthlyCard.purchaseDiamonds
    : 0;
  const monthlyCardPurchaseAmountRmb = selections.monthlyCardSelected
    ? monthlyCardPurchaseCount * rules.monthlyCard.priceRmb
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
      monthlyIncomeDays: incomeDays,
      remainingDays: selections.monthlyCardRemainingDays,
      existingCoveredDays: monthlyCardExistingCoveredDays,
      requiredPurchases: monthlyCardRequiredPurchases,
      extraPurchases: monthlyCardExtraPurchases,
      purchaseCount: monthlyCardPurchaseCount,
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

function calculateEventIncome(
  currentDate,
  targetDate,
  event,
  eventTypes,
) {
  const currentTimestamp = parseCalendarDate(currentDate);
  const targetTimestamp = parseCalendarDate(targetDate);
  const startTimestamp = parseCalendarDate(event.startDate);
  const endTimestamp = parseCalendarDate(event.endDate);
  const eventType = eventTypes.find(
    (candidate) => candidate.id === event.type,
  );

  if (currentTimestamp === null) {
    return { valid: false, error: "当前日期格式无效。" };
  }

  if (startTimestamp === null || endTimestamp === null) {
    return { valid: false, error: `活动“${event.name}”日期无效。` };
  }

  if (!eventType) {
    return { valid: false, error: `活动“${event.name}”类型无效。` };
  }

  const ineligibleResult = {
    valid: true,
    error: null,
    eventId: event.id,
    eventName: event.name,
    status: event.status,
    eligible: false,
    phase: null,
    resources: {},
  };

  if (currentTimestamp > endTimestamp) {
    return ineligibleResult;
  }

  if (targetTimestamp === null) {
    return { valid: false, error: "目标日期格式无效。" };
  }

  if (targetTimestamp < startTimestamp) {
    return ineligibleResult;
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
  currentDate,
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
    const result = calculateEventIncome(
      currentDate,
      targetDate,
      event,
      eventTypes,
    );

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

function calculatePackValue(
  pack,
  redDiamondPerPull,
  rules,
  {
    targetDate = "",
    targetBanner = null,
    resourceInstances = [],
  } = {},
) {
  if (
    typeof redDiamondPerPull !== "number" ||
    !Number.isFinite(redDiamondPerPull) ||
    redDiamondPerPull <= 0
  ) {
    return { valid: false, error: "红钻理论折算率必须大于 0。" };
  }

  const immediateContents = Array.isArray(pack.contents)
    ? pack.contents
    : Object.entries(pack.contents).map(([resourceId, amount]) => ({
        resourceId,
        amount,
      }));
  const deferredContents = (pack.deferredRewards ?? []).flatMap((reward) =>
    reward.type === "relative_daily" && Array.isArray(reward.contents)
      ? reward.contents.map(({ resourceId, amount }) => ({
          resourceId,
          amount: amount * reward.days,
        }))
      : [],
  );
  const contents = [...immediateContents, ...deferredContents];
  const resourceInstancesById = new Map(
    resourceInstances.map((resource) => [resource.id, resource]),
  );
  let theoreticalPulls = 0;

  contents.forEach(({ resourceId, amount }) => {
    if (resourceId === "diamond") {
      theoreticalPulls += amount / rules.diamondPerPull;
      return;
    }

    if (resourceId === "red_diamond") {
      theoreticalPulls += amount / redDiamondPerPull;
      return;
    }

    if (resourceId === "common_paint") {
      theoreticalPulls += amount / rules.commonPaintPerPull;
      return;
    }

    const resource = resourceInstancesById.get(resourceId);

    if (
      resource?.category === "timed_paint" &&
      isResourceInstanceAvailable(resource, targetDate, targetBanner)
    ) {
      theoreticalPulls += amount;
      return;
    }

    if (resource?.category === "limited_paint") {
      theoreticalPulls += amount;
    }
  });

  return {
    valid: true,
    error: null,
    pack,
    theoreticalPulls,
    pricePerPull:
      theoreticalPulls > 0 ? pack.price / theoreticalPulls : null,
  };
}

function calculatePermanentPackValue(pack, redDiamondPerPull, rules) {
  const result = calculatePackValue(pack, redDiamondPerPull, rules);

  if (!result.valid) {
    return result;
  }

  if (result.theoreticalPulls <= 0) {
    return { valid: false, error: `礼包“${pack.name}”没有抽卡资源。` };
  }

  return result;
}

function sortPackValuesByPricePerPull(packValues) {
  return packValues
    .map((value, originalIndex) => ({ value, originalIndex }))
    .sort((left, right) => {
      const leftPrice = left.value.pricePerPull;
      const rightPrice = right.value.pricePerPull;
      const leftHasPrice =
        typeof leftPrice === "number" && Number.isFinite(leftPrice);
      const rightHasPrice =
        typeof rightPrice === "number" && Number.isFinite(rightPrice);

      if (leftHasPrice && rightHasPrice && leftPrice !== rightPrice) {
        return leftPrice - rightPrice;
      }

      if (leftHasPrice !== rightHasPrice) {
        return leftHasPrice ? -1 : 1;
      }

      return left.originalIndex - right.originalIndex;
    })
    .map(({ value }) => value);
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

function getDisplayableEventPacks(eventPacks, currentDate) {
  const currentTimestamp = parseCalendarDate(currentDate);

  if (currentTimestamp === null) {
    return [];
  }

  return eventPacks.filter((eventPack) => {
    const endTimestamp = parseCalendarDate(eventPack.endDate);

    return endTimestamp !== null && currentTimestamp <= endTimestamp;
  });
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

function calculateCurrencyPackWeeklyAvailability(
  currentDate,
  targetDate,
  currencyPack,
  weeklyLimit,
) {
  const currentTimestamp = parseCalendarDate(currentDate);
  const targetTimestamp = parseCalendarDate(targetDate);
  const startTimestamp = parseCalendarDate(currencyPack.startDate);
  const endTimestamp = parseCalendarDate(currencyPack.endDate);

  if (
    currentTimestamp === null ||
    targetTimestamp === null ||
    startTimestamp === null ||
    endTimestamp === null ||
    targetTimestamp < currentTimestamp ||
    endTimestamp < startTimestamp ||
    !Number.isSafeInteger(weeklyLimit) ||
    weeklyLimit <= 0
  ) {
    return {
      valid: false,
      weeks: 0,
      maximumQuantity: 0,
      error: "钻石 / 红钻礼包日期或每周限购规则无效。",
    };
  }

  const firstAvailableTimestamp = Math.max(
    currentTimestamp,
    startTimestamp,
  );
  const lastAvailableTimestamp = Math.min(targetTimestamp, endTimestamp);

  if (firstAvailableTimestamp > lastAvailableTimestamp) {
    return {
      valid: true,
      weeks: 0,
      maximumQuantity: 0,
      error: null,
    };
  }

  const firstDate = new Date(firstAvailableTimestamp);
  const lastDate = new Date(lastAvailableTimestamp);
  const firstMondayTimestamp =
    firstAvailableTimestamp -
    ((firstDate.getUTCDay() + 6) % 7) * MILLISECONDS_PER_DAY;
  const lastMondayTimestamp =
    lastAvailableTimestamp -
    ((lastDate.getUTCDay() + 6) % 7) * MILLISECONDS_PER_DAY;
  const weeks =
    (lastMondayTimestamp - firstMondayTimestamp) /
      (7 * MILLISECONDS_PER_DAY) +
    1;

  return {
    valid: true,
    weeks,
    maximumQuantity: weeks * weeklyLimit,
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

      pack.contents.forEach(({ resourceId, amount }) => {
        resources[resourceId] =
          (resources[resourceId] ?? 0) + amount * quantity;
      });

      const deferredSummary = calculateEventPackDeferredRewards(
        eventPack,
        pack,
        quantity,
        currentDate,
        targetDate,
      );

      Object.entries(deferredSummary.resources).forEach(
        ([resourceId, amount]) => {
          resources[resourceId] = (resources[resourceId] ?? 0) + amount;
        },
      );
    });
  });

  return {
    totalPrice,
    resources,
    purchaseState: normalizedState,
  };
}

function calculateEventPackDeferredRewards(
  eventPack,
  pack,
  quantity,
  currentDate,
  targetDate,
) {
  const resources = {};
  const targetTimestamp = parseCalendarDate(targetDate);
  const intersection = calculateInclusiveDateIntersection([
    { startDate: currentDate, endDate: targetDate },
    eventPack,
  ]);

  if (
    !intersection.valid ||
    intersection.days === 0 ||
    targetTimestamp === null ||
    !Number.isSafeInteger(quantity) ||
    quantity <= 0
  ) {
    return {
      assumedPurchaseDate: null,
      deliveredOccurrences: 0,
      resources,
    };
  }

  const assumedPurchaseTimestamp = intersection.firstTimestamp;
  let deliveredOccurrences = 0;

  (pack.deferredRewards ?? []).forEach((reward) => {
    if (reward.type !== "relative_daily") {
      return;
    }

    for (let index = 0; index < reward.days; index += 1) {
      const rewardTimestamp =
        assumedPurchaseTimestamp +
        (reward.startOffsetDays + reward.intervalDays * index) *
          MILLISECONDS_PER_DAY;

      if (rewardTimestamp > targetTimestamp) {
        continue;
      }

      deliveredOccurrences += 1;
      reward.contents.forEach(({ resourceId, amount }) => {
        resources[resourceId] =
          (resources[resourceId] ?? 0) + amount * quantity;
      });
    }
  });

  return {
    assumedPurchaseDate: new Date(assumedPurchaseTimestamp)
      .toISOString()
      .slice(0, 10),
    deliveredOccurrences,
    resources,
  };
}

function calculateInclusiveDateIntersection(ranges) {
  let firstTimestamp = Number.NEGATIVE_INFINITY;
  let lastTimestamp = Number.POSITIVE_INFINITY;

  for (const range of ranges) {
    const startTimestamp = parseCalendarDate(range?.startDate);
    const endTimestamp = parseCalendarDate(range?.endDate);

    if (
      startTimestamp === null ||
      endTimestamp === null ||
      startTimestamp > endTimestamp
    ) {
      return {
        valid: false,
        days: 0,
        firstTimestamp: null,
        lastTimestamp: null,
        error: "日期区间无效。",
      };
    }

    firstTimestamp = Math.max(firstTimestamp, startTimestamp);
    lastTimestamp = Math.min(lastTimestamp, endTimestamp);
  }

  const days = firstTimestamp > lastTimestamp
    ? 0
    : (lastTimestamp - firstTimestamp) / MILLISECONDS_PER_DAY + 1;

  return {
    valid: true,
    days,
    firstTimestamp,
    lastTimestamp,
    error: null,
  };
}

function getIntersectingRechargeEvents(
  rechargeEvents,
  currentDate,
  targetDate,
) {
  const mainRange = { startDate: currentDate, endDate: targetDate };
  const mainRangeResult = calculateInclusiveDateIntersection([mainRange]);

  if (!mainRangeResult.valid) {
    return { valid: false, error: mainRangeResult.error, events: [] };
  }

  const events = rechargeEvents.filter((rechargeEvent) => {
    const intersection = calculateInclusiveDateIntersection([
      mainRange,
      rechargeEvent,
    ]);
    return intersection.valid && intersection.days > 0;
  });

  return {
    valid: true,
    error: null,
    events: [...events].sort((firstEvent, secondEvent) =>
      firstEvent.startDate.localeCompare(secondEvent.startDate),
    ),
  };
}

function calculateEventPackLimitedRechargeRmb(
  eventPacks,
  purchaseState,
  currentDate,
  targetDate,
  rechargeEvent,
) {
  if (!rechargeEvent) {
    return { valid: true, error: null, amount: 0 };
  }

  let amount = 0;
  const mainRange = { startDate: currentDate, endDate: targetDate };

  for (const eventPack of eventPacks) {
    const rechargeIntersection = calculateInclusiveDateIntersection([
      eventPack,
      rechargeEvent,
    ]);

    if (!rechargeIntersection.valid) {
      return { valid: false, error: rechargeIntersection.error, amount: 0 };
    }

    if (rechargeIntersection.days === 0) {
      continue;
    }

    for (const pack of eventPack.packs) {
      const purchase = purchaseState?.[eventPack.id]?.[pack.id];
      const quantity = purchase?.selected ? purchase.quantity : 0;

      if (
        !Number.isSafeInteger(quantity) ||
        quantity < 0 ||
        typeof pack.price !== "number" ||
        !Number.isFinite(pack.price) ||
        pack.price < 0
      ) {
        return { valid: false, error: "活动礼包购买金额无效。", amount: 0 };
      }

      if (quantity === 0 || !pack.countsTowardLimitedRecharge) {
        continue;
      }

      let eligibleQuantity = quantity;

      if (pack.purchaseRule.type === "daily") {
        const dailyIntersection = calculateInclusiveDateIntersection([
          mainRange,
          eventPack,
          rechargeEvent,
        ]);

        if (!dailyIntersection.valid) {
          return {
            valid: false,
            error: dailyIntersection.error,
            amount: 0,
          };
        }

        eligibleQuantity = Math.min(
          quantity,
          dailyIntersection.days * pack.purchaseRule.limit,
        );
      }

      amount += pack.price * eligibleQuantity;
    }
  }

  return { valid: true, error: null, amount };
}

function calculateMonthlyCardRechargeEligibility({
  currentDate,
  targetDate,
  rechargeEvent,
  monthlyCard,
  todayIncomeClaimed = true,
  durationDays = 30,
} = {}) {
  if (!rechargeEvent || !monthlyCard?.selected) {
    return {
      valid: true,
      error: null,
      eligibleRequiredPurchases: 0,
      extraPurchases: 0,
      maximumQuantity: 0,
      requiredPurchaseDeadlines: [],
    };
  }

  if (
    !Number.isSafeInteger(monthlyCard.existingCoveredDays) ||
    monthlyCard.existingCoveredDays < 0 ||
    !Number.isSafeInteger(monthlyCard.requiredPurchases) ||
    monthlyCard.requiredPurchases < 0 ||
    !Number.isSafeInteger(monthlyCard.extraPurchases) ||
    monthlyCard.extraPurchases < 0 ||
    !Number.isSafeInteger(durationDays) ||
    durationDays <= 0
  ) {
    return { valid: false, error: "月卡购买数据无效。" };
  }

  const mainRange = { startDate: currentDate, endDate: targetDate };
  const intersection = calculateInclusiveDateIntersection([
    mainRange,
    rechargeEvent,
  ]);

  if (!intersection.valid) {
    return { valid: false, error: intersection.error };
  }

  if (
    intersection.days === 0 ||
    monthlyCard.countsTowardLimitedRecharge === false
  ) {
    return {
      valid: true,
      error: null,
      eligibleRequiredPurchases: 0,
      extraPurchases: 0,
      maximumQuantity: 0,
      requiredPurchaseDeadlines: [],
    };
  }

  const currentTimestamp = parseCalendarDate(currentDate);
  const firstIncomeTimestamp =
    currentTimestamp +
    (todayIncomeClaimed ? MILLISECONDS_PER_DAY : 0);
  const firstRequiredDeadline =
    firstIncomeTimestamp +
    monthlyCard.existingCoveredDays * MILLISECONDS_PER_DAY;
  const requiredPurchaseDeadlines = Array.from(
    { length: monthlyCard.requiredPurchases },
    (_, index) =>
      firstRequiredDeadline +
      index * durationDays * MILLISECONDS_PER_DAY,
  );
  const eligibleRequiredPurchases = requiredPurchaseDeadlines.filter(
    (deadline) => deadline >= intersection.firstTimestamp,
  ).length;

  return {
    valid: true,
    error: null,
    eligibleRequiredPurchases,
    extraPurchases: monthlyCard.extraPurchases,
    maximumQuantity:
      eligibleRequiredPurchases + monthlyCard.extraPurchases,
    requiredPurchaseDeadlines,
  };
}

function calculateLimitedRechargeSummary({
  rechargeEvent = null,
  currentDate = "",
  targetDate = "",
  permanentPackPurchases = [],
  eventPacks = [],
  eventPackPurchaseState = {},
  monthlyCardRechargeQuantity = 0,
  monthlyCardRechargeMaximum = 0,
  monthlyCardPrice = 0,
  monthlyCardCountsTowardLimitedRecharge = true,
} = {}) {
  if (!rechargeEvent) {
    return {
      valid: true,
      error: null,
      permanentPackRmb: 0,
      eventPackRmb: 0,
      monthlyCardRmb: 0,
      limitedRechargeRmb: 0,
    };
  }

  if (
    !Number.isSafeInteger(monthlyCardRechargeQuantity) ||
    monthlyCardRechargeQuantity < 0 ||
    !Number.isSafeInteger(monthlyCardRechargeMaximum) ||
    monthlyCardRechargeMaximum < 0 ||
    monthlyCardRechargeQuantity > monthlyCardRechargeMaximum ||
    typeof monthlyCardPrice !== "number" ||
    !Number.isFinite(monthlyCardPrice) ||
    monthlyCardPrice < 0
  ) {
    return { valid: false, error: "月卡计入限时累充数量无效。" };
  }

  let permanentPackRmb = 0;

  for (const purchase of permanentPackPurchases) {
    if (
      typeof purchase.price !== "number" ||
      !Number.isFinite(purchase.price) ||
      purchase.price < 0
    ) {
      return { valid: false, error: "常驻礼包购买金额无效。" };
    }

    if (purchase.countsTowardLimitedRecharge) {
      permanentPackRmb += purchase.price;
    }
  }

  const eventPackResult = calculateEventPackLimitedRechargeRmb(
    eventPacks,
    eventPackPurchaseState,
    currentDate,
    targetDate,
    rechargeEvent,
  );

  if (!eventPackResult.valid) {
    return eventPackResult;
  }

  const monthlyCardRmb = monthlyCardCountsTowardLimitedRecharge
    ? monthlyCardRechargeQuantity * monthlyCardPrice
    : 0;

  return {
    valid: true,
    error: null,
    permanentPackRmb,
    eventPackRmb: eventPackResult.amount,
    monthlyCardRmb,
    limitedRechargeRmb:
      permanentPackRmb + eventPackResult.amount + monthlyCardRmb,
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

function getApplicableLimitedPaintResources(
  resources,
  targetMode,
  targetBanner,
) {
  if (targetMode !== "banner" || !targetBanner) {
    return [];
  }

  return resources.filter(
    (resource) =>
      resource.category === "limited_paint" &&
      isResourceInstanceAvailable(resource, "", targetBanner),
  );
}

function calculatePreConversionSummary({
  resourceSources = [],
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

  let rmbTotal = 0;

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
  }

  return {
    valid: true,
    error: null,
    resources,
    rmbTotal,
  };
}

function calculateFinalResourceTotals(
  resources,
  resourceAdjustments = {},
) {
  const finalResources = { ...resources };

  for (const [resourceId, amount] of Object.entries(resourceAdjustments)) {
    if (!Number.isSafeInteger(amount)) {
      return { valid: false, error: "资源调整量无效。" };
    }

    if (
      Object.prototype.hasOwnProperty.call(finalResources, resourceId)
    ) {
      finalResources[resourceId] += amount;
    }
  }

  return {
    valid: true,
    error: null,
    resources: finalResources,
  };
}

function calculateAvailablePulls(
  resources,
  { includeLimitedPaint = true } = {},
) {
  const amounts = [
    resources?.diamond ?? 0,
    resources?.common_paint ?? 0,
    resources?.timed_paint ?? 0,
    resources?.limited_paint ?? 0,
  ];

  if (amounts.some((amount) => !Number.isFinite(amount))) {
    return { valid: false, error: "可用抽数资源无效。" };
  }

  return {
    valid: true,
    error: null,
    pulls:
      amounts[0] / 150 +
      amounts[1] +
      amounts[2] +
      (includeLimitedPaint ? amounts[3] : 0),
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

function createMonthlyCardCurrencyPack(
  config,
  currentDate,
  targetDate,
) {
  return {
    id: config.id,
    name: config.name,
    source: "monthly_card",
    startDate: currentDate,
    endDate: targetDate,
    packs: [config.pack],
  };
}

function getCurrencyPacksForMonthlyCard(
  eventCurrencyPacks,
  monthlyCardConfig,
  monthlyCardSelected,
  currentDate,
  targetDate,
) {
  if (!monthlyCardSelected || !monthlyCardConfig) {
    return [...eventCurrencyPacks];
  }

  return [
    createMonthlyCardCurrencyPack(
      monthlyCardConfig,
      currentDate,
      targetDate,
    ),
    ...eventCurrencyPacks,
  ];
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

    if (resource?.category === "limited_paint") {
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

  if (pack.purchaseRule.type === "weekly") {
    return calculateCurrencyPackWeeklyAvailability(
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

function synchronizeCurrencyPackPurchaseState(
  currencyPacks,
  purchaseState,
  currentDate,
  targetDate,
) {
  const nextState = createCurrencyPackPurchaseState(currencyPacks);

  currencyPacks.forEach((currencyPack) => {
    currencyPack.packs.forEach((pack) => {
      const existingPurchase =
        purchaseState?.[currencyPack.id]?.[pack.id];

      if (existingPurchase) {
        nextState[currencyPack.id][pack.id] = {
          ...existingPurchase,
        };
        return;
      }

      if (currencyPack.source === "monthly_card") {
        const maximumQuantity = getCurrencyPackMaximumQuantity(
          pack,
          currencyPack,
          currentDate,
          targetDate,
        );
        nextState[currencyPack.id][pack.id] = {
          selected: maximumQuantity > 0,
          quantity: maximumQuantity,
        };
      }
    });
  });

  return nextState;
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
