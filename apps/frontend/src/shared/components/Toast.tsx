import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@shared/utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (message: string) => {
      addToast(message, 'success');
    },
    [addToast],
  );

  const error = useCallback(
    (message: string) => {
      addToast(message, 'error');
    },
    [addToast],
  );

  const info = useCallback(
    (message: string) => {
      addToast(message, 'info');
    },
    [addToast],
  );

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: number) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps): React.JSX.Element | null {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface ToastProps {
  toast: ToastItem;
  onRemove: (id: number) => void;
}

function Toast({ toast, onRemove }: ToastProps): React.JSX.Element {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000);
    return () => {
      clearTimeout(timer);
    };
  }, [toast.id, onRemove]);

  const Icon = toast.type === 'success' ? CheckCircle : toast.type === 'error' ? AlertCircle : Info;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-slide-in',
        'bg-card border border-border',
        toast.type === 'success' && 'border-success/50',
        toast.type === 'error' && 'border-destructive/50',
        toast.type === 'info' && 'border-primary/50',
      )}
      role="alert"
    >
      <Icon
        size={18}
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
        className="ml-2 text-muted-foreground hover:text-foreground"
      >
        <X size={16} />
      </button>
    </div>
  );
}
