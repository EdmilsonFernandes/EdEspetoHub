import { SubscriptionService } from '../services/SubscriptionService';
import { logger } from '../utils/logger';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const scheduleSubscriptionExpirationJob = () => {
  const service = new SubscriptionService();
  const log = logger.child({ scope: 'SubscriptionJob' });

  const run = async () => {
    await service.updateStatusesForAll();
  };

  run().catch((error) => log.error('Erro ao executar verificacao de assinatura', { error }));

  setInterval(() => {
    run().catch((error) => log.error('Erro ao executar verificacao de assinatura', { error }));
  }, DAY_IN_MS);
};
