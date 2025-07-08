import {
  CallSignatureDeclaration,
  EnumDeclaration,
  IndexSignatureDeclaration,
  InterfaceDeclaration,
  IntersectionTypeNode,
  MappedTypeNode,
  Node,
  Project,
  PropertySignature,
  SyntaxKind,
  TupleTypeNode,
  TypeAliasDeclaration,
  TypeLiteralNode,
  TypeNode,
  TypeParameterDeclaration,
  TypeReferenceNode,
  UnionTypeNode,
} from 'ts-morph';
import { Declaration, registerExtractor } from '@dry-lint/dry-lint';

/**
 * Normalize an InterfaceDeclaration into a serializable shape.
 * Captures type parameters, properties, index signatures, and call signatures.
 */
export function normalizeInterface(iface: InterfaceDeclaration): any {
  const typeParams = iface.getTypeParameters().map(normalizeTypeParameter);
  const props = iface
    .getProperties()
    .map(normalizeProperty)
    .sort((a, b) => a.name.localeCompare(b.name));
  const index = iface
    .getIndexSignatures()
    .map(normalizeIndexSignature)
    .sort((a, b) => a.keyName.localeCompare(b.keyName));
  const calls = iface
    .getCallSignatures()
    .map(normalizeCallSignature)
    .sort((a, b) => a.params.length - b.params.length);
  return {
    kind: 'Interface',
    name: iface.getName(),
    typeParams,
    props,
    index,
    calls,
  };
}

/**
 * Normalize a TypeAliasDeclaration into a serializable shape.
 * Captures type parameters and the aliased type node.
 */
export function normalizeTypeAlias(alias: TypeAliasDeclaration): any {
  const typeParams = alias.getTypeParameters().map(normalizeTypeParameter);
  const value = normalizeTypeNode(alias.getTypeNodeOrThrow());
  return { kind: 'TypeAlias', name: alias.getName(), typeParams, value };
}

/**
 * Normalize an EnumDeclaration into a serializable shape.
 * Captures member names and values.
 */
