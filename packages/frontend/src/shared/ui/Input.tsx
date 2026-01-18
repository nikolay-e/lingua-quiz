import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@shared/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, invalid = false, ...props }, ref) => {
  return (
    <input
      ref={ref}
      aria-invalid={invalid}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm',
        'ring-offset-background placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'min-h-[var(--touch-target-min)]',
        invalid && 'border-error focus-visible:ring-error',
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';
