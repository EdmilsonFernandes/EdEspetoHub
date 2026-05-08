import { describe, it, expect } from 'vitest';

/**
 * Tests the statusTimeline append logic used in OrderService.
 */

function appendTimeline(
  current: Array<{ status: string; at: string }> | null | undefined,
  nextStatus: string
) {
  const prev = Array.isArray(current) ? current : [];
  return [...prev, { status: nextStatus, at: new Date().toISOString() }];
}

describe('Order — statusTimeline', () => {
  it('creates timeline from null', () => {
    const result = appendTimeline(null, 'pending');
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('pending');
    expect(result[0].at).toBeTruthy();
  });

  it('creates timeline from undefined', () => {
    const result = appendTimeline(undefined, 'pending');
    expect(result).toHaveLength(1);
  });

  it('appends to existing timeline', () => {
    const existing = [{ status: 'pending', at: '2026-01-01T00:00:00Z' }];
    const result = appendTimeline(existing, 'preparing');
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('pending');
    expect(result[1].status).toBe('preparing');
  });

  it('preserves order of entries', () => {
    const existing = [
      { status: 'pending', at: '2026-01-01T00:00:00Z' },
      { status: 'preparing', at: '2026-01-01T00:05:00Z' },
    ];
    const result = appendTimeline(existing, 'ready');
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.status)).toEqual(['pending', 'preparing', 'ready']);
  });

  it('each entry has ISO timestamp', () => {
    const result = appendTimeline([], 'pending');
    expect(result[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
