"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

const eventTypeData = JSON.parse(
  readProjectFile(path.join("data", "events", "event-types.json")),
);
const eventData = JSON.parse(
  readProjectFile(path.join("data", "events", "events.json")),
);
const eventTypes = eventTypeData.eventTypes;
const events = eventData.events;
const calculatorContext = vm.createContext({ Date });

vm.runInContext(
  readProjectFile(path.join("js", "calculator.js")),
  calculatorContext,
);

const calculateEventIncome = vm.runInContext(
  "calculateEventIncome",
  calculatorContext,
);
const calculateSelectedEventIncome = vm.runInContext(
  "calculateSelectedEventIncome",
  calculatorContext,
);
const getDefaultSelectedEventIds = vm.runInContext(
  "getDefaultSelectedEventIds",
  calculatorContext,
);

const eventTypeIds = new Set(eventTypes.map((eventType) => eventType.id));
assert.equal(new Set(events.map((event) => event.id)).size, events.length);
assert.equal(
  events.every(
    (event) =>
      typeof event.name === "string" &&
      event.name.trim() !== "" &&
      event.startDate <= event.endDate &&
      eventTypeIds.has(event.type) &&
      ["available", "complete"].every(
        (phase) =>
          event.incomeAdjustment[phase] !== null &&
          typeof event.incomeAdjustment[phase] === "object" &&
          !Array.isArray(event.incomeAdjustment[phase]) &&
          Object.entries(event.incomeAdjustment[phase]).every(
            ([resourceId, amount]) =>
              resourceId.trim() !== "" && Number.isSafeInteger(amount),
          ),
      ),
  ),
  true,
);
assert.equal(events.every((event) => eventTypeIds.has(event.type)), true);
assert.equal(
  events.every((event) => ["current", "future"].includes(event.status)),
  true,
);

const rerunEvent = events.find((event) => event.id === "庄园诡戏");
const soloEvent = events.find((event) => event.id === "怪谈：电子");
const anniversaryWarmup = events.find((event) => event.id === "六周年预热");
const anniversaryCelebration = events.find(
  (event) => event.id === "六周年庆典",
);
const anniversaryWineCard = events.find(
  (event) => event.id === "六周年圣酒月卡",
);
const fivePersonEventType = eventTypes.find(
  (eventType) => eventType.id === "五人活动",
);
assert.deepEqual(
  JSON.parse(JSON.stringify(fivePersonEventType)),
  {
    id: "五人活动",
    available: { diamond: 300, common_paint: 1, timed_paint: 4 },
    complete: { diamond: 1266, common_paint: 3, timed_paint: 14 },
  },
);
assert.equal(anniversaryWarmup.type, "五人活动");
assert.equal(anniversaryWarmup.startDate, "2026-09-19");
assert.equal(anniversaryWarmup.endDate, "2026-10-12");
assert.equal(anniversaryCelebration.type, "五人活动");
assert.equal(anniversaryWineCard.type, "持续签到活动");
assert.equal(anniversaryWineCard.startDate, "2026-09-20");
assert.equal(anniversaryWineCard.endDate, "2026-10-23");
assert.deepEqual(
  JSON.parse(JSON.stringify(anniversaryWineCard.incomeRule)),
  {
    type: "claim_then_daily",
    maxDays: 24,
    initialReward: { diamond: 300 },
    dailyReward: { diamond: 50 },
  },
);

const beforeStart = calculateEventIncome(
  "2026-08-01",
  "2026-08-25",
  rerunEvent,
  eventTypes,
);
assert.equal(beforeStart.valid, true);
assert.equal(beforeStart.eligible, false);
assert.equal(Object.keys(beforeStart.resources).length, 0);

const availableAtStart = calculateEventIncome(
  "2026-08-01",
  "2026-08-26",
  rerunEvent,
  eventTypes,
);
assert.equal(availableAtStart.phase, "available");
assert.equal(availableAtStart.status, "current");
assert.equal(availableAtStart.resources.diamond, 50);
assert.equal(availableAtStart.resources.common_paint, 3);

