import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: ToastItem[];
}

interface ToastStoreActions {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  remove: (id: number) => void;
}

type ToastStore = ToastState & ToastStoreActions;

let toastId = 0;

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],

  success: (message: string) => {
    const id = ++toastId;
    set((state) => ({ toasts: [...state.toasts, { id, message, type: 'success' }] }));
  },

  error: (message: string) => {
    const id = ++toastId;
    set((state) => ({ toasts: [...state.toasts, { id, message, type: 'error' }] }));
  },

  info: (message: string) => {
    const id = ++toastId;
    set((state) => ({ toasts: [...state.toasts, { id, message, type: 'info' }] }));
  },

  remove: (id: number) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

export interface ToastActions {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

export function useToast(): ToastActions {
  return useToastStore((state) => ({
    success: state.success,
    error: state.error,
    info: state.info,
  }));
}

export const useToasts = (): ToastItem[] => useToastStore((state) => state.toasts);
export const useRemoveToast = (): ((id: number) => void) => useToastStore((state) => state.remove);
