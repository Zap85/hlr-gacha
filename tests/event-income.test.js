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
  readProjectFile(path.join("data", "events", "sample-event.json")),
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
assert.equal(events.every((event) => eventTypeIds.has(event.type)), true);
assert.equal(events.every((event) => event.status === "current"), true);
assert.equal(eventTypes.length, 2);
assert.equal(events.length, 2);

const rerunEvent = events.find((event) => event.id === "庄园诡戏");
const soloEvent = events.find((event) => event.id === "怪谈：电子");

const beforeStart = calculateEventIncome(
  "2026-08-25",
  rerunEvent,
  eventTypes,
);
assert.equal(beforeStart.valid, true);
assert.equal(beforeStart.eligible, false);
assert.equal(Object.keys(beforeStart.resources).length, 0);

const availableAtStart = calculateEventIncome(
  "2026-08-26",
  rerunEvent,
  eventTypes,
);
assert.equal(availableAtStart.phase, "available");
assert.equal(availableAtStart.status, "current");
assert.equal(availableAtStart.resources.diamond, 50);
assert.equal(availableAtStart.resources.common_paint, 3);

const completeAtEnd = calculateEventIncome(
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
  "2026-08-30",
  adjustedEvent,
  eventTypes,
);
assert.equal(adjustedAvailable.resources.diamond, 30);
assert.equal(adjustedAvailable.resources.common_paint, 5);
assert.equal(adjustedAvailable.resources.red_diamond, 10);

const adjustedComplete = calculateEventIncome(
  "2026-09-03",
  adjustedEvent,
  eventTypes,
);
assert.equal(adjustedComplete.resources.diamond, 225);
assert.equal(adjustedComplete.resources.common_paint, 2);
assert.equal(Object.keys(adjustedComplete.resources).length, 2);

const soloAvailable = calculateEventIncome(
  "2026-08-15",
  soloEvent,
  eventTypes,
);
const soloComplete = calculateEventIncome(
  "2026-08-16",
  soloEvent,
  eventTypes,
);
assert.equal(soloAvailable.phase, "available");
assert.equal(soloAvailable.resources.diamond, 40);
assert.equal(soloComplete.phase, "complete");
assert.equal(soloComplete.resources.diamond, 360);

const defaultSelectedIds = Array.from(getDefaultSelectedEventIds(events));
assert.deepEqual(defaultSelectedIds, ["怪谈：电子"]);

const futureTestEvent = {
  ...soloEvent,
  id: "sample-future-event",
  name: "未来测试活动",
  status: "future",
  startDate: "2026-09-01",
  endDate: "2026-09-10",
};
const futureIncome = calculateEventIncome(
  "2026-09-05",
  futureTestEvent,
  eventTypes,
);
assert.equal(futureIncome.eligible, true);
assert.equal(futureIncome.status, "future");
assert.equal(futureIncome.resources.diamond, 40);
assert.deepEqual(
  Array.from(getDefaultSelectedEventIds([...events, futureTestEvent])),
  ["怪谈：电子", "sample-future-event"],
);

const onlyDefaultSelected = calculateSelectedEventIncome(
  "banner",
  "2026-09-26",
  events,
  eventTypes,
  defaultSelectedIds,
);
assert.equal(onlyDefaultSelected.enabled, true);
assert.equal(onlyDefaultSelected.selectedResources.diamond, 360);
assert.equal(onlyDefaultSelected.selectedResources.common_paint, undefined);

const bothSelected = calculateSelectedEventIncome(
  "banner",
  "2026-09-26",
  events,
  eventTypes,
  ["庄园诡戏", "怪谈：电子"],
);
assert.equal(bothSelected.selectedResources.diamond, 560);
assert.equal(bothSelected.selectedResources.common_paint, 3);

const noneSelected = calculateSelectedEventIncome(
  "banner",
  "2026-09-26",
  events,
  eventTypes,
  [],
);
assert.equal(Object.keys(noneSelected.selectedResources).length, 0);

const customDateMode = calculateSelectedEventIncome(
  "custom",
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

assert.equal(isValidEvent(futureTestEvent), true);
assert.equal(isValidEvent({ ...futureTestEvent, status: "unknown" }), false);

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

  assert.deepEqual(
    Array.from(loadedEventTypes, (eventType) => eventType.id),
    ["复刻活动", "单人活动"],
  );
  assert.deepEqual(
    Array.from(loadedEvents, (event) => event.id),
    ["庄园诡戏", "怪谈：电子"],
  );
  assert.equal(loadedEvents.every((event) => Array.isArray(event.exchanges)), true);
  assert.deepEqual(requestedPaths, [
    "data/events/event-types.json",
    "data/events/sample-event.json",
  ]);
  console.log("event income: data and calculation tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
