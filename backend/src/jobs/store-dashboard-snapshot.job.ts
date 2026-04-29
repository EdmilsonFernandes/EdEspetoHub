import { logger } from '../utils/logger';
import { StoreDashboardSnapshotService } from '../services/StoreDashboardSnapshotService';

const log = logger.child({ scope: 'StoreDashboardSnapshotJob' });
const snapshotService = new StoreDashboardSnapshotService();

export function scheduleStoreDashboardSnapshotJob() {
  const enabled = process.env.STORE_DASHBOARD_SNAPSHOT_JOB_ENABLED !== 'false';
  const intervalMs =
    process.env.STORE_DASHBOARD_SNAPSHOT_INTERVAL_MS && Number(process.env.STORE_DASHBOARD_SNAPSHOT_INTERVAL_MS) > 0
      ? Number(process.env.STORE_DASHBOARD_SNAPSHOT_INTERVAL_MS)
      : 10 * 60 * 1000;
  const maxDatesPerTick =
    process.env.STORE_DASHBOARD_SNAPSHOT_MAX_DATES && Number(process.env.STORE_DASHBOARD_SNAPSHOT_MAX_DATES) > 0
      ? Number(process.env.STORE_DASHBOARD_SNAPSHOT_MAX_DATES)
      : 500;

  if (!enabled) {
    log.info('Store dashboard snapshot job disabled');
    return;
  }

  const tick = async () => {
    await snapshotService.runScheduledRefresh(maxDatesPerTick);
  };

  setInterval(tick, intervalMs);
  void tick();
  log.info('Store dashboard snapshot job scheduled', { intervalMs, maxDatesPerTick });
}
