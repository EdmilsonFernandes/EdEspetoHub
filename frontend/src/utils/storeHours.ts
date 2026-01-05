export type OpeningInterval = { start: string; end: string };
export type OpeningDay = { day: number; enabled?: boolean; intervals?: OpeningInterval[] };

export const normalizeOpeningHours = (openingHours?: OpeningDay[]) => {
  const base = Array.isArray(openingHours) ? openingHours : [];
  const byDay = new Map<number, OpeningDay>();
  base.forEach((entry) => {
    if (typeof entry?.day === 'number') {
      byDay.set(entry.day, entry);
    }
  });

  return Array.from({ length: 7 }).map((_, day) => {
    const entry = byDay.get(day);
    return {
      day,
      enabled: entry?.enabled ?? false,
      intervals: Array.isArray(entry?.intervals) && entry.intervals.length > 0
        ? entry.intervals
        : [ { start: '10:00', end: '22:00' } ],
    };
  });
};

export const isStoreOpenNow = (openingHours?: OpeningDay[], manualOpen?: boolean) => {
  if (manualOpen === false) return false;
  if (!Array.isArray(openingHours) || openingHours.length === 0) return true;

  const now = new Date();
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = openingHours.find((entry) => entry?.day === day);
  if (!today || today?.enabled === false) return false;

  const intervals = Array.isArray(today.intervals) ? today.intervals : [];
  return intervals.some((interval) => {
    if (!interval?.start || !interval?.end) return false;
    const [startH, startM] = interval.start.split(':').map(Number);
    const [endH, endM] = interval.end.split(':').map(Number);
    if (Number.isNaN(startH) || Number.isNaN(startM) || Number.isNaN(endH) || Number.isNaN(endM)) return false;

    const start = startH * 60 + startM;
    const end = endH * 60 + endM;

    if (end < start) {
      return minutes >= start || minutes < end;
    }

    return minutes >= start && minutes < end;
  });
};
