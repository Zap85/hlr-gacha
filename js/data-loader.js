"use strict";

const BANNER_PATHS = ["data/banners/sample-banner.json"];
const RESOURCE_TYPES_PATH = "data/resources/resource-types.json";
const RESOURCE_INSTANCES_PATH = "data/resources/sample-resources.json";

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
