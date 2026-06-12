import type { HTMLAttributes } from 'react';
import { cn } from './classNames';

type SkeletonBlockProps = HTMLAttributes<HTMLDivElement> & {
  rounded?: 'sm' | 'md' | 'lg' | 'full';
};

const roundedClasses = {
  sm: 'rounded-lg',
  md: 'rounded-2xl',
  lg: 'rounded-[1.5rem]',
  full: 'rounded-full',
};

export function SkeletonBlock({ rounded = 'md', className, ...props }: SkeletonBlockProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse bg-slate-200/85', roundedClasses[rounded], className)}
      {...props}
    />
  );
}
