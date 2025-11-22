import fs from 'node:fs';
import path from 'node:path';
import { compile } from 'json-schema-to-typescript';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..', '..');
const schemaDir = path.resolve(repoRoot, 'packages', 'domain-schema');
const outputDir = path.resolve(__dirname, 'src', 'generated');
const outputFile = path.join(outputDir, 'domain.ts');

fs.mkdirSync(outputDir, { recursive: true });

const schemaFiles = fs
  .readdirSync(schemaDir)
  .filter((file) => file.endsWith('.schema.json'))
  .map((file) => path.join(schemaDir, file))
  .sort();

if (schemaFiles.length === 0) {
  console.warn('No schema files found in packages/domain-schema. Did you run `make domain-schema`?');
  process.exit(1);
}

const banner = `// Auto-generated from JSON Schemas. Do not edit manually.
`;

const pascalCase = (input) =>
  input
    .replace(/[-_]+/g, ' ')
    .replace(/\s+./g, (match) => match.trim().toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase());

const stripTitles = (node) => {
  if (node && typeof node === 'object') {
    if ('title' in node) {
      delete node.title;
    }
    if (node.properties) {
      Object.values(node.properties).forEach(stripTitles);
    }
    if (node.definitions) {
      Object.values(node.definitions).forEach(stripTitles);
    }
    if (Array.isArray(node.anyOf)) node.anyOf.forEach(stripTitles);
    if (Array.isArray(node.oneOf)) node.oneOf.forEach(stripTitles);
    if (Array.isArray(node.allOf)) node.allOf.forEach(stripTitles);
  }
};

const compileSchemas = async () => {
  const chunks = [];

  for (const schemaPath of schemaFiles) {
    const raw = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    stripTitles(raw);
    const typeName = raw.title ? raw.title : pascalCase(path.basename(schemaPath).replace('.schema.json', ''));

    const compiled = await compile(raw, typeName, {
      bannerComment: '',
      unreachableDefinitions: false,
      additionalProperties: false,
      style: {
        singleQuote: true,
      },
    });
    chunks.push(compiled);
  }

  fs.writeFileSync(outputFile, `${banner + chunks.join('\n\n')}\n`);
  console.log(`✅ Generated ${path.relative(repoRoot, outputFile)}`);
};

await compileSchemas();
