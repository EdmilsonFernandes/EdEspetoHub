import { APP_BUILD_INFO } from '../generated/buildInfo';

export const getVersionLabel = () => APP_BUILD_INFO.versionLabel;

export const getVersionWithBuild = () => `${APP_BUILD_INFO.versionLabel} (${APP_BUILD_INFO.shortHash})`;

export const getBuildDateLabel = () => {
  const date = new Date(APP_BUILD_INFO.builtAt);
  if (!Number.isFinite(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
};
