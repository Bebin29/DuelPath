import { cn } from '@/lib/utils';

/**
 * Skeleton-Loader Komponente für Loading-States
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export { Skeleton };
