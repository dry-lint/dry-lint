/**
 * Represents a declaration emitted by an extractor plugin.
 */
export interface Declaration<TShape = Record<string, unknown>> {
  id: string;
  kind: string;
  shape: TShape;
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
  pool?: number;
  progress?: boolean;
}

/**
 * Signature for extractor plugins.
 */
export type Extractor<TShape = Record<string, unknown>> =
  | ((filePath: string, fileText: string) => Declaration<TShape>[])
  | ((filePath: string, fileText: string) => Promise<Declaration<TShape>[]>);
