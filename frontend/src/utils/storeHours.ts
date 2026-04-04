export type OpeningInterval = { start: string; end: string };
export type OpeningDay = { day: number; enabled?: boolean; intervals?: OpeningInterval[] };
const SAO_PAULO_TZ = 'America/Sao_Paulo';

const parseDayValue = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const candidateDayValues = (jsDay: number) => {
  const normalized = ((jsDay % 7) + 7) % 7;
  const isoDay = normalized === 0 ? 7 : normalized; // ISO Mon=1..Sun=7
  const sunFirstDay = normalized + 1; // Sun-first Sun=1..Sat=7
  return Array.from(new Set([ normalized, isoDay, sunFirstDay ]));
};

const getSaoPauloNowParts = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SAO_PAULO_TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const weekdayRaw = String(parts.find((part) => part.type === 'weekday')?.value || '').toLowerCase();
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  const weekdayMap: Record<string, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };
  const day = Number.isFinite(weekdayMap[weekdayRaw]) ? weekdayMap[weekdayRaw] : now.getDay();
  const safeHour = Math.max(0, Math.min(23, Number.isFinite(hour) ? hour : 0));
  const safeMinute = Math.max(0, Math.min(59, Number.isFinite(minute) ? minute : 0));
  return { day, minutes: safeHour * 60 + safeMinute };
};

export const normalizeOpeningHours = (openingHours?: OpeningDay[]) => {
  const base = Array.isArray(openingHours) ? openingHours : [];
  const byDay = new Map<number, OpeningDay>();
  const groups = new Map<number, OpeningDay[]>();

  base.forEach((entry) => {
    const parsedDay = parseDayValue(entry?.day);
    if (parsedDay == null) return;
    const dayValue = ((parsedDay % 7) + 7) % 7;
    const normalizedEntry = { ...entry, day: dayValue };
    byDay.set(dayValue, normalizedEntry);
    if (!groups.has(dayValue)) groups.set(dayValue, []);
    groups.get(dayValue)?.push(normalizedEntry);
  });

  const normalized = Array.from({ length: 7 }).map((_, day) => {
    const entry = byDay.get(day);
    const groupEntries = groups.get(day) || [];
    const mergedIntervals = groupEntries.flatMap((item) =>
      Array.isArray(item?.intervals) && item.intervals.length > 0 ? item.intervals : []
    );
    return {
      day,
      enabled: entry?.enabled ?? groupEntries.some((item) => item?.enabled !== false),
      intervals: mergedIntervals.length > 0
        ? mergedIntervals
        : [ { start: '10:00', end: '22:00' } ],
    };
  });

  return normalized;
};

const toMinutes = (value?: string) => {
  if (!value || typeof value !== 'string') return null;
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

const isInsideInterval = (nowMinutes: number, start: number, end: number) => {
  if (start === end) return true;
  if (end < start) return nowMinutes >= start || nowMinutes < end;
  return nowMinutes >= start && nowMinutes < end;
};

const isOpenFromPreviousDayOvernight = (openingHours: OpeningDay[], currentDay: number, currentMinutes: number) => {
  const previousDay = (currentDay + 6) % 7;
  const previousCandidates = candidateDayValues(previousDay);
  const previousEntries = openingHours.filter((entry) => {
    const day = parseDayValue(entry?.day);
    return day != null && previousCandidates.includes(day) && entry?.enabled !== false;
  });
  if (!previousEntries.length) return false;

  return previousEntries.some((entry) => {
    const intervals = Array.isArray(entry?.intervals) ? entry.intervals : [];
    return intervals.some((interval) => {
      const start = toMinutes(interval?.start);
      const end = toMinutes(interval?.end);
      if (start == null || end == null) return false;
      if (end < start) return currentMinutes < end;
      return false;
    });
  });
};

export const isStoreOpenNow = (openingHours?: OpeningDay[]) => {
  if (!Array.isArray(openingHours) || openingHours.length === 0) return true;

  const { day, minutes } = getSaoPauloNowParts();
  const candidates = candidateDayValues(day);
  const todayEntries = openingHours.filter((entry) => {
    const parsed = parseDayValue(entry?.day);
    return parsed != null && candidates.includes(parsed) && entry?.enabled !== false;
  });
  if (!todayEntries.length) return isOpenFromPreviousDayOvernight(openingHours, day, minutes);

  const openByToday = todayEntries.some((entry) => {
    const intervals = Array.isArray(entry?.intervals) ? entry.intervals : [];
    if (!intervals.length) return true;
    return intervals.some((interval) => {
      const start = toMinutes(interval?.start);
      const end = toMinutes(interval?.end);
      if (start == null || end == null) return false;
      return isInsideInterval(minutes, start, end);
    });
  });
  if (openByToday) return true;

  return isOpenFromPreviousDayOvernight(openingHours, day, minutes);
};

export const formatOpeningHoursSummary = (openingHours?: OpeningDay[]) => {
  if (!Array.isArray(openingHours) || openingHours.length === 0) return [];
  const labels = [ 'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab' ];
  return normalizeOpeningHours(openingHours).map((entry) => {
    const dayLabel = labels[ entry.day ] || 'Dia';
    if (entry.enabled === false) {
      return `${dayLabel}: fechado`;
    }
    const intervals = Array.isArray(entry.intervals) ? entry.intervals : [];
    if (!intervals.length) {
      return `${dayLabel}: horario livre`;
    }
    const ranges = intervals.map((interval) => `${interval.start}–${interval.end}`).join(' • ');
    return `${dayLabel}: ${ranges}`;
  });
};
