import type { JSONSchema7 } from 'json-schema';
import jsf from 'json-schema-faker';
import fc, { type Arbitrary } from 'fast-check';

const toArbitrary = (schema: JSONSchema7): Arbitrary<unknown> => {
  if (schema.anyOf) {
    return fc.oneof(...schema.anyOf.map((s) => toArbitrary(s as JSONSchema7)));
  }
  if (schema.type === 'string') {
    const min = typeof schema.minLength === 'number' ? schema.minLength : 0;
    const max = typeof schema.maxLength === 'number' ? schema.maxLength : 20;
    return fc.string({ minLength: min, maxLength: Math.max(min, max) });
  }
  if (schema.type === 'integer' || schema.type === 'number') {
    const min = typeof schema.minimum === 'number' ? schema.minimum : -1000;
    const max = typeof schema.maximum === 'number' ? schema.maximum : 1000;
    return fc.integer({ min, max });
  }
  if (schema.type === 'boolean') {
    return fc.boolean();
  }
  if (schema.type === 'null') {
    return fc.constant(null);
  }
  if (schema.type === 'array' && schema.items) {
    return fc.array(toArbitrary(schema.items as JSONSchema7));
  }
  if (schema.type === 'object' || schema.properties) {
    const props = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const record: Record<string, Arbitrary<unknown>> = {};
    for (const [key, propSchema] of Object.entries(props)) {
      const arb = toArbitrary(propSchema as JSONSchema7);
      record[key] = required.has(key) ? arb : fc.option(arb, { nil: undefined });
    }
    return fc.record(record);
  }
  return fc.anything();
};

export const arbitraryFromSchema = <T>(schema: JSONSchema7): Arbitrary<T> => toArbitrary(schema) as Arbitrary<T>;

export const sampleFromSchema = async <T>(schema: JSONSchema7, count = 1): Promise<T[]> => {
  const samples: T[] = [];
  for (let i = 0; i < count; i += 1) {
    samples.push((await jsf.resolve(schema)) as T);
  }
  return samples;
};
