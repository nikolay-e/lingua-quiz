import fs from 'node:fs';
import path from 'node:path';
import { compile } from 'json-schema-to-typescript';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..', '..');
const schemaPath = path.join(repoRoot, 'lingua-quiz-schema.json');
const outputDir = path.resolve(__dirname, 'src', 'generated');
const outputFile = path.join(outputDir, 'domain.ts');

fs.mkdirSync(outputDir, { recursive: true });

if (!fs.existsSync(schemaPath)) {
  console.error('OpenAPI schema not found. Run `make openapi` first.');
  process.exit(1);
}

const banner = `// Auto-generated from OpenAPI schema (lingua-quiz-schema.json). Do not edit manually.
`;

const stripTitles = (node) => {
  if (node && typeof node === 'object') {
    if ('title' in node) {
      delete node.title;
    }
    if (node.properties) {
      Object.values(node.properties).forEach(stripTitles);
    }
    if (node.definitions || node.$defs) {
      Object.values(node.definitions || node.$defs).forEach(stripTitles);
    }
    if (Array.isArray(node.anyOf)) node.anyOf.forEach(stripTitles);
    if (Array.isArray(node.oneOf)) node.oneOf.forEach(stripTitles);
    if (Array.isArray(node.allOf)) node.allOf.forEach(stripTitles);
  }
};

const rewriteRefs = (node) => {
  if (node && typeof node === 'object') {
    if ('$ref' in node && typeof node.$ref === 'string') {
      node.$ref = node.$ref.replace('#/components/schemas/', '#/$defs/');
    }
    if (node.properties) {
      Object.values(node.properties).forEach(rewriteRefs);
    }
    if (node.items) {
      rewriteRefs(node.items);
    }
    if (Array.isArray(node.anyOf)) node.anyOf.forEach(rewriteRefs);
    if (Array.isArray(node.oneOf)) node.oneOf.forEach(rewriteRefs);
    if (Array.isArray(node.allOf)) node.allOf.forEach(rewriteRefs);
  }
};

const compileSchemas = async () => {
  const openapi = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const schemas = openapi.components?.schemas || {};

  if (Object.keys(schemas).length === 0) {
    console.error('No schemas found in OpenAPI spec components.');
    process.exit(1);
  }

  const schemasCopy = JSON.parse(JSON.stringify(schemas));
  Object.values(schemasCopy).forEach(rewriteRefs);

  const wrapperSchema = {
    type: 'object',
    $defs: schemasCopy,
  };

  stripTitles(wrapperSchema);

  let compiled = await compile(wrapperSchema, 'DomainTypes', {
    bannerComment: '',
    unreachableDefinitions: true,
    additionalProperties: false,
    style: {
      singleQuote: true,
    },
  });

  compiled = compiled.replace(/export interface DomainTypes \{[^}]*\}\n*/g, '');

  fs.writeFileSync(outputFile, `${banner}${compiled}\n`);
  console.info(`✅ Generated ${path.relative(repoRoot, outputFile)} from OpenAPI schema`);
};

await compileSchemas();
