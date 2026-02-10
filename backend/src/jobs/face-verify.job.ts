/*
 * Assisted verification job: periodically verifies motoboy selfie vs CNH.
 */

import { logger } from '../utils/logger';
import { faceVerifyService } from '../services/FaceVerifyService';

const log = logger.child({ scope: 'FaceVerifyJob' });

export function scheduleFaceVerifyJob() {
  const enabled = process.env.FACE_VERIFY_JOB_ENABLED !== 'false';
  const intervalMs =
    process.env.FACE_VERIFY_JOB_INTERVAL_MS && Number(process.env.FACE_VERIFY_JOB_INTERVAL_MS) > 0
      ? Number(process.env.FACE_VERIFY_JOB_INTERVAL_MS)
      : 30_000;

  if (!enabled) {
    log.info('Face verify job disabled');
    return;
  }

  const tick = async () => {
    try {
      await faceVerifyService.processNextBatch(3);
    } catch (error: any) {
      log.warn('Face verify tick failed', { error: error?.message || String(error) });
    }
  };

  setInterval(tick, intervalMs);
  tick();
  log.info('Face verify job scheduled', { intervalMs });
}

