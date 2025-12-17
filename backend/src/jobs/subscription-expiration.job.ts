import { SubscriptionService } from '../services/SubscriptionService';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const scheduleSubscriptionExpirationJob = () => {
  const service = new SubscriptionService();

  const run = async () => {
    await service.updateStatusesForAll();
  };

  run().catch((error) => console.error('Erro ao executar verificação de assinatura', error));

  setInterval(() => {
    run().catch((error) => console.error('Erro ao executar verificação de assinatura', error));
  }, DAY_IN_MS);
};
