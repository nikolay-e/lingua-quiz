import type { ReactNode } from 'react';
import { cn } from '@shared/utils';

type MaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

interface PageContainerProps {
  children: ReactNode;
  maxWidth?: MaxWidth;
  centered?: boolean;
  className?: string;
}

const maxWidthClasses: Record<MaxWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

export function PageContainer({
  children,
  maxWidth = '3xl',
  centered = false,
  className,
}: PageContainerProps): React.JSX.Element {
  return (
    <main className={cn('min-h-screen bg-background', centered ? 'flex items-center justify-center p-4' : 'px-4 py-8')}>
      <div className={cn('w-full mx-auto', maxWidthClasses[maxWidth], !centered && 'flex flex-col gap-6', className)}>
        {children}
      </div>
    </main>
  );
}
