import { Declaration, registerExtractor } from '@dry-lint/dry-lint';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

/**
 * Shape of a React component's PropTypes declaration.
 */
interface PropTypeShape {
  /** Always 'PropTypes' for this extractor */
  kind: string;
  /** Map of prop names to their normalized type definitions */
  props: Record<string, any>;
}

/**
 * Normalizes a PropTypes AST node into a simple object representation.
 * Supports built-in types (e.g., PropTypes.string) and calls (e.g., PropTypes.arrayOf).
 * @param node - The Babel Expression node representing a PropTypes reference
 * @returns A plain object capturing the kind and nested argument, if any
 */
function normalizePropType(node: t.Expression): any {
  // Handle MemberExpression like PropTypes.string
  if (
    t.isMemberExpression(node) &&
    t.isIdentifier(node.object, { name: 'PropTypes' }) &&
    t.isIdentifier(node.property)
  ) {
    return { kind: node.property.name };
  }

  // Handle CallExpression like PropTypes.arrayOf(PropTypes.string)
  if (
    t.isCallExpression(node) &&
    t.isMemberExpression(node.callee) &&
    t.isIdentifier(node.callee.object, { name: 'PropTypes' })
  ) {
    const methodName = (node.callee.property as t.Identifier).name;
    const arg = node.arguments[0] as t.Expression | undefined;
    return {
      kind: methodName,
      argument: arg ? normalizePropType(arg) : undefined,
    };
  }

  // Fallback for unsupported expressions
  return { kind: node.type };
}

/**
 * Registers an extractor to find React PropTypes definitions.
 * Looks for assignments of the form MyComponent.propTypes = { ... }.
 */
registerExtractor((filePath, fileText): Declaration[] => {
  const declarations: Declaration[] = [];

  // Parse the file content into a Babel AST (supports TypeScript & JSX)
  const ast = parse(fileText, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  // Traverse AST to find PropTypes assignments
  traverse(ast, {
    AssignmentExpression(path: {
      node: { left: any; right: any };
      scope: { generateUid: () => any };
    }) {
      const left = path.node.left;
      const right = path.node.right;

      // Identify patterns like MyComponent.propTypes = { ... }
      if (
        t.isMemberExpression(left) &&
        t.isIdentifier(left.property, { name: 'propTypes' }) &&
        t.isObjectExpression(right)
      ) {
        // Determine component name from the left-hand side object
        const compName = t.isIdentifier(left.object) ? left.object.name : path.scope.generateUid();

        // Collect each property in the object expression
        const props: Record<string, any> = {};
        right.properties.forEach(propNode => {
          if (
            t.isObjectProperty(propNode) &&
            t.isIdentifier(propNode.key) &&
            t.isExpression(propNode.value)
          ) {
            props[propNode.key.name] = normalizePropType(propNode.value);
          }
        });

        // Emit a declaration for this component's PropTypes
        declarations.push({
          id: `${filePath}#prop-types:${compName}`,
          kind: 'prop-types',
          shape: { kind: 'PropTypes', props } as PropTypeShape,
          location: { file: filePath, name: compName },
        });
      }
    },
  });

  return declarations;
});
