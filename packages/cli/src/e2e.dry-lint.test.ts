import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { execa } from 'execa';
import { createRequire } from 'module';

/** ------------------------------------------------------------------
 *  Shared helpers
 *  ------------------------------------------------------------------ */
interface DuplicateGroup {
  similarity: number;
  decls: { location: { file: string } }[];
}

interface Fixture {
  /** npm package name of the extractor */
  plugin: string;
  /** files to write: filename → contents */
  files: Record<string, string>;
  /** expected number of groups at threshold 1 (default 1) */
  exactGroups?: number;
}

const cliDist = fs.existsSync(path.resolve(__dirname, '..', 'dist', 'index.js'))
  ? path.resolve(__dirname, '..', 'dist', 'index.js')
  : path.resolve(__dirname, '..', 'bin', 'dry-lint.js');

const parseCliJson = (stdout: string): DuplicateGroup[] => {
  const start = stdout.indexOf('[');
  const end = stdout.lastIndexOf(']') + 1;
  if (start === -1 || end === 0) return [];
  try {
    return JSON.parse(stdout.slice(start, end));
  } catch {
    return [];
  }
};

async function runE2E(fx: Fixture, threshold = '1') {
  // create isolated workspace
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-lint-e2e-'));

  try {
    /* ── write fixture files ── */
    for (const [name, contents] of Object.entries(fx.files)) {
      fs.outputFileSync(path.join(cwd, name), contents);
    }

    /* ── .drylintrc.json with absolute plugin entry ── */
    const require = createRequire(import.meta.url);
    const pluginEntry = require.resolve(fx.plugin);
    fs.writeJSONSync(path.join(cwd, '.drylintrc.json'), {
      plugins: [pluginEntry],
    });

    /* ── spawn CLI ── */
    const args = [cliDist, cwd, '--json', '--no-progress', '--no-cache', '--threshold', threshold];
    const opts = { env: { FORCE_COLOR: '0' } };

    let stdout: string;
    try {
      ({ stdout } = await execa('node', args, opts));
    } catch (err: any) {
      // CLI exited with non-zero (e.g. plugin parse error) – still capture JSON
      stdout = err?.stdout ?? '';
    }

    return parseCliJson(stdout);
  } finally {
    fs.removeSync(cwd); // always clean up
  }
}

/** ------------------------------------------------------------------
 *  Minimal fixtures per plugin
 *  Add a new extractor by appending one object.
 *  ------------------------------------------------------------------ */
