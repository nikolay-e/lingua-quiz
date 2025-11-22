import {
  AdminService,
  type VocabularyItemCreate,
  type VocabularyItemDetailResponse,
  type VocabularyItemUpdate,
} from '@lingua-quiz/api-client';
import type { AdminVocabularyItem } from './api-types';
import { handleApiError, setAuthToken } from './apiClientConfig';

const execute = async <T>(token: string, operation: () => Promise<T>): Promise<T> => {
  setAuthToken(token);
  try {
    return await operation();
  } catch (error) {
    return handleApiError(error);
  }
};

const adminApi = {
  searchVocabulary: (token: string, query: string, limit = 50): Promise<AdminVocabularyItem[]> =>
    execute(token, () => AdminService.searchVocabularyApiAdminVocabularySearchGet(query, limit)),

  getVocabularyItem: (token: string, itemId: string): Promise<AdminVocabularyItem> =>
    execute(token, () => AdminService.getVocabularyItemApiAdminVocabularyItemIdGet(itemId)),

  createVocabularyItem: (token: string, data: VocabularyItemCreate): Promise<{ message: string; id: string }> =>
    execute(token, () => AdminService.createVocabularyItemApiAdminVocabularyPost(data)),

  updateVocabularyItem: (token: string, itemId: string, data: VocabularyItemUpdate): Promise<{ message: string }> =>
    execute(token, () => AdminService.updateVocabularyItemApiAdminVocabularyItemIdPut(itemId, data)),

  deleteVocabularyItem: (token: string, itemId: string): Promise<{ message: string }> =>
    execute(token, () => AdminService.deleteVocabularyItemApiAdminVocabularyItemIdDelete(itemId)),

  listVocabulary: (
    token: string,
    options: { listName?: string; limit?: number; offset?: number } = {},
  ): Promise<AdminVocabularyItem[]> => {
    const { listName, limit = 100, offset } = options;
    return execute(token, () => AdminService.listVocabularyApiAdminVocabularyGet(listName ?? null, limit, offset));
  },
};

export type { VocabularyItemCreate, VocabularyItemDetailResponse, VocabularyItemUpdate };

export default adminApi;
