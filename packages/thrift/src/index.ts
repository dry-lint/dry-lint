import { Declaration, registerExtractor } from '@dry-lint/dry-lint';
import {
  EnumDefinition,
  FieldDefinition,
  parse,
  StructDefinition,
  ThriftDocument,
  ThriftErrors,
} from '@creditkarma/thrift-parser';

/**
 * Represents a field within a Thrift struct, capturing its ID, name, and type.
 */
interface ThriftField {
  /** Numeric field identifier */
  id: number;
  /** Name of the field */
  name: string;
  /** String representation of the field's type */
  type: string;
}

/**
 * Registers an extractor to parse Thrift IDL files (.thrift).
 * - Parses the file into an AST
 * - Emits declarations for each struct and enum found
 */
registerExtractor((filePath, fileText): Declaration[] => {
  if (!filePath.endsWith('.thrift')) {
    return [];
  }
  // Parse the Thrift file into AST or errors
  const ast = parse(fileText);

  // If the result is not a valid ThriftDocument, log errors and skip
  if (ast.type !== 'ThriftDocument') {
    console.error(`⚠️ Thrift parse errors in ${filePath}`, (ast as ThriftErrors).errors);
    return [];
  }

  const doc = ast as ThriftDocument;
  const declarations: Declaration[] = [];

  // Iterate through each top-level statement in the Thrift document
  for (const stmt of doc.body) {
    if (stmt.type === 'StructDefinition') {
      // Handle Thrift struct definitions
      const struct = stmt as StructDefinition;

      // Extract and normalize fields with IDs
      const fields: ThriftField[] = (struct.fields as FieldDefinition[])
        .filter(f => f.fieldID != null)
        .map(f => {
          const id = f.fieldID!.value;
          let typeStr: string;

          // If the type node has a 'names' array, join for qualified types
          if ('names' in f.fieldType && Array.isArray((f.fieldType as any).names)) {
            typeStr = (f.fieldType as any).names.join('.');
          } else {
            // Fallback: serialize the AST node to JSON for type description
            typeStr = JSON.stringify(f.fieldType);
          }

          return { id, name: f.name.value, type: typeStr };
        })
        .sort((a, b) => a.id - b.id);

      // Emit a declaration for the struct
      declarations.push({
        id: `${filePath}#thrift:struct:${struct.name.value}`,
        kind: 'thrift-struct',
        shape: { kind: 'struct', name: struct.name.value, fields },
        location: { file: filePath, name: struct.name.value },
      });
    } else if (stmt.type === 'EnumDefinition') {
      // Handle Thrift enum definitions
      const en = stmt as EnumDefinition;
      // Extract enum member names in sorted order
      const values = en.members.map(m => m.name.value).sort();

      // Emit a declaration for the enum
      declarations.push({
        id: `${filePath}#thrift:enum:${en.name.value}`,
        kind: 'thrift-enum',
        shape: { kind: 'enum', name: en.name.value, values },
        location: { file: filePath, name: en.name.value },
      });
    }
  }

  return declarations;
});
