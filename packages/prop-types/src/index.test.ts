import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { _clearRegistryForTests, findDuplicates } from '@dry-lint/dry-lint';

const tmp = (pfx: string) => fs.mkdtempSync(path.join(os.tmpdir(), pfx));
const write = (d: string, n: string, c: string) => fs.writeFileSync(path.join(d, n), c);

describe('PropTypes extractor', () => {
  beforeEach(async () => {
    _clearRegistryForTests();
    vi.resetModules();
    await import('./index.js');
  });

  it('extracts a component’s propTypes shape (no dupes for single file)', async () => {
    const dir = tmp('dry-prop-');
    write(
      dir,
      'btn.jsx',
      `
        import PropTypes from 'prop-types';
        function Button() { return null; }
        Button.propTypes = {
          label: PropTypes.string.isRequired,
          count: PropTypes.number
        };
      `
    );

    const groups = await findDuplicates([path.join(dir, 'btn.jsx')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toEqual([]);
  });

  it('extracts props from inline object declarations', async () => {
    const dir = tmp('dry-prop-inline-');
    const inlineCode = `
      import PropTypes from 'prop-types';
      export const Inline = {
        foo: PropTypes.string,
        bar: PropTypes.arrayOf(PropTypes.number)
      };
    `;

    write(dir, 'a.jsx', inlineCode);
    write(dir, 'b.jsx', inlineCode);
    const fileA = path.join(dir, 'a.jsx');
    const fileB = path.join(dir, 'b.jsx');

    const groups = await findDuplicates([fileA, fileB], {
      threshold: 1,
      json: true,
    });

    expect(groups).toHaveLength(1);

    const group = groups[0]! as any;
    expect(group).toBeDefined();

    expect(group.decls).toHaveLength(2);

    const [declA, declB] = group.decls;
    expect(declA).toBeDefined();
    expect(declB).toBeDefined();

    expect(declA.shape.props.foo).toEqual({ kind: 'string' });
    expect(declA.shape.props.bar).toEqual({
      kind: 'arrayOf',
      argument: { kind: 'number' },
    });
  });

  it('detects duplicate propTypes definitions across files', async () => {
    const dir = tmp('dry-prop-dup-');
    const snippet = `
      import PropTypes from 'prop-types';
      const X = () => null;
      X.propTypes = { foo: PropTypes.string };
    `;
    write(dir, 'a.jsx', snippet);
    write(dir, 'b.jsx', snippet);

    const groups = await findDuplicates([path.join(dir, 'a.jsx'), path.join(dir, 'b.jsx')], {
      threshold: 1,
      json: true,
    });

    expect(groups).toHaveLength(1);
    const names = groups[0]!.decls.map(d => d.location.name);
    expect(names).toEqual(['X', 'X']);
  });
});
