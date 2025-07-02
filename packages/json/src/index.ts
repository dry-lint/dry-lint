import { Declaration, registerExtractor } from '@dry-lint/core';
import { JSONSchema7 } from 'json-schema';

/**
 * Option structure for JSON Schema extractor (reserved for future use).
 */
interface JsonSchemaOptions {
  // Future extractor options could be added here
}

/**
 * Collects the root schema and its definitions from a JSON Schema document.
 * @param schema - The root JSON Schema object
 * @returns Array of objects containing JSON pointers and corresponding subschemas
 */
function collectSubschemas(schema: JSONSchema7): Array<{ key: string; schema: JSONSchema7 }> {
  const out: Array<{ key: string; schema: JSONSchema7 }> = [];

  // Include the root schema at pointer #/
  out.push({ key: '#/', schema });

  // Include each named definition under #/definitions
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

// Register the synchronous JSON Schema extractor plugin
registerExtractor((filePath, fileText): Declaration[] => {
  let raw: JSONSchema7;

  try {
    // Attempt to parse the file as JSON
    raw = JSON.parse(fileText);
  } catch (err) {
    console.error(`⚠️ JSON Schema parse error in ${filePath}`, err);
    return [];
  }

  const decls: Declaration[] = [];

  // Emit a declaration for each subschema collected
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
