import fs from 'node:fs';
import { cacheKey, readCache, writeCache } from './cache.js';
import { collectDeclarations } from './collectDeclarations.js';
import { groupDeclarations } from './groupDeclarations.js';
import { writeFixFile } from './writeFixFile.js';
import type { CoreOptions, DupGroup } from './types.js';
import ProgressBar from 'cli-progress';

/**
 * Main orchestrator for dry-lint.
 *
 * Steps:
 *  1.  Scan & read source files (skip unchanged via cache)
 *  2.  Run all registered extractors and collect declarations
 *  3.  Group identical / near-identical declarations
 *  4.  Emit output (JSON, SARIF, console) and optional fix-file
 *
 * @param filePaths – absolute or relative paths to the files under analysis
 * @param opts      – behaviour flags & thresholds
 * @returns array of duplicate groups (always returned, even when printed)
 */
export async function findDuplicates(
  filePaths: string[],
  opts: CoreOptions = {}
): Promise<DupGroup[]> {
  const {
    threshold = 1,
    cache = true,
    json = false,
    sarif = false,
    fix = false,
    outFile,
    progress,
  } = opts;

  const showBar = progress !== false && !json && !sarif && process.stdout.isTTY;

  const bar = showBar
    ? new ProgressBar.SingleBar(
        { format: 'Scanning [{bar}] {percentage}% | {value}/{total} files' },
        ProgressBar.Presets.shades_classic
      )
    : null;

  const files: { path: string; text: string }[] = [];
  bar?.start(filePaths.length, 0);

  for (const fp of filePaths) {
    const mtime = fs.statSync(fp).mtimeMs;
    const key = cacheKey(fp, mtime);
    const isCached = cache && readCache<boolean>(key);

    if (!isCached) {
      const text = fs.readFileSync(fp, 'utf8');
      writeCache(key, true);
      files.push({ path: fp, text });
    }

    bar?.increment();
  }

  bar?.stop();
  
  const decls = await collectDeclarations(files);
  const groups = groupDeclarations(decls, threshold);

  if (json) {
    const out = JSON.stringify(groups, null, 2);
    if (outFile) {
      fs.writeFileSync(outFile, out, 'utf8');
    } else {
      console.log(out);
    }
  } else if (sarif) {
    const sarifDoc = {
      version: '2.1.0',
      runs: [
        {
          tool: { driver: { name: 'dry-lint', version: '1.0.0' } },
          results: groups.map(g => ({
            message: { text: `Similarity: ${g.similarity}` },
            locations: g.decls.map(d => ({
              physicalLocation: {
                artifactLocation: { uri: d.location.file },
                region: { snippet: { text: d.location.name } },
              },
            })),
          })),
        },
      ],
    };
    const out = JSON.stringify(sarifDoc, null, 2);
    if (outFile) {
      fs.writeFileSync(outFile, out, 'utf8');
    } else {
      console.log(out);
    }
  } else {
    for (const g of groups) {
      console.log(`Group (${Math.round(g.similarity * 100)}%):`);
      g.decls.forEach(d => console.log(`  [${d.kind}] ${d.location.file}:${d.location.name}`));
      console.log('');
    }
  }

  if (fix && outFile) writeFixFile(groups, outFile);

  return groups;
}
