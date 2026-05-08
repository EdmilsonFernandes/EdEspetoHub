export type OpeningInterval = { start: string; end: string };
export type OpeningDay = { day: number; enabled?: boolean; intervals?: OpeningInterval[] };
const SAO_PAULO_TZ = 'America/Sao_Paulo';
const WEEKDAY_LABELS = [ 'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab' ];

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

const resolveDayEntries = (openingHours: OpeningDay[], jsDay: number) => {
  const normalized = ((jsDay % 7) + 7) % 7;
  // Tenta primeiro o match exato (0-6)
  const exactMatches = openingHours.filter((entry) => parseDayValue(entry?.day) === normalized);
  if (exactMatches.length > 0) return exactMatches;

  // Fallback para candidatos legados
  const candidates = candidateDayValues(jsDay);
  return openingHours.filter((entry) => {
    const day = parseDayValue(entry?.day);
    return day != null && candidates.includes(day);
  });
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
  const normalized = Array.from({ length: 7 }).map((_, day) => {
    const dayEntries = resolveDayEntries(base, day);
    const enabled = dayEntries.some(e => e.enabled !== false);
    const mergedIntervals = dayEntries.flatMap(e => Array.isArray(e.intervals) ? e.intervals : []);
    
    return {
      day,
      enabled,
      intervals: mergedIntervals,
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

const formatCompactTime = (value?: string, padHour = false) => {
  const totalMinutes = toMinutes(value);
  if (totalMinutes == null) return '';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourLabel = padHour ? String(hours).padStart(2, '0') : String(hours);
  return minutes === 0 ? `${hourLabel}h` : `${hourLabel}h${String(minutes).padStart(2, '0')}`;
};

const resolveDayPart = (value?: string) => {
  const totalMinutes = toMinutes(value);
  if (totalMinutes == null) return '';
  if (totalMinutes < 360) return 'da madrugada';
  if (totalMinutes < 720) return 'da manhã';
  if (totalMinutes < 1080) return 'da tarde';
  return 'da noite';
};

const formatCompactTimeWithContext = (value?: string) => {
  const base = formatCompactTime(value);
  if (!base) return '';
  const dayPart = resolveDayPart(value);
  return dayPart ? `${base} ${dayPart}` : base;
};

const isInsideInterval = (nowMinutes: number, start: number, end: number) => {
  if (start === end) return true;
  if (end < start) return nowMinutes >= start || nowMinutes < end;
  return nowMinutes >= start && nowMinutes < end;
};

const resolveDayValueLabel = (
  enabled: boolean | undefined,
  intervals: OpeningInterval[],
  closedLabel: string,
  openAllDayLabel: string
) => {
  if (enabled === false) return closedLabel;
  if (!intervals.length) return openAllDayLabel;
  return intervals.map((interval) => formatOpeningIntervalLabel(interval)).join(' • ');
};

const isOpenFromPreviousDayOvernight = (openingHours: OpeningDay[], currentDay: number, currentMinutes: number) => {
  const previousDay = (currentDay + 6) % 7;
  const previousEntries = resolveDayEntries(openingHours, previousDay).filter(e => e.enabled !== false);
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
  if (!Array.isArray(openingHours) || openingHours.length === 0) return false;

  const { day, minutes } = getSaoPauloNowParts();
  const todayEntries = resolveDayEntries(openingHours, day).filter(e => e.enabled !== false);
  
  const openByToday = todayEntries.some((entry) => {
    const intervals = Array.isArray(entry?.intervals) ? entry.intervals : [];
    // Habilitado mas sem intervalos = aberto o dia todo
    if (!intervals.length) return true;
    return intervals.some((interval) => {
      const start = toMinutes(interval?.start);
      const end = toMinutes(interval?.end);
      if (start == null || end == null) return false;
      return isInsideInterval(minutes, start, end);
    });
  });

  if (openByToday) return true;

  // Se não abriu pelo dia de hoje, SEMPRE checa se o dia anterior ainda está no período overnight
  return isOpenFromPreviousDayOvernight(openingHours, day, minutes);
};

export const formatOpeningIntervalLabel = (interval?: OpeningInterval | null) => {
  const rawStart = String(interval?.start || '').trim();
  const rawEnd = String(interval?.end || '').trim();
  const start = toMinutes(rawStart);
  const end = toMinutes(rawEnd);
  if (start == null || end == null) return [ rawStart, rawEnd ].filter(Boolean).join(' às ');
  if (start === end) return '24 horas';

  const startLabel = formatCompactTime(rawStart);
  const endLabel = end < start ? formatCompactTimeWithContext(rawEnd) : formatCompactTime(rawEnd);
  return `${startLabel} às ${endLabel}`;
};

export const formatOpeningIntervalsLabel = (intervals?: OpeningInterval[] | null) => {
  const safeIntervals = Array.isArray(intervals) ? intervals : [];
  if (!safeIntervals.length) return '24 horas';
  return safeIntervals.map((interval) => formatOpeningIntervalLabel(interval)).join(' • ');
};

export const formatOpeningHoursForDay = (
  openingHours: OpeningDay[] | undefined,
  jsDay: number,
  options?: { closedLabel?: string; openAllDayLabel?: string }
) => {
  const closedLabel = options?.closedLabel || 'Fechado';
  const openAllDayLabel = options?.openAllDayLabel || '24 horas';
  const normalizedDay = normalizeOpeningHours(openingHours);
  const entry = normalizedDay.find((item) => item.day === ((jsDay % 7) + 7) % 7);
  if (!entry) return closedLabel;
  const intervals = Array.isArray(entry.intervals) ? entry.intervals : [];
  return resolveDayValueLabel(entry.enabled, intervals, closedLabel, openAllDayLabel);
};

export const getCurrentClosingTimeLabel = (openingHours?: OpeningDay[]) => {
  if (!Array.isArray(openingHours) || openingHours.length === 0) return '';

  const { day, minutes } = getSaoPauloNowParts();
  const todayEntries = resolveDayEntries(openingHours, day).filter((entry) => entry.enabled !== false);
  for (const entry of todayEntries) {
    const intervals = Array.isArray(entry?.intervals) ? entry.intervals : [];
    if (!intervals.length) return '24 horas';
    for (const interval of intervals) {
      const start = toMinutes(interval?.start);
      const end = toMinutes(interval?.end);
      if (start == null || end == null) continue;
      if (isInsideInterval(minutes, start, end)) {
        return end < start ? formatCompactTimeWithContext(interval.end) : formatCompactTime(interval.end);
      }
    }
  }

  const previousDay = (day + 6) % 7;
  const previousEntries = resolveDayEntries(openingHours, previousDay).filter((entry) => entry.enabled !== false);
  for (const entry of previousEntries) {
    const intervals = Array.isArray(entry?.intervals) ? entry.intervals : [];
    for (const interval of intervals) {
      const start = toMinutes(interval?.start);
      const end = toMinutes(interval?.end);
      if (start == null || end == null || end >= start) continue;
      if (minutes < end) {
        return formatCompactTimeWithContext(interval.end);
      }
    }
  }

  return '';
};

export const formatNextOpeningLabel = (label?: string | null) => {
  const rawLabel = String(label || '').trim();
  if (!rawLabel) return '';
  return rawLabel.replace(/\b(\d{1,2}:\d{2})\b/g, (_, value: string) => formatCompactTime(value, true));
};

export const formatOpeningHoursSummary = (openingHours?: OpeningDay[]) => {
  if (!Array.isArray(openingHours) || openingHours.length === 0) return [];
  return normalizeOpeningHours(openingHours).map((entry) => {
    const dayLabel = WEEKDAY_LABELS[ entry.day ] || 'Dia';
    const intervals = Array.isArray(entry.intervals) ? entry.intervals : [];
    const value = resolveDayValueLabel(entry.enabled, intervals, 'fechado', '24 horas');
    return `${dayLabel}: ${value}`;
  });
};
