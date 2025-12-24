import Ajv from 'ajv';
import addFormats from 'ajv-formats';

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

const schemas: Record<string, JSONSchema7> = {
  VocabularyItemResponse: {
    type: 'object',
    required: [
      'id',
      'sourceText',
      'sourceLanguage',
      'targetText',
      'targetLanguage',
      'listName',
      'sourceUsageExample',
      'targetUsageExample',
    ],
    properties: {
      id: { type: 'string' },
      sourceText: { type: 'string' },
      sourceLanguage: { type: 'string' },
      targetText: { type: 'string' },
      targetLanguage: { type: 'string' },
      listName: { type: 'string' },
      difficultyLevel: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      sourceUsageExample: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      targetUsageExample: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    },
  },
  WordListResponse: {
    type: 'object',
    required: ['listName', 'wordCount'],
    properties: {
      listName: { type: 'string' },
      wordCount: { type: 'integer' },
    },
  },
  UserProgressResponse: {
    type: 'object',
    required: [
      'vocabularyItemId',
      'sourceText',
      'sourceLanguage',
      'targetLanguage',
      'level',
      'queuePosition',
      'correctCount',
      'incorrectCount',
      'consecutiveCorrect',
      'lastPracticed',
    ],
    properties: {
      vocabularyItemId: { type: 'string' },
      sourceText: { type: 'string' },
      sourceLanguage: { type: 'string' },
      targetLanguage: { type: 'string' },
      level: { type: 'integer' },
      queuePosition: { type: 'integer' },
      correctCount: { type: 'integer' },
      incorrectCount: { type: 'integer' },
      consecutiveCorrect: { type: 'integer' },
      lastPracticed: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    },
  },
  ProgressUpdateRequest: {
    type: 'object',
    required: ['vocabularyItemId', 'level', 'queuePosition', 'correctCount', 'incorrectCount'],
    properties: {
      vocabularyItemId: { type: 'string' },
      level: { type: 'integer', minimum: 0, maximum: 5 },
      queuePosition: { type: 'integer', minimum: 0 },
      correctCount: { type: 'integer', minimum: 0 },
      incorrectCount: { type: 'integer', minimum: 0 },
    },
  },
  ContentVersionResponse: {
    type: 'object',
    required: ['versionId', 'versionName', 'isActive'],
    properties: {
      versionId: { type: 'integer' },
      versionName: { type: 'string' },
      isActive: { type: 'boolean' },
    },
  },
  TTSRequest: {
    type: 'object',
    required: ['text', 'language'],
    properties: {
      text: { type: 'string', minLength: 1, maxLength: 500 },
      language: { type: 'string', pattern: '^(en|de|ru|es|English|German|Russian|Spanish)$' },
    },
  },
  TTSResponse: {
    type: 'object',
    required: ['audioData', 'text', 'language'],
    properties: {
      audioData: { type: 'string' },
      contentType: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      text: { type: 'string' },
      language: { type: 'string' },
    },
  },
  TTSLanguagesResponse: {
    type: 'object',
    required: ['available', 'supportedLanguages'],
    properties: {
      available: { type: 'boolean' },
      supportedLanguages: { type: 'array', items: { type: 'string' } },
    },
  },
};

export const validateVocabularyItem = compile<unknown>(schemas.VocabularyItemResponse);
export const validateWordList = compile<unknown>(schemas.WordListResponse);
export const validateUserProgress = compile<unknown>(schemas.UserProgressResponse);
export const validateProgressUpdate = compile<unknown>(schemas.ProgressUpdateRequest);
export const validateContentVersion = compile<unknown>(schemas.ContentVersionResponse);
export const validateTtsRequest = compile<unknown>(schemas.TTSRequest);
export const validateTtsResponse = compile<unknown>(schemas.TTSResponse);
export const validateTtsLanguages = compile<unknown>(schemas.TTSLanguagesResponse);
