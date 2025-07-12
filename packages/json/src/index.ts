import { Declaration, registerExtractor } from '@dry-lint/dry-lint';
import { JSONSchema7 } from 'json-schema';

/**
 * Option structure for JSON Schema extractor (reserved for future use).
 */
interface JsonSchemaOptions {}

/**
 * Collects the root schema and its definitions from a JSON Schema document.
 * @param schema - The root JSON Schema object
 * @returns Array of objects containing JSON pointers and corresponding subschemas
 */
function collectSubschemas(schema: JSONSchema7): Array<{ key: string; schema: JSONSchema7 }> {
  const out: Array<{ key: string; schema: JSONSchema7 }> = [];

  out.push({ key: '#/', schema });

  if (schema.definitions && typeof schema.definitions === 'object') {
    for (const [defName, defSchema] of Object.entries(schema.definitions)) {
      if (typeof defSchema === 'object') {
        out.push({
          key: `#/definitions/${defName}`,
          schema: defSchema as JSONSchema7,
        });
      }
    }
  }

  return out;
}

registerExtractor((filePath, fileText): Declaration<JsonSchemaOptions>[] => {
  if (!filePath.endsWith('.json')) {
    return [];
  }

  let raw: JSONSchema7;

  try {
    raw = JSON.parse(fileText);
  } catch (err) {
    console.error(`⚠️ JSON Schema parse error in ${filePath}`, err);
    return [];
  }

  const decls: Declaration<JsonSchemaOptions>[] = [];

  for (const { key, schema } of collectSubschemas(raw)) {
    decls.push({
      id: `${filePath}${key}`,
      kind: 'json-schema',
      shape: schema,
      location: { file: filePath, name: key },
    });
  }

  return decls;
});
