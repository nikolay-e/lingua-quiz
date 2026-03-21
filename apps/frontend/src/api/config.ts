import { ApiError, OpenAPI } from '@lingua-quiz/api-client';
import { extractErrorMessage } from '@shared/utils/error';

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

export async function fetchWithAuth<T>(
  endpoint: string,
  options: { method: string; body?: unknown; token: string },
): Promise<T> {
  const url = `${OpenAPI.BASE}${endpoint}`;

  const response = await fetch(url, {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.token}`,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (response.status === 403) {
      throw new Error('Forbidden - Admin access required');
    }
    const errorData = (await response.json().catch(() => ({ detail: response.statusText }))) as { detail?: string };
    throw new Error(errorData.detail ?? `HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json') === true) {
    return response.json() as Promise<T>;
  }
  throw new Error(`Unexpected non-JSON response from ${endpoint}`);
}
