export function extractErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  return error instanceof Error ? error.message : fallback;
}

type AsyncSuccess<T> = { success: true; data: T };
type AsyncFailure = { success: false; error: string };
export type AsyncResult<T> = AsyncSuccess<T> | AsyncFailure;

export async function safeAsync<T>(
  operation: () => Promise<T>,
  errorLabel: string,
  fallbackMessage = 'An unexpected error occurred',
): Promise<AsyncResult<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error: unknown) {
    console.error(`${errorLabel}:`, error);
    const message = extractErrorMessage(error, fallbackMessage);
    return { success: false, error: message };
  }
}
