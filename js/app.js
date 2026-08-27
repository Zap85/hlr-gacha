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
};
let freeDailyAccumulationRules = null;
let freeDailyAccumulationView = null;

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

function updateFreeDailyAccumulationResult() {
  if (!freeDailyAccumulationView) {
    return;
  }

  const outputs = [
    freeDailyAccumulationView.dailyTasks,
    freeDailyAccumulationView.weeklyShares,
    freeDailyAccumulationView.monthlySignIns,
  ];

  if (!freeDailyAccumulationRules) {
    outputs.forEach((output) => {
      output.textContent = "—";
    });
    return;
  }

  const result = calculateFreeDailyAccumulation(
    dateSelectionState.currentDate,
    dateSelectionState.targetDate,
    freeDailyAccumulationRules,
  );

  if (!result.valid) {
    outputs.forEach((output) => {
      output.textContent = "—";
    });
    freeDailyAccumulationView.error.textContent = result.error;
    return;
  }

  freeDailyAccumulationView.dailyTasks.textContent =
    `${result.dailyTasks.days} 天 × ${freeDailyAccumulationRules.dailyTaskDiamonds} 钻，共 ${result.dailyTasks.diamonds} 钻`;
  freeDailyAccumulationView.weeklyShares.textContent =
    `${result.weeklyShares.count} 次 × ${freeDailyAccumulationRules.weeklyShare.diamonds} 钻，共 ${result.weeklyShares.diamonds} 钻`;
  freeDailyAccumulationView.monthlySignIns.textContent =
    `共 ${result.monthlySignIns.diamonds} 钻，${result.monthEndRewards.commonPaint} 个老荷兰颜料`;
  freeDailyAccumulationView.error.textContent = "";
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
    updateFreeDailyAccumulationResult();

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
        });
        removeButton.addEventListener("click", () => {
          removeLimitedInventoryResource(resourceId);
          renderLimitedInventoryList();
          renderLimitedResourceOptions();
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
      initializeLimitedInventory(resources);
      dynamicInventoryError.textContent = "";
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
  freeDailyAccumulationView = {
    dailyTasks: document.querySelector("#daily-task-result"),
    weeklyShares: document.querySelector("#weekly-share-result"),
    monthlySignIns: document.querySelector("#monthly-sign-in-result"),
    error: document.querySelector("#free-accumulation-error"),
  };

  loadFreeDailyAccumulationRules()
    .then((rules) => {
      freeDailyAccumulationRules = rules;
      updateFreeDailyAccumulationResult();
    })
    .catch(() => {
      freeDailyAccumulationView.error.textContent =
        "日常收入规则加载失败，请使用本地开发服务器打开页面。";
    });
}

if (typeof document !== "undefined") {
  initializeDateModule();
  initializeInventoryModule();
  initializeFreeDailyAccumulationModule();
}
