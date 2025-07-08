import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';

// Register the CSS extractor plugin before running tests
import '../src/index';
import { findDuplicates } from '@dry-lint/dry-lint';

/**
 * Tests for the CSS extractor plugin across plain CSS, SCSS, and Less files.
 */
describe('CSS plugin (plain, SCSS, Less)', () => {
  it('extracts class selectors, custom properties, and variables without duplicates', async () => {
    // Create a temporary directory to hold the CSS file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-css-'));

    // Sample stylesheet containing a class, a CSS variable, a SCSS variable, and a mixin
    const cssContent = `
      .foo { color: red; }
      :root { --main: #fff; }
      $sc-var: 1px;
      @my-mixin { display: block; }
    `;

    // Write the content to a .css file
    const filePath = path.join(tmpDir, 'a.css');
    fs.writeFileSync(filePath, cssContent);

    // Run duplicate detection at 100% threshold; expect no duplicate groups
    const groups = await findDuplicates([filePath], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate class and CSS variable definitions across SCSS and Less files', async () => {
    // Create a temporary directory for duplicate test
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-css-dup-'));

    // Single selector and property used in both SCSS and Less
    const sharedContent = '.dup { a: 1; } --v:2;';

    // Write the shared content to .scss and .less files
    const fileScss = path.join(tmpDir, 'a.scss');
    const fileLess = path.join(tmpDir, 'b.less');
    fs.writeFileSync(fileScss, sharedContent);
    fs.writeFileSync(fileLess, sharedContent);

    // Run duplicate detection at 100% threshold
    const groups = await findDuplicates([fileScss, fileLess], { threshold: 1, json: true });

    // Expect two duplicate groups: one for the class, one for the CSS variable
    expect(groups).toHaveLength(2);

    // Collect the kinds of declarations in each group for verification
    const kinds = groups
      .map(g => g.decls[0]!.kind) // first declaration's kind in each group
      .sort();
    expect(kinds).toEqual(['css-class', 'css-var']);
  });
});
