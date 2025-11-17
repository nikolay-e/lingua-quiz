import type { VocabularyItem } from './api-types';

declare global {
  interface Window {
    LINGUA_QUIZ_API_URL?: string;
  }
}

const getServerAddress = (): string => {
  if (typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL !== '') {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window.LINGUA_QUIZ_API_URL === 'string' && window.LINGUA_QUIZ_API_URL !== '') {
    return window.LINGUA_QUIZ_API_URL;
  }

  return '/api';
};

const serverAddress = getServerAddress();

interface ApiErrorResponse {
  message?: string;
  detail?: string;
}

async function fetchWrapper<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    let errorData: ApiErrorResponse = {};
    try {
      errorData = (await response.json()) as ApiErrorResponse;
    } catch {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (response.status === 403) {
      throw new Error('Forbidden - Admin access required');
    }
    if (response.status === 404) {
      throw new Error('Resource not found');
    }

    const errorMessage = errorData.message ?? errorData.detail ?? `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export interface VocabularyItemCreate {
  sourceText: string;
  sourceLanguage: string;
  targetText: string;
  targetLanguage: string;
  listName: string;
  difficultyLevel?: string;
  sourceUsageExample?: string;
  targetUsageExample?: string;
}

export interface VocabularyItemUpdate {
  sourceText?: string;
  targetText?: string;
  sourceUsageExample?: string;
  targetUsageExample?: string;
  isActive?: boolean;
}

const adminApi = {
  searchVocabulary: async (token: string, query: string, limit = 50): Promise<VocabularyItem[]> => {
    const url = `${serverAddress}/admin/vocabulary/search?query=${encodeURIComponent(query)}&limit=${limit}`;
    return fetchWrapper<VocabularyItem[]>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  getVocabularyItem: async (token: string, itemId: string): Promise<VocabularyItem> => {
    return fetchWrapper<VocabularyItem>(`${serverAddress}/admin/vocabulary/${itemId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  createVocabularyItem: async (token: string, data: VocabularyItemCreate): Promise<{ message: string; id: string }> => {
    return fetchWrapper<{ message: string; id: string }>(`${serverAddress}/admin/vocabulary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  updateVocabularyItem: async (
    token: string,
    itemId: string,
    data: VocabularyItemUpdate,
  ): Promise<{ message: string }> => {
    return fetchWrapper<{ message: string }>(`${serverAddress}/admin/vocabulary/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  deleteVocabularyItem: async (token: string, itemId: string): Promise<{ message: string }> => {
    return fetchWrapper<{ message: string }>(`${serverAddress}/admin/vocabulary/${itemId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  listVocabulary: async (
    token: string,
    options: { listName?: string; limit?: number; offset?: number } = {},
  ): Promise<VocabularyItem[]> => {
    const params = new URLSearchParams();
    if (typeof options.listName === 'string' && options.listName !== '') {
      params.append('list_name', options.listName);
    }
    if (typeof options.limit === 'number' && options.limit > 0) {
      params.append('limit', options.limit.toString());
    }
    if (typeof options.offset === 'number' && options.offset >= 0) {
      params.append('offset', options.offset.toString());
    }

    return fetchWrapper<VocabularyItem[]>(`${serverAddress}/admin/vocabulary?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

export default adminApi;
