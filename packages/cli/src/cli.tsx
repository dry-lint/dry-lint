#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { render } from 'ink';
import { Command } from 'commander';
import { globby } from 'globby';
import '@dry-lint/typescript';
import '@dry-lint/zod';
import { findDuplicates } from '@dry-lint/core';
import { DryUI } from './ui.js';

// Initialize the CLI program
export const program = new Command();
program
  .name('dry')
  .description('Detect duplicate declarations across TypeScript & Zod schemas')
  .argument('[projectDir]', 'Directory to scan (default: current directory)', '.')
  .option('-t, --threshold <num>', 'Similarity threshold between 0 and 1', v => parseFloat(v), 1)
  .option('--json', 'Output results in JSON format')
  .option('--sarif', 'Output results in SARIF format')
  .option('--out <file>', 'Write report to the specified file')
  .option('--fix', 'Generate a fix file for exact matches')
  .option('--ignore <patterns...>', 'Glob patterns to ignore', [])
  .option('--no-cache', 'Disable file caching for fresh scans')
  .option('--ui', 'Launch interactive Ink-based UI')
  .parse();

// Main execution block
export async function run(argv = process.argv.slice(2)) {
  program.parse(argv, { from: 'user' });
  await (async () => {
    const opts = program.opts();
    const [projectDir = '.'] = program.args;

    // 1) Verify that the project directory exists and is a directory
    if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
      console.error(`Error: path "${projectDir}" not found or is not a directory`);
      process.exit(1);
    }

    try {
      // 2) Construct the list of files to scan based on globs
      const includePatterns = ['**/*.{ts,tsx}'];
      const ignoreGlobs: string[] = Array.isArray(opts.ignore) ? opts.ignore : [opts.ignore];
      const filePaths = await globby(includePatterns, {
        cwd: projectDir,
        absolute: true,
        ignore: ignoreGlobs,
      });

      // Determine output file path if --out option is used
      let outFilePath: string | undefined;
      if (opts.out) {
        outFilePath = path.isAbsolute(opts.out) ? opts.out : path.join(projectDir, opts.out);
      }

      // 3) Dispatch to either interactive UI or direct report generation
      if (opts.ui) {
        // Launch the Ink UI component for interactive navigation
        render(<DryUI projectPath={projectDir} threshold={opts.threshold} />);
      } else {
        // Run duplicate detection and write reports based on options
        await findDuplicates(filePaths, {
          threshold: opts.threshold,
          json: opts.json,
          sarif: opts.sarif,
          fix: opts.fix,
          outFile: outFilePath,
          ignore: ignoreGlobs,
          cache: opts.noCache !== true,
        });
      }
    } catch (err: any) {
      // 4) Handle any unexpected errors during execution
      console.error(err.message || err);
      process.exit(1);
    }
  })();
}
if (import.meta.main) run();
