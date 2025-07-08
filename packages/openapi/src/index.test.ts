import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import './index';
import { findDuplicates } from '@dry-lint/dry-lint';

/**
 * Test suite for the OpenAPI schema extractor plugin.
 * Validates extraction of component schemas and duplicate detection across API documents.
 */
describe('OpenAPI plugin', () => {
  it('extracts all component schemas from a simple OpenAPI JSON document', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-openapi-'));
    const apiDoc: {
      openapi: string;
      info: { title: string; version: string };
      paths: Record<string, any>;
      components: {
        schemas: Record<string, any>;
      };
    } = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          Foo: { type: 'object', properties: { x: { type: 'number' } } },
          Bar: { type: 'object', properties: { y: { type: 'string' } } },
        },
      },
    };
    const filePath = path.join(tmpDir, 'api.json');
    fs.writeFileSync(filePath, JSON.stringify(apiDoc, null, 2));

    const groups = await findDuplicates([filePath], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);

    const filePath2 = path.join(tmpDir, 'api2.json');
    apiDoc.components.schemas['FooAlias'] = apiDoc.components.schemas.Foo;
    fs.writeFileSync(filePath2, JSON.stringify(apiDoc, null, 2));

    const dupGroups = await findDuplicates([filePath, filePath2], { threshold: 1, json: true });

    expect(dupGroups).toHaveLength(1);
    dupGroups.forEach(group => expect(group.similarity).toBe(1));

    const namesList = dupGroups.map(g => g.decls.map(d => d.location.name).sort());
    expect(namesList).toContainEqual(['Foo', 'FooAlias']);
  });
});
