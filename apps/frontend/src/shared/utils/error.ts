export function extractErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error === null || error === undefined) {
    return fallback;
  }

  if (typeof error === 'string' && error !== '') {
    return error;
  }

  if (typeof error === 'object') {
    const typedError = error as { message?: string; detail?: unknown; body?: unknown };

    if (typedError.body !== undefined && typedError.body !== null) {
      const bodyMessage = extractObjectFields(typedError.body);
      if (bodyMessage !== null) return bodyMessage;
    }

    return extractObjectFields(error) ?? fallback;
  }

  return fallback;
}

function extractObjectFields(obj: unknown): string | null {
  if (obj === null || obj === undefined) return null;

  if (typeof obj === 'string' && obj !== '') return obj;

  if (typeof obj === 'object') {
    const typed = obj as { message?: string; detail?: unknown };

    if (typeof typed.message === 'string' && typed.message !== '') {
      return typed.message;
    }

    if (typeof typed.detail === 'string' && typed.detail !== '') {
      return typed.detail;
    }

    if (Array.isArray(typed.detail)) {
      const collected = typed.detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item != null && typeof item === 'object') {
            const entry = item as { msg?: string; message?: string };
            return entry.msg ?? entry.message ?? '';
          }
          return '';
        })
        .filter((msg) => msg !== '')
        .join(', ');
      if (collected !== '') return collected;
    }
  }

  return null;
}
