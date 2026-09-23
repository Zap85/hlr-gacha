"use strict";

const inventoryState = {
  fixedResources: {},
  timedPaintTotals: {},
  limitedPaintResources: {},
};
let updateLimitedInventoryForTarget = () => {};
const dateSelectionState = {
  currentDate: "",
  targetDate: "",
  targetMode: "banner",
  targetBanner: null,
};
const incomeCardSelections = {
  monthlyCardSelected: false,
  monthlyCardRemainingDays: 0,
  monthlyCardExtraPurchases: 0,
  seasonalCardSelected: false,
  annualCardSelected: false,
  catTreatSelected: false,
};
const dailyIncomeSettings = {
  todayIncomeClaimed: true,
};
const dailyIncomeState = {
  resources: {},
  rmbTotal: 0,
  monthlyCard: null,
};
let freeDailyAccumulationRules = null;
let freeDailyAccumulationView = null;
let incomeCardRules = null;
let incomeCardView = null;
const eventIncomeState = {
  selectedEventIds: new Set(),
  incomeRuleStates: {},
  resources: {},
};
let eventIncomeView = null;
let eventTypes = [];
let events = [];
let eventResourceTypes = [];
let eventIncomeLoading = true;
let eventIncomeLoadError = "";
const permanentPackState = {
  quantities: {},
  resources: {},
  totalPrice: 0,
  purchases: [],
};
let permanentPackView = null;
let permanentPacks = [];
let permanentPackRules = null;
let permanentPackResourceTypes = [];
const packValuationState = {
  redDiamondPerPull: null,
};
const eventPackPurchaseState = {
  purchases: {},
  resources: {},
  totalPrice: 0,
};
let eventPackView = null;
let eventPacks = [];
let eventPackResourceNames = new Map();
let eventPacksLoading = true;
let eventPacksLoadError = "";
const otherState = {
  resources: {
    diamond: 0,
    red_diamond: 0,
    common_paint: 0,
    timed_paint: 0,
    limited_paint: 0,
  },
};
let preConversionSummaryView = null;
let summaryResourceInstances = [];
const preConversionSummaryState = {
  resources: {
    diamond: 0,
    red_diamond: 0,
    common_paint: 0,
    timed_paint: 0,
    limited_paint: 0,
  },
  rmbTotal: 0,
};
const currencyPackPurchaseState = {
  purchases: {},
  costs: { diamond: 0, red_diamond: 0 },
  rewards: {},
  resources: { ...preConversionSummaryState.resources },
};
let currencyPackView = null;
let currencyPacks = [];
let eventCurrencyPacks = [];
let monthlyCardCurrencyPackConfig = null;
let currencyPackResourceNames = new Map();
let currencyPacksLoading = true;
let currencyPacksLoadError = "";
const rechargeSummaryState = {
  selectedRechargeEventId: "",
  monthlyCardQuantities: {},
  monthlyCardQuantityTouched: {},
  limitedRechargeRmb: 0,
};
let rechargeSummaryView = null;
let rechargeEvents = [];
let rechargeEventsLoading = true;
let rechargeEventsLoadError = "";

function initializeFixedInventoryState(resourceTypes) {
  inventoryState.fixedResources = {};

  resourceTypes
    .filter((resourceType) => resourceType.management === "fixed")
    .forEach((resourceType) => {
      inventoryState.fixedResources[resourceType.id] = 0;
    });

  return inventoryState;
}

function initializeTimedInventoryState(resourceTypes) {
  inventoryState.timedPaintTotals = {};

  resourceTypes
    .filter((resourceType) => resourceType.management === "validity_batch")
    .forEach((resourceType) => {
      inventoryState.timedPaintTotals[resourceType.id] = 0;
    });

  return inventoryState;
}

function initializeLimitedInventoryState(resources) {
  inventoryState.limitedPaintResources = {};

  resources
    .filter((resource) => resource.category === "limited_paint")
    .forEach((resource) => {
      inventoryState.limitedPaintResources[resource.id] = 0;
    });

  return inventoryState;
}

function updateInventoryAmount(inventoryGroup, resourceId, value) {
  const inventory = inventoryState[inventoryGroup];

  if (
    !inventory ||
    !Object.prototype.hasOwnProperty.call(
      inventory,
      resourceId,
    )
  ) {
    return { valid: false, amount: null, error: "未知的库存资源。" };
  }

  const result = parseInventoryAmount(value);

  if (result.valid) {
    inventory[resourceId] = result.amount;
  }

  return result;
}

function updateFixedInventoryAmount(resourceId, value) {
  return updateInventoryAmount("fixedResources", resourceId, value);
}

function updateMonthlyCardInputState(selectionKey, value) {
  if (
    ![
      "monthlyCardRemainingDays",
      "monthlyCardExtraPurchases",
    ].includes(selectionKey)
  ) {
    return { valid: false, amount: null, error: "未知的月卡输入。" };
  }

  const result = parseInventoryAmount(value);

  if (result.valid) {
    incomeCardSelections[selectionKey] = result.amount;
  }

  return result;
}

function updateEventIncomeRuleRemainingDays(eventId, value) {
  const sourceEvent = events.find((event) => event.id === eventId);
  const state = eventIncomeState.incomeRuleStates[eventId];

  if (!sourceEvent?.incomeRule || !state) {
    return { valid: false, amount: null, error: "未知的持续签到活动。" };
  }

  const result = parseInventoryAmount(value);

  if (result.valid && result.amount > sourceEvent.incomeRule.maxDays) {
    return {
      valid: false,
      amount: null,
      error: `剩余签到天数不得超过 ${sourceEvent.incomeRule.maxDays} 天。`,
    };
  }

  if (result.valid) {
    state.remainingDays = result.amount;
  }

  return result;
}

function getInventoryResourceSources() {
  return [
    inventoryState.fixedResources,
    inventoryState.timedPaintTotals,
    inventoryState.limitedPaintResources,
  ];
}

function formatAvailablePulls(pulls) {
  return String(Number(pulls.toFixed(2)));
}

function renderCurrentResourceTotals(resources) {
  if (!preConversionSummaryView) {
    return;
  }

  const hasTargetBanner =
    dateSelectionState.targetMode === "banner" &&
    dateSelectionState.targetBanner !== null;
  const applicableLimitedPaintResources =
    getApplicableLimitedPaintResources(
      summaryResourceInstances,
      dateSelectionState.targetMode,
      dateSelectionState.targetBanner,
    );
  const limitedPaintNames = applicableLimitedPaintResources.map(
    (resource) => resource.name,
  );

  preConversionSummaryView.limitedPaintLabel.textContent =
    limitedPaintNames.length > 0
      ? `限定老荷兰（${limitedPaintNames.join("、")}）`
      : "限定老荷兰";

  Object.entries(preConversionSummaryView.resources).forEach(
    ([resourceId, output]) => {
      if (resourceId === "limited_paint" && !hasTargetBanner) {
        output.textContent = "—";
        return;
      }

      output.textContent = String(resources[resourceId] ?? 0);
    },
  );

  const availablePullsResult = calculateAvailablePulls(resources, {
    includeLimitedPaint: hasTargetBanner,
  });
  preConversionSummaryView.availablePulls.textContent =
    availablePullsResult.valid
      ? `${formatAvailablePulls(availablePullsResult.pulls)} 抽`
      : "—";
}

function renderFinalResourceTotals() {
  const result = calculateFinalResourceTotals(
    currencyPackPurchaseState.resources,
    otherState.resources,
  );

  if (!result.valid) {
    if (preConversionSummaryView) {
      preConversionSummaryView.error.textContent = result.error;
    }
    return;
  }

  renderCurrentResourceTotals(result.resources);
}

function formatRechargeEventOptionLabel(rechargeEvent) {
  return `${rechargeEvent.name} ${rechargeEvent.startDate} ～ ${rechargeEvent.endDate}`;
}

