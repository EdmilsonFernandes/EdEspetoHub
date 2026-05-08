import { describe, it, expect } from 'vitest';
import { appendOrderTimelineEntry, buildOrderTimelineJson } from '../utils/orderTimeline';

describe('Order — statusTimeline', () => {
  it('creates timeline from null', () => {
    const result = appendOrderTimelineEntry(null, 'pending');
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('pending');
    expect(result[0].at).toBeTruthy();
  });

  it('creates timeline from undefined', () => {
    const result = appendOrderTimelineEntry(undefined, 'pending');
    expect(result).toHaveLength(1);
  });

  it('appends to existing timeline', () => {
    const existing = [{ status: 'pending', at: '2026-01-01T00:00:00Z' }];
    const result = appendOrderTimelineEntry(existing, 'preparing');
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('pending');
    expect(result[1].status).toBe('preparing');
  });

  it('preserves order of entries', () => {
    const existing = [
      { status: 'pending', at: '2026-01-01T00:00:00Z' },
      { status: 'preparing', at: '2026-01-01T00:05:00Z' },
    ];
    const result = appendOrderTimelineEntry(existing, 'ready');
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.status)).toEqual(['pending', 'preparing', 'ready']);
  });

  it('each entry has ISO timestamp', () => {
    const result = appendOrderTimelineEntry([], 'pending');
    expect(result[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('builds JSON payload for SQL appends', () => {
    const result = JSON.parse(buildOrderTimelineJson('pending', '2026-05-08T14:00:00.000Z'));
    expect(result).toEqual([{ status: 'pending', at: '2026-05-08T14:00:00.000Z' }]);
  });
});
