/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */

import type { HealthResponse } from '../models/HealthResponse';
import type { VersionResponse } from '../models/VersionResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HealthService {
    /**
     * Health Check
     * @returns HealthResponse Successful Response
     * @throws ApiError
     */
    public static healthCheckApiHealthGet(): CancelablePromise<HealthResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/health',
        });
    }
    /**
     * Get Version
     * @returns VersionResponse Successful Response
     * @throws ApiError
     */
    public static getVersionApiVersionGet(): CancelablePromise<VersionResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/version',
        });
    }
}
