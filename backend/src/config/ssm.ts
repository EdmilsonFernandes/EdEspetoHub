import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

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
  Object.entries(parsed).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (!shouldOverride && process.env[key]) return;
    process.env[key] = String(value);
  });
};