const fixtures: Fixture[] = [
  /* ───────── structured schema-style extractors ───────── */
  {
    plugin: '@dry-lint/asyncapi',
    files: {
      'a.yml': `asyncapi: 2.6.0
info:
  title: dup
  version: 1.0.0
channels:
  test:
    subscribe:
      message:
        $ref: '#/components/messages/Evt'
components:
  messages:
    Evt:
      name: Evt
      payload:
        type: object
        properties:
          id: { type: string }
`,
      'b.yml': `asyncapi: 2.6.0
info:
  title: dup
  version: 1.0.0
channels:
  test:
    subscribe:
      message:
        $ref: '#/components/messages/Evt'
components:
  messages:
    Evt:
      name: Evt
      payload:
        type: object
        properties:
          id: { type: string }
`,
    },
  },
  {
    plugin: '@dry-lint/avro',
    files: {
      'a.avsc':
        '{ "namespace":"dup","name":"T","type":"record","fields":[{ "name":"id","type":"string" }] }',
      'b.avsc':
        '{ "namespace":"dup","name":"T","type":"record","fields":[{ "name":"id","type":"string" }] }',
    },
  },
  {
    plugin: '@dry-lint/cloudformation',
    files: {
      'a.yaml': 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket\n',
      'b.yaml': 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket\n',
    },
  },
  {
    plugin: '@dry-lint/json-schema',
    files: {
      'a.json': '{ "type": "object", "properties": { "id": { "type": "string" } } }',
      'b.json': '{ "type": "object", "properties": { "id": { "type": "string" } } }',
    },
  },
  {
    plugin: '@dry-lint/openapi',
    files: {
      'a.yml': `openapi: 3.1.0
info: { title: dup, version: 1.0.0 }
components:
  schemas:
    T:
      type: object
      properties: { id: { type: string } }
paths: {}
`,
      'b.yml': `openapi: 3.1.0
info: { title: dup, version: 1.0.0 }
components:
  schemas:
    T:
      type: object
      properties: { id: { type: string } }
paths: {}
`,
    },
  },
  {
    plugin: '@dry-lint/prisma',
    files: {
      'a.prisma': `datasource db { provider = "sqlite" url = "file:dev.db" }
generator client { provider = "prisma-client-js" }
model Dup { id Int @id }`,
      'b.prisma': `datasource db { provider = "sqlite" url = "file:dev.db" }
generator client { provider = "prisma-client-js" }
model Dup { id Int @id }`,
    },
  },
  {
    plugin: '@dry-lint/proto',
    files: {
      'a.proto': 'syntax = "proto3";\nmessage T { int32 id = 1; }\n',
      'b.proto': 'syntax = "proto3";\nmessage T { int32 id = 1; }\n',
    },
  },
  {
    plugin: '@dry-lint/sql',
    files: {
      'a.sql': 'CREATE TABLE t(id INT);',
      'b.sql': 'CREATE TABLE t(id INT);',
    },
  },
  {
    plugin: '@dry-lint/terraform',
    files: {
      'a.tf': 'resource "null_resource" "dup" {}\n',
      'b.tf': 'resource "null_resource" "dup" {}\n',
    },
  },
  {
    plugin: '@dry-lint/thrift',
    files: {
      'a.thrift': 'struct T { 1: i32 id }',
      'b.thrift': 'struct T { 1: i32 id }',
    },
  },
  {
    plugin: '@dry-lint/xsd',
    files: {
      'a.xsd': `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="T"><xs:sequence/></xs:complexType>
</xs:schema>`,
      'b.xsd': `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="T"><xs:sequence/></xs:complexType>
</xs:schema>`,
    },
  },

  /* ─────────── code / config extractors ─────────── */
  {
    plugin: '@dry-lint/k8s',
    files: {
      'a.yaml': 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: dup\n',
      'b.yaml': 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: dup\n',
    },
  },
  {
    plugin: '@dry-lint/css',
    exactGroups: 2,
    files: {
      'a.css': '.dup{--primary:#f00;color:var(--primary)}',
      'b.css': '.dup{--primary:#f00;color:var(--primary)}',
    },
  },
  {
    plugin: '@dry-lint/graphql',
    files: {
      'a.graphql': 'type T{ id: ID! }',
      'b.graphql': 'type T{ id: ID! }',
    },
  },
  {
    plugin: '@dry-lint/mongoose',
    files: {
      'a.ts': `import mongoose from 'mongoose';
export const Dup = mongoose.model('Dup', new mongoose.Schema({ id: String }));`,
      'b.ts': `import mongoose from 'mongoose';
export const Dup = mongoose.model('Dup', new mongoose.Schema({ id: String }));`,
    },
  },
  {
    plugin: '@dry-lint/prop-types',
    files: {
      'a.js': `import PropTypes from 'prop-types';
export const Dup = { id: PropTypes.string };`,
      'b.js': `import PropTypes from 'prop-types';
export const Dup = { id: PropTypes.string };`,
    },
  },
  {
    plugin: '@dry-lint/typeorm',
    files: {
      'a.ts': '@Entity()\nexport class T { @PrimaryGeneratedColumn() id!: number }',
      'b.ts': '@Entity()\nexport class T { @PrimaryGeneratedColumn() id!: number }',
    },
  },
  {
    plugin: '@dry-lint/typescript',
    files: {
      'a.ts': 'export interface T { id: string }',
      'b.ts': 'export interface T { id: string }',
    },
  },
  {
    plugin: '@dry-lint/zod',
    files: {
      'a.ts': `import { z } from 'zod';
export const Dup = z.object({ id: z.string() });`,
      'b.ts': `import { z } from 'zod';
export const Dup = z.object({ id: z.string() });`,
    },
  },
];

/** ------------------------------------------------------------------
 *  Table-driven tests – runs once per fixture
 *  ------------------------------------------------------------------ */
describe.each(fixtures)('$plugin extractor (e2e)', fx => {
  const expected = fx.exactGroups ?? 1;

  it('detects the expected duplicate groups at threshold 1.0', async () => {
    const groups = await runE2E(fx, '1');
    expect(groups).toHaveLength(expected);
  });

  it('detects at least one group at threshold 0.8', async () => {
    const groups = await runE2E(fx, '0.8');
    expect(groups.length).toBeGreaterThanOrEqual(1);
  });
  it('returns zero groups for a workspace with no duplicates', async () => {
    const firstName = Object.keys(fx.files)[0]!;
    const singleFileFixture = {
      plugin: fx.plugin,
      files: { [firstName]: fx.files[firstName]! },
    };

    const groups = await runE2E(singleFileFixture, '1');
    expect(groups).toHaveLength(0);
  });

  it('gracefully ignores parse errors', async () => {
    const ext = path.extname(Object.keys(fx.files)[0]!) || '.txt';

    const brokenFixture = {
      plugin: fx.plugin,
      files: {
        ...fx.files,
        [`broken${ext}`]: '::::',
      },
    };

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const groups = await runE2E(brokenFixture, '1');
    expect(Array.isArray(groups)).toBe(true);
    spy.mockRestore();
  });
});
