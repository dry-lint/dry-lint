import { Declaration, registerExtractor } from '@dry-lint/core';
import { getSchema } from '@mrleebo/prisma-ast';

/**
 * Describes the shape of a Prisma model or enum for duplicate detection.
 */
interface PrismaShape {
  /** 'model' or 'enum' */
  kind: 'model' | 'enum';
  /** Name of the model or enum */
  name: string;
  /** Array of field definitions for models */
  fields?: { name: string; type: string }[];
  /** Array of enum values for enums */
  values?: string[];
}

/**
 * Prisma extractor plugin:
 * - Strips out datasource and generator blocks to focus on models & enums
 * - Parses the cleaned schema with getSchema
 * - Emits declarations for each model and enum in the schema
 */
registerExtractor((filePath, fileText): Declaration[] => {
  // Remove datasource and generator blocks before parsing
  const cleaned = fileText.replace(/^\s*(?:datasource|generator)\s+\w+\s*\{[\s\S]*?}\s*/gim, '');

  let ast;
  try {
    // Parse the cleaned schema into an AST
    ast = getSchema(cleaned);
  } catch (err) {
    console.error(`⚠️ Prisma schema parse error in ${filePath}`, err);
    return [];
  }

  const declarations: Declaration[] = [];

  // Iterate through AST nodes (models and enums)
  for (const node of ast.list || []) {
    if (node.type === 'model') {
      // Collect all fields from the model
      const fields = node.properties
        .filter((p: any) => p.type === 'field')
        .map((f: any) => ({ name: f.name, type: f.fieldType }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Emit a declaration for the model
      declarations.push({
        id: `${filePath}#model:${node.name}`,
        kind: 'prisma-model',
        shape: { kind: 'model', name: node.name, fields } as PrismaShape,
        location: { file: filePath, name: node.name },
      });
    } else if (node.type === 'enum') {
      // Extract enum values from properties
      const enumNode = node as any;
      const values = Array.isArray(enumNode.properties)
        ? enumNode.properties.map((p: any) => p.name).sort()
        : [];

      // Emit a declaration for the enum
      declarations.push({
        id: `${filePath}#enum:${enumNode.name}`,
        kind: 'prisma-enum',
        shape: { kind: 'enum', name: enumNode.name, values } as PrismaShape,
        location: { file: filePath, name: enumNode.name },
      });
    }
  }

  return declarations;
});
