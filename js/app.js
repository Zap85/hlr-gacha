"use strict";

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

if (typeof document !== "undefined") {
  initializeDateModule();
}