function updateRechargeSummaryResult() {
  if (!rechargeSummaryView) {
    return;
  }

  rechargeSummaryView.rmbTotal.textContent =
    `¥${preConversionSummaryState.rmbTotal}`;
  rechargeSummaryView.error.textContent = "";

  if (rechargeEventsLoading) {
    rechargeSummaryView.eventField.hidden = true;
    rechargeSummaryView.eventMessage.hidden = false;
    rechargeSummaryView.eventMessage.textContent =
      "正在加载限时累充数据。";
    rechargeSummaryView.monthlyCardField.hidden = true;
    rechargeSummaryView.limitedRechargeRmb.textContent = "¥0";
    rechargeSummaryState.limitedRechargeRmb = 0;
    return;
  }

  if (rechargeEventsLoadError) {
    rechargeSummaryView.eventField.hidden = true;
    rechargeSummaryView.eventMessage.hidden = false;
    rechargeSummaryView.eventMessage.textContent = "";
    rechargeSummaryView.monthlyCardField.hidden = true;
    rechargeSummaryView.limitedRechargeRmb.textContent = "¥0";
    rechargeSummaryView.error.textContent = rechargeEventsLoadError;
    rechargeSummaryState.limitedRechargeRmb = 0;
    return;
  }

  const availableResult = getIntersectingRechargeEvents(
    rechargeEvents,
    dateSelectionState.currentDate,
    dateSelectionState.targetDate,
  );

  if (!availableResult.valid) {
    rechargeSummaryView.eventField.hidden = true;
    rechargeSummaryView.eventMessage.hidden = true;
    rechargeSummaryView.monthlyCardField.hidden = true;
    rechargeSummaryView.limitedRechargeRmb.textContent = "¥0";
    rechargeSummaryView.error.textContent = availableResult.error;
    rechargeSummaryState.limitedRechargeRmb = 0;
    return;
  }

  if (availableResult.events.length === 0) {
    rechargeSummaryState.selectedRechargeEventId = "";
    rechargeSummaryView.eventSelect.replaceChildren();
    rechargeSummaryView.eventField.hidden = true;
    rechargeSummaryView.eventMessage.hidden = false;
    rechargeSummaryView.eventMessage.textContent =
      "当前计算区间内没有限时累充";
    rechargeSummaryView.monthlyCardField.hidden = true;
    rechargeSummaryView.limitedRechargeRmb.textContent = "¥0";
    rechargeSummaryState.limitedRechargeRmb = 0;
    return;
  }

  const availableIds = new Set(
    availableResult.events.map((rechargeEvent) => rechargeEvent.id),
  );

  if (
    !availableIds.has(rechargeSummaryState.selectedRechargeEventId)
  ) {
    rechargeSummaryState.selectedRechargeEventId =
      availableResult.events[0].id;
  }

  rechargeSummaryView.eventSelect.replaceChildren();
  availableResult.events.forEach((rechargeEvent) => {
    const option = document.createElement("option");
    option.value = rechargeEvent.id;
    option.textContent = formatRechargeEventOptionLabel(rechargeEvent);
    rechargeSummaryView.eventSelect.append(option);
  });
  rechargeSummaryView.eventSelect.value =
    rechargeSummaryState.selectedRechargeEventId;
  rechargeSummaryView.eventField.hidden = false;
  rechargeSummaryView.eventMessage.hidden = true;

  const selectedRechargeEvent = availableResult.events.find(
    (rechargeEvent) =>
      rechargeEvent.id ===
      rechargeSummaryState.selectedRechargeEventId,
  );
  const monthlyCardEligibility =
    calculateMonthlyCardRechargeEligibility({
      currentDate: dateSelectionState.currentDate,
      targetDate: dateSelectionState.targetDate,
      rechargeEvent: selectedRechargeEvent,
      monthlyCard: dailyIncomeState.monthlyCard,
      todayIncomeClaimed: dailyIncomeSettings.todayIncomeClaimed,
      durationDays: incomeCardRules?.monthlyCard.durationDays ?? 30,
    });

  if (!monthlyCardEligibility.valid) {
    rechargeSummaryView.monthlyCardField.hidden = true;
    rechargeSummaryView.limitedRechargeRmb.textContent = "¥0";
    rechargeSummaryView.error.textContent = monthlyCardEligibility.error;
    rechargeSummaryState.limitedRechargeRmb = 0;
    return;
  }

  const monthlyCard = dailyIncomeState.monthlyCard;
  const showMonthlyCardInput =
    monthlyCard?.selected && monthlyCard.purchaseCount > 0;
  let monthlyCardQuantity = 0;

  if (showMonthlyCardInput) {
    const rechargeEventId = selectedRechargeEvent.id;
    const quantityWasTouched =
      rechargeSummaryState.monthlyCardQuantityTouched[
        rechargeEventId
      ] === true;
    const savedQuantity = quantityWasTouched
      ? rechargeSummaryState.monthlyCardQuantities[rechargeEventId] ?? 0
      : monthlyCardEligibility.maximumQuantity;
    monthlyCardQuantity = Math.min(
      savedQuantity,
      monthlyCardEligibility.maximumQuantity,
    );
    rechargeSummaryState.monthlyCardQuantities[rechargeEventId] =
      monthlyCardQuantity;
    rechargeSummaryView.monthlyCardQuantity.max =
      String(monthlyCardEligibility.maximumQuantity);
    rechargeSummaryView.monthlyCardQuantity.value =
      String(monthlyCardQuantity);
    rechargeSummaryView.monthlyCardMaximum.textContent =
      `本期最多可计入 ${monthlyCardEligibility.maximumQuantity} 张`;
  }

  rechargeSummaryView.monthlyCardField.hidden = !showMonthlyCardInput;

  const summary = calculateLimitedRechargeSummary({
    rechargeEvent: selectedRechargeEvent,
    currentDate: dateSelectionState.currentDate,
    targetDate: dateSelectionState.targetDate,
    permanentPackPurchases: permanentPackState.purchases,
    eventPacks,
    eventPackPurchaseState: eventPackPurchaseState.purchases,
    monthlyCardRechargeQuantity: monthlyCardQuantity,
    monthlyCardRechargeMaximum:
      monthlyCardEligibility.maximumQuantity,
    monthlyCardPrice: incomeCardRules?.monthlyCard.priceRmb ?? 0,
    monthlyCardCountsTowardLimitedRecharge:
      monthlyCard?.countsTowardLimitedRecharge ?? false,
  });

  if (!summary.valid) {
    rechargeSummaryView.limitedRechargeRmb.textContent = "¥0";
    rechargeSummaryView.error.textContent = summary.error;
    rechargeSummaryState.limitedRechargeRmb = 0;
    return;
  }

  rechargeSummaryState.limitedRechargeRmb =
    summary.limitedRechargeRmb;
  rechargeSummaryView.limitedRechargeRmb.textContent =
    `¥${summary.limitedRechargeRmb}`;
}

function updatePreConversionSummaryResult() {
  if (!preConversionSummaryView) {
    return;
  }

  const result = calculatePreConversionSummary({
    resourceSources: [
      ...getInventoryResourceSources(),
      dailyIncomeState.resources,
      eventIncomeState.resources,
      permanentPackState.resources,
      eventPackPurchaseState.resources,
    ],
    paymentSources: [
      {
        amount: dailyIncomeState.rmbTotal,
      },
      ...permanentPackState.purchases.map((purchase) => ({
        amount: purchase.price,
        countsTowardLimitedRecharge:
          purchase.countsTowardLimitedRecharge,
      })),
      {
        amount: eventPackPurchaseState.totalPrice,
      },
    ],
    resourceInstances: summaryResourceInstances,
    targetDate: dateSelectionState.targetDate,
    targetBanner: dateSelectionState.targetBanner,
  });

  if (!result.valid) {
    preConversionSummaryView.error.textContent = result.error;
    return;
  }

  preConversionSummaryState.resources = result.resources;
  preConversionSummaryState.rmbTotal = result.rmbTotal;

  preConversionSummaryView.error.textContent = "";
  updateRechargeSummaryResult();

  if (currencyPackView) {
    updateCurrencyPacksResult();
  } else {
    currencyPackPurchaseState.resources = { ...result.resources };
    renderFinalResourceTotals();
  }
}

function updateFreeDailyAccumulationResult() {
  if (!freeDailyAccumulationView) {
    return;
  }

  dailyIncomeState.resources = {};
  dailyIncomeState.rmbTotal = 0;
  dailyIncomeState.monthlyCard = null;
  updatePreConversionSummaryResult();

  const outputs = [
    freeDailyAccumulationView.dailyTasks,
    freeDailyAccumulationView.weeklyShares,
    freeDailyAccumulationView.monthlySignIns,
  ];
  const cardOutputs = incomeCardView
    ? [
        incomeCardView.monthlyDaily,
        incomeCardView.monthlyPurchase,
        incomeCardView.seasonalDaily,
        incomeCardView.seasonalTotal,
        incomeCardView.annualCount,
        incomeCardView.annualPaint,
        incomeCardView.catTreatCount,
        incomeCardView.catTreatPaint,
      ]
    : [];

  if (!freeDailyAccumulationRules || !incomeCardRules) {
    [...outputs, ...cardOutputs].forEach((output) => {
      output.textContent = "—";
    });
    incomeCardView.monthlyCost.textContent =
      incomeCardSelections.monthlyCardSelected ? "—" : "¥0";
    return;
  }

  const result = calculateFreeDailyAccumulation(
    dateSelectionState.currentDate,
    dateSelectionState.targetDate,
    freeDailyAccumulationRules,
    dailyIncomeSettings.todayIncomeClaimed,
  );

  if (!result.valid) {
    [...outputs, ...cardOutputs].forEach((output) => {
      output.textContent = "—";
    });
    freeDailyAccumulationView.error.textContent = result.error;
    incomeCardView.error.textContent = "";
    incomeCardView.monthlyCost.textContent =
      incomeCardSelections.monthlyCardSelected ? "—" : "¥0";
    return;
  }

  const cardResult = calculateIncomeCards(
    dateSelectionState.currentDate,
    dateSelectionState.targetDate,
    result.monthlySignIns.diamonds,
    incomeCardRules,
    incomeCardSelections,
    dailyIncomeSettings.todayIncomeClaimed,
  );

  if (!cardResult.valid) {
    cardOutputs.forEach((output) => {
      output.textContent = "—";
    });
    incomeCardView.error.textContent = cardResult.error;
    incomeCardView.monthlyCost.textContent =
      incomeCardSelections.monthlyCardSelected ? "—" : "¥0";
    return;
  }

  freeDailyAccumulationView.dailyTasks.textContent =
    `${result.dailyTasks.days} 天 × ${freeDailyAccumulationRules.dailyTaskDiamonds} 钻，共 ${result.dailyTasks.diamonds} 钻`;
  freeDailyAccumulationView.weeklyShares.textContent =
    `${result.weeklyShares.count} 次 × ${freeDailyAccumulationRules.weeklyShare.diamonds} 钻，共 ${result.weeklyShares.diamonds} 钻`;
  freeDailyAccumulationView.monthlySignIns.textContent =
    `共 ${cardResult.monthlySignInDiamonds} 钻，${result.monthEndRewards.commonPaint} 个老荷兰颜料`;
  incomeCardView.monthlyDaily.textContent =
    `${cardResult.monthlyCard.dailyDiamonds} 钻`;
  incomeCardView.monthlyPurchase.textContent =
    `${cardResult.monthlyCard.purchaseDiamonds} 钻`;
  incomeCardView.monthlyCost.textContent =
    `¥${cardResult.monthlyCard.purchaseAmountRmb}`;
  incomeCardView.seasonalDaily.textContent =
    `${cardResult.seasonalCard.dailyDiamonds} 钻`;
  incomeCardView.seasonalTotal.textContent =
    `${cardResult.seasonalCard.totalDiamonds} 钻`;
  incomeCardView.annualCount.textContent =
    `${cardResult.annualCard.rewardCount} 个`;
  incomeCardView.annualPaint.textContent =
    `${cardResult.annualCard.commonPaint} 个老荷兰颜料`;
  incomeCardView.catTreatCount.textContent =
    `${cardResult.catTreat.rewardCount} 个`;
  incomeCardView.catTreatPaint.textContent =
    `${cardResult.catTreat.commonPaint} 个老荷兰颜料`;
  dailyIncomeState.resources = {
    diamond:
      result.dailyTasks.diamonds +
      result.weeklyShares.diamonds +
      cardResult.monthlySignInDiamonds +
      cardResult.monthlyCard.totalDiamonds +
      cardResult.seasonalCard.totalDiamonds,
    common_paint:
      result.monthEndRewards.commonPaint +
      cardResult.annualCard.commonPaint +
      cardResult.catTreat.commonPaint,
  };
  dailyIncomeState.rmbTotal =
    cardResult.monthlyCard.purchaseAmountRmb;
  dailyIncomeState.monthlyCard = cardResult.monthlyCard;
  freeDailyAccumulationView.error.textContent = "";
  incomeCardView.error.textContent = "";
  updatePreConversionSummaryResult();
}

