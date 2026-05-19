import { describe, expect, it } from 'vitest';
import { applySsmEnvObject } from './ssm';

describe('SSM env helpers', () => {
  it('aplica chaves do SSM e mantem fallback local quando a chave nao vem no JSON', () => {
    const targetEnv: NodeJS.ProcessEnv = {
      MFA_ENABLED: 'false',
      MFA_SECRET_ENCRYPTION_KEY: 'local-fixed-key-with-more-than-32-chars',
    };

    const applied = applySsmEnvObject(
      {
        MFA_ENABLED: 'true',
        TRUSTED_DEVICE_EXPIRATION_DAYS: 45,
      },
      { targetEnv }
    );

    expect(applied).toEqual(['MFA_ENABLED', 'TRUSTED_DEVICE_EXPIRATION_DAYS']);
    expect(targetEnv.MFA_ENABLED).toBe('true');
    expect(targetEnv.TRUSTED_DEVICE_EXPIRATION_DAYS).toBe('45');
    expect(targetEnv.MFA_SECRET_ENCRYPTION_KEY).toBe('local-fixed-key-with-more-than-32-chars');
  });

  it('respeita SSM_OVERRIDE=false e nao sobrescreve variaveis existentes', () => {
    const targetEnv: NodeJS.ProcessEnv = {
      MFA_ENABLED: 'false',
      TRUSTED_DEVICE_ENABLED: 'false',
    };

    const applied = applySsmEnvObject(
      {
        MFA_ENABLED: 'true',
        TRUSTED_DEVICE_ENABLED: 'true',
        MFA_CHALLENGE_TTL_MINUTES: 10,
      },
      { targetEnv, shouldOverride: false }
    );

    expect(applied).toEqual(['MFA_CHALLENGE_TTL_MINUTES']);
    expect(targetEnv.MFA_ENABLED).toBe('false');
    expect(targetEnv.TRUSTED_DEVICE_ENABLED).toBe('false');
    expect(targetEnv.MFA_CHALLENGE_TTL_MINUTES).toBe('10');
  });

  it('mantem o SSM como fonte preferencial para dias de dispositivo confiavel', () => {
    const targetEnv: NodeJS.ProcessEnv = {
      TRUSTED_DEVICE_EXPIRATION_DAYS: '30',
      MFA_TRUSTED_DEVICE_EXPIRATION_DAYS: '30',
    };

    const applied = applySsmEnvObject(
      {
        TRUSTED_DEVICE_EXPIRATION_DAYS: 180,
        MFA_TRUSTED_DEVICE_EXPIRATION_DAYS: 180,
      },
      { targetEnv, shouldOverride: false }
    );

    expect(applied).toEqual(['TRUSTED_DEVICE_EXPIRATION_DAYS', 'MFA_TRUSTED_DEVICE_EXPIRATION_DAYS']);
    expect(targetEnv.TRUSTED_DEVICE_EXPIRATION_DAYS).toBe('180');
    expect(targetEnv.MFA_TRUSTED_DEVICE_EXPIRATION_DAYS).toBe('180');
  });
});
