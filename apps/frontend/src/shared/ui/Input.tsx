import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@shared/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, invalid = false, ...props }, ref) => {
  return (
    <input
      ref={ref}
      data-slot="input"
      aria-invalid={invalid}
      className={cn(
        'flex h-10 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'min-h-[var(--touch-target-min)]',
        'transition-colors duration-150',
        invalid && 'border-error focus-visible:border-error focus-visible:ring-error/30',
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';
