/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ContentVersionResponse } from '../models/ContentVersionResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ContentVersionService {
    /**
     * Get Active Content Version
     * @returns ContentVersionResponse Successful Response
     * @throws ApiError
     */
    public static getActiveContentVersionApiContentVersionGet(): CancelablePromise<ContentVersionResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/content-version',
        });
    }
}
