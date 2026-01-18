/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { VocabularyItemResponse } from '../models/VocabularyItemResponse';
import type { WordListResponse } from '../models/WordListResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class VocabularyService {
  /**
   * Get Word Lists
   * @returns WordListResponse Successful Response
   * @throws ApiError
   */
  public static getWordListsApiWordListsGet(): CancelablePromise<Array<WordListResponse>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/word-lists',
    });
  }
  /**
   * Get Translations
   * @param listName
   * @returns VocabularyItemResponse Successful Response
   * @throws ApiError
   */
  public static getTranslationsApiTranslationsGet(listName: string): CancelablePromise<Array<VocabularyItemResponse>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/translations',
      query: {
        list_name: listName,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
