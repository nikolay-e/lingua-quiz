/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BulkProgressUpdateRequest } from '../models/BulkProgressUpdateRequest';
import type { ProgressUpdateRequest } from '../models/ProgressUpdateRequest';
import type { UserProgressResponse } from '../models/UserProgressResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ProgressService {
    /**
     * Get User Progress
     * @param listName
     * @returns UserProgressResponse Successful Response
     * @throws ApiError
     */
    public static getUserProgressApiUserProgressGet(
        listName?: (string | null),
    ): CancelablePromise<Array<UserProgressResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/user/progress',
            query: {
                'list_name': listName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Save User Progress
     * @param requestBody
     * @returns string Successful Response
     * @throws ApiError
     */
    public static saveUserProgressApiUserProgressPost(
        requestBody: ProgressUpdateRequest,
    ): CancelablePromise<Record<string, string>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/user/progress',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Save Bulk Progress
     * @param requestBody
     * @returns string Successful Response
     * @throws ApiError
     */
    public static saveBulkProgressApiUserProgressBulkPost(
        requestBody: BulkProgressUpdateRequest,
    ): CancelablePromise<Record<string, string>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/user/progress/bulk',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
