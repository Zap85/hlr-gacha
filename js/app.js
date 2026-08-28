"use strict";

const inventoryState = {
  fixedResources: {},
  timedPaintTotals: {},
  limitedPaintResources: {},
};
const limitedResourceIds = new Set();
const dateSelectionState = {
  currentDate: "",
  targetDate: "",
  targetMode: "banner",
  targetBanner: null,
};
const incomeCardSelections = {
  monthlyCardSelected: false,
  monthlyCardAdjustment: 0,
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
  limitedRechargeRmb: 0,
};
let freeDailyAccumulationRules = null;
let freeDailyAccumulationView = null;
let incomeCardRules = null;
let incomeCardView = null;
const eventIncomeState = {
  selectedEventIds: new Set(),
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
const eventPackPurchaseState = {
  purchases: {},
  resources: {},
  totalPrice: 0,
  limitedRechargePrice: 0,
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
  limitedResourceIds.clear();

  resources
    .filter((resource) => resource.category === "limited_paint")
    .forEach((resource) => limitedResourceIds.add(resource.id));

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

function addLimitedInventoryResource(resourceId, value) {
  if (!limitedResourceIds.has(resourceId)) {
    return { valid: false, amount: null, error: "请选择限定老荷兰。" };
  }

  if (
    Object.prototype.hasOwnProperty.call(
      inventoryState.limitedPaintResources,
      resourceId,
    )
  ) {
    return { valid: false, amount: null, error: "该限定老荷兰已添加。" };
  }

  const result = parseInventoryAmount(value);

  if (result.valid) {
    inventoryState.limitedPaintResources[resourceId] = result.amount;
  }

  return result;
}

function removeLimitedInventoryResource(resourceId) {
  return delete inventoryState.limitedPaintResources[resourceId];
}

function getInventoryResourceSources() {
  return [
    inventoryState.fixedResources,
    inventoryState.timedPaintTotals,
    inventoryState.limitedPaintResources,
  ];
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
    resourceAdjustments: otherState.resources,
    paymentSources: [
      {
        amount: dailyIncomeState.rmbTotal,
        limitedRechargeAmount: dailyIncomeState.limitedRechargeRmb,
      },
      ...permanentPackState.purchases.map((purchase) => ({
        amount: purchase.price,
        countsTowardLimitedRecharge:
          purchase.countsTowardLimitedRecharge,
      })),
      {
        amount: eventPackPurchaseState.totalPrice,
        limitedRechargeAmount:
          eventPackPurchaseState.limitedRechargePrice,
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

  Object.entries(preConversionSummaryView.resources).forEach(
    ([resourceId, output]) => {
      output.textContent = String(result.resources[resourceId]);
    },
  );
  preConversionSummaryView.rmbTotal.textContent = `¥${result.rmbTotal}`;
  preConversionSummaryView.limitedRechargeRmb.textContent =
    `¥${result.limitedRechargeRmb}`;
  preConversionSummaryView.error.textContent = "";
}

function updateFreeDailyAccumulationResult() {
  if (!freeDailyAccumulationView) {
    return;
  }

  dailyIncomeState.resources = {};
  dailyIncomeState.rmbTotal = 0;
  dailyIncomeState.limitedRechargeRmb = 0;
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
        incomeCardView.monthlyBaseCount,
        incomeCardView.monthlyActualCount,
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
  incomeCardView.monthlyBaseCount.textContent =
    `${cardResult.monthlyCard.basePurchases} 张`;
  incomeCardView.monthlyActualCount.textContent =
    `${cardResult.monthlyCard.actualPurchases} 张`;
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
  dailyIncomeState.limitedRechargeRmb =
    cardResult.monthlyCard.countsTowardLimitedRecharge
      ? cardResult.monthlyCard.purchaseAmountRmb
      : 0;
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
  const heading = document.createElement("h3");
  const income = document.createElement("p");
  const incomeLabel = getEventIncomeLabel(event.status);

  card.className = "income-card event-income-card";
  card.classList.toggle("is-selected", event.selected);
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-pressed", String(event.selected));
  heading.textContent = event.eventName;
  income.textContent = `${incomeLabel}：${formatEventResources(event.resources)}`;
  card.append(heading, income);

  function toggleEvent() {
    if (eventIncomeState.selectedEventIds.has(event.eventId)) {
      eventIncomeState.selectedEventIds.delete(event.eventId);
    } else {
      eventIncomeState.selectedEventIds.add(event.eventId);
    }

    updateEventIncomeResult();
  }

  card.addEventListener("click", toggleEvent);
  card.addEventListener("keydown", (keyboardEvent) => {
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
      dateSelectionState.targetDate,
      events,
      eventTypes,
      [...eventIncomeState.selectedEventIds],
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
    dateSelectionState.targetDate,
    events,
    eventTypes,
    [...eventIncomeState.selectedEventIds],
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

  const redDiamondPerPull = Number(permanentPackView.redDiamondRate.value);
  const displayResult = getDisplayablePermanentPacks(
    permanentPacks,
    redDiamondPerPull,
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
    const theoreticalPulls = document.createElement("p");
    const pricePerPull = document.createElement("p");
    const purchasePrice = document.createElement("p");

    card.className = "income-card permanent-pack-card";
    card.classList.toggle("is-selected", quantity > 0);
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-pressed", String(quantity > 0));
    heading.textContent = pack.name;
    price.className = "permanent-pack-price";
    price.textContent = `¥${pack.price}`;
    header.append(heading, price);
    contents.textContent =
      `抽卡相关资源：${formatPermanentPackContents(pack.contents)}`;
    theoreticalPulls.textContent =
      `理论抽数：${result.theoreticalPulls.toFixed(2)}`;
    pricePerPull.textContent =
      `理论元/抽：¥${result.pricePerPull.toFixed(2)}`;
    purchasePrice.textContent = `购买金额：¥${pack.price * quantity}`;
    card.append(
      header,
      contents,
      theoreticalPulls,
      pricePerPull,
      purchasePrice,
    );

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

function createEventPackCard(eventPack, pack, purchases) {
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
  const purchaseRule = document.createElement("p");

  card.className = "income-card event-pack-card";
  card.classList.toggle("is-selected", purchase.selected);
  card.classList.toggle("is-disabled", disabled);
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-pressed", String(purchase.selected));
  card.setAttribute("aria-disabled", String(disabled));
  heading.textContent = pack.name;
  price.className = "permanent-pack-price";
  price.textContent = `¥${pack.price}`;
  header.append(heading, price);
  contents.textContent =
    `抽卡相关资源：${formatEventPackContents(pack.contents)}`;
  purchaseRule.textContent =
    pack.purchaseRule.type === "daily"
      ? `每日限购 ${pack.purchaseRule.limit} 次；当前区间最多 ${maximumQuantity} 份`
      : `活动期间限购 ${pack.purchaseRule.limit} 次`;
  card.append(header, contents);

  if (pack.otherContents.length > 0) {
    const otherContents = document.createElement("p");
    otherContents.textContent =
      `其他奖励：${formatEventPackOtherContents(pack.otherContents)}`;
    card.append(otherContents);
  }

  card.append(purchaseRule);

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
    eventPack.packs.forEach((pack) => {
      list.append(createEventPackCard(eventPack, pack, purchases));
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
  eventPackView.summary.hidden = true;
  eventPackView.error.textContent = "";
  eventPackPurchaseState.resources = {};
  eventPackPurchaseState.totalPrice = 0;
  eventPackPurchaseState.limitedRechargePrice = 0;
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
  eventPackPurchaseState.limitedRechargePrice =
    summary.limitedRechargePrice;
  updatePreConversionSummaryResult();
  const displayableEventPacks = getDisplayableEventPacks(
    eventPacks,
    dateSelectionState.targetDate,
  );

  if (displayableEventPacks.length === 0) {
    eventPackView.message.textContent =
      "当前目标日期没有可计入的活动礼包。";
    return;
  }

  eventPackView.message.textContent = "";
  eventPackView.summary.hidden = false;
  eventPackView.totalPrice.textContent = `¥${summary.totalPrice}`;
  eventPackView.limitedRechargePrice.textContent =
    `¥${summary.limitedRechargePrice}`;
  eventPackView.resources.textContent = formatEventPackContents(
    Object.entries(summary.resources).map(([resourceId, amount]) => ({
      resourceId,
      amount,
    })),
  );
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
  const bannerDateRange = document.querySelector("#banner-date-range");
  const customTargetField = document.querySelector("#custom-target-field");
  const customTargetDateInput = document.querySelector("#custom-target-date");
  const actualTargetDate = document.querySelector("#actual-target-date");
  const calculatedDays = document.querySelector("#calculated-days");
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
    updateFreeDailyAccumulationResult();
    updateEventIncomeResult();
    updateEventPacksResult();
    updatePreConversionSummaryResult();

    actualTargetDate.textContent = targetDate || "—";
    calculatedDays.textContent = "—";

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

    calculatedDays.textContent = `${result.days} 天`;
    dateError.textContent = "";
  }

  function updateBannerDateRange() {
    const banner = getSelectedBanner();
    bannerDateRange.textContent = banner
      ? `${banner.startDate} ～ ${banner.endDate}`
      : "—";
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

    if (banners.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "无可用卡池";
      bannerSelect.append(option);
      return;
    }

    banners.forEach((banner) => {
      const option = document.createElement("option");
      option.value = banner.id;
      option.textContent = banner.name;
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
    updateBannerDateRange();
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
      updateBannerDateRange();
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
  const limitedResourceSelect = document.querySelector(
    "#limited-resource-select",
  );
  const limitedResourceAmount = document.querySelector(
    "#limited-resource-amount",
  );
  const addLimitedResourceButton = document.querySelector(
    "#add-limited-resource",
  );
  const limitedInventoryList = document.querySelector(
    "#limited-inventory-list",
  );
  const inventoryError = document.querySelector("#inventory-error");
  const limitedAddError = document.querySelector("#limited-add-error");
  const dynamicInventoryError = document.querySelector(
    "#dynamic-inventory-error",
  );
  let limitedResourceDefinitions = [];

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
      (resourceType) => resourceType.name,
      () => "请填写可用于当前目标的限时老荷兰数量",
    );
  }

  function getApplicabilityDescription(resource) {
    const values = resource.applicability.values.join("、");
    return resource.applicability.type === "banner_id"
      ? `适用卡池：${values}`
      : `适用卡池标签：${values}`;
  }

  function renderLimitedResourceOptions() {
    const availableResources = limitedResourceDefinitions.filter(
      (resource) =>
        !Object.prototype.hasOwnProperty.call(
          inventoryState.limitedPaintResources,
          resource.id,
        ),
    );

    limitedResourceSelect.replaceChildren();

    if (availableResources.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "没有可添加的限定老荷兰";
      limitedResourceSelect.append(option);
      limitedResourceSelect.disabled = true;
      limitedResourceAmount.disabled = true;
      addLimitedResourceButton.disabled = true;
      return;
    }

    availableResources.forEach((resource) => {
      const option = document.createElement("option");
      option.value = resource.id;
      option.textContent = resource.name;
      limitedResourceSelect.append(option);
    });

    limitedResourceSelect.disabled = false;
    limitedResourceAmount.disabled = false;
    addLimitedResourceButton.disabled = false;
  }

  function renderLimitedInventoryList() {
    limitedInventoryList.replaceChildren();

    Object.entries(inventoryState.limitedPaintResources).forEach(
      ([resourceId, amount], index) => {
        const resource = limitedResourceDefinitions.find(
          (item) => item.id === resourceId,
        );
        const item = document.createElement("div");
        const label = document.createElement("label");
        const labelText = document.createElement("span");
        const description = document.createElement("span");
        const input = document.createElement("input");
        const error = document.createElement("small");
        const removeButton = document.createElement("button");
        const inputId = `limited-inventory-${index}`;
        const errorId = `${inputId}-error`;

        item.className = "inventory-item";
        label.className = "inventory-field";
        labelText.textContent = resource.name;
        description.className = "inventory-description";
        description.textContent = getApplicabilityDescription(resource);
        input.id = inputId;
        input.type = "number";
        input.min = "0";
        input.step = "1";
        input.value = amount ?? "";
        input.setAttribute("aria-describedby", errorId);
        error.id = errorId;
        error.className = "inventory-input-error";
        removeButton.type = "button";
        removeButton.textContent = "删除";

        input.addEventListener("input", () => {
          const result = updateInventoryAmount(
            "limitedPaintResources",
            resourceId,
            input.value,
          );

          error.textContent = result.error ?? "";
          input.setAttribute("aria-invalid", String(!result.valid));

          if (result.valid) {
            updatePreConversionSummaryResult();
          }
        });
        removeButton.addEventListener("click", () => {
          removeLimitedInventoryResource(resourceId);
          renderLimitedInventoryList();
          renderLimitedResourceOptions();
          updatePreConversionSummaryResult();
        });

        label.append(labelText, description, input, error);
        item.append(label, removeButton);
        limitedInventoryList.append(item);
      },
    );
  }

  function initializeLimitedInventory(resources) {
    limitedResourceDefinitions = resources.filter(
      (resource) => resource.category === "limited_paint",
    );

    initializeLimitedInventoryState(limitedResourceDefinitions);
    renderLimitedResourceOptions();
    renderLimitedInventoryList();
  }

  addLimitedResourceButton.addEventListener("click", () => {
    const result = addLimitedInventoryResource(
      limitedResourceSelect.value,
      limitedResourceAmount.value,
    );

    limitedAddError.textContent = result.error ?? "";

    if (!result.valid) {
      return;
    }

    limitedResourceAmount.value = "0";
    renderLimitedInventoryList();
    renderLimitedResourceOptions();
    updatePreConversionSummaryResult();
  });

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
      initializeLimitedInventory(resources);
      dynamicInventoryError.textContent = "";
      updatePreConversionSummaryResult();
    })
    .catch(() => {
      limitedResourceSelect.replaceChildren();
      limitedResourceSelect.disabled = true;
      limitedResourceAmount.disabled = true;
      addLimitedResourceButton.disabled = true;
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
    monthlyAdjustment: document.querySelector("#monthly-card-adjustment"),
    monthlyCost: document.querySelector("#monthly-card-cost"),
    monthlyDaily: document.querySelector("#monthly-card-daily"),
    monthlyPurchase: document.querySelector("#monthly-card-purchase"),
    monthlyBaseCount: document.querySelector("#monthly-card-base-count"),
    monthlyActualCount: document.querySelector("#monthly-card-actual-count"),
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

  incomeCardView.monthlyAdjustment.addEventListener("input", () => {
    const value = incomeCardView.monthlyAdjustment.value;
    const adjustment = value === "" ? 0 : Number(value);

    if (!Number.isInteger(adjustment)) {
      incomeCardView.error.textContent = "月卡调整值必须是整数。";
      return;
    }

    incomeCardSelections.monthlyCardAdjustment = adjustment;
    updateFreeDailyAccumulationResult();
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
    renderPermanentPacks,
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
      permanentPackView.redDiamondRate.value =
        String(permanentPackRules.defaultRedDiamondPerPull);
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
    groups: document.querySelector("#event-pack-groups"),
    message: document.querySelector("#event-packs-message"),
    summary: document.querySelector("#event-pack-summary"),
    totalPrice: document.querySelector("#event-pack-total-price"),
    limitedRechargePrice: document.querySelector(
      "#event-pack-limited-recharge-price",
    ),
    resources: document.querySelector("#event-pack-resource-summary"),
    error: document.querySelector("#event-packs-error"),
  };

  Promise.all([
    loadEventPacks(),
    loadResourceTypes(),
    loadResourceInstances(),
  ])
    .then(([loadedEventPacks, resourceTypes, resourceInstances]) => {
      eventPacks = loadedEventPacks;
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
      updatePreConversionSummaryResult();
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
    rmbTotal: document.querySelector("#pre-conversion-rmb-total"),
    limitedRechargeRmb: document.querySelector(
      "#pre-conversion-limited-recharge-rmb",
    ),
    error: document.querySelector("#pre-conversion-error"),
  };

  updatePreConversionSummaryResult();
}

if (typeof document !== "undefined") {
  initializeDateModule();
  initializeInventoryModule();
  initializeFreeDailyAccumulationModule();
  initializeEventIncomeModule();
  initializePermanentPacksModule();
  initializeEventPacksModule();
  initializeOtherModule();
  initializePreConversionSummaryModule();
}
