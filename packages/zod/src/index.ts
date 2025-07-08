import { Declaration, registerExtractor } from '@dry-lint/dry-lint';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { generate } from '@babel/generator';

/**
 * Convert a Zod schema expression into a concise string representation.
 * - For known primitive calls (z.string(), z.number(), etc.), return the primitive name.
 * - For z.literal(x), return the literal value as string.
 * - Otherwise, generate the code snippet for the expression.
 * @param expr - Babel Expression node for a Zod type
 * @returns String representation of the Zod type
 */
export function flattenZodType(expr: t.Expression): string {
  if (
    t.isCallExpression(expr) &&
    t.isMemberExpression(expr.callee) &&
    t.isIdentifier(expr.callee.object, { name: 'z' }) &&
    t.isIdentifier(expr.callee.property)
  ) {
    const method = expr.callee.property.name;
    // Recognize built-in Zod primitives
    if (['string', 'number', 'boolean', 'any', 'unknown'].includes(method)) {
      return method;
    }
    // Handle literal types: z.literal('foo') → 'foo'
    if (method === 'literal' && expr.arguments[0] && t.isLiteral(expr.arguments[0])) {
      return String((expr.arguments[0] as any).value);
    }
  }
  // Fallback: generate the full code for the expression
  return generate(expr, {}).code.trim();
}

/**
 * Extractor plugin for Zod object schemas:
 * - Parses TypeScript/JS file into a Babel AST
 * - Finds "const X = z.object({...})" definitions
 * - Flattens property types and builds a normalized interface shape
 */
registerExtractor((filePath, fileText): Declaration[] => {
  const declarations: Declaration[] = [];
  // Parse file supporting TS and JSX syntax
  const ast = parse(fileText, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  // Traverse AST to locate Zod object declarations
  traverse(ast, {
    VariableDeclarator(path: { node: { id: any; init: any } }) {
      const { id, init } = path.node;
      // Match patterns like: const Foo = z.object({ ... });
      if (
        t.isIdentifier(id) &&
        t.isCallExpression(init) &&
        t.isMemberExpression(init.callee) &&
        t.isIdentifier(init.callee.object, { name: 'z' }) &&
        t.isIdentifier(init.callee.property, { name: 'object' })
      ) {
        const name = id.name;
        const arg = init.arguments[0];

        if (t.isObjectExpression(arg)) {
          // Collect each property and its flattened type
          const props = arg.properties
            .flatMap((p): Array<{ name: string; type: string }> => {
              if (t.isObjectProperty(p) && t.isIdentifier(p.key) && t.isExpression(p.value)) {
                const propName = p.key.name;
                const propType = flattenZodType(p.value);
                return [{ name: propName, type: propType }];
              }
              return [];
            })
            .sort((a, b) => a.name.localeCompare(b.name));

          // Build shape matching TS interface normal form
          const normProps = props.map(({ name, type }) => ({
            name,
            optional: false,
            readonly: false,
            type,
          }));

          const shape = {
            kind: 'Interface',
            name,
            typeParams: [] as any[],
            props: normProps,
            index: [] as any[],
            calls: [] as any[],
          };

          // Emit the declaration for this Zod object
          declarations.push({
            id: `${filePath}#zodobject:${name}`,
            kind: 'zodobject',
            shape,
            location: { file: filePath, name },
          });
        }
      }
    },
  });

  return declarations;
});
