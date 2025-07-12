import { Declaration, registerExtractor } from '@dry-lint/dry-lint';
import { parse } from '@babel/parser';
import _trv from '@babel/traverse';
import * as t from '@babel/types';

/**
 *  Babel’s `@babel/traverse` ships both CJS and ESM builds.
 *  This little shim makes sure we always get the callable function.
 */
type NodePath<T extends t.Node = t.Node> = _trv.NodePath<T>;
const traverse: typeof _trv = typeof _trv === 'function' ? _trv : (_trv as any).default;

interface PropTypeShape {
  kind: 'PropTypes';
  props: Record<string, unknown>;
}

/**
 * Convert a PropTypes AST node into a JSON-able value so that
 * structural similarity can be computed later on.
 *
 * Examples:
 *   • `PropTypes.string`  → { kind: 'string' }
 *   • `PropTypes.arrayOf(PropTypes.string)`
 *            → { kind: 'arrayOf', argument: { kind: 'string' } }
 */
function normalise(node: t.Expression): unknown {
  if (
    t.isMemberExpression(node) &&
    t.isIdentifier(node.object, { name: 'PropTypes' }) &&
    t.isIdentifier(node.property)
  ) {
    return { kind: node.property.name };
  }

  if (
    t.isCallExpression(node) &&
    t.isMemberExpression(node.callee) &&
    t.isIdentifier(node.callee.object, { name: 'PropTypes' })
  ) {
    const calleeName = (node.callee.property as t.Identifier).name;
    const arg = node.arguments[0] as t.Expression | undefined;
    return { kind: calleeName, argument: arg ? normalise(arg) : undefined };
  }

  return { kind: node.type };
}

/**
 *  Walks JS/TS files, detects
 *    – classic assignments:   `MyComp.propTypes = { … }`
 *    – inline objects:        `export const MyComp = { …PropTypes… }`
 *  and emits one declaration per component.
 */
registerExtractor<PropTypeShape>((filePath, code): Declaration<PropTypeShape>[] => {
  if (!/\.[cm]?[jt]sx?$/.test(filePath)) return [];

  const declarations: Declaration<PropTypeShape>[] = [];
  const ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });

  traverse(ast, {
    AssignmentExpression(path: NodePath<t.AssignmentExpression>) {
      const { left, right } = path.node;

      if (
        t.isMemberExpression(left) &&
        t.isIdentifier(left.property, { name: 'propTypes' }) &&
        t.isObjectExpression(right)
      ) {
        const component = t.isIdentifier(left.object)
          ? left.object.name
          : path.scope.generateUidIdentifier('Comp').name;

        const props: Record<string, unknown> = {};
        right.properties.forEach(p => {
          if (t.isObjectProperty(p) && t.isIdentifier(p.key) && t.isExpression(p.value)) {
            props[p.key.name] = normalise(p.value);
          }
        });

        declarations.push({
          id: `${filePath}#prop-types:${component}`,
          kind: 'prop-types',
          shape: { kind: 'PropTypes', props },
          location: { file: filePath, name: component },
        });
      }
    },

    VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
      if (!t.isIdentifier(path.node.id) || !t.isObjectExpression(path.node.init)) return;

      const component = path.node.id.name;
      const obj = path.node.init;

      // Quick check: does at least one property reference PropTypes?
      const hasPropTypes = obj.properties.some(
        (p: t.ObjectMember | t.SpreadElement) =>
          t.isObjectProperty(p) &&
          t.isExpression(p.value) &&
          t.isMemberExpression(p.value) &&
          t.isIdentifier(p.value.object, { name: 'PropTypes' })
      );

      if (!hasPropTypes) return;

      const props: Record<string, unknown> = {};
      obj.properties.forEach((p: t.ObjectMember | t.SpreadElement) => {
        if (t.isObjectProperty(p) && t.isIdentifier(p.key) && t.isExpression(p.value)) {
          props[p.key.name] = normalise(p.value);
        }
      });

      declarations.push({
        id: `${filePath}#prop-types:${component}`,
        kind: 'prop-types',
        shape: { kind: 'PropTypes', props },
        location: { file: filePath, name: component },
      });
    },
  });

  return declarations;
});
