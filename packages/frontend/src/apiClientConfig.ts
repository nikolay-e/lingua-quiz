import { ApiError, OpenAPI } from './generated/api';
import { extractErrorMessage } from './lib/utils/error';

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

    const message = extractErrorMessage(error.body, `Request failed with status ${error.status}`);
    throw new Error(message);
  }

  throw error instanceof Error ? error : new Error('Request failed');
};

export async function executeApiCall<T>(
  operation: () => Promise<T>,
  options?: { token?: string; requireAuth?: boolean },
): Promise<T> {
  const { token, requireAuth = false } = options ?? {};

  if (token !== undefined) {
    setAuthToken(token);
  } else if (requireAuth) {
    throw new Error('Authentication required but no token provided');
  }

  try {
    return await operation();
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
