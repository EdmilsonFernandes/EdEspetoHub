import { getVersionLabel } from '../../utils/appVersion';

type AppVersionBadgeProps = {
  className?: string;
  prefix?: string;
};

export function AppVersionBadge({ className = '', prefix = '' }: AppVersionBadgeProps) {
  return (
    <span className={className}>
      {prefix}
      {getVersionLabel()}
    </span>
  );
}
