/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: ssm.ts
 * @Date: 2026-01-26
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const shouldOverride = () => {
  const flag = process.env.SSM_OVERRIDE;
  if (!flag) return false;
  return [ '1', 'true', 'yes' ].includes(flag.toLowerCase());
};

/**
 * Loads environment variables from AWS SSM Parameter Store.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-26
 */
export const loadSsmEnv = async () => {
  const name = process.env.SSM_PARAMETER_NAME;
  const region = process.env.AWS_REGION;
  if (!name || !region) return;

  const client = new SSMClient({ region });
  const response = await client.send(
    new GetParameterCommand({
      Name: name,
      WithDecryption: true,
    })
  );

  const raw = response.Parameter?.Value;
  if (!raw) return;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error('[maps] invalid SSM JSON', error);
    return;
  }

  const override = shouldOverride();
  const reservedKeys = new Set([ 'PORT', 'CORS_ORIGIN' ]);
  Object.entries(parsed).forEach(([key, value]) => {
    if (reservedKeys.has(key)) return;
    const normalizedValue = value == null ? undefined : String(value).trim();
    if (!normalizedValue) return;
    if (override || !process.env[key]) {
      process.env[key] = normalizedValue;
    }
  });

  console.log('[maps] SSM env loaded', {
    parameter: name,
    keys: Object.keys(parsed).length,
    hasGoogleMapsApiKey: Boolean(process.env.GOOGLE_MAPS_API_KEY),
    hasGoogleMapsJsKey: Boolean(process.env.VITE_GOOGLE_MAPS_JS_KEY),
  });
};
