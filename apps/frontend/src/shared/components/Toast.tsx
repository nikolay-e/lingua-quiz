import { useEffect, useRef, useCallback, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToasts, useRemoveToast } from '@shared/stores/toast.store';
import { cn } from '@shared/utils';

export { useToast } from '@shared/stores/toast.store';

export function Toasts(): React.JSX.Element | null {
  const toasts = useToasts();
  const remove = useRemoveToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={remove} />
      ))}
    </div>
  );
}

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toast: ToastItem;
  onRemove: (id: number) => void;
}

const TOAST_DURATION = 4000;
const MIN_REMAINING_AFTER_PAUSE = 500;

function Toast({ toast, onRemove }: ToastProps): React.JSX.Element {
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(TOAST_DURATION);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onRemoveRef = useRef(onRemove);
  onRemoveRef.current = onRemove;

  const scheduleRemoval = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onRemoveRef.current(toast.id);
    }, remainingRef.current);
  }, [toast.id]);

  useEffect(() => {
    scheduleRemoval();
    return () => {
      clearTimeout(timerRef.current);
    };
  }, [scheduleRemoval]);

  const handleMouseEnter = () => {
    clearTimeout(timerRef.current);
    remainingRef.current = Math.max(
      MIN_REMAINING_AFTER_PAUSE,
      remainingRef.current - (Date.now() - startTimeRef.current),
    );
    setPaused(true);
  };

  const handleMouseLeave = () => {
    setPaused(false);
    scheduleRemoval();
  };

  const getIcon = () => {
    if (toast.type === 'success') return CheckCircle;
    if (toast.type === 'error') return AlertCircle;
    return Info;
  };
  const Icon = getIcon();

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-slide-in',
        'bg-card border border-border',
        toast.type === 'success' && 'border-success/50',
        toast.type === 'error' && 'border-destructive/50',
        toast.type === 'info' && 'border-primary/50',
        paused && 'shadow-xl',
      )}
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Icon
        size={18}
        aria-hidden="true"
        className={cn(
          toast.type === 'success' && 'text-success',
          toast.type === 'error' && 'text-destructive',
          toast.type === 'info' && 'text-primary',
        )}
      />
      <span className="text-sm text-foreground">{toast.message}</span>
      <button
        type="button"
        onClick={() => {
          onRemove(toast.id);
        }}
        className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