function updateIncomeCardAppearance(card, selected) {
  card.classList.toggle("is-selected", selected);
  card.setAttribute("aria-pressed", String(selected));
}

function makeIncomeCardSelectable(card, selectionKey) {
  function toggleCard() {
    incomeCardSelections[selectionKey] = !incomeCardSelections[selectionKey];
    updateIncomeCardAppearance(card, incomeCardSelections[selectionKey]);
    updateFreeDailyAccumulationResult();
  }

  card.addEventListener("click", (event) => {
    if (event.target.closest("input, label")) {
      return;
    }

    toggleCard();
  });

  card.addEventListener("keydown", (event) => {
    if (
      event.target === card &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      toggleCard();
    }
  });
}

function formatEventResources(resources) {
  const resourceNames = new Map(
    eventResourceTypes.map((resourceType) => [
      resourceType.id,
      resourceType.name,
    ]),
  );
  const entries = Object.entries(resources);

  if (entries.length === 0) {
    return "无";
  }

  return entries
    .map(
      ([resourceId, amount]) =>
        `${amount} ${resourceNames.get(resourceId) ?? resourceId}`,
    )
    .join("，");
}

function groupEligibleEventsByStatus(eligibleEvents) {
  return {
    current: eligibleEvents.filter((event) => event.status === "current"),
    future: eligibleEvents.filter((event) => event.status === "future"),
  };
}

function getEventIncomeLabel(status) {
  return status === "future" ? "预计可计入" : "可计入";
}

function createEventIncomeCard(event) {
  const card = document.createElement("article");
  const header = document.createElement("header");
  const heading = document.createElement("h3");
  const income = document.createElement("p");
  const incomeLabel = getEventIncomeLabel(event.status);
  const sourceEvent = events.find(
    (candidate) => candidate.id === event.eventId,
  );
  const isClaimThenDaily =
    sourceEvent?.incomeRule?.type === "claim_then_daily";

  card.className = "income-card event-income-card";
  card.classList.toggle("is-selected", event.selected);
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-pressed", String(event.selected));
  heading.textContent = event.eventName;
  income.textContent = isClaimThenDaily
    ? `当前可计入钻石：${event.resources.diamond ?? 0} 钻`
    : `${incomeLabel}：${formatEventResources(event.resources)}`;
  header.append(heading);

  if (sourceEvent?.isRerun) {
    const rerunBadge = document.createElement("span");
    rerunBadge.className = "event-income-rerun-badge";
    rerunBadge.textContent = "复刻";
    header.append(rerunBadge);
  }

  card.append(header);

  if (isClaimThenDaily) {
    const remainingDaysLabel = document.createElement("label");
    const remainingDaysInput = document.createElement("input");
    const remainingDaysError = document.createElement("p");
    const initialRewardLabel = document.createElement("label");
    const initialRewardClaimed = document.createElement("input");
    const state = eventIncomeState.incomeRuleStates[event.eventId];

    remainingDaysLabel.append("当前剩余签到天数", remainingDaysInput);
    remainingDaysInput.type = "number";
    remainingDaysInput.min = "0";
    remainingDaysInput.max = String(sourceEvent.incomeRule.maxDays);
    remainingDaysInput.step = "1";
    remainingDaysInput.value = String(state.remainingDays);
    remainingDaysInput.dataset.eventId = event.eventId;
    remainingDaysError.className = "inventory-input-error";
    remainingDaysError.setAttribute("aria-live", "polite");
    initialRewardClaimed.type = "checkbox";
    initialRewardClaimed.checked = state.initialRewardClaimed;
    initialRewardClaimed.dataset.eventId = event.eventId;
    initialRewardLabel.append(
      initialRewardClaimed,
      "领取当日300钻已领取",
    );
    card.append(
      remainingDaysLabel,
      remainingDaysError,
      initialRewardLabel,
      income,
    );

    remainingDaysInput.addEventListener("input", () => {
      const result = updateEventIncomeRuleRemainingDays(
        event.eventId,
        remainingDaysInput.value,
      );

      remainingDaysError.textContent = result.error ?? "";
      remainingDaysInput.setAttribute(
        "aria-invalid",
        String(!result.valid),
      );

      if (result.valid) {
        updateEventIncomeResult();
      }
    });
    initialRewardClaimed.addEventListener("change", () => {
      state.initialRewardClaimed = initialRewardClaimed.checked;
      updateEventIncomeResult();
    });
  } else {
    card.append(income);
  }

  function toggleEvent() {
    if (eventIncomeState.selectedEventIds.has(event.eventId)) {
      eventIncomeState.selectedEventIds.delete(event.eventId);
    } else {
      eventIncomeState.selectedEventIds.add(event.eventId);
    }

    updateEventIncomeResult();
  }

  card.addEventListener("click", (clickEvent) => {
    if (clickEvent.target.closest("input, label")) {
      return;
    }

    toggleEvent();
  });
  card.addEventListener("keydown", (keyboardEvent) => {
    if (keyboardEvent.target.closest("input, label")) {
      return;
    }

    if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
      keyboardEvent.preventDefault();
      toggleEvent();
    }
  });

  return card;
}

function updateEventIncomeResult() {
  if (!eventIncomeView) {
    return;
  }

  eventIncomeView.currentList.replaceChildren();
  eventIncomeView.futureList.replaceChildren();
  eventIncomeView.groups.hidden = true;
  eventIncomeState.resources = {};
  eventIncomeView.error.textContent = "";
  updatePreConversionSummaryResult();

  if (dateSelectionState.targetMode !== "banner") {
    const disabledResult = calculateSelectedEventIncome(
      dateSelectionState.targetMode,
      dateSelectionState.currentDate,
      dateSelectionState.targetDate,
      events,
      eventTypes,
      [...eventIncomeState.selectedEventIds],
      eventIncomeState.incomeRuleStates,
      dailyIncomeSettings.todayIncomeClaimed,
    );

    eventIncomeState.resources = disabledResult.selectedResources;
    eventIncomeView.message.textContent =
      "自定义日期模式下不计算活动收入。";
    return;
  }

  if (eventIncomeLoading) {
    eventIncomeView.message.textContent = "正在加载活动数据。";
    return;
  }

  if (eventIncomeLoadError) {
    eventIncomeView.message.textContent = "";
    eventIncomeView.error.textContent = eventIncomeLoadError;
    return;
  }

  if (!dateSelectionState.targetDate) {
    eventIncomeView.message.textContent = "请选择有效的目标卡池。";
    return;
  }

  const result = calculateSelectedEventIncome(
    dateSelectionState.targetMode,
    dateSelectionState.currentDate,
    dateSelectionState.targetDate,
    events,
    eventTypes,
    [...eventIncomeState.selectedEventIds],
    eventIncomeState.incomeRuleStates,
    dailyIncomeSettings.todayIncomeClaimed,
  );

  if (!result.valid) {
    eventIncomeView.message.textContent = "";
    eventIncomeView.error.textContent = result.error;
    return;
  }

  eventIncomeState.resources = result.selectedResources;
  updatePreConversionSummaryResult();
  const eligibleEvents = result.events.filter((event) => event.eligible);

  if (eligibleEvents.length === 0) {
    eventIncomeView.message.textContent = "当前目标日期没有可计入的活动。";
    return;
  }

  eventIncomeView.message.textContent = "";
  eventIncomeView.groups.hidden = false;
  const groupedEvents = groupEligibleEventsByStatus(eligibleEvents);

  groupedEvents.current.forEach((event) => {
    eventIncomeView.currentList.append(createEventIncomeCard(event));
  });
  groupedEvents.future.forEach((event) => {
    eventIncomeView.futureList.append(createEventIncomeCard(event));
  });
  eventIncomeView.currentEmpty.hidden = groupedEvents.current.length > 0;
  eventIncomeView.futureEmpty.hidden = groupedEvents.future.length > 0;
}

function formatPermanentPackContents(contents) {
  const resourceNames = new Map(
    permanentPackResourceTypes.map((resourceType) => [
      resourceType.id,
      resourceType.name,
    ]),
  );

  return Object.entries(contents)
    .map(
      ([resourceId, amount]) =>
        `${resourceNames.get(resourceId) ?? resourceId}×${amount}`,
    )
    .join("，");
}

