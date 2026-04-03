import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import type { JSONSchema7 } from 'json-schema';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

type Validator = (data: unknown) => { valid: boolean; errors: string[] };

const compile = (schema: JSONSchema7): Validator => {
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

const schemas = {
  VocabularyItemResponse: {
    type: 'object',
    required: ['id', 'sourceText', 'sourceLanguage', 'targetText', 'targetLanguage', 'listName'],
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
      'recentHistory',
      'pronunciationPassed',
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
      recentHistory: { type: 'array', items: { type: 'boolean' } },
      pronunciationPassed: { type: 'boolean' },
    },
  },
  ProgressUpdateRequest: {
    type: 'object',
    required: [
      'vocabularyItemId',
      'level',
      'queuePosition',
      'correctCount',
      'incorrectCount',
      'consecutiveCorrect',
      'recentHistory',
    ],
    properties: {
      vocabularyItemId: { type: 'string' },
      level: { type: 'integer', minimum: 0, maximum: 5 },
      queuePosition: { type: 'integer', minimum: 0 },
      correctCount: { type: 'integer', minimum: 0 },
      incorrectCount: { type: 'integer', minimum: 0 },
      consecutiveCorrect: { type: 'integer', minimum: 0 },
      recentHistory: { type: 'array', items: { type: 'boolean' }, maxItems: 20 },
      pronunciationPassed: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
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
} satisfies Record<string, JSONSchema7>;

export const validateVocabularyItem = compile(schemas.VocabularyItemResponse);
export const validateWordList = compile(schemas.WordListResponse);
export const validateUserProgress = compile(schemas.UserProgressResponse);
export const validateProgressUpdate = compile(schemas.ProgressUpdateRequest);
export const validateContentVersion = compile(schemas.ContentVersionResponse);
export const validateTtsRequest = compile(schemas.TTSRequest);
export const validateTtsResponse = compile(schemas.TTSResponse);
export const validateTtsLanguages = compile(schemas.TTSLanguagesResponse);
