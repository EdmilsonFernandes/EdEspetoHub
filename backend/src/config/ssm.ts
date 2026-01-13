import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import fs from 'fs';

const parseJson = (raw: string) => {
  try {
    return JSON.parse(raw) as Record<string, any>;
  } catch {
    return null;
  }
};

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
  const appliedKeys: string[] = [];
  const overrides: Record<string, string> = {};
  Object.entries(parsed).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (!shouldOverride && process.env[key]) return;
    process.env[key] = String(value);
    appliedKeys.push(key);
  });

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