function renderPermanentPacks() {
  if (!permanentPackView || !permanentPackRules) {
    return;
  }

  const displayResult = getDisplayablePermanentPacks(
    permanentPacks,
    packValuationState.redDiamondPerPull,
    permanentPackRules,
  );

  permanentPackView.list.replaceChildren();

  if (!displayResult.valid) {
    permanentPackView.error.textContent = displayResult.error;
    return;
  }

  const displayedIds = new Set(
    displayResult.packs.map((result) => result.pack.id),
  );

  permanentPacks.forEach((pack) => {
    if (!displayedIds.has(pack.id)) {
      permanentPackState.quantities[pack.id] = 0;
    }
  });

  const purchaseResult = calculatePermanentPackPurchases(
    permanentPacks,
    permanentPackState.quantities,
  );

  if (!purchaseResult.valid) {
    permanentPackView.error.textContent = purchaseResult.error;
    return;
  }

  permanentPackState.resources = purchaseResult.resources;
  permanentPackState.totalPrice = purchaseResult.totalPrice;
  permanentPackState.purchases = purchaseResult.purchases;
  permanentPackView.error.textContent = "";
  updatePreConversionSummaryResult();

  displayResult.packs.forEach((result) => {
    const { pack } = result;
    const quantity = permanentPackState.quantities[pack.id] ?? 0;
    const purchaseLimit = getPermanentPackPurchaseLimit(pack);
    const card = document.createElement("article");
    const header = document.createElement("header");
    const heading = document.createElement("h3");
    const price = document.createElement("span");
    const contents = document.createElement("p");
    const valueSummary = document.createElement("p");
    const theoreticalPulls = document.createElement("span");
    const pricePerPull = document.createElement("span");

    card.className = "income-card permanent-pack-card";
    card.classList.toggle("is-selected", quantity > 0);
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-pressed", String(quantity > 0));
    heading.textContent = pack.name;
    price.className = "permanent-pack-price";
    price.textContent = `¥${pack.price * Math.max(1, quantity)}`;
    header.append(heading, price);
    contents.textContent =
      `抽卡资源：${formatPermanentPackContents(pack.contents)}`;
    valueSummary.className = "permanent-pack-value-summary";
    theoreticalPulls.textContent =
      `理论抽数：${result.theoreticalPulls.toFixed(2)}`;
    pricePerPull.textContent =
      `单抽价格：¥${result.pricePerPull.toFixed(2)}`;
    valueSummary.append(theoreticalPulls, pricePerPull);
    card.append(header, contents, valueSummary);

    if (purchaseLimit > 1 && quantity > 0) {
      const quantityLabel = document.createElement("label");
      const quantityInput = document.createElement("input");

      quantityLabel.className = "permanent-pack-quantity";
      quantityLabel.append("购买数量", quantityInput);
      quantityInput.type = "number";
      quantityInput.min = "1";
      quantityInput.max = String(purchaseLimit);
      quantityInput.step = "1";
      quantityInput.value = String(quantity);
      quantityInput.addEventListener("input", () => {
        const nextQuantity = Number(quantityInput.value);

        if (
          !Number.isSafeInteger(nextQuantity) ||
          nextQuantity < 1 ||
          nextQuantity > purchaseLimit
        ) {
          permanentPackView.error.textContent =
            `“${pack.name}”购买数量必须为 1～${purchaseLimit}。`;
          return;
        }

        permanentPackState.quantities[pack.id] = nextQuantity;
        renderPermanentPacks();
      });
      card.append(quantityLabel);
    } else {
      const quantityText = document.createElement("p");
      quantityText.textContent = `购买数量：${quantity}`;
      card.append(quantityText);
    }

    function togglePack() {
      permanentPackState.quantities[pack.id] = quantity > 0 ? 0 : 1;
      renderPermanentPacks();
    }

    card.addEventListener("click", (event) => {
      if (event.target.closest("input, label")) {
        return;
      }

      togglePack();
    });
    card.addEventListener("keydown", (event) => {
      if (
        event.target === card &&
        (event.key === "Enter" || event.key === " ")
      ) {
        event.preventDefault();
        togglePack();
      }
    });
    permanentPackView.list.append(card);
  });
}

function formatEventPackContents(contents) {
  if (contents.length === 0) {
    return "无";
  }

  return contents
    .map(
      ({ resourceId, amount }) =>
        `${eventPackResourceNames.get(resourceId) ?? resourceId}×${amount}`,
    )
    .join("，");
}

function formatEventPackOtherContents(contents) {
  return contents
    .map(({ name, amount }) => `${name}×${amount}`)
    .join("，");
}

function updatePackValuationRate(rawValue) {
  packValuationState.redDiamondPerPull = Number(rawValue);

  [
    permanentPackView?.redDiamondRate,
    eventPackView?.redDiamondRate,
  ].forEach((input) => {
    if (input && input.value !== rawValue) {
      input.value = rawValue;
    }
  });

  renderPermanentPacks();
  updateEventPacksResult();
}

function initializePackValuationRate(defaultRate) {
  if (packValuationState.redDiamondPerPull === null) {
    packValuationState.redDiamondPerPull = defaultRate;
  }

  const rawValue = String(packValuationState.redDiamondPerPull);

  [
    permanentPackView?.redDiamondRate,
    eventPackView?.redDiamondRate,
  ].forEach((input) => {
    if (input) {
      input.value = rawValue;
    }
  });
}

function createEventPackCard(eventPack, valueResult, purchases) {
  const { pack } = valueResult;
  const purchase = purchases[pack.id];
  const maximumQuantity = getEventPackMaximumQuantity(
    pack,
    eventPack,
    dateSelectionState.currentDate,
    dateSelectionState.targetDate,
  );
  const prerequisitesSatisfied = pack.prerequisites.every(
    (prerequisiteId) => purchases[prerequisiteId]?.selected,
  );
  const disabled = maximumQuantity === 0 || !prerequisitesSatisfied;
  const card = document.createElement("article");
  const header = document.createElement("header");
  const heading = document.createElement("h4");
  const price = document.createElement("span");
  const contents = document.createElement("p");
  const valueSummary = document.createElement("p");
  const theoreticalPulls = document.createElement("span");
  const pricePerPull = document.createElement("span");

  card.className = "income-card event-pack-card";
  card.classList.toggle("is-selected", purchase.selected);
  card.classList.toggle("is-disabled", disabled);
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-pressed", String(purchase.selected));
  card.setAttribute("aria-disabled", String(disabled));
  heading.textContent = pack.name;
  price.className = "permanent-pack-price";
  price.textContent = `¥${pack.price * Math.max(1, purchase.quantity)}`;
  header.append(heading, price);
  contents.textContent = `抽卡资源：${formatEventPackContents(pack.contents)}`;
  card.append(header, contents);

  if (pack.otherContents.length > 0) {
    const otherContents = document.createElement("p");
    otherContents.textContent =
      `其他奖励：${formatEventPackOtherContents(pack.otherContents)}`;
    card.append(otherContents);
  }

  valueSummary.className = "permanent-pack-value-summary";
  theoreticalPulls.textContent = valueResult.valid
    ? `理论抽数：${valueResult.theoreticalPulls.toFixed(2)}`
    : "理论抽数：—";
  pricePerPull.textContent =
    valueResult.valid && valueResult.pricePerPull !== null
      ? `单抽价格：¥${valueResult.pricePerPull.toFixed(2)}`
      : "单抽价格：—";
  valueSummary.append(theoreticalPulls, pricePerPull);
  card.append(valueSummary);

  if (pack.purchaseRule.type !== "total") {
    const purchaseRule = document.createElement("p");
    const periodLabel =
      pack.purchaseRule.type === "weekly" ? "每周" : "每日";
    purchaseRule.textContent =
      `${periodLabel}限购 ${pack.purchaseRule.limit} 次；当前区间最多 ${maximumQuantity} 份`;
    card.append(purchaseRule);
  }

  if (pack.prerequisites.length > 0) {
    const prerequisites = document.createElement("p");
    prerequisites.textContent =
      `需先购买：${pack.prerequisites.join("、")}`;
    card.append(prerequisites);
  }

  if (pack.trigger !== null) {
    const trigger = document.createElement("p");
    trigger.textContent = `抽卡达到 ${pack.trigger.value} 次后触发`;
    card.append(trigger);
  }

  pack.deferredRewards.forEach((reward) => {
    const deferredReward = document.createElement("p");
    const note = reward.note ? `；${reward.note}` : "";

    if (reward.type === "relative_daily") {
      const intervalLabel =
        reward.intervalDays === 1
          ? "每天"
          : `每隔 ${reward.intervalDays} 天`;
      deferredReward.textContent =
        `购买后第 ${reward.startOffsetDays} 天起，${intervalLabel}发放` +
        `${formatEventPackContents(reward.contents)}，共 ${reward.days} 次${note}`;
    } else {
      deferredReward.textContent =
        `购买后可获得：${reward.name}×${reward.amount}${note}`;
    }
    card.append(deferredReward);
  });

  if (maximumQuantity > 1 && purchase.selected) {
    const quantityLabel = document.createElement("label");
    const quantityInput = document.createElement("input");

    quantityLabel.className = "permanent-pack-quantity";
    quantityLabel.append("购买数量", quantityInput);
    quantityInput.type = "number";
    quantityInput.min = "1";
    quantityInput.max = String(maximumQuantity);
    quantityInput.step = "1";
    quantityInput.value = String(purchase.quantity);
    quantityInput.addEventListener("input", () => {
      const result = updateEventPackPurchase(
        eventPack,
        purchases,
        pack.id,
        true,
        Number(quantityInput.value),
        dateSelectionState.currentDate,
        dateSelectionState.targetDate,
      );

      if (!result.valid) {
        eventPackView.error.textContent = result.error;
        return;
      }

      eventPackPurchaseState.purchases[eventPack.id] = result.purchases;
      updateEventPacksResult();
    });
    card.append(quantityLabel);
  } else {
    const quantity = document.createElement("p");
    quantity.textContent = `购买数量：${purchase.quantity}`;
    card.append(quantity);
  }

  function togglePack() {
    if (disabled) {
      return;
    }

    const result = updateEventPackPurchase(
      eventPack,
      purchases,
      pack.id,
      !purchase.selected,
      1,
      dateSelectionState.currentDate,
      dateSelectionState.targetDate,
    );

    if (!result.valid) {
      eventPackView.error.textContent = result.error;
      return;
    }

    eventPackPurchaseState.purchases[eventPack.id] = result.purchases;
    updateEventPacksResult();
  }

  card.addEventListener("click", (event) => {
    if (event.target.closest("input, label")) {
      return;
    }

    togglePack();
  });
  card.addEventListener("keydown", (event) => {
    if (
      event.target === card &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      togglePack();
    }
  });

  return card;
}

