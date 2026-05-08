export type OrderTimelineEntry = {
  status: string;
  at: string;
};

export function normalizeOrderTimelineAt(value?: Date | string | null) {
  if (!value) return new Date().toISOString();
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

export function appendOrderTimelineEntry(
  current: OrderTimelineEntry[] | null | undefined,
  status: string,
  at?: Date | string | null
) {
  const prev = Array.isArray(current) ? current : [];
  return [
    ...prev,
    {
      status,
      at: normalizeOrderTimelineAt(at),
    },
  ];
}

export function buildOrderTimelineJson(status: string, at?: Date | string | null) {
  return JSON.stringify([
    {
      status,
      at: normalizeOrderTimelineAt(at),
    },
  ]);
}
