import { Declaration, registerExtractor } from '@dry-lint/dry-lint';
import {
  EnumTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  parse,
  TypeNode,
} from 'graphql';

/**
 * Represents a field within a GraphQL object or input type.
 */
interface GraphQLField {
  /** Name of the field */
  name: string;
  /** Normalized type representation */
  type: any;
}

/**
 * Describes the shape of a GraphQL definition for duplicate detection.
 */
interface GraphQLShape {
  /** Definition kind: ObjectType, InputObject, or EnumType */
  kind: string;
  /** Name of the GraphQL type or enum */
  name: string;
  /** Array of fields for object/input types */
  fields?: GraphQLField[];
  /** Array of enum values for enum types */
  values?: string[];
}

/**
 * Normalizes a GraphQL TypeNode into a plain object for hashing.
 * Supports named, non-null, and list types recursively.
 * @param node - The GraphQL AST TypeNode to normalize
 * @returns A simplified object representation of the type
 */
function normalizeTypeNode(node: TypeNode): any {
  switch (node.kind) {
    case 'NamedType':
      return { kind: 'Named', name: node.name.value };
    case 'NonNullType':
      return { kind: 'NonNull', ofType: normalizeTypeNode(node.type) };
    case 'ListType':
      return { kind: 'List', ofType: normalizeTypeNode(node.type) };
    default:
      return { kind: node.kind };
  }
}

/**
 * Registers an extractor that parses GraphQL SDL documents,
 * extracting object types, input object types, and enum types.
 */
registerExtractor((filePath, fileText): Declaration<GraphQLShape>[] => {
  if (!filePath.endsWith('.graphql') && !filePath.endsWith('.gql')) {
    return [];
  }
  // Parse the GraphQL SDL into an AST
  const ast = parse(fileText);
  const decls: Declaration<GraphQLShape>[] = [];

  // Iterate over all top-level definitions in the document
  for (const def of ast.definitions) {
    let shape: GraphQLShape | null = null;

    // Handle object type definitions
    if (def.kind === 'ObjectTypeDefinition') {
      const node = def as ObjectTypeDefinitionNode;
      // Extract and normalize each field, sorted by name
      const fields = (node.fields || [])
        .map(f => ({ name: f.name.value, type: normalizeTypeNode(f.type) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      shape = { kind: 'ObjectType', name: node.name.value, fields };

      // Handle input object type definitions
    } else if (def.kind === 'InputObjectTypeDefinition') {
      const node = def as InputObjectTypeDefinitionNode;
      const fields = (node.fields || [])
        .map(f => ({ name: f.name.value, type: normalizeTypeNode(f.type) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      shape = { kind: 'InputObject', name: node.name.value, fields };

      // Handle enum type definitions
    } else if (def.kind === 'EnumTypeDefinition') {
      const node = def as EnumTypeDefinitionNode;
      // Collect all enum values sorted alphabetically
      const values = node.values?.map(v => v.name.value).sort() || [];
      shape = { kind: 'EnumType', name: node.name.value, values };
    }

    // If a supported shape was extracted, add a declaration
    if (shape) {
      decls.push({
        id: `${filePath}#graphql:${shape.name}`,
        kind: `graphql-${shape.kind.toLowerCase()}`,
        shape,
        location: { file: filePath, name: shape.name },
      });
    }
  }

  return decls;
});