function renderEventPackGroups(displayableEventPacks) {
  eventPackView.groups.replaceChildren();

  displayableEventPacks.forEach((eventPack, index) => {
    const group = document.createElement("section");
    const heading = document.createElement("h3");
    const list = document.createElement("div");
    const headingId = `event-pack-group-${index}`;
    const purchases = eventPackPurchaseState.purchases[eventPack.id];

    group.className = "event-pack-group";
    group.setAttribute("aria-labelledby", headingId);
    heading.id = headingId;
    heading.textContent = eventPack.name;
    list.className = "event-pack-card-grid";
    const packValues = eventPack.packs.map((pack) => ({
      ...calculatePackValue(
        pack,
        packValuationState.redDiamondPerPull,
        permanentPackRules,
        {
          targetDate: dateSelectionState.targetDate,
          targetBanner: dateSelectionState.targetBanner,
          resourceInstances: summaryResourceInstances,
        },
      ),
      pack,
    }));

    sortPackValuesByPricePerPull(packValues).forEach((valueResult) => {
      list.append(createEventPackCard(eventPack, valueResult, purchases));
    });
    group.append(heading, list);
    eventPackView.groups.append(group);
  });
}

function updateEventPacksResult() {
  if (!eventPackView) {
    return;
  }

  eventPackView.groups.replaceChildren();
  eventPackView.error.textContent = "";
  eventPackPurchaseState.resources = {};
  eventPackPurchaseState.totalPrice = 0;
  updatePreConversionSummaryResult();

  if (eventPacksLoading) {
    eventPackView.message.textContent = "正在加载活动礼包数据。";
    return;
  }

  if (eventPacksLoadError) {
    eventPackView.message.textContent = "";
    eventPackView.error.textContent = eventPacksLoadError;
    return;
  }

  if (!dateSelectionState.targetDate) {
    eventPackView.message.textContent = "请选择有效的目标日期。";
    return;
  }

  const summary = calculateEventPackPurchaseSummary(
    eventPacks,
    eventPackPurchaseState.purchases,
    dateSelectionState.currentDate,
    dateSelectionState.targetDate,
  );
  eventPackPurchaseState.purchases = summary.purchaseState;
  eventPackPurchaseState.resources = summary.resources;
  eventPackPurchaseState.totalPrice = summary.totalPrice;
  updatePreConversionSummaryResult();
  const displayableEventPacks = getDisplayableEventPacks(
    eventPacks,
    dateSelectionState.currentDate,
  );

  if (displayableEventPacks.length === 0) {
    eventPackView.message.textContent =
      "当前目标日期没有可计入的活动礼包。";
    return;
  }

  eventPackView.message.textContent = "";
  renderEventPackGroups(displayableEventPacks);
}

function resolveTargetDate(mode, banner, bannerDateType, customTargetDate) {
  if (mode === "custom") {
    return customTargetDate;
  }

  if (!banner) {
    return "";
  }

  return bannerDateType === "end" ? banner.endDate : banner.startDate;
}

function formatBannerOptionLabel(banner) {
  return `${banner.name} ${banner.startDate} ～ ${banner.endDate}`;
}

function initializeDateModule() {
  const currentDateInput = document.querySelector("#current-date");
  const targetModeInputs = document.querySelectorAll(
    'input[name="target-mode"]',
  );
  const bannerTargetFields = document.querySelector("#banner-target-fields");
  const bannerSelect = document.querySelector("#banner-select");
  const bannerDateTypeInputs = document.querySelectorAll(
    'input[name="banner-date-type"]',
  );
  const customTargetField = document.querySelector("#custom-target-field");
  const customTargetDateInput = document.querySelector("#custom-target-date");
  const dateError = document.querySelector("#date-error");

  let banners = [];
  let isBannerDataLoading = true;
  let bannerDataError = "";

  function getCheckedValue(inputs) {
    return Array.from(inputs).find((input) => input.checked)?.value ?? "";
  }

  function getSelectedBanner() {
    return banners.find((banner) => banner.id === bannerSelect.value) ?? null;
  }

  function updateDateResult() {
    const mode = getCheckedValue(targetModeInputs);
    const banner = getSelectedBanner();
    const bannerDateType = getCheckedValue(bannerDateTypeInputs);
    const targetDate = resolveTargetDate(
      mode,
      banner,
      bannerDateType,
      customTargetDateInput.value,
    );

    dateSelectionState.currentDate = currentDateInput.value;
    dateSelectionState.targetDate = targetDate;
    dateSelectionState.targetMode = mode;
    dateSelectionState.targetBanner = mode === "banner" ? banner : null;
    updateLimitedInventoryForTarget();
    updateFreeDailyAccumulationResult();
    updateEventIncomeResult();
    updateEventPacksResult();
    updatePreConversionSummaryResult();

    if (mode === "banner" && isBannerDataLoading) {
      dateError.textContent = "正在加载卡池数据。";
      return;
    }

    if (mode === "banner" && !banner) {
      dateError.textContent = bannerDataError || "请选择有效的卡池。";
      return;
    }

    const result = calculateDateRange(currentDateInput.value, targetDate);

    if (!result.valid) {
      dateError.textContent = result.error;
      return;
    }

    dateError.textContent = "";
  }

  function updateTargetMode() {
    const isBannerMode = getCheckedValue(targetModeInputs) === "banner";

    bannerTargetFields.hidden = !isBannerMode;
    bannerSelect.disabled = !isBannerMode;
    bannerDateTypeInputs.forEach((input) => {
      input.disabled = !isBannerMode;
    });
    customTargetField.hidden = isBannerMode;
    customTargetDateInput.disabled = isBannerMode;
    updateDateResult();
  }

  function renderBannerOptions() {
    bannerSelect.replaceChildren();
    const visibleBanners = [
      ...banners.filter((banner) => banner.archive !== true),
    ].sort((firstBanner, secondBanner) =>
      firstBanner.startDate.localeCompare(secondBanner.startDate),
    );

    if (visibleBanners.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "无可用卡池";
      bannerSelect.append(option);
      return;
    }

    visibleBanners.forEach((banner) => {
      const option = document.createElement("option");
      option.value = banner.id;
      option.textContent = formatBannerOptionLabel(banner);
      bannerSelect.append(option);
    });
  }

  targetModeInputs.forEach((input) => {
    input.addEventListener("change", updateTargetMode);
  });
  bannerDateTypeInputs.forEach((input) => {
    input.addEventListener("change", updateDateResult);
  });
  bannerSelect.addEventListener("change", () => {
    updateDateResult();
  });
  currentDateInput.addEventListener("input", updateDateResult);
  customTargetDateInput.addEventListener("input", updateDateResult);

  updateTargetMode();

  loadBanners()
    .then((loadedBanners) => {
      banners = loadedBanners;
      bannerDataError =
        banners.length === 0 ? "没有可用的卡池数据。" : "";
    })
    .catch(() => {
      banners = [];
      bannerDataError =
        "卡池数据加载失败，请使用本地开发服务器打开页面。";
    })
    .finally(() => {
      isBannerDataLoading = false;
      renderBannerOptions();
      updateDateResult();
    });
}

