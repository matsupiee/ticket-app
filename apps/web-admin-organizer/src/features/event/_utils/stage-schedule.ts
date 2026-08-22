export type StageSchedule = {
  stageDate?: string;
  doorsOpenAt: string;
  startsAt: string;
};

export function getStageDateValue(schedule: StageSchedule) {
  return schedule.stageDate || getDatePart(schedule.doorsOpenAt) || getDatePart(schedule.startsAt);
}

export function getDoorsOpenTimeValue(schedule: StageSchedule) {
  return getTimePart(schedule.doorsOpenAt);
}

export function getStartsTimeValue(schedule: StageSchedule) {
  return getTimePart(schedule.startsAt);
}

export function getDefaultStageSchedule(
  referenceDate = new Date(),
): StageSchedule & { stageDate: string } {
  const stageDate = addDays(toLocalDateValue(referenceDate), 7);

  return {
    stageDate,
    doorsOpenAt: `${stageDate}T18:00`,
    startsAt: `${stageDate}T18:00`,
  };
}

export function buildStageSchedule(input: {
  schedule: StageSchedule;
  date?: string;
  doorsOpenTime?: string;
  startsTime?: string;
}): StageSchedule {
  const date = input.date ?? getStageDateValue(input.schedule);
  const doorsOpenTime = input.doorsOpenTime ?? getDoorsOpenTimeValue(input.schedule);
  const startsTime = input.startsTime ?? getStartsTimeValue(input.schedule);

  if (!date) {
    return { stageDate: "", doorsOpenAt: "", startsAt: "" };
  }

  return {
    stageDate: date,
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
