import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { describe, expect, it } from 'vitest';
import { flattenZodType } from './index';
import '@dry-lint/zod';
import { collectDeclarations } from '@dry-lint/core';

/**
 * Utility to parse a code snippet and extract the first CallExpression node.
 * @param code - Source code containing a Zod expression
 * @returns The first Babel Expression node found
 */
function parseExpr(code: string): t.Expression {
  const ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  let expr: t.Expression | undefined;
  // Traverse the AST to capture the first CallExpression
  traverse(ast, {
    CallExpression(path) {
      if (!expr) expr = path.node;
    },
  });
  if (!expr) throw new Error('No CallExpression found in code');
  return expr;
}

/**
 * Tests for the flattenZodType helper, ensuring correct string output
 * for various Zod type expressions.
 */
describe('Zod plugin helper: flattenZodType', () => {
  it('should flatten primitive Zod types to their names', () => {
    // Check built-in Zod primitives
    expect(flattenZodType(parseExpr('z.string()'))).toBe('string');
    expect(flattenZodType(parseExpr('z.number()'))).toBe('number');
    expect(flattenZodType(parseExpr('z.boolean()'))).toBe('boolean');
    expect(flattenZodType(parseExpr('z.any()'))).toBe('any');
    expect(flattenZodType(parseExpr('z.unknown()'))).toBe('unknown');
  });

  it('should flatten z.literal calls to the literal value', () => {
    // Literal values should be converted to their string representation
    expect(flattenZodType(parseExpr(`z.literal('foo')`))).toBe('foo');
    expect(flattenZodType(parseExpr('z.literal(42)'))).toBe('42');
  });

  it('falls back to using Babel generator for unknown calls', () => {
    // For custom Zod methods, return the original code snippet
    const code = `z.customType(z.string(), 123)`;
    const out = flattenZodType(parseExpr(code));
    expect(out).toBe(code);
  });
});

/**
 * Integration tests for the Zod extractor plugin, verifying that
 * z.object schemas are detected, normalized, and collected correctly.
 */
describe('Zod plugin integration', () => {
  it('extracts and normalizes z.object schemas into interface shapes', async () => {
    // Sample code defining a Zod object schema with various property types
    const code = `
      import { z } from 'zod';
      const Foo = z.object({ 
        a: z.string(), 
        b: z.number(), 
        c: z.literal('L') 
      });
    `;

    // Collect declarations from the code snippet
    const decls = await collectDeclarations([{ path: 'test.ts', text: code }]);
    // Expect exactly one Zod object extracted
    expect(decls).toHaveLength(1);
    const d = decls[0]!;

    // Verify kind and component name
    expect(d.kind).toBe('zodobject');
    expect(d.location.name).toBe('Foo');

    // Shape should mimic a TS interface with the correct name
    expect(d.shape).toMatchObject({ kind: 'Interface', name: 'Foo' });

    // Props: sorted by name, correct types, and flags
    expect(d.shape.props).toEqual([
      { name: 'a', optional: false, readonly: false, type: 'string' },
      { name: 'b', optional: false, readonly: false, type: 'number' },
      { name: 'c', optional: false, readonly: false, type: 'L' },
    ]);
  });
});