function initializeInventoryModule() {
  const fixedInventoryFields = document.querySelector(
    "#fixed-inventory-fields",
  );
  const timedInventoryFields = document.querySelector(
    "#timed-inventory-fields",
  );
  const limitedInventoryList = document.querySelector(
    "#limited-inventory-list",
  );
  const limitedInventoryMessage = document.querySelector(
    "#limited-inventory-message",
  );
  const limitedInventoryHeading = document.querySelector(
    "#limited-inventory-heading",
  );
  const inventoryError = document.querySelector("#inventory-error");
  const dynamicInventoryError = document.querySelector(
    "#dynamic-inventory-error",
  );
  let limitedResourceDefinitions = [];
  let limitedResourcesLoading = true;

  function renderInventoryFields(
    container,
    resources,
    inventoryGroup,
    getLabel,
    getDescription,
  ) {
    container.replaceChildren();

    resources.forEach((resource, index) => {
      const label = document.createElement("label");
      const labelText = document.createElement("span");
      const description = document.createElement("span");
      const input = document.createElement("input");
      const error = document.createElement("small");
      const inputId = `inventory-${inventoryGroup}-${index}`;
      const errorId = `${inputId}-error`;

      label.className = "inventory-field";
      labelText.textContent = getLabel(resource);
      description.className = "inventory-description";
      description.textContent = getDescription(resource);
      input.id = inputId;
      input.type = "number";
      input.min = "0";
      input.step = "1";
      input.value = "0";
      input.dataset.inventoryGroup = inventoryGroup;
      input.dataset.resourceId = resource.id;
      input.setAttribute("aria-describedby", errorId);
      error.id = errorId;
      error.className = "inventory-input-error";

      input.addEventListener("input", () => {
        const result = updateInventoryAmount(
          input.dataset.inventoryGroup,
          input.dataset.resourceId,
          input.value,
        );

        error.textContent = result.error ?? "";
        input.setAttribute("aria-invalid", String(!result.valid));

        if (result.valid) {
          updatePreConversionSummaryResult();
        }
      });

      label.append(labelText);

      if (description.textContent !== "") {
        label.append(description);
      }

      label.append(input, error);
      container.append(label);
    });
  }

  function renderFixedInventoryFields(resourceTypes) {
    const fixedResourceTypes = resourceTypes.filter(
      (resourceType) => resourceType.management === "fixed",
    );

    initializeFixedInventoryState(fixedResourceTypes);
    renderInventoryFields(
      fixedInventoryFields,
      fixedResourceTypes,
      "fixedResources",
      (resourceType) => resourceType.name,
      () => "",
    );
  }

  function renderTimedInventoryField(resourceTypes) {
    const timedResourceTypes = resourceTypes.filter(
      (resourceType) => resourceType.management === "validity_batch",
    );

    initializeTimedInventoryState(timedResourceTypes);
    renderInventoryFields(
      timedInventoryFields,
      timedResourceTypes,
      "timedPaintTotals",
      (resourceType) =>
       `${resourceType.name}（请填写可用于当前目标日期的数量）`,
      () => "",
    );
  }

  function renderLimitedInventoryList() {
    limitedInventoryList.replaceChildren();
    limitedInventoryMessage.textContent = "";
    limitedInventoryHeading.hidden = true;
    limitedInventoryMessage.hidden = true;

    function showLimitedInventoryStatus(message) {
      limitedInventoryHeading.hidden = false;
      limitedInventoryMessage.hidden = false;
      limitedInventoryMessage.textContent = message;
    }

    if (limitedResourcesLoading) {
      showLimitedInventoryStatus("正在加载资源实例…");
      return;
    }

    if (dateSelectionState.targetMode !== "banner") {
      showLimitedInventoryStatus("限定老荷兰仅在按卡池计算时可填写");
      return;
    }

    if (!dateSelectionState.targetBanner) {
      showLimitedInventoryStatus("请选择有效的卡池后填写限定老荷兰");
      return;
    }

    const applicableResources = getApplicableLimitedPaintResources(
      limitedResourceDefinitions,
      dateSelectionState.targetMode,
      dateSelectionState.targetBanner,
    );

    if (applicableResources.length === 0) {
      showLimitedInventoryStatus("当前卡池没有已配置的限定老荷兰");
      return;
    }

    applicableResources.forEach((resource, index) => {
      const label = document.createElement("label");
      const labelText = document.createElement("span");
      const description = document.createElement("span");
      const input = document.createElement("input");
      const error = document.createElement("small");
      const inputId = `limited-inventory-${index}`;
      const errorId = `${inputId}-error`;

      label.className = "inventory-field";
      labelText.textContent =
        `限定老荷兰（${resource.name} 适用卡池：${dateSelectionState.targetBanner.name}）`;
      description.textContent = "";
      input.id = inputId;
      input.type = "number";
      input.min = "0";
      input.step = "1";
      input.value = String(
        inventoryState.limitedPaintResources[resource.id] ?? 0,
      );
      input.dataset.inventoryGroup = "limitedPaintResources";
      input.dataset.resourceId = resource.id;
      input.setAttribute("aria-describedby", errorId);
      error.id = errorId;
      error.className = "inventory-input-error";

      input.addEventListener("input", () => {
        const result = updateInventoryAmount(
          "limitedPaintResources",
          resource.id,
          input.value,
        );

        error.textContent = result.error ?? "";
        input.setAttribute("aria-invalid", String(!result.valid));

        if (result.valid) {
          updatePreConversionSummaryResult();
        }
      });

      label.append(labelText, input, error);
      limitedInventoryList.append(label);
    });
  }

  updateLimitedInventoryForTarget = renderLimitedInventoryList;

  function initializeLimitedInventory(resources) {
    limitedResourceDefinitions = resources.filter(
      (resource) => resource.category === "limited_paint",
    );

    initializeLimitedInventoryState(limitedResourceDefinitions);
    renderLimitedInventoryList();
  }

  loadResourceTypes()
    .then((resourceTypes) => {
      renderFixedInventoryFields(resourceTypes);
      renderTimedInventoryField(resourceTypes);
      inventoryError.textContent = "";
    })
    .catch(() => {
      fixedInventoryFields.replaceChildren();
      timedInventoryFields.replaceChildren();
      inventoryError.textContent =
        "资源类型加载失败，请使用本地开发服务器打开页面。";
    });

  loadResourceInstances()
    .then((resources) => {
      summaryResourceInstances = resources;
      limitedResourcesLoading = false;
      initializeLimitedInventory(resources);
      dynamicInventoryError.textContent = "";
      updatePreConversionSummaryResult();
    })
    .catch(() => {
      limitedResourcesLoading = false;
      limitedInventoryList.replaceChildren();
      limitedInventoryHeading.hidden = false;
      limitedInventoryMessage.hidden = false;
      limitedInventoryMessage.textContent = "限定老荷兰数据加载失败";
      dynamicInventoryError.textContent =
        "动态资源加载失败，请使用本地开发服务器打开页面。";
    });
}

function initializeFreeDailyAccumulationModule() {
  const todayIncomeClaimed = document.querySelector(
    "#today-income-claimed",
  );
  freeDailyAccumulationView = {
    dailyTasks: document.querySelector("#daily-task-result"),
    weeklyShares: document.querySelector("#weekly-share-result"),
    monthlySignIns: document.querySelector("#monthly-sign-in-result"),
    error: document.querySelector("#free-accumulation-error"),
  };
  incomeCardView = {
    monthlyCard: document.querySelector("#monthly-card"),
    monthlyRemainingDays: document.querySelector(
      "#monthly-card-remaining-days",
    ),
    monthlyRemainingDaysError: document.querySelector(
      "#monthly-card-remaining-days-error",
    ),
    monthlyExtraPurchases: document.querySelector(
      "#monthly-card-extra-purchases",
    ),
    monthlyExtraPurchasesError: document.querySelector(
      "#monthly-card-extra-purchases-error",
    ),
    monthlyCost: document.querySelector("#monthly-card-cost"),
    monthlyDaily: document.querySelector("#monthly-card-daily"),
    monthlyPurchase: document.querySelector("#monthly-card-purchase"),
    seasonalCard: document.querySelector("#seasonal-card"),
    seasonalDaily: document.querySelector("#seasonal-card-daily"),
    seasonalTotal: document.querySelector("#seasonal-card-total"),
    annualCard: document.querySelector("#annual-card"),
    annualCount: document.querySelector("#annual-card-count"),
    annualPaint: document.querySelector("#annual-card-paint"),
    catTreatCard: document.querySelector("#cat-treat-card"),
    catTreatCount: document.querySelector("#cat-treat-count"),
    catTreatPaint: document.querySelector("#cat-treat-paint"),
    error: document.querySelector("#income-card-error"),
  };

  makeIncomeCardSelectable(
    incomeCardView.monthlyCard,
    "monthlyCardSelected",
  );

  todayIncomeClaimed.addEventListener("change", () => {
    dailyIncomeSettings.todayIncomeClaimed = todayIncomeClaimed.checked;
    updateFreeDailyAccumulationResult();
    updateEventIncomeResult();
  });
  makeIncomeCardSelectable(
    incomeCardView.seasonalCard,
    "seasonalCardSelected",
  );
  makeIncomeCardSelectable(
    incomeCardView.annualCard,
    "annualCardSelected",
  );
  makeIncomeCardSelectable(
    incomeCardView.catTreatCard,
    "catTreatSelected",
  );

  [
    {
      input: incomeCardView.monthlyRemainingDays,
      error: incomeCardView.monthlyRemainingDaysError,
      selectionKey: "monthlyCardRemainingDays",
    },
    {
      input: incomeCardView.monthlyExtraPurchases,
      error: incomeCardView.monthlyExtraPurchasesError,
      selectionKey: "monthlyCardExtraPurchases",
    },
  ].forEach(({ input, error, selectionKey }) => {
    input.addEventListener("input", () => {
      const result = updateMonthlyCardInputState(
        selectionKey,
        input.value,
      );

      error.textContent = result.error ?? "";
      input.setAttribute("aria-invalid", String(!result.valid));

      if (result.valid) {
        updateFreeDailyAccumulationResult();
      }
    });
  });

  Promise.all([
    loadFreeDailyAccumulationRules(),
    loadIncomeCardRules(),
  ])
    .then(([freeRules, cardRules]) => {
      freeDailyAccumulationRules = freeRules;
      incomeCardRules = cardRules;
      updateFreeDailyAccumulationResult();
    })
    .catch(() => {
      freeDailyAccumulationView.error.textContent =
        "日常收入规则加载失败，请使用本地开发服务器打开页面。";
    });
}

function initializeEventIncomeModule() {
  eventIncomeView = {
    groups: document.querySelector("#event-income-groups"),
    currentList: document.querySelector("#current-event-income-list"),
    futureList: document.querySelector("#future-event-income-list"),
    currentEmpty: document.querySelector("#current-events-empty"),
    futureEmpty: document.querySelector("#future-events-empty"),
    message: document.querySelector("#event-income-message"),
    error: document.querySelector("#event-income-error"),
  };

  updateEventIncomeResult();

  Promise.all([
    loadEventTypes(),
    loadEvents(),
    loadResourceTypes(),
  ])
    .then(([loadedEventTypes, loadedEvents, loadedResourceTypes]) => {
      eventTypes = loadedEventTypes;
      events = loadedEvents;
      eventResourceTypes = loadedResourceTypes;
      eventIncomeState.selectedEventIds = new Set(
        getDefaultSelectedEventIds(events),
      );
      eventIncomeState.incomeRuleStates = Object.fromEntries(
        events
          .filter(
            (event) =>
              event.incomeRule?.type === "claim_then_daily",
          )
          .map((event) => [
            event.id,
            {
              initialRewardClaimed: true,
              remainingDays: 0,
            },
          ]),
      );
      eventIncomeLoadError =
        eventTypes.length === 0 || events.length === 0
          ? "没有可用的活动数据。"
          : "";
    })
    .catch(() => {
      eventTypes = [];
      events = [];
      eventResourceTypes = [];
      eventIncomeLoadError =
        "活动数据加载失败，请使用本地开发服务器打开页面。";
    })
    .finally(() => {
      eventIncomeLoading = false;
      updateEventIncomeResult();
    });
}

function initializePermanentPacksModule() {
  permanentPackView = {
    redDiamondRate: document.querySelector("#red-diamond-per-pull"),
    list: document.querySelector("#permanent-pack-list"),
    error: document.querySelector("#permanent-pack-error"),
  };

  permanentPackView.redDiamondRate.addEventListener(
    "input",
    (event) => updatePackValuationRate(event.target.value),
  );

  Promise.all([
    loadPermanentPacks(),
    loadPermanentPackRules(),
    loadResourceTypes(),
  ])
    .then(([loadedPacks, loadedRules, loadedResourceTypes]) => {
      permanentPacks = loadedPacks;
      permanentPackRules = loadedRules;
      permanentPackResourceTypes = loadedResourceTypes;
      initializePackValuationRate(
        permanentPackRules.defaultRedDiamondPerPull,
      );
      permanentPackState.quantities = Object.fromEntries(
        permanentPacks.map((pack) => [pack.id, 0]),
      );

      if (permanentPacks.length === 0) {
        permanentPackView.error.textContent =
          "没有可用的新人和等级礼包数据。";
        return;
      }

      renderPermanentPacks();
    })
    .catch(() => {
      permanentPacks = [];
      permanentPackView.list.replaceChildren();
      permanentPackView.error.textContent =
        "新人和等级礼包数据加载失败，请使用本地开发服务器打开页面。";
    });
}

