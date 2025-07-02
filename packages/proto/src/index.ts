import { Declaration, registerExtractor } from '@dry-lint/core';
import protobuf from 'protobufjs';

/**
 * Recursively walks a protobuf.js namespace, collecting message and enum declarations.
 * @param ns - The namespace to traverse (Root, Namespace, or Type)
 * @param filePath - Path to the .proto file (used in declaration IDs)
 * @param parent - Optional parent namespace path for nested types
 * @returns Array of Declaration objects for messages and enums
 */
function walkNamespace(
  ns: protobuf.NamespaceBase,
  filePath: string,
  parent: string = ''
): Declaration[] {
  const declarations: Declaration[] = [];

  // Iterate through nested definitions within this namespace
  for (const nested of Object.values(ns.nested ?? {})) {
    if (nested instanceof protobuf.Type) {
      // Handle protobuf message types
      const fullName = parent ? `${parent}.${nested.name}` : nested.name;

      // Extract fields from the message, sorted by name
      const fields = Object.values(nested.fields)
        .map(f => ({ name: f.name, type: f.type }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Emit a declaration for this message
      declarations.push({
        id: `${filePath}#message:${fullName}`,
        kind: 'proto-message',
        shape: { kind: 'message', name: fullName, fields },
        location: { file: filePath, name: fullName },
      });

      // Recurse into nested types within the message
      declarations.push(...walkNamespace(nested, filePath, fullName));
    } else if (nested instanceof protobuf.Enum) {
      // Handle protobuf enum types
      const fullName = parent ? `${parent}.${nested.name}` : nested.name;
      const values = Object.keys(nested.values).sort();

      // Emit a declaration for this enum
      declarations.push({
        id: `${filePath}#enum:${fullName}`,
        kind: 'proto-enum',
        shape: { kind: 'enum', name: fullName, values },
        location: { file: filePath, name: fullName },
      });
    } else if (nested instanceof protobuf.Namespace) {
      // Recurse into nested namespaces (e.g., package scopes)
      const nsName = parent ? `${parent}.${nested.name}` : nested.name;
      declarations.push(...walkNamespace(nested, filePath, nsName));
    }
  }

  return declarations;
}

/**
 * Registers the protobuf extractor plugin to parse .proto files and
 * emit declarations for all messages and enums within.
 */
registerExtractor((filePath, fileText): Declaration[] => {
  let root: protobuf.Root;
  try {
    // Parse the .proto content into a protobuf.js Root
    root = protobuf.parse(fileText, { keepCase: true }).root;
  } catch (err) {
    console.error(`⚠️ Proto parse error in ${filePath}`, err);
    return [];
  }

  // Walk the root namespace to collect all declarations
  return walkNamespace(root, filePath);
});