export function normalizeEnum(en: EnumDeclaration): any {
  const members = en.getMembers().map(m => ({ name: m.getName(), value: m.getValue() }));
  return {
    kind: 'Enum',
    name: en.getName(),
    members: members.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function normalizeProperty(p: PropertySignature): any {
  return {
    name: p.getName(),
    optional: p.hasQuestionToken(),
    readonly: p.isReadonly(),
    type: normalizeTypeNode(p.getTypeNodeOrThrow()),
  };
}

function normalizeTypeParameter(tp: TypeParameterDeclaration): any {
  const constraint = tp.getConstraint() ? normalizeTypeNode(tp.getConstraintOrThrow()) : null;
  const defaultType = tp.getDefault() ? normalizeTypeNode(tp.getDefaultOrThrow()) : null;
  return { name: tp.getName(), constraint, default: defaultType };
}

function normalizeIndexSignature(sig: IndexSignatureDeclaration): any {
  const keyName = sig.getKeyName();
  const keyTypeNode = sig.getKeyTypeNode();
  const keyType = keyTypeNode ? normalizeTypeNode(keyTypeNode) : null;
  const valType = normalizeTypeNode(sig.getReturnTypeNodeOrThrow());
  return { kind: 'Index', keyName, keyType, valType };
}

function normalizeCallSignature(cs: CallSignatureDeclaration): any {
  const params = cs.getParameters().map(p => ({
    name: p.getName(),
    optional: p.isOptional(),
    type: p.getTypeNode() ? normalizeTypeNode(p.getTypeNodeOrThrow()) : null,
  }));
  const returnType = normalizeTypeNode(cs.getReturnTypeNodeOrThrow());
  return { kind: 'Call', params, returnType };
}

function normalizeTypeNode(node: TypeNode): any {
  switch (node.getKind()) {
    case SyntaxKind.TypeLiteral:
      return normalizeTypeLiteral(node as TypeLiteralNode);
    case SyntaxKind.UnionType:
      return normalizeUnion(node as UnionTypeNode);
    case SyntaxKind.IntersectionType:
      return normalizeIntersection(node as IntersectionTypeNode);
    case SyntaxKind.TupleType:
      return normalizeTuple(node as TupleTypeNode);
    case SyntaxKind.MappedType:
      return normalizeMapped(node as MappedTypeNode);
    case SyntaxKind.TypeReference:
      return normalizeReference(node as TypeReferenceNode);
    default:
      return node.getText().trim();
  }
}

export function normalizeTypeLiteral(lit: TypeLiteralNode): any {
  const members = lit
    .getMembers()
    .flatMap(m =>
      Node.isPropertySignature(m)
        ? [{ name: m.getName(), type: normalizeTypeNode(m.getTypeNodeOrThrow()) }]
        : []
    );
  const index = lit.getIndexSignatures().map(normalizeIndexSignature);
  return {
    kind: 'TypeLiteral',
    members: members.sort((a, b) => a.name.localeCompare(b.name)),
    index,
  };
}

export function normalizeUnion(u: UnionTypeNode): any {
  const types = u.getTypeNodes().map(normalizeTypeNode);
  const sorted = types
    .map(t => JSON.stringify(t))
    .sort()
    .map(s => JSON.parse(s));
  return { kind: 'Union', types: sorted };
}

export function normalizeIntersection(i: IntersectionTypeNode): any {
  const types = i.getTypeNodes().map(normalizeTypeNode);
  const sorted = types
    .map(t => JSON.stringify(t))
    .sort()
    .map(s => JSON.parse(s));
  return { kind: 'Intersection', types: sorted };
}

export function normalizeTuple(tu: TupleTypeNode): any {
  // Prefer the API if available and returns elements
  const apiElems: TypeNode[] | undefined =
    typeof (tu as any).getElementTypeNodes === 'function'
      ? (tu as any).getElementTypeNodes()
      : undefined;

  let elements: any[];
  if (apiElems && apiElems.length > 0) {
    elements = apiElems.map(normalizeTypeNode);
  } else {
    // Fallback: parse raw text to simple strings
    const text = tu.getText().trim();
    const inner = text.startsWith('[') && text.endsWith(']') ? text.slice(1, -1) : '';
    const rawElems = inner
      ? inner
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : [];
    elements = rawElems; // Already primitive strings
  }

  return { kind: 'Tuple', elements };
}

export function normalizeMapped(m: MappedTypeNode): any {
  const tp = m.getTypeParameter();
  const key = tp.getName();
  const constraint = tp.getConstraint() ? normalizeTypeNode(tp.getConstraintOrThrow()) : null;
  const value = m.getTypeNode() ? normalizeTypeNode(m.getTypeNodeOrThrow()) : null;
  return { kind: 'Mapped', key, constraint, value };
}

export function normalizeReference(ref: TypeReferenceNode): any {
  const name = ref.getTypeName().getText();
  const args = ref.getTypeArguments().map(normalizeTypeNode);
  return { kind: 'Reference', name, args };
}

/**
 * Registers the TypeScript extractor plugin to process interfaces, type aliases, and enums.
 */
registerExtractor((filePath, fileText): Declaration[] => {
  // Initialize an in-memory ts-morph project to parse the source file
  const project = new Project({ useInMemoryFileSystem: true });
  project.createSourceFile(filePath, fileText);
  const sf = project.getSourceFileOrThrow(filePath);
  const declarations: Declaration[] = [];

  // Extract and normalize interfaces
  sf.getInterfaces().forEach(iface => {
    declarations.push({
      id: `${filePath}#iface:${iface.getName()}`,
      kind: 'ts-interface',
      shape: normalizeInterface(iface),
      location: { file: filePath, name: iface.getName() },
    });
  });

  // Extract and normalize type aliases
  sf.getTypeAliases().forEach(alias => {
    declarations.push({
      id: `${filePath}#alias:${alias.getName()}`,
      kind: 'ts-alias',
      shape: normalizeTypeAlias(alias),
      location: { file: filePath, name: alias.getName() },
    });
  });

  // Extract and normalize enums
  sf.getEnums().forEach(en => {
    declarations.push({
      id: `${filePath}#enum:${en.getName()}`,
      kind: 'ts-enum',
      shape: normalizeEnum(en),
      location: { file: filePath, name: en.getName() },
    });
  });

  return declarations;
});
