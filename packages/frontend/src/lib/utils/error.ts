export function extractErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  return error instanceof Error ? error.message : fallback;
}
