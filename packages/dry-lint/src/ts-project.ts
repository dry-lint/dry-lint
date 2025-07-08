import { Project } from 'ts-morph';

const PROJECT_KEY = Symbol.for('dry-lint.tsProject');
const g = globalThis as any;

if (!g[PROJECT_KEY]) {
  g[PROJECT_KEY] = new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
  });
}

export function getProject(): Project {
  return g[PROJECT_KEY] as Project;
}
