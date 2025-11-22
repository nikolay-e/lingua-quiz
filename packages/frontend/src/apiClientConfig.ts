import { ApiError, OpenAPI } from './generated/api';

declare global {
  interface Window {
    LINGUA_QUIZ_API_URL?: string;
  }
}

const getServerAddress = (): string => {
  if (typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL !== '') {
    return import.meta.env.VITE_API_URL;
  }

  if (
    typeof window !== 'undefined' &&
    typeof window.LINGUA_QUIZ_API_URL === 'string' &&
    window.LINGUA_QUIZ_API_URL !== ''
  ) {
    return window.LINGUA_QUIZ_API_URL;
  }

  return '/api';
};

const normalizeApiBase = (address: string): string => {
  const trimmed = address.replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) {
    return trimmed.slice(0, -4);
  }
  return trimmed;
};

const apiBaseUrl = normalizeApiBase(getServerAddress());

OpenAPI.BASE = apiBaseUrl;
OpenAPI.WITH_CREDENTIALS = false;

export const setAuthToken = (token?: string): void => {
  OpenAPI.TOKEN = token ?? undefined;
};

const extractErrorMessage = (body: unknown): string | undefined => {
  if (body === null || body === undefined) return undefined;

  if (typeof body === 'string') {
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
      return collected !== '' ? collected : undefined;
    }
  }

  return undefined;
};

export const handleApiError = (error: unknown): never => {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      throw new Error('Unauthorized');
    }
    if (error.status === 403) {
      throw new Error('Forbidden - Admin access required');
    }
    if (error.status === 404) {
      throw new Error('Resource not found');
    }

    const message = extractErrorMessage(error.body);
    if (message !== undefined) {
      throw new Error(message);
    }
    throw new Error(`Request failed with status ${error.status}`);
  }

  throw error instanceof Error ? error : new Error('Request failed');
};

export { apiBaseUrl, getServerAddress };
