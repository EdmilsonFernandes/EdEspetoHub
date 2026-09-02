import { describe, expect, it } from 'vitest';
import { StoreDashboardAnalyticsService } from '../services/StoreDashboardAnalyticsService';

describe('StoreDashboardAnalyticsService (purezas do relatório)', () => {
  describe('resolveComparisonWindows', () => {
    it('rolling 30d: janela atual termina hoje e anterior tem o mesmo comprimento', () => {
      const windows = StoreDashboardAnalyticsService.resolveComparisonWindows({
        periodDays: 30,
        todayKey: '2026-09-01',
      });
      expect(windows.current).toEqual({ startKey: '2026-08-03', endKey: '2026-09-01' });
      // anterior: termina um dia antes do início atual, 30 dias de comprimento
      expect(windows.previous).toEqual({ startKey: '2026-07-04', endKey: '2026-08-02' });
    });

    it('range customizado: anterior espelha o comprimento exato do range', () => {
      const windows = StoreDashboardAnalyticsService.resolveComparisonWindows({
        customRange: { startDate: '2026-08-10', endDate: '2026-08-19' }, // 10 dias
        todayKey: '2026-09-01',
      });
      expect(windows.current).toEqual({ startKey: '2026-08-10', endKey: '2026-08-19' });
      expect(windows.previous).toEqual({ startKey: '2026-07-31', endKey: '2026-08-09' });
    });

    it('todo período não tem janela comparável', () => {
      const windows = StoreDashboardAnalyticsService.resolveComparisonWindows({
        periodDays: null,
        todayKey: '2026-09-01',
      });
      expect(windows.current).toBeNull();
      expect(windows.previous).toBeNull();
    });

    it('cruza virada de mês e de ano sem off-by-one', () => {
      const windows = StoreDashboardAnalyticsService.resolveComparisonWindows({
        periodDays: 3,
        todayKey: '2026-01-01',
      });
      expect(windows.current).toEqual({ startKey: '2025-12-30', endKey: '2026-01-01' });
      expect(windows.previous).toEqual({ startKey: '2025-12-27', endKey: '2025-12-29' });
    });
  });

  describe('pickBestDay', () => {
    it('devolve o dia de maior receita', () => {
      const best = StoreDashboardAnalyticsService.pickBestDay([
        { date: '2026-08-28', total: 1200 },
        { date: '2026-08-29', total: 2543.5 },
        { date: '2026-08-30', total: 900 },
      ]);
      expect(best).toEqual({ date: '2026-08-29', total: 2543.5 });
    });

    it('empate de receita → dia mais recente', () => {
      const best = StoreDashboardAnalyticsService.pickBestDay([
        { date: '2026-08-01', total: 500 },
        { date: '2026-08-15', total: 500 },
      ]);
      expect(best?.date).toBe('2026-08-15');
    });

    it('sem dia com receita → null', () => {
      expect(StoreDashboardAnalyticsService.pickBestDay([{ date: '2026-08-01', total: 0 }])).toBeNull();
      expect(StoreDashboardAnalyticsService.pickBestDay([])).toBeNull();
    });

    it('aceita Date (driver pg devolve date como Date)', () => {
      const best = StoreDashboardAnalyticsService.pickBestDay([{ date: new Date(Date.UTC(2026, 7, 29, 12)), total: 800 }]);
      expect(best?.date).toBe('2026-08-29');
    });
  });
});