const completeAtEnd = calculateEventIncome(
  "2026-08-01",
  "2026-09-02",
  rerunEvent,
  eventTypes,
);
assert.equal(completeAtEnd.phase, "complete");
assert.equal(completeAtEnd.resources.diamond, 200);
assert.equal(completeAtEnd.resources.common_paint, 3);

const adjustedEvent = {
  ...rerunEvent,
  incomeAdjustment: {
    available: {
      diamond: -20,
      common_paint: 2,
      red_diamond: 10,
    },
    complete: {
      diamond: 25,
      common_paint: -1,
    },
  },
  exchanges: [
    {
      cost: { diamond: 9999 },
      reward: { common_paint: 9999 },
    },
  ],
};
const adjustedAvailable = calculateEventIncome(
  "2026-08-27",
  "2026-08-30",
  adjustedEvent,
  eventTypes,
);
assert.equal(adjustedAvailable.resources.diamond, 30);
assert.equal(adjustedAvailable.resources.common_paint, 5);
assert.equal(adjustedAvailable.resources.red_diamond, 10);

const adjustedComplete = calculateEventIncome(
  "2026-08-01",
  "2026-09-03",
  adjustedEvent,
  eventTypes,
);
assert.equal(adjustedComplete.resources.diamond, 225);
assert.equal(adjustedComplete.resources.common_paint, 2);
assert.equal(Object.keys(adjustedComplete.resources).length, 2);

const soloAvailable = calculateEventIncome(
  "2026-08-01",
  "2026-08-15",
  soloEvent,
  eventTypes,
);
const soloComplete = calculateEventIncome(
  "2026-08-01",
  "2026-08-16",
  soloEvent,
  eventTypes,
);
assert.equal(soloAvailable.phase, "available");
assert.equal(soloAvailable.resources.diamond, 40);
assert.equal(soloComplete.phase, "complete");
assert.equal(soloComplete.resources.diamond, 360);

const eventDateScenarios = [
  {
    currentDate: "2026-08-30",
    targetDate: "2026-08-26",
    eligible: true,
    phase: "available",
  },
  {
    currentDate: "2026-08-30",
    targetDate: "2026-09-01",
    eligible: true,
    phase: "available",
  },
  {
    currentDate: "2026-08-30",
    targetDate: "2026-09-02",
    eligible: true,
    phase: "complete",
  },
  {
    currentDate: "2026-08-30",
    targetDate: "2026-10-01",
    eligible: true,
    phase: "complete",
  },
  {
    currentDate: "2026-09-03",
    targetDate: "2026-10-01",
    eligible: false,
    phase: null,
  },
  {
    currentDate: "2026-08-01",
    targetDate: "2026-08-20",
    eligible: false,
    phase: null,
  },
];

eventDateScenarios.forEach((scenario) => {
  const result = calculateEventIncome(
    scenario.currentDate,
    scenario.targetDate,
    rerunEvent,
    eventTypes,
  );

  assert.equal(result.valid, true);
  assert.equal(result.eligible, scenario.eligible);
  assert.equal(result.phase, scenario.phase);
});

const defaultSelectedIds = Array.from(getDefaultSelectedEventIds(events));
assert.equal(defaultSelectedIds.includes("庄园诡戏"), false);
assert.deepEqual(
  defaultSelectedIds.slice().sort(),
  events
    .filter((event) => !event.isRerun)
    .map((event) => event.id)
    .sort(),
);

