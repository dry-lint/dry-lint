import fs from 'fs';
import crypto from 'crypto';

/**
 * Represents a declaration emitted by an extractor plugin.
 */
export interface Declaration {
  /** Unique identifier for the declaration (e.g., filePath#type:name) */
  id: string;
  /** Kind of declaration (e.g., 'asyncapi-message', 'avro-record') */
  kind: string;
  /** The shape object used to compute similarity */
  shape: any;
  /** Source location of the declaration */
  location: { file: string; name: string };
}

/**
 * A group of declarations determined to be duplicates or near-duplicates.
 */
export interface DupGroup {
  /** Similarity score between 0 (no match) and 1 (identical) */
  similarity: number;
  /** Array of declarations in this duplicate group */
  decls: Declaration[];
}

/**
 * Options for controlling findDuplicates behavior and output formats.
 */
export interface CoreOptions {
  threshold?: number; // Similarity threshold (default: 1)
  json?: boolean; // Output JSON
  sarif?: boolean; // Output SARIF report
  fix?: boolean; // Generate fix file for exact matches
  ignore?: string[]; // Glob patterns to ignore
  cache?: boolean; // Enable/disable caching
  outFile?: string; // Path to write output or fix file
}

/**
 * Signature for extractor plugins, synchronous or async.
 */
export type Extractor =
  | ((filePath: string, fileText: string) => Declaration[])
  | ((filePath: string, fileText: string) => Promise<Declaration[]>);

// Registered extractor plugins
const extractors: Extractor[] = [];

/**
 * Registers an extractor plugin.
 * @param ext - Plugin function to extract declarations from a file
 */
export function registerExtractor(ext: Extractor) {
  extractors.push(ext);
}

/**
 * Reads each file and applies all registered extractors to collect declarations.
 * @param files - Array of filePath/text pairs
 * @returns A flat array of all extracted declarations
 */
export async function collectDeclarations(
  files: Array<{ path: string; text: string }>
): Promise<Declaration[]> {
  const all: Declaration[] = [];
  for (const f of files) {
    for (const ext of extractors) {
      const result = ext(f.path, f.text);
      const decls = result instanceof Promise ? await result : result;
      all.push(...decls);
    }
  }
  return all;
}

/**
 * Computes a SHA-1 hash of the declaration shape, ensuring stable grouping.
 */
function hashShape(shape: any): string {
  const json = JSON.stringify(shape);
  return crypto.createHash('sha1').update(json).digest('hex');
}

/**
 * Groups declarations by exact hash matches, and optionally fuzzy matches below threshold.
 * @param decls - Array of declarations to group
 * @param threshold - Similarity threshold for reporting fuzzy matches
 * @returns Array of duplicate groups
 */
export function groupDeclarations(decls: Declaration[], threshold = 1): DupGroup[] {
  // Map from shape-hash to declarations
  const map = new Map<string, Declaration[]>();
  for (const d of decls) {
    const h = hashShape(d.shape);
    const bucket = map.get(h) || [];
    bucket.push(d);
    map.set(h, bucket);
  }

  const groups: DupGroup[] = [];

  // Exact duplicates (similarity === 1)
  for (const bucket of map.values()) {
    if (bucket.length > 1) {
      groups.push({ similarity: 1, decls: bucket });
    }
  }

  // Fuzzy duplicates for threshold < 1
  if (threshold < 1) {
    const hashes = Array.from(map.keys());
    for (let i = 0; i < hashes.length; i++) {
      for (let j = i + 1; j < hashes.length; j++) {
        const a = hashes[i]!;
        const b = hashes[j]!;
        // Compute Jaccard-like similarity over hash character sets
        const setA = new Set(a);
        const setB = new Set(b);
        const intersection = [...setA].filter(c => setB.has(c)).length;
        const union = setA.size + setB.size - intersection;
        const sim = intersection / union;
        if (sim >= threshold && sim < 1) {
          groups.push({ similarity: sim, decls: [...map.get(a)!, ...map.get(b)!] });
        }
      }
    }
  }

  return groups;
}

/**
 * Main entrypoint: reads files, collects declarations, groups duplicates, and outputs results.
 */
export async function findDuplicates(
  filePaths: string[],
  opts: CoreOptions = {}
): Promise<DupGroup[]> {
  const { threshold = 1, json = false, sarif = false, fix = false, outFile } = opts;

  // Read file contents
  const files = filePaths.map(fp => ({ path: fp, text: fs.readFileSync(fp, 'utf8') }));
  // Extract and group
  const decls = await collectDeclarations(files);
  const groups = groupDeclarations(decls, threshold);

  // JSON output
  if (json) {
    const out = JSON.stringify(groups, null, 2);
    if (outFile) fs.writeFileSync(outFile, out, 'utf8');
    else console.log(out);
  }

  // SARIF output
  if (sarif) {
    const sarifDoc = {
      version: '2.1.0',
      runs: [
        {
          tool: { driver: { name: 'core', version: '1.0.0' } },
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
    if (outFile) fs.writeFileSync(outFile, out, 'utf8');
    else console.log(out);
  }

  // Plain console output for CLI
  if (!json && !sarif) {
    for (const g of groups) {
      console.log(`Group (${Math.round(g.similarity * 100)}%):`);
      g.decls.forEach(d => console.log(`  [${d.kind}] ${d.location.file}:${d.location.name}`));
      console.log('');
    }
  }

  // Fix file generation
  if (fix && outFile) {
    writeFixFile(groups, outFile);
  }

  return groups;
}

/**
 * Writes a TypeScript file with type aliases for exact duplicate groups.
 */
function writeFixFile(groups: DupGroup[], outFile: string) {
  const exact = groups.filter(g => g.similarity === 1);
  let body = `// Auto-generated by dry-lint – identical types unified\n\n`;
  exact.forEach((g, idx) => {
    const baseName = g.decls[0]!.location.name;
    body += `// Group ${idx + 1}\n`;
    // Declare a placeholder for the base type
    body += `export type ${baseName} = {/* replace with real shape */};\n`;
    // Alias remaining duplicates to the base type
    g.decls.slice(1).forEach(d => {
      body += `export type ${d.location.name} = ${baseName};\n`;
    });
    body += `\n`;
  });
  fs.writeFileSync(outFile, body, 'utf8');
}
