import { describe, it, expect } from 'vitest';
import { getProject } from './ts-project.js';
import { Project } from 'ts-morph';

describe('getProject', () => {
  it('returns a ts-morph Project instance', () => {
    const project = getProject();
    expect(project).toBeInstanceOf(Project);
  });

  it('always returns the same singleton Project', () => {
    const p1 = getProject();
    const p2 = getProject();
    expect(p1).toBe(p2);
  });

  it('stores the Project on globalThis', () => {
    const key = Symbol.for('dry-lint.tsProject');
    const project = getProject();
    expect((globalThis as any)[key]).toBe(project);
  });

  it('uses an in-memory file system and skips adding files from tsconfig', () => {
    const project = getProject();
    expect(project.getFileSystem().constructor.name).toBe('InMemoryFileSystemHost');
    expect(project.getSourceFiles().length).toBe(0);
  });
});
