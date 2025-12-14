/**
 * Extracts error message from various error formats:
 * - Error objects (instanceof Error)
 * - API response bodies (string, {message}, {detail}, {detail: array})
 * - Unknown values (returns fallback)
 */
export function extractErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  // Handle Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle null/undefined
  if (error === null || error === undefined) {
    return fallback;
  }

  // Handle string errors
  if (typeof error === 'string' && error !== '') {
    return error;
  }

  // Handle API response bodies
  if (typeof error === 'object') {
    const typedError = error as { message?: string; detail?: unknown; body?: unknown };

    // Extract from nested body (ApiError format)
    if (typedError.body !== undefined && typedError.body !== null) {
      const bodyMessage = extractErrorFromBody(typedError.body);
      if (bodyMessage !== null) return bodyMessage;
    }

    // Extract from message field
    if (typeof typedError.message === 'string' && typedError.message !== '') {
      return typedError.message;
    }

    // Extract from detail field (string)
    if (typeof typedError.detail === 'string' && typedError.detail !== '') {
      return typedError.detail;
    }

    // Extract from detail field (array of errors)
    if (Array.isArray(typedError.detail)) {
      const collected = typedError.detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item != null && typeof item === 'object') {
            const obj = item as { msg?: string; message?: string };
            return obj.msg ?? obj.message ?? '';
          }
          return '';
        })
        .filter((msg) => msg !== '')
        .join(', ');
      if (collected !== '') return collected;
    }
  }

  return fallback;
}

/**
 * Helper function to extract error message from API response body
 */
function extractErrorFromBody(body: unknown): string | null {
  if (body === null || body === undefined) return null;

  if (typeof body === 'string' && body !== '') {
    return body;
  }

  if (typeof body === 'object') {
    const typedBody = body as { message?: string; detail?: unknown };

    if (typeof typedBody.message === 'string' && typedBody.message !== '') {
      return typedBody.message;
    }

    if (typeof typedBody.detail === 'string' && typedBody.detail !== '') {
      return typedBody.detail;
    }

    if (Array.isArray(typedBody.detail)) {
      const collected = typedBody.detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item != null && typeof item === 'object') {
            const obj = item as { msg?: string; message?: string };
            return obj.msg ?? obj.message ?? '';
          }
          return '';
        })
        .filter((msg) => msg !== '')
        .join(', ');
      return collected !== '' ? collected : null;
    }
  }

  return null;
}
