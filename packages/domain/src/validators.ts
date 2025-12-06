import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import openapi from '../../../lingua-quiz-schema.json';

import type { JSONSchema7 } from 'json-schema';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

type Validator<T> = (data: unknown) => { valid: boolean; errors: string[] };

const compile = <T>(schema: JSONSchema7): Validator<T> => {
  const validate = ajv.compile(schema);
  return (data: unknown) => {
    const valid = validate(data) as boolean;
    return {
      valid,
      errors: valid
        ? []
        : (validate.errors ?? []).map((e) => {
            const path = 'instancePath' in e ? e.instancePath : '';
            return `${path} ${e.message ?? ''}`.trim();
          }),
    };
  };
};

const schemas = (openapi as { components?: { schemas?: Record<string, JSONSchema7> } }).components?.schemas || {};

export const validateVocabularyItem = compile<unknown>(schemas.VocabularyItemResponse as JSONSchema7);
export const validateWordList = compile<unknown>(schemas.WordListResponse as JSONSchema7);
export const validateUser = compile<unknown>(schemas.UserResponse as JSONSchema7);
export const validateUserProgress = compile<unknown>(schemas.UserProgressResponse as JSONSchema7);
export const validateProgressUpdate = compile<unknown>(schemas.ProgressUpdateRequest as JSONSchema7);
export const validateContentVersion = compile<unknown>(schemas.ContentVersionResponse as JSONSchema7);
export const validateTtsRequest = compile<unknown>(schemas.TTSRequest as JSONSchema7);
export const validateTtsResponse = compile<unknown>(schemas.TTSResponse as JSONSchema7);
export const validateTtsLanguages = compile<unknown>(schemas.TTSLanguagesResponse as JSONSchema7);
