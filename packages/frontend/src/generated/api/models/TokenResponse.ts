/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserResponse } from './UserResponse';
export type TokenResponse = {
    token: string;
    refresh_token: string;
    expires_in?: (string | null);
    user: UserResponse;
};

