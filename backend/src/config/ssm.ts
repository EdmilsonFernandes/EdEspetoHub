/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: ssm.ts
 * @Date: 2026-01-13
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import fs from 'fs';
/**
 * Parses json.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-01-13
 */
const parseJson = (raw: string) => {
  try {
    return JSON.parse(raw) as Record<string, any>;
  } catch {
    return null;
  }
};

type ApplySsmEnvOptions = {
  shouldOverride?: boolean;
  targetEnv?: NodeJS.ProcessEnv;
};

const ssmPreferredKeys = new Set([
  'TRUSTED_DEVICE_EXPIRATION_DAYS',
  'MFA_TRUSTED_DEVICE_EXPIRATION_DAYS',
]);

/**
 * Applies parsed SSM JSON values to the target environment.
 * Keys missing from SSM are intentionally left untouched so local/env fallback keeps working.
 */
export const applySsmEnvObject = (
  parsed: Record<string, unknown>,
  options: ApplySsmEnvOptions = {}
) => {
  const shouldOverride = options.shouldOverride ?? true;
  const targetEnv = options.targetEnv || process.env;
  const appliedKeys: string[] = [];

  Object.entries(parsed).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (!shouldOverride && targetEnv[key] && !ssmPreferredKeys.has(key)) return;
    targetEnv[key] = String(value);
    appliedKeys.push(key);
  });

  return appliedKeys;
};
/**
 * Loads ssm env.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-01-13
 */
export const loadSsmEnv = async () => {
  const parameterName = process.env.SSM_PARAMETER_NAME;
  if (!parameterName) return;

  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  if (!region) {
    throw new Error('AWS_REGION is required to load SSM parameter');
  }

  const client = new SSMClient({ region });
  const response = await client.send(
    new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true,
    })
  );

  const raw = response.Parameter?.Value;
  if (!raw) {
    throw new Error(`SSM parameter ${parameterName} is empty`);
  }

  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`SSM parameter ${parameterName} must be a JSON object`);
  }

  const shouldOverride = process.env.SSM_OVERRIDE !== 'false';
  const overrides: Record<string, string> = {};
  const appliedKeys = applySsmEnvObject(parsed, { shouldOverride });

  const runningInDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER === 'true';
  if (!runningInDocker) {
    const localDbHost = process.env.SSM_LOCAL_DB_HOST;
    if (localDbHost && process.env.PGHOST === 'postgres') {
      process.env.PGHOST = localDbHost;
      overrides.PGHOST = localDbHost;
    }
  }

  const logKeys = process.env.SSM_LOG_KEYS === 'true';
  const logOverrides = process.env.SSM_LOG_OVERRIDES !== 'false';
  console.info('SSM env loaded', {
    parameter: parameterName,
    keys: Object.keys(parsed).length,
    applied: appliedKeys.length,
    override: shouldOverride,
    docker: runningInDocker,
    ...(logKeys ? { appliedKeys } : {}),
    ...(logOverrides && Object.keys(overrides).length ? { overrides } : {}),
  });
};