function initializeEventPacksModule() {
  eventPackView = {
    redDiamondRate: document.querySelector(
      "#event-pack-red-diamond-per-pull",
    ),
    groups: document.querySelector("#event-pack-groups"),
    message: document.querySelector("#event-packs-message"),
    error: document.querySelector("#event-packs-error"),
  };

  eventPackView.redDiamondRate.addEventListener(
    "input",
    (event) => updatePackValuationRate(event.target.value),
  );

  Promise.all([
    loadEventPacks(),
    loadPermanentPackRules(),
    loadResourceTypes(),
    loadResourceInstances(),
  ])
    .then(([
      loadedEventPacks,
      loadedPackRules,
      resourceTypes,
      resourceInstances,
    ]) => {
      eventPacks = loadedEventPacks;
      permanentPackRules ??= loadedPackRules;
      initializePackValuationRate(
        permanentPackRules.defaultRedDiamondPerPull,
      );
      summaryResourceInstances = resourceInstances;
      eventPackResourceNames = new Map([
        ...resourceTypes.map((resourceType) => [
          resourceType.id,
          resourceType.name,
        ]),
        ...resourceInstances
          .filter((resource) => typeof resource.name === "string")
          .map((resource) => [resource.id, resource.name]),
      ]);
      eventPackPurchaseState.purchases =
        createEventPackPurchaseState(eventPacks);
      eventPacksLoadError =
        eventPacks.length === 0 ? "没有可用的活动礼包数据。" : "";
    })
    .catch(() => {
      eventPacks = [];
      eventPackPurchaseState.purchases = {};
      eventPacksLoadError =
        "活动礼包数据加载失败，请使用本地开发服务器打开页面。";
    })
    .finally(() => {
      eventPacksLoading = false;
      updateEventPacksResult();
      updatePreConversionSummaryResult();
    });
}

function initializeOtherModule() {
  const resourceInputs = document.querySelectorAll(
    "[data-other-resource-id]",
  );
  const error = document.querySelector("#other-error");

  resourceInputs.forEach((input) => {
    input.addEventListener("input", () => {
      const result = parseResourceAdjustment(input.value);

      input.setAttribute("aria-invalid", String(!result.valid));
      error.textContent = result.error ?? "";

      if (!result.valid) {
        return;
      }

      otherState.resources[input.dataset.otherResourceId] = result.amount;
      renderFinalResourceTotals();
    });
  });
}

function initializePreConversionSummaryModule() {
  preConversionSummaryView = {
    resources: {
      diamond: document.querySelector("#pre-conversion-diamond"),
      red_diamond: document.querySelector(
        "#pre-conversion-red-diamond",
      ),
      common_paint: document.querySelector(
        "#pre-conversion-common-paint",
      ),
      timed_paint: document.querySelector(
        "#pre-conversion-timed-paint",
      ),
      limited_paint: document.querySelector(
        "#pre-conversion-limited-paint",
      ),
    },
    availablePulls: document.querySelector("#available-pulls-total"),
    limitedPaintLabel: document.querySelector(
      "#pre-conversion-limited-paint-label",
    ),
    error: document.querySelector("#pre-conversion-error"),
  };

  updatePreConversionSummaryResult();
}

function initializeRechargeSummaryModule() {
  rechargeSummaryView = {
    rmbTotal: document.querySelector("#rmb-total"),
    eventField: document.querySelector("#recharge-event-field"),
    eventSelect: document.querySelector("#recharge-event-select"),
    eventMessage: document.querySelector("#recharge-event-message"),
    monthlyCardField: document.querySelector(
      "#monthly-card-recharge-field",
    ),
    monthlyCardQuantity: document.querySelector(
      "#monthly-card-recharge-quantity",
    ),
    monthlyCardMaximum: document.querySelector(
      "#monthly-card-recharge-maximum",
    ),
    limitedRechargeRmb: document.querySelector(
      "#limited-recharge-rmb",
    ),
    error: document.querySelector("#recharge-summary-error"),
  };

  rechargeSummaryView.eventSelect.addEventListener("change", () => {
    rechargeSummaryState.selectedRechargeEventId =
      rechargeSummaryView.eventSelect.value;
    updateRechargeSummaryResult();
  });

  rechargeSummaryView.monthlyCardQuantity.addEventListener(
    "input",
    () => {
      const result = parseInventoryAmount(
        rechargeSummaryView.monthlyCardQuantity.value,
      );
      const maximumQuantity = Number(
        rechargeSummaryView.monthlyCardQuantity.max,
      );

      if (!result.valid || result.amount > maximumQuantity) {
        rechargeSummaryView.monthlyCardQuantity.setAttribute(
          "aria-invalid",
          "true",
        );
        rechargeSummaryView.error.textContent = result.valid
          ? `月卡计入本期数量不得超过 ${maximumQuantity} 张。`
          : result.error;
        return;
      }

      rechargeSummaryView.monthlyCardQuantity.setAttribute(
        "aria-invalid",
        "false",
      );
      rechargeSummaryState.monthlyCardQuantities[
        rechargeSummaryState.selectedRechargeEventId
      ] = result.amount;
      rechargeSummaryState.monthlyCardQuantityTouched[
        rechargeSummaryState.selectedRechargeEventId
      ] = true;
      updateRechargeSummaryResult();
    },
  );

  loadRechargeEvents()
    .then((loadedRechargeEvents) => {
      rechargeEvents = loadedRechargeEvents;
      rechargeEventsLoadError = "";
    })
    .catch(() => {
      rechargeEvents = [];
      rechargeEventsLoadError =
        "限时累充数据加载失败，请使用本地开发服务器打开页面。";
    })
    .finally(() => {
      rechargeEventsLoading = false;
      updateRechargeSummaryResult();
    });

  updateRechargeSummaryResult();
}

function formatCurrencyPackContents(contents) {
  return contents
    .map(
      ({ resourceId, amount }) =>
        `${currencyPackResourceNames.get(resourceId) ?? resourceId}×${amount}`,
    )
    .join("，");
}

function formatCurrencyPackOtherContents(contents) {
  return contents
    .map(({ name, amount }) => `${name}×${amount}`)
    .join("，");
}

function synchronizeCurrencyPacks() {
  const nextCurrencyPacks = getCurrencyPacksForMonthlyCard(
    eventCurrencyPacks,
    monthlyCardCurrencyPackConfig,
    incomeCardSelections.monthlyCardSelected,
    dateSelectionState.currentDate,
    dateSelectionState.targetDate,
  );
  const nextPurchaseState = synchronizeCurrencyPackPurchaseState(
    nextCurrencyPacks,
    currencyPackPurchaseState.purchases,
    dateSelectionState.currentDate,
    dateSelectionState.targetDate,
  );

  currencyPacks = nextCurrencyPacks;
  currencyPackPurchaseState.purchases = nextPurchaseState;
}

