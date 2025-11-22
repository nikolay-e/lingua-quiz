import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import contentVersionSchema from '../../domain-schema/content_version.schema.json';
import progressUpdateSchema from '../../domain-schema/progress_update.schema.json';
import ttsLanguagesSchema from '../../domain-schema/tts_languages.schema.json';
import ttsRequestSchema from '../../domain-schema/tts_request.schema.json';
import ttsResponseSchema from '../../domain-schema/tts_response.schema.json';
import userSchema from '../../domain-schema/user.schema.json';
import userProgressSchema from '../../domain-schema/user_progress.schema.json';
import vocabularyItemSchema from '../../domain-schema/vocabulary_item.schema.json';
import wordListSchema from '../../domain-schema/word_list.schema.json';

import type { JSONSchema7 } from 'json-schema';

const ajv = new Ajv({ allErrors: true, strict: false } as any);
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
            const path = 'instancePath' in e ? e.instancePath : ((e as any).dataPath ?? '');
            return `${path} ${e.message ?? ''}`.trim();
          }),
    };
  };
};

export const validateVocabularyItem = compile<unknown>(vocabularyItemSchema as JSONSchema7);
export const validateWordList = compile<unknown>(wordListSchema as JSONSchema7);
export const validateUser = compile<unknown>(userSchema as JSONSchema7);
export const validateUserProgress = compile<unknown>(userProgressSchema as JSONSchema7);
export const validateProgressUpdate = compile<unknown>(progressUpdateSchema as JSONSchema7);
export const validateContentVersion = compile<unknown>(contentVersionSchema as JSONSchema7);
export const validateTtsRequest = compile<unknown>(ttsRequestSchema as JSONSchema7);
export const validateTtsResponse = compile<unknown>(ttsResponseSchema as JSONSchema7);
export const validateTtsLanguages = compile<unknown>(ttsLanguagesSchema as JSONSchema7);
