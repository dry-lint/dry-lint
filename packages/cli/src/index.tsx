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
import { DryLintConfig } from './configSchema.js';
import os from 'node:os';

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
  .option('--progress', 'Show progress bar (default)', true)
  .option('--no-progress', 'Disable progress bar')
  .option('--ui', 'Launch interactive Ink UI')
  .option(
    '--pool <n>',
    'Max worker threads (default: logical cores)',
    v => parseInt(v, 10),
    os.cpus().length
  );

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

function mergeConfig(fileCfg: DryLintConfig, cli: Record<string, any>): DryLintConfig {
  return {
    ...fileCfg,
    ...cli,
    ignore: [
      ...(fileCfg.ignore ?? []),
      ...(Array.isArray(cli.ignore) ? cli.ignore : cli.ignore ? [cli.ignore] : []),
    ],
    pool: cli.pool,
    progress: cli.progress,
  };
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

  const fileCfg = await bootstrapPlugins(projectDir);
  const cfg = mergeConfig(fileCfg, opts);

  try {
    const includePatterns = [
      // generic data / config
      '**/*.{json,yaml,yml,avsc,avro,avro.json,prisma,sql,tf}',
      // schemas & IDLs
      '**/*.{proto,thrift,xsd,graphql,gql}',
      // code
      '**/*.{js,jsx,ts,tsx}',
      // stylesheets
      '**/*.{css,scss,less}',
    ];

    const filePaths = await globby(includePatterns, {
      cwd: projectDir,
      absolute: true,
      ignore: cfg.ignore,
    });

    const outFilePath = cfg.out
      ? path.isAbsolute(cfg.out)
        ? cfg.out
        : path.join(projectDir, cfg.out)
      : undefined;

    if (cfg.ui) {
      render(<DryUI projectPath={projectDir} threshold={cfg.threshold} />);
      return;
    }

    await findDuplicates(filePaths, {
      ...cfg,
      outFile: outFilePath,
      progress: cfg.progress,
    });
  } catch (err: any) {
    console.error(err.message || err);
    process.exit(1);
  }
}

if (import.meta.main) void run();