function createCurrencyPackCard(
  currencyPack,
  valueResult,
  purchases,
) {
  const { pack } = valueResult;
  const purchase = purchases[pack.id];
  const maximumQuantity = getCurrencyPackMaximumQuantity(
    pack,
    currencyPack,
    dateSelectionState.currentDate,
    dateSelectionState.targetDate,
  );
  const card = document.createElement("article");
  const header = document.createElement("header");
  const heading = document.createElement("h4");
  const cost = document.createElement("span");
  const costName = pack.cost.resourceId === "diamond" ? "钻石" : "红钻";

  card.className = "income-card event-pack-card currency-pack-card";
  card.classList.toggle("is-selected", purchase.selected);
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-pressed", String(purchase.selected));
  heading.textContent = pack.name;
  cost.className = "permanent-pack-price";
  cost.textContent =
    `${pack.cost.amount * Math.max(1, purchase.quantity)} ${costName}`;
  header.append(heading, cost);
  card.append(header);

  if (pack.contents.length > 0) {
    const contents = document.createElement("p");
    contents.textContent =
      `抽卡资源：${formatCurrencyPackContents(pack.contents)}`;
    card.append(contents);
  }

  if (pack.otherContents.length > 0) {
    const otherContents = document.createElement("p");
    otherContents.textContent =
      `其他资源：${formatCurrencyPackOtherContents(pack.otherContents)}`;
    card.append(otherContents);
  }

  if (pack.cost.resourceId === "red_diamond") {
    const valueSummary = document.createElement("p");
    const theoreticalPulls = document.createElement("span");
    const redDiamondPerPull = document.createElement("span");

    valueSummary.className = "permanent-pack-value-summary";
    theoreticalPulls.textContent =
      `理论抽数：${valueResult.theoreticalPulls}`;
    redDiamondPerPull.textContent =
      `单抽红钻价：${valueResult.redDiamondPerPull === null
        ? "—"
        : valueResult.redDiamondPerPull.toFixed(2)}`;
    valueSummary.append(theoreticalPulls, redDiamondPerPull);
    card.append(valueSummary);
  }

  if (pack.purchaseRule.type !== "total") {
    const purchaseLimit = document.createElement("p");
    purchaseLimit.textContent =
      pack.purchaseRule.type === "weekly"
        ? `每周限购 ${pack.purchaseRule.limit} 份；当前区间最多 ${maximumQuantity} 份`
        : `每日限购 ${pack.purchaseRule.limit} 份`;
    card.append(purchaseLimit);
  }

  pack.prerequisites.forEach((prerequisiteId) => {
    const prerequisite = document.createElement("p");
    prerequisite.textContent = `需先购买：${prerequisiteId}`;
    card.append(prerequisite);
  });

  if (pack.trigger?.type === "pull_count") {
    const trigger = document.createElement("p");
    trigger.textContent = `抽卡达到 ${pack.trigger.value} 次后触发`;
    card.append(trigger);
  }

  pack.deferredRewards.forEach((reward) => {
    const deferredReward = document.createElement("p");
    const note = reward.note ? `；${reward.note}` : "";
    deferredReward.textContent =
      `购买后可获得：${reward.name}×${reward.amount}${note}`;
    card.append(deferredReward);
  });

  if (maximumQuantity > 1 && purchase.selected) {
    const quantityLabel = document.createElement("label");
    const quantityInput = document.createElement("input");

    quantityLabel.className = "permanent-pack-quantity";
    quantityLabel.append("购买数量", quantityInput);
    quantityInput.type = "number";
    quantityInput.min = "1";
    quantityInput.max = String(maximumQuantity);
    quantityInput.step = "1";
    quantityInput.value = String(purchase.quantity);
    quantityInput.addEventListener("input", () => {
      const result = updateCurrencyPackPurchase(
        currencyPacks,
        currencyPackPurchaseState.purchases,
        currencyPack.id,
        pack.id,
        true,
        Number(quantityInput.value),
        preConversionSummaryState.resources,
        dateSelectionState.currentDate,
        dateSelectionState.targetDate,
        dateSelectionState.targetBanner,
        summaryResourceInstances,
      );

      if (!result.valid) {
        currencyPackView.error.textContent = result.error;
        return;
      }

      currencyPackPurchaseState.purchases = result.purchaseState;
      updateCurrencyPacksResult();
    });
    card.append(quantityLabel);
  } else {
    const quantity = document.createElement("p");
    quantity.textContent = `购买数量：${purchase.quantity}`;
    card.append(quantity);
  }

  function togglePack() {
    const result = updateCurrencyPackPurchase(
      currencyPacks,
      currencyPackPurchaseState.purchases,
      currencyPack.id,
      pack.id,
      !purchase.selected,
      1,
      preConversionSummaryState.resources,
      dateSelectionState.currentDate,
      dateSelectionState.targetDate,
      dateSelectionState.targetBanner,
      summaryResourceInstances,
    );

    if (!result.valid) {
      currencyPackView.error.textContent = result.error;
      return;
    }

    currencyPackPurchaseState.purchases = result.purchaseState;
    updateCurrencyPacksResult();
  }

  card.addEventListener("click", (event) => {
    if (event.target.closest("input, label")) {
      return;
    }

    togglePack();
  });
  card.addEventListener("keydown", (event) => {
    if (
      event.target === card &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      togglePack();
    }
  });

  return card;
}

function renderCurrencyPackGroups(displayableCurrencyPacks) {
  currencyPackView.groups.replaceChildren();

  displayableCurrencyPacks.forEach((currencyPack, index) => {
    const group = document.createElement("section");
    const heading = document.createElement("h3");
    const headingId = `currency-pack-group-${index}`;
    const groups = groupCurrencyPackItems(
      currencyPack,
      dateSelectionState.targetDate,
      dateSelectionState.targetBanner,
      summaryResourceInstances,
    );
    const purchases =
      currencyPackPurchaseState.purchases[currencyPack.id];

    group.className = "event-pack-group currency-pack-group";
    group.setAttribute("aria-labelledby", headingId);
    heading.id = headingId;
    heading.textContent = currencyPack.name;
    group.append(heading);

    if (currencyPack.source === "monthly_card") {
      const list = document.createElement("div");

      list.className = "event-pack-card-grid";
      groups.diamond.forEach((valueResult) => {
        list.append(
          createCurrencyPackCard(currencyPack, valueResult, purchases),
        );
      });
      group.append(list);
      currencyPackView.groups.append(group);
      return;
    }

    [
      ["diamond", "钻石礼包"],
      ["red_diamond", "红钻礼包"],
    ].forEach(([resourceId, label]) => {
      const typeGroup = document.createElement("section");
      const typeHeading = document.createElement("h4");
      const list = document.createElement("div");

      typeGroup.className = "currency-pack-type-group";
      typeHeading.textContent = label;
      list.className = "event-pack-card-grid";
      groups[resourceId].forEach((valueResult) => {
        list.append(
          createCurrencyPackCard(currencyPack, valueResult, purchases),
        );
      });
      typeGroup.append(typeHeading, list);
      group.append(typeGroup);
    });

    currencyPackView.groups.append(group);
  });
}

function updateCurrencyPacksResult() {
  if (!currencyPackView) {
    return;
  }

  synchronizeCurrencyPacks();
  currencyPackView.groups.replaceChildren();
  currencyPackView.error.textContent = "";
  currencyPackPurchaseState.costs = { diamond: 0, red_diamond: 0 };
  currencyPackPurchaseState.rewards = {};
  currencyPackPurchaseState.resources = {
    ...preConversionSummaryState.resources,
  };
  renderFinalResourceTotals();

  if (currencyPacksLoading) {
    currencyPackView.message.textContent =
      "正在加载钻石 / 红钻礼包数据。";
    return;
  }

  if (currencyPacksLoadError) {
    currencyPackView.message.textContent = "";
    currencyPackView.error.textContent = currencyPacksLoadError;
    return;
  }

  const displayableCurrencyPacks = getDisplayableCurrencyPacks(
    currencyPacks,
    dateSelectionState.currentDate,
    dateSelectionState.targetDate,
  );

  if (displayableCurrencyPacks.length === 0) {
    currencyPackView.message.textContent =
      "当前计算区间没有可购买的钻石 / 红钻礼包。";
    return;
  }

  const result = calculateCurrencyPackPurchaseSummary(
    currencyPacks,
    currencyPackPurchaseState.purchases,
    preConversionSummaryState.resources,
    dateSelectionState.currentDate,
    dateSelectionState.targetDate,
    dateSelectionState.targetBanner,
    summaryResourceInstances,
  );
  currencyPackPurchaseState.purchases = result.purchaseState;
  currencyPackPurchaseState.costs = result.costs;
  currencyPackPurchaseState.rewards = result.rewards;
  currencyPackPurchaseState.resources = result.resources;
  renderFinalResourceTotals();
  currencyPackView.message.textContent = "";
  renderCurrencyPackGroups(displayableCurrencyPacks);

  if (!result.valid) {
    currencyPackView.error.textContent = result.error;
    return;
  }

}

function initializeCurrencyPacksModule() {
  currencyPackView = {
    groups: document.querySelector("#currency-pack-groups"),
    message: document.querySelector("#currency-packs-message"),
    error: document.querySelector("#currency-packs-error"),
  };

  Promise.all([
    loadCurrencyPacks(),
    loadIncomeCardRules(),
    loadResourceTypes(),
    loadResourceInstances(),
  ])
    .then(([
      loadedCurrencyPacks,
      loadedIncomeCardRules,
      resourceTypes,
      resourceInstances,
    ]) => {
      eventCurrencyPacks = loadedCurrencyPacks;
      monthlyCardCurrencyPackConfig =
        loadedIncomeCardRules.monthlyCard.weeklyDiscountCurrencyPack;
      summaryResourceInstances = resourceInstances;
      currencyPackResourceNames = new Map([
        ...resourceTypes.map((resourceType) => [
          resourceType.id,
          resourceType.name,
        ]),
        ...resourceInstances
          .filter((resource) => typeof resource.name === "string")
          .map((resource) => [resource.id, resource.name]),
      ]);
      synchronizeCurrencyPacks();
      currencyPacksLoadError =
        eventCurrencyPacks.length === 0
          ? "没有可用的钻石 / 红钻礼包数据。"
          : "";
    })
    .catch(() => {
      currencyPacks = [];
      eventCurrencyPacks = [];
      monthlyCardCurrencyPackConfig = null;
      currencyPackPurchaseState.purchases = {};
      currencyPacksLoadError =
        "钻石 / 红钻礼包数据加载失败，请使用本地开发服务器打开页面。";
    })
    .finally(() => {
      currencyPacksLoading = false;
      updateCurrencyPacksResult();
    });
}

function initializeUserGuideModule() {
  const toggle = document.querySelector("#user-guide-toggle");
  const modal = document.querySelector("#user-guide-modal");
  const backdrop = modal.querySelector(".user-guide-backdrop");
  const closeButton = document.querySelector("#user-guide-close");
  const body = document.querySelector("#user-guide-body");
  let isLoaded = false;
  let loadPromise = null;

  function loadUserGuide() {
    body.textContent = "正在加载使用说明……";
    loadPromise = fetch("docs/user-guide.html")
      .then((response) => {
        if (!response.ok) {
          throw new Error("使用说明加载失败");
        }

        return response.text();
      })
      .then((html) => {
        body.innerHTML = html;
        isLoaded = true;
      })
      .catch(() => {
        body.textContent = "使用说明加载失败，请稍后重试。";
        loadPromise = null;
      });
  }

  function openUserGuide() {
    modal.hidden = false;
    document.body.classList.add("user-guide-modal-open");
    closeButton.focus();

    if (!isLoaded && loadPromise === null) {
      loadUserGuide();
    }
  }

  function closeUserGuide() {
    modal.hidden = true;
    document.body.classList.remove("user-guide-modal-open");
    toggle.focus();
  }

  toggle.addEventListener("click", openUserGuide);
  closeButton.addEventListener("click", closeUserGuide);
  backdrop.addEventListener("click", closeUserGuide);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeUserGuide();
    }
  });
}

if (typeof document !== "undefined") {
  initializeUserGuideModule();
  initializeDateModule();
  initializeInventoryModule();
  initializeFreeDailyAccumulationModule();
  initializeEventIncomeModule();
  initializePermanentPacksModule();
  initializeEventPacksModule();
  initializeOtherModule();
  initializePreConversionSummaryModule();
  initializeRechargeSummaryModule();
  initializeCurrencyPacksModule();
}
