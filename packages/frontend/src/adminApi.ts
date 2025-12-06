import {
  AdminService,
  type VocabularyItemCreate,
  type VocabularyItemDetailResponse,
  type VocabularyItemUpdate,
} from './generated/api';
import type { AdminVocabularyItem } from './api-types';
import { executeApiCall } from './apiClientConfig';

const adminApi = {
  searchVocabulary: (token: string, query: string, limit = 50): Promise<AdminVocabularyItem[]> =>
    executeApiCall(() => AdminService.searchVocabularyApiAdminVocabularySearchGet(query, limit), {
      token,
      requireAuth: true,
    }),

  getVocabularyItem: (token: string, itemId: string): Promise<AdminVocabularyItem> =>
    executeApiCall(() => AdminService.getVocabularyItemApiAdminVocabularyItemIdGet(itemId), {
      token,
      requireAuth: true,
    }),

  createVocabularyItem: (token: string, data: VocabularyItemCreate): Promise<Record<string, string>> =>
    executeApiCall(() => AdminService.createVocabularyItemApiAdminVocabularyPost(data), { token, requireAuth: true }),

  updateVocabularyItem: (token: string, itemId: string, data: VocabularyItemUpdate): Promise<Record<string, string>> =>
    executeApiCall(() => AdminService.updateVocabularyItemApiAdminVocabularyItemIdPut(itemId, data), {
      token,
      requireAuth: true,
    }),

  deleteVocabularyItem: (token: string, itemId: string): Promise<Record<string, string>> =>
    executeApiCall(() => AdminService.deleteVocabularyItemApiAdminVocabularyItemIdDelete(itemId), {
      token,
      requireAuth: true,
    }),

  listVocabulary: (
    token: string,
    options: { listName?: string; limit?: number; offset?: number } = {},
  ): Promise<AdminVocabularyItem[]> => {
    const { listName, limit = 100, offset } = options;
    return executeApiCall(() => AdminService.listVocabularyApiAdminVocabularyGet(listName ?? null, limit, offset), {
      token,
      requireAuth: true,
    });
  },
};

export type { VocabularyItemCreate, VocabularyItemDetailResponse, VocabularyItemUpdate };

export default adminApi;
