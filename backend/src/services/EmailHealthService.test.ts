import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  getValue: vi.fn(),
  setValue: vi.fn(),
}));

vi.mock('../config/database', () => ({
  AppDataSource: {
    isInitialized: true,
    query: mocks.query,
  },
}));

vi.mock('../config/env', () => ({
  env: {
    ops: {
      alertWebhookUrl: '',
      emailAlertThrottleMinutes: 30,
    },
  },
}));

vi.mock('./SettingsService', () => ({
  SettingsService: class {
    getValue = mocks.getValue;
    setValue = mocks.setValue;
  },
}));

import { EmailHealthService } from './EmailHealthService';

describe('EmailHealthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marca bloqueio do provedor SMTP como degradado e crítico', async () => {
    mocks.query.mockResolvedValueOnce([{ count: '1' }]);

    await new EmailHealthService().recordFailure({
      templateKey: 'customer_verification',
      category: 'account',
      toEmail: 'cliente@exemplo.com',
      subject: 'Código de verificação',
      errorMessage: 'Message failed: 550 5.4.6 Unusual sending activity detected. Click UnblockMe.',
    });

    expect(mocks.setValue).toHaveBeenCalledWith('ops.email_health', expect.any(String));
    const [, rawPayload] = mocks.setValue.mock.calls[0];
    const payload = JSON.parse(rawPayload);

    expect(payload).toMatchObject({
      status: 'degraded',
      severity: 'critical',
      reason: 'smtp_provider_blocked_or_limited',
      lastTemplateKey: 'customer_verification',
      lastToEmail: 'cl*****@exemplo.com',
    });
    expect(payload.suggestedAction).toContain('Zoho');
  });

  it('retorna saúde normal quando não há falhas recentes', async () => {
    mocks.getValue.mockResolvedValueOnce(null);
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FILTER')) {
        return [{ sent_last_hour: '3', failed_last_hour: '0', failed_last_15_min: '0' }];
      }
      return [
        {
          template_key: 'customer_verification',
          to_email: 'cliente@exemplo.com',
          status: 'sent',
          error_message: null,
          created_at: '2026-06-06T18:19:08.000Z',
        },
      ];
    });

    const overview = await new EmailHealthService().getOverview();

    expect(overview).toMatchObject({
      status: 'healthy',
      severity: 'ok',
      sentLastHour: 3,
      failedLastHour: 0,
      failedLast15Min: 0,
    });
  });
});
