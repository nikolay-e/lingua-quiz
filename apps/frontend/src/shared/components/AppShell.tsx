import type { ReactNode } from 'react';

import { cn } from '@shared/utils';

const MAX_WIDTH_CLASSES: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

interface AppShellProps {
  children: ReactNode;
  maxWidth?: keyof typeof MAX_WIDTH_CLASSES;
  className?: string;
}

export function AppShell({ children, maxWidth, className }: AppShellProps): React.JSX.Element {
  return (
    <main
      id="main-content"
      className={cn(
        'w-full mx-auto flex flex-col gap-4 page-safe-area md:pt-16 md:pb-12 md:px-6 md:gap-6',
        maxWidth !== undefined && MAX_WIDTH_CLASSES[maxWidth],
        className,
      )}
    >
      {children}
    </main>
  );
}
