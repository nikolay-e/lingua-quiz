import fc from 'fast-check';
import { describe, it } from 'vitest';
import type { JSONSchema7 } from 'json-schema';

import { arbitraryFromSchema } from '../src/schemaArb';
import {
  validateVocabularyItem,
  validateUserProgress,
  validateProgressUpdate,
  validateWordList,
} from '../src/validators';

import openapi from '../../../lingua-quiz-schema.json';

const schemas = (openapi as { components?: { schemas?: Record<string, JSONSchema7> } }).components?.schemas || {};
const vocabularyItemSchema = schemas.VocabularyItemResponse as JSONSchema7;
const userProgressSchema = schemas.UserProgressResponse as JSONSchema7;
const progressUpdateSchema = schemas.ProgressUpdateRequest as JSONSchema7;
const wordListSchema = schemas.WordListResponse as JSONSchema7;

const assertValid = (arb: fc.Arbitrary<unknown>, validate: (data: unknown) => { valid: boolean; errors: string[] }) =>
  fc.assert(
    fc.property(arb, (data) => validate(data).valid),
    { numRuns: 5 },
  );

describe('domain schema arbitraries validate against validators', () => {
  it('vocabulary item', () => {
    const arb = arbitraryFromSchema<unknown>(vocabularyItemSchema);
    assertValid(arb, validateVocabularyItem);
  });

  it('user progress', () => {
    const arb = arbitraryFromSchema<unknown>(userProgressSchema);
    assertValid(arb, validateUserProgress);
  });

  it('progress update', () => {
    const arb = arbitraryFromSchema<unknown>(progressUpdateSchema);
    assertValid(arb, validateProgressUpdate);
  });

  it('word list', () => {
    const arb = arbitraryFromSchema<unknown>(wordListSchema);
    assertValid(arb, validateWordList);
  });
});
