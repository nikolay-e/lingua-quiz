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
      const bodyMessage = extractErrorFromBody(typedError.body);
      if (bodyMessage !== null) return bodyMessage;
    }

    if (typeof typedError.message === 'string' && typedError.message !== '') {
      return typedError.message;
    }

    if (typeof typedError.detail === 'string' && typedError.detail !== '') {
      return typedError.detail;
    }

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
