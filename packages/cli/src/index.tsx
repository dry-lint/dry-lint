#!/usr/bin/env node
/**
 * dry-lint CLI entry‑point.
 *
 * Responsibilities
 *  • Parse CLI flags.
 *  • Discover and load extractors (plugins).
 *  • Delegate duplicate detection to @dry-lint/dry-lint.
 */

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { render } from 'ink';
import { Command } from 'commander';
import { globby } from 'globby';
import { findDuplicates } from '@dry-lint/dry-lint';

import { DryUI } from './ui.js';
import { loadConfig } from './loadConfig.js';

/**
 * CLI definition
 */
export const program = new Command();
program
  .name('dry')
  .description('Detect duplicate declarations across your project')
  .argument('[projectDir]', 'Directory to scan (default: current directory)', '.')
  .option('-t, --threshold <num>', 'Similarity threshold between 0 and 1', v => parseFloat(v), 1)
  .option('--json', 'Output results in JSON format')
  .option('--sarif', 'Output results in SARIF format')
  .option('--out <file>', 'Write report to the specified file')
  .option('--fix', 'Generate a fix file for exact matches')
  .option('--ignore <patterns...>', 'Glob patterns to ignore', [])
  .option('--no-cache', 'Disable file caching')
  .option('--ui', 'Launch interactive Ink UI')
  .parse();

/**
 * Load and register the requested plugins.
 *
 * @returns Resolved user config (so other options can be read later).
 */
async function bootstrapPlugins(cwd: string) {
  const cfg = await loadConfig(cwd);

  // 1. Plugins listed explicitly in .drylintrc
  let plugins: string[] = Array.isArray(cfg.plugins) ? cfg.plugins : [];

  // 2. Fallback: every installed @dry‑lint/* package except core & cli
  if (plugins.length === 0) {
    try {
      const pkgJson = JSON.parse(await fsPromises.readFile(path.join(cwd, 'package.json'), 'utf8'));
      const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies } as Record<
        string,
        unknown
      >;
      plugins = Object.keys(deps).filter(
        n => n.startsWith('@dry-lint/') && !['@dry-lint/dry-lint', '@dry-lint/cli'].includes(n)
      );
    } catch {
      // No package.json – ignore.
    }
  }

  for (const id of plugins) {
    try {
      await import(id);
      console.log(`Loaded plugin: ${id}`);
    } catch (err) {
      console.error(`Unable to load plugin “${id}”`, err);
    }
  }

  return cfg;
}

/**
 * Main execution entry.
 */
export async function run(argv = process.argv.slice(2)) {
  program.parse(argv, { from: 'user' });

  const opts = program.opts();
  const [projectDir = '.'] = program.args;

  if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
    console.error(`Error: path “${projectDir}” not found or is not a directory`);
    process.exit(1);
  }

  await bootstrapPlugins(projectDir);

  try {
    const includePatterns = [
      '**/*.{ts,tsx,js,jsx,json,yaml,yml,graphql,gql,proto,thrift,sql,xsd,tf}',
    ];
    const ignoreGlobs: string[] = Array.isArray(opts.ignore) ? opts.ignore : [opts.ignore];

    const filePaths = await globby(includePatterns, {
      cwd: projectDir,
      absolute: true,
      ignore: ignoreGlobs,
    });

    const outFilePath = opts.out
      ? path.isAbsolute(opts.out)
        ? opts.out
        : path.join(projectDir, opts.out)
      : undefined;

    if (opts.ui) {
      render(<DryUI projectPath={projectDir} threshold={opts.threshold} />);
      return;
    }

    await findDuplicates(filePaths, {
      threshold: opts.threshold,
      json: opts.json,
      sarif: opts.sarif,
      fix: opts.fix,
      outFile: outFilePath,
      ignore: ignoreGlobs,
      cache: opts.noCache !== true,
    });
  } catch (err: any) {
    console.error(err.message || err);
    process.exit(1);
  }
}

if (import.meta.main) void run();