const warmupAvailable = calculateEventIncome(
  "2026-09-19",
  "2026-09-19",
  anniversaryWarmup,
  eventTypes,
);
const warmupComplete = calculateEventIncome(
  "2026-09-19",
  "2026-10-12",
  anniversaryWarmup,
  eventTypes,
);
assert.deepEqual(
  JSON.parse(JSON.stringify(warmupAvailable.resources)),
  { diamond: 160, common_paint: 1, timed_paint: 17 },
);
assert.deepEqual(
  JSON.parse(JSON.stringify(warmupComplete.resources)),
  { diamond: 160, common_paint: 1, timed_paint: 17 },
);

const celebrationAvailable = calculateEventIncome(
  "2026-09-23",
  "2026-09-24",
  anniversaryCelebration,
  eventTypes,
);
const celebrationComplete = calculateEventIncome(
  "2026-09-23",
  "2026-10-12",
  anniversaryCelebration,
  eventTypes,
);
assert.deepEqual(
  JSON.parse(JSON.stringify(celebrationAvailable.resources)),
  { diamond: 300, common_paint: 1, timed_paint: 4 },
);
assert.deepEqual(
  JSON.parse(JSON.stringify(celebrationComplete.resources)),
  { diamond: 1266, common_paint: 3, timed_paint: 14 },
);

const unclaimedInWindow = calculateEventIncome(
  "2026-09-20",
  "2026-09-20",
  anniversaryWineCard,
  eventTypes,
  { initialRewardClaimed: false, remainingDays: 24 },
  false,
);
assert.equal(unclaimedInWindow.resources.diamond, 300);
assert.equal(unclaimedInWindow.dailyRewardDays, 0);

const beforeStartWineCard = calculateEventIncome(
  "2026-09-18",
  "2026-09-21",
  anniversaryWineCard,
  eventTypes,
  { initialRewardClaimed: false, remainingDays: 24 },
  false,
);
assert.equal(beforeStartWineCard.status, "future");
assert.equal(beforeStartWineCard.resources.diamond, 350);
assert.equal(beforeStartWineCard.dailyRewardDays, 1);

const claimedWineCard = calculateEventIncome(
  "2026-09-20",
  "2026-09-21",
  anniversaryWineCard,
  eventTypes,
  { initialRewardClaimed: true, remainingDays: 23 },
  true,
);
assert.equal(claimedWineCard.resources.diamond, 50);

const fullRemainingToday = calculateEventIncome(
  "2026-09-20",
  "2026-09-20",
  anniversaryWineCard,
  eventTypes,
  { initialRewardClaimed: true, remainingDays: 24 },
  false,
);
assert.equal(fullRemainingToday.resources.diamond, 0);
assert.equal(fullRemainingToday.dailyRewardDays, 0);

const partialRemainingTodayClaimed = calculateEventIncome(
  "2026-09-20",
  "2026-09-20",
  anniversaryWineCard,
  eventTypes,
  { initialRewardClaimed: true, remainingDays: 23 },
  true,
);
const partialRemainingTodayUnclaimed = calculateEventIncome(
  "2026-09-20",
  "2026-09-20",
  anniversaryWineCard,
  eventTypes,
  { initialRewardClaimed: true, remainingDays: 23 },
  false,
);
assert.equal(partialRemainingTodayClaimed.resources.diamond, 0);
assert.equal(partialRemainingTodayUnclaimed.resources.diamond, 50);

const zeroRemainingWineCard = calculateEventIncome(
  "2026-09-20",
  "2026-10-23",
  anniversaryWineCard,
  eventTypes,
  { initialRewardClaimed: true, remainingDays: 0 },
  false,
);
assert.equal(zeroRemainingWineCard.resources.diamond, 0);

const maximumDailyWineCard = calculateEventIncome(
  "2026-09-20",
  "2026-10-14",
  anniversaryWineCard,
  eventTypes,
  { initialRewardClaimed: true, remainingDays: 24 },
  false,
);
assert.equal(maximumDailyWineCard.dailyRewardDays, 24);
assert.equal(maximumDailyWineCard.resources.diamond, 1200);

