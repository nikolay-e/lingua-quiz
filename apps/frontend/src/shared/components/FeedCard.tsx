import type { ReactNode } from 'react';
import { cn } from '@shared/utils';

interface FeedCardProps {
  title?: string;
  subtitle?: string;
  dense?: boolean;
  className?: string;
  headerAction?: ReactNode;
  children?: ReactNode;
}

export function FeedCard({
  title,
  subtitle,
  dense = false,
  className,
  headerAction,
  children,
}: FeedCardProps): React.JSX.Element {
  return (
    <article className={cn('bg-card border border-border rounded-lg shadow-sm', dense ? 'p-4' : 'p-6', className)}>
      {(title !== undefined || subtitle !== undefined || headerAction !== undefined) && (
        <header className="mb-3">
          <div className="flex justify-between items-center gap-4">
            <div>
              {title !== undefined && <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>}
              {subtitle !== undefined && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {headerAction !== undefined && <div className="shrink-0">{headerAction}</div>}
          </div>
        </header>
      )}
      <div className="flex flex-col gap-3">{children}</div>
    </article>
  );
}
