/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TTSLanguagesResponse } from '../models/TTSLanguagesResponse';
import type { TTSRequest } from '../models/TTSRequest';
import type { TTSResponse } from '../models/TTSResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TextToSpeechService {
  /**
   * Synthesize Speech
   * @param requestBody
   * @returns TTSResponse Successful Response
   * @throws ApiError
   */
  public static synthesizeSpeechApiTtsSynthesizePost(requestBody: TTSRequest): CancelablePromise<TTSResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/tts/synthesize',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get Tts Languages
   * @returns TTSLanguagesResponse Successful Response
   * @throws ApiError
   */
  public static getTtsLanguagesApiTtsLanguagesGet(): CancelablePromise<TTSLanguagesResponse> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/tts/languages',
    });
  }
}