const nearTargetWineCard = calculateEventIncome(
  "2026-09-20",
  "2026-09-25",
  anniversaryWineCard,
  eventTypes,
  { initialRewardClaimed: true, remainingDays: 24 },
  false,
);
assert.equal(nearTargetWineCard.dailyRewardDays, 5);
assert.equal(nearTargetWineCard.resources.diamond, 250);

const lastClaimDateWineCard = calculateEventIncome(
  "2026-10-23",
  "2026-11-16",
  anniversaryWineCard,
  eventTypes,
  { initialRewardClaimed: false, remainingDays: 24 },
  false,
);
assert.equal(lastClaimDateWineCard.absoluteLastRewardDate, "2026-11-16");
assert.equal(lastClaimDateWineCard.dailyRewardDays, 24);
assert.equal(lastClaimDateWineCard.resources.diamond, 1500);

const afterClaimWindowWineCard = calculateEventIncome(
  "2026-10-24",
  "2026-10-25",
  anniversaryWineCard,
  eventTypes,
  { initialRewardClaimed: true, remainingDays: 10 },
  false,
);
assert.equal(afterClaimWindowWineCard.eligible, true);
assert.equal(afterClaimWindowWineCard.status, "current");
assert.equal(afterClaimWindowWineCard.resources.diamond, 100);

const expiredWineCard = calculateEventIncome(
  "2026-11-17",
  "2026-11-17",
  anniversaryWineCard,
  eventTypes,
  { initialRewardClaimed: true, remainingDays: 24 },
  false,
);
assert.equal(expiredWineCard.eligible, false);
assert.equal(expiredWineCard.status, "expired");
assert.equal(Object.keys(expiredWineCard.resources).length, 0);
assert.equal(lastClaimDateWineCard.rmbTotal, 0);
assert.equal(lastClaimDateWineCard.limitedRechargeRmb, 0);

const selectedWineCardIncome = calculateSelectedEventIncome(
  "banner",
  "2026-10-24",
  "2026-10-25",
  [anniversaryWineCard],
  eventTypes,
  [anniversaryWineCard.id],
  {
    [anniversaryWineCard.id]: {
      initialRewardClaimed: true,
      remainingDays: 10,
    },
  },
  false,
);
assert.equal(selectedWineCardIncome.selectedResources.diamond, 100);

const unselectedWineCardIncome = calculateSelectedEventIncome(
  "banner",
  "2026-10-24",
  "2026-10-25",
  [anniversaryWineCard],
  eventTypes,
  [],
  {
    [anniversaryWineCard.id]: {
      initialRewardClaimed: true,
      remainingDays: 10,
    },
  },
  false,
);
assert.equal(
  Object.keys(unselectedWineCardIncome.selectedResources).length,
  0,
);

const futureTestEvent = {
  ...soloEvent,
  id: "sample-future-event",
  name: "未来测试活动",
  status: "future",
  startDate: "2026-09-01",
  endDate: "2026-09-10",
};
const futureIncome = calculateEventIncome(
  "2026-08-01",
  "2026-09-05",
  futureTestEvent,
  eventTypes,
);
assert.equal(futureIncome.eligible, true);
assert.equal(futureIncome.status, "future");
assert.equal(futureIncome.resources.diamond, 40);
assert.deepEqual(
  Array.from(getDefaultSelectedEventIds([...events, futureTestEvent])).sort(),
  [...defaultSelectedIds, "sample-future-event"].sort(),
);

const defaultSelectionFixture = [rerunEvent, soloEvent];
const onlyDefaultSelected = calculateSelectedEventIncome(
  "banner",
  "2026-08-01",
  "2026-09-26",
  defaultSelectionFixture,
  eventTypes,
  getDefaultSelectedEventIds(defaultSelectionFixture),
);
assert.equal(onlyDefaultSelected.enabled, true);
assert.equal(onlyDefaultSelected.selectedResources.diamond, 360);
assert.equal(onlyDefaultSelected.selectedResources.common_paint, undefined);

