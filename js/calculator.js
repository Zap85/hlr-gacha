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
