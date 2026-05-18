import { afterEach, describe, expect, it } from 'vitest';
import { env } from './env';
import { validateCriticalRuntimeConfig } from './runtimeValidation';

const snapshot = () => ({
  jwtSecret: env.jwtSecret,
  appUrl: env.appUrl,
  strictRuntimeValidation: env.security.strictRuntimeValidation,
  publicUploadsMode: env.storage.publicUploadsMode,
  publicUploadsS3Bucket: env.storage.publicUploadsS3Bucket,
  publicUploadsS3Region: env.storage.publicUploadsS3Region,
  mfaEnabled: env.mfa.enabled,
  mfaSecretEncryptionKey: env.mfa.secretEncryptionKey,
});

const restore = (state: ReturnType<typeof snapshot>) => {
  env.jwtSecret = state.jwtSecret;
  env.appUrl = state.appUrl;
  env.security.strictRuntimeValidation = state.strictRuntimeValidation;
  env.storage.publicUploadsMode = state.publicUploadsMode;
  env.storage.publicUploadsS3Bucket = state.publicUploadsS3Bucket;
  env.storage.publicUploadsS3Region = state.publicUploadsS3Region;
  env.mfa.enabled = state.mfaEnabled;
  env.mfa.secretEncryptionKey = state.mfaSecretEncryptionKey;
};

const initial = snapshot();

describe('runtime config validation', () => {
  afterEach(() => restore(initial));

  it('bloqueia MFA ativo sem chave fixa de criptografia', () => {
    env.jwtSecret = 'safe-jwt-secret-with-more-than-32-chars';
    env.security.strictRuntimeValidation = false;
    env.storage.publicUploadsMode = 'local';
    env.mfa.enabled = true;
    env.mfa.secretEncryptionKey = '';

    expect(() => validateCriticalRuntimeConfig()).toThrow(/MFA_SECRET_ENCRYPTION_KEY/);
  });

  it('permite MFA ativo com chave fixa de criptografia', () => {
    env.jwtSecret = 'safe-jwt-secret-with-more-than-32-chars';
    env.security.strictRuntimeValidation = false;
    env.storage.publicUploadsMode = 'local';
    env.mfa.enabled = true;
    env.mfa.secretEncryptionKey = 'safe-mfa-secret-encryption-key-with-more-than-32-chars';

    expect(() => validateCriticalRuntimeConfig()).not.toThrow();
  });
});
