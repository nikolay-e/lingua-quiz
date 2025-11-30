/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { VocabularyItemCreate } from '../models/VocabularyItemCreate';
import type { VocabularyItemDetailResponse } from '../models/VocabularyItemDetailResponse';
import type { VocabularyItemUpdate } from '../models/VocabularyItemUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AdminService {
    /**
     * Search Vocabulary
     * @param query
     * @param limit
     * @returns VocabularyItemDetailResponse Successful Response
     * @throws ApiError
     */
    public static searchVocabularyApiAdminVocabularySearchGet(
        query: string,
        limit: number = 50,
    ): CancelablePromise<Array<VocabularyItemDetailResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/vocabulary/search',
            query: {
                'query': query,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Vocabulary Item
     * @param itemId
     * @returns VocabularyItemDetailResponse Successful Response
     * @throws ApiError
     */
    public static getVocabularyItemApiAdminVocabularyItemIdGet(
        itemId: string,
    ): CancelablePromise<VocabularyItemDetailResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/vocabulary/{item_id}',
            path: {
                'item_id': itemId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Vocabulary Item
     * @param itemId
     * @param requestBody
     * @returns string Successful Response
     * @throws ApiError
     */
    public static updateVocabularyItemApiAdminVocabularyItemIdPut(
        itemId: string,
        requestBody: VocabularyItemUpdate,
    ): CancelablePromise<Record<string, string>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/admin/vocabulary/{item_id}',
            path: {
                'item_id': itemId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Vocabulary Item
     * @param itemId
     * @returns string Successful Response
     * @throws ApiError
     */
    public static deleteVocabularyItemApiAdminVocabularyItemIdDelete(
        itemId: string,
    ): CancelablePromise<Record<string, string>> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/vocabulary/{item_id}',
            path: {
                'item_id': itemId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Vocabulary Item
     * @param requestBody
     * @returns string Successful Response
     * @throws ApiError
     */
    public static createVocabularyItemApiAdminVocabularyPost(
        requestBody: VocabularyItemCreate,
    ): CancelablePromise<Record<string, string>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/vocabulary',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Vocabulary
     * @param listName
     * @param limit
     * @param offset
     * @returns VocabularyItemDetailResponse Successful Response
     * @throws ApiError
     */
    public static listVocabularyApiAdminVocabularyGet(
        listName?: (string | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<VocabularyItemDetailResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/vocabulary',
            query: {
                'list_name': listName,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
