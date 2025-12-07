export function useAsyncAction<T>(
  operation: () => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (e: Error) => void;
  },
) {
  let loading = $state(false);
  let error = $state<Error | null>(null);

  async function execute(): Promise<T | undefined> {
    loading = true;
    error = null;
    try {
      const result = await operation();
      options?.onSuccess?.(result);
      return result;
    } catch (e) {
      error = e as Error;
      options?.onError?.(e as Error);
      return undefined;
    } finally {
      loading = false;
    }
  }

  return {
    execute,
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },
  };
}

export function useFormAction<T>(options?: { onSuccess?: (data: T) => void; onError?: (e: Error) => void }) {
  let loading = $state(false);
  let error = $state<Error | null>(null);
  let message = $state('');

  async function submit(operation: () => Promise<T>): Promise<T | undefined> {
    loading = true;
    error = null;
    message = '';
    try {
      const result = await operation();
      options?.onSuccess?.(result);
      return result;
    } catch (e) {
      error = e as Error;
      message = (e as Error).message;
      options?.onError?.(e as Error);
      return undefined;
    } finally {
      loading = false;
    }
  }

  return {
    submit,
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },
    get message() {
      return message;
    },
    setMessage(msg: string) {
      message = msg;
    },
  };
}
