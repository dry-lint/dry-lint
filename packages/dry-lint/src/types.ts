/**
 * Represents a declaration emitted by an extractor plugin.
 */
export interface Declaration {
  id: string;
  kind: string;
  shape: any;
  location: { file: string; name: string };
}

/**
 * A group of declarations determined to be duplicates or near-duplicates.
 */
export interface DupGroup {
  similarity: number;
  decls: Declaration[];
}

export interface CoreOptions {
  threshold?: number;
  json?: boolean;
  sarif?: boolean;
  fix?: boolean;
  ignore?: string[];
  cache?: boolean;
  outFile?: string;
}

/**
 * Signature for extractor plugins.
 */
export type Extractor =
  | ((filePath: string, fileText: string) => Declaration[])
  | ((filePath: string, fileText: string) => Promise<Declaration[]>);
