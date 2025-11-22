import { generate } from 'openapi-typescript-codegen';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendOpenApiPath = path.resolve(__dirname, '../backend/openapi.json');
const outputPath = path.resolve(__dirname, 'src/generated');

await generate({
  input: backendOpenApiPath,
  output: outputPath,
  httpClient: 'fetch',
  useUnionTypes: true,
});

console.log('✅ Generated TypeScript client from OpenAPI');
