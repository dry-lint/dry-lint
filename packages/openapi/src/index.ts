import { Declaration, registerExtractor } from '@dry-lint/dry-lint';
import SwaggerParser from '@apidevtools/swagger-parser';
import YAML from 'yaml';

/**
 * Registers an asynchronous extractor to parse OpenAPI documents (v2/v3) in JSON or YAML,
 * dereference all $ref pointers, and emit schema declarations for each component under
 * components.schemas.
 */
registerExtractor(async (filePath, fileText): Promise<Declaration[]> => {
  if (!filePath.endsWith('.yaml') && !filePath.endsWith('.yml') && !filePath.endsWith('.json')) {
    return [];
  }

  let apiDoc: any;

  try {
    // Attempt to parse as JSON and dereference references
    const json = JSON.parse(fileText);
    apiDoc = await SwaggerParser.dereference(filePath, json);
  } catch {
    // Fallback: parse as YAML and dereference references
    const yamlDoc = YAML.parse(fileText);
    apiDoc = await SwaggerParser.dereference(filePath, yamlDoc);
  }

  // Ensure the document has a components.schemas object
  if (!apiDoc?.components?.schemas || typeof apiDoc.components.schemas !== 'object') {
    return [];
  }

  const declarations: Declaration<any>[] = [];

  // Emit a declaration for each schema under components.schemas
  for (const [schemaName, schemaDef] of Object.entries(apiDoc.components.schemas)) {
    declarations.push({
      id: `${filePath}#/components/schemas/${schemaName}`,
      kind: 'openapi-schema',
      shape: schemaDef,
      location: { file: filePath, name: schemaName },
    });
  }

  return declarations;
});
