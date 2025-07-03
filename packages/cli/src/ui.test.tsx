import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { DryUI, DryUIRender, printGroup } from './ui.js';

vi.mock('globby', () => ({
  globby: async () => [],
}));
vi.mock('@dry-lint/core', () => ({
  findDuplicates: async () => [],
}));

describe('DryUIRender', () => {
  it('shows spinner when scanning', () => {
    const { lastFrame } = render(<DryUIRender state="scanning" groups={[]} cursor={0} />);
    expect(lastFrame()).toMatch(/Scanning/);
  });

  it('shows success when no duplicates', () => {
    const { lastFrame } = render(<DryUIRender state="done" groups={[]} cursor={0} />);
    expect(lastFrame()).toMatch(/No duplicate declarations/);
  });

  it('shows groups when found', () => {
    const groups = [
      {
        similarity: 1,
        decls: [
          { id: 'A', kind: 'x', shape: {}, location: { file: 'f1.ts', name: 'Foo' } },
          { id: 'B', kind: 'x', shape: {}, location: { file: 'f2.ts', name: 'Foo' } },
        ],
      },
    ];
    const { lastFrame } = render(<DryUIRender state="done" groups={groups} cursor={0} />);
    expect(lastFrame()).toMatch(/1 duplicate group/);
    expect(lastFrame()).toMatch(/100% – Foo ↔ Foo/);
  });
});

describe('printGroup', () => {
  it('prints a group to console.log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const group = {
      similarity: 1,
      decls: [
        { id: 'A', kind: 'x', shape: {}, location: { file: '/abs/path/foo.ts', name: 'Foo' } },
        { id: 'B', kind: 'x', shape: {}, location: { file: '/abs/path/bar.ts', name: 'Bar' } },
      ],
    };

    printGroup(group as any);

    const calls = spy.mock.calls.flat();
    expect(calls.join(' ')).toContain('Foo');
    expect(calls.join(' ')).toContain('Bar');
    expect(calls.join(' ')).toContain('Group similarity');

    spy.mockRestore();
  });
});

describe('DryUI input handling', () => {
  it('exits on q input', async () => {
    const { stdin } = render(<DryUI projectPath="." threshold={1} />);
    stdin.write('q');
  });
});
