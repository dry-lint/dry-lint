import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/dry-lint';

/**
 * Test suite for the PropTypes extractor plugin.
 * Validates extraction of React component propTypes and duplicate detection.
 */
describe('PropTypes plugin', () => {
  it('extracts a component’s propTypes shape from a single file', async () => {
    // Create a temporary directory and write a JSX file with propTypes
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-prop-'));
    const code = `
      import PropTypes from 'prop-types';
      function Button() { return null; }
      Button.propTypes = {
        label: PropTypes.string.isRequired,
        count: PropTypes.number
      };
    `;
    const filePath = path.join(tmpDir, 'btn.jsx');
    fs.writeFileSync(filePath, code);

    // Run duplicate detection at full threshold; expect no duplicates for single definition
    const groups = await findDuplicates([filePath], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate propTypes definitions across multiple files', async () => {
    // Create a temp directory and two JSX files with identical propTypes
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-prop-dup-'));
    const snippet = `
      import PropTypes from 'prop-types';
      const X = () => null;
      X.propTypes = { foo: PropTypes.string };
    `;
    const fileA = path.join(tmpDir, 'a.jsx');
    const fileB = path.join(tmpDir, 'b.jsx');
    fs.writeFileSync(fileA, snippet);
    fs.writeFileSync(fileB, snippet);

    // Run duplicate detection on both files at full similarity threshold
    const groups = await findDuplicates([fileA, fileB], { threshold: 1, json: true });

    // Expect one duplicate group for component X
    expect(groups).toHaveLength(1);
    const group = groups[0]!;
    expect(group.similarity).toBe(1);

    // Verify both declarations reference the same component name 'X'
    const names = group.decls.map(d => d.location.name).sort();
    expect(names).toEqual(['X', 'X']);
  });
});
