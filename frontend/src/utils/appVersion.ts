import { APP_BUILD_INFO } from '../generated/buildInfo';

const sanitizeVersion = (value: string) => String(value || '').split('+')[0].trim();

export const getVersionLabel = () => `v${sanitizeVersion(APP_BUILD_INFO.version)}`;

export const getVersionWithBuild = () => `${APP_BUILD_INFO.versionLabel} (${APP_BUILD_INFO.shortHash})`;

export const getBuildDateLabel = () => {
  const date = new Date(APP_BUILD_INFO.builtAt);
  if (!Number.isFinite(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
};
