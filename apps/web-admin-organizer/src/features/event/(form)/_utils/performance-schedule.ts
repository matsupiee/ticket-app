export type PerformanceSchedule = {
  performanceDate?: string;
  doorsOpenAt: string;
  startsAt: string;
};

export function getPerformanceDateValue(schedule: PerformanceSchedule) {
  return (
    schedule.performanceDate || getDatePart(schedule.doorsOpenAt) || getDatePart(schedule.startsAt)
  );
}

export function getDoorsOpenTimeValue(schedule: PerformanceSchedule) {
  return getTimePart(schedule.doorsOpenAt);
}

export function getStartsTimeValue(schedule: PerformanceSchedule) {
  return getTimePart(schedule.startsAt);
}

export function getDefaultPerformanceSchedule(
  referenceDate = new Date(),
): PerformanceSchedule & { performanceDate: string } {
  const performanceDate = addDays(toLocalDateValue(referenceDate), 7);

  return {
    performanceDate,
    doorsOpenAt: `${performanceDate}T18:00`,
    startsAt: `${performanceDate}T18:00`,
  };
}

export function buildPerformanceSchedule(input: {
  schedule: PerformanceSchedule;
  date?: string;
  doorsOpenTime?: string;
  startsTime?: string;
}): PerformanceSchedule {
  const date = input.date ?? getPerformanceDateValue(input.schedule);
  const doorsOpenTime = input.doorsOpenTime ?? getDoorsOpenTimeValue(input.schedule);
  const startsTime = input.startsTime ?? getStartsTimeValue(input.schedule);

  if (!date) {
    return { performanceDate: "", doorsOpenAt: "", startsAt: "" };
  }

  return {
    performanceDate: date,
    doorsOpenAt: doorsOpenTime ? `${date}T${doorsOpenTime}` : "",
    startsAt: startsTime
      ? `${resolveStartsDate({ date, doorsOpenTime, startsTime })}T${startsTime}`
      : "",
  };
}

function resolveStartsDate(input: { date: string; doorsOpenTime: string; startsTime: string }) {
  if (input.doorsOpenTime && input.startsTime < input.doorsOpenTime) {
    return addDays(input.date, 1);
  }

  return input.date;
}

function addDays(dateValue: string, days: number) {
  const [year = 0, month = 1, day = 1] = dateValue.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return date.toISOString().slice(0, 10);
}

function toLocalDateValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function getDatePart(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) ? value.slice(0, 10) : "";
}

function getTimePart(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) ? value.slice(11, 16) : "";
}