const bothSelected = calculateSelectedEventIncome(
  "banner",
  "2026-08-01",
  "2026-09-26",
  events,
  eventTypes,
  ["庄园诡戏", "怪谈：电子"],
);
assert.equal(bothSelected.selectedResources.diamond, 560);
assert.equal(bothSelected.selectedResources.common_paint, 3);

const noneSelected = calculateSelectedEventIncome(
  "banner",
  "2026-08-01",
  "2026-09-26",
  events,
  eventTypes,
  [],
);
assert.equal(Object.keys(noneSelected.selectedResources).length, 0);

const customDateMode = calculateSelectedEventIncome(
  "custom",
  "2026-08-01",
  "2026-09-26",
  events,
  eventTypes,
  ["庄园诡戏", "怪谈：电子"],
);
assert.equal(customDateMode.enabled, false);
assert.equal(customDateMode.events.length, 0);
assert.equal(Object.keys(customDateMode.selectedResources).length, 0);

const requestedPaths = [];
const loaderContext = vm.createContext({
  Date,
  fetch: async (requestedPath) => {
    requestedPaths.push(requestedPath);

    return {
      ok: true,
      json: async () =>
        requestedPath === "data/events/event-types.json"
          ? eventTypeData
          : eventData,
    };
  },
});

vm.runInContext(
  readProjectFile(path.join("js", "data-loader.js")),
  loaderContext,
);

const loadEventTypes = vm.runInContext("loadEventTypes", loaderContext);
const loadEvents = vm.runInContext("loadEvents", loaderContext);
const isValidEvent = vm.runInContext("isValidEvent", loaderContext);
const isValidEventIncomeRule = vm.runInContext(
  "isValidEventIncomeRule",
  loaderContext,
);

assert.equal(isValidEvent(futureTestEvent), true);
assert.equal(isValidEvent({ ...futureTestEvent, status: "unknown" }), false);
assert.equal(isValidEventIncomeRule(anniversaryWineCard.incomeRule), true);
assert.equal(
  isValidEventIncomeRule({
    ...anniversaryWineCard.incomeRule,
    maxDays: -1,
  }),
  false,
);

const appContext = vm.createContext({});
vm.runInContext(readProjectFile(path.join("js", "app.js")), appContext);
const groupEligibleEventsByStatus = vm.runInContext(
  "groupEligibleEventsByStatus",
  appContext,
);
const getEventIncomeLabel = vm.runInContext(
  "getEventIncomeLabel",
  appContext,
);
const groupedEvents = groupEligibleEventsByStatus([
  availableAtStart,
  futureIncome,
]);

assert.equal(groupedEvents.current.length, 1);
assert.equal(groupedEvents.current[0].eventId, "庄园诡戏");
assert.equal(groupedEvents.future.length, 1);
assert.equal(groupedEvents.future[0].eventId, "sample-future-event");
assert.equal(getEventIncomeLabel("current"), "可计入");
assert.equal(getEventIncomeLabel("future"), "预计可计入");

(async () => {
  const loadedEventTypes = await loadEventTypes();
  const loadedEvents = await loadEvents();

  assert.equal(
    new Set(loadedEventTypes.map((eventType) => eventType.id)).size,
    loadedEventTypes.length,
  );
  assert.equal(
    new Set(loadedEvents.map((event) => event.id)).size,
    loadedEvents.length,
  );
  assert.equal(
    loadedEvents.every(
      (event) =>
        isValidEvent(event) &&
        eventTypeIds.has(event.type) &&
        event.startDate <= event.endDate,
    ),
    true,
  );
  assert.equal(loadedEvents.every((event) => Array.isArray(event.exchanges)), true);
  assert.deepEqual(requestedPaths, [
    "data/events/event-types.json",
    "data/events/events.json",
  ]);
  console.log("event income: data and calculation tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
