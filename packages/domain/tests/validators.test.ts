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

import vocabularyItemSchema from '../../domain-schema/vocabulary_item.schema.json';
import userProgressSchema from '../../domain-schema/user_progress.schema.json';
import progressUpdateSchema from '../../domain-schema/progress_update.schema.json';
import wordListSchema from '../../domain-schema/word_list.schema.json';

const assertValid = (arb: fc.Arbitrary<unknown>, validate: (data: unknown) => { valid: boolean; errors: string[] }) =>
  fc.assert(
    fc.property(arb, (data) => validate(data).valid),
    { numRuns: 5 },
  );

describe('domain schema arbitraries validate against validators', () => {
  it('vocabulary item', () => {
    const arb = arbitraryFromSchema<unknown>(vocabularyItemSchema as JSONSchema7);
    assertValid(arb, validateVocabularyItem);
  });

  it('user progress', () => {
    const arb = arbitraryFromSchema<unknown>(userProgressSchema as JSONSchema7);
    assertValid(arb, validateUserProgress);
  });

  it('progress update', () => {
    const arb = arbitraryFromSchema<unknown>(progressUpdateSchema as JSONSchema7);
    assertValid(arb, validateProgressUpdate);
  });

  it('word list', () => {
    const arb = arbitraryFromSchema<unknown>(wordListSchema as JSONSchema7);
    assertValid(arb, validateWordList);
  });
});
