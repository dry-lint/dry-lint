# dry-lint Monorepo

[![CI](https://github.com/dry-lint/dry-lint/actions/workflows/ci.yml/badge.svg)](https://github.com/dry-lint/dry-lint/actions/workflows/ci.yml)  
[![npm](https://img.shields.io/npm/v/@dry-lint/cli)](https://www.npmjs.com/package/@dry-lint/cli)  
[![downloads](https://img.shields.io/npm/dw/@dry-lint/cli)](https://www.npmjs.com/package/@dry-lint/cli)  
[![size](https://img.shields.io/bundlephobia/minzip/@dry-lint/cli)](https://bundlephobia.com/package/@dry-lint/cli)  
[![codecov](https://codecov.io/gh/dry-lint/dry-lint/branch/main/graph/badge.svg)](https://codecov.io/gh/dry-lint/dry-lint)  
[![docs](https://img.shields.io/badge/docs-%E2%9C%93-blue)](https://dry-lint.github.io/dry-lint/)  
[![license](https://img.shields.io/npm/l/@dry-lint/cli)](LICENSE)

A plugin-driven duplicate declaration detection framework for TypeScript and Zod. This monorepo contains:

- **dry-core**: The shared engine for extracting, normalizing, hashing, and grouping any kind of declaration.
- **typescript-dry**: A plugin that registers TypeScript AST extractors (interfaces, types, enums).
- **zod-dry**: A plugin that registers Zod schema extractors (`z.object()`, `z.enum()`, etc.).
- **cli**: A user-friendly CLI (`dry`) and optional Ink UI for interactive exploration.

> **Efficiency**: incremental file caching, parallel AST parsing, and optional fuzzy grouping.

---

## 📦 Packages

| Package               | npm Name                      | Description                                |
| --------------------- | ----------------------------- | ------------------------------------------ |
| **asyncapi**          | `@dry-lint/asyncapi`          | AsyncAPI specification extractor           |
| **avro**              | `@dry-lint/avro`              | Avro schema extractor                      |
| **cloudformation**    | `@dry-lint/cloudformation`    | AWS CloudFormation template extractor      |
| **core**              | `@dry-lint/core`              | Core engine & API (registration, grouping) |
| **css**               | `@dry-lint/css`               | CSS style rule extractor                   |
| **eslint-config**     | `@dry-lint/eslint-config`     | Shared ESLint configurations               |
| **graphql**           | `@dry-lint/graphql`           | GraphQL schema extractor                   |
| **integration-tests** | `@dry-lint/integration-tests` | End-to-end integration test harness        |
| **json**              | `@dry-lint/json`              | JSON structure extractor                   |
| **k8s**               | `@dry-lint/k8s`               | Kubernetes manifest extractor              |
| **mongoose**          | `@dry-lint/mongoose`          | Mongoose schema extractor                  |
| **openapi**           | `@dry-lint/openapi`           | OpenAPI/Swagger spec extractor             |
| **prisma**            | `@dry-lint/prisma`            | Prisma schema extractor                    |
| **prop-types**        | `@dry-lint/prop-types`        | React PropTypes extractor                  |
| **proto**             | `@dry-lint/proto`             | Protobuf IDL extractor                     |
| **sql**               | `@dry-lint/sql`               | SQL DDL extractor                          |
| **terraform**         | `@dry-lint/terraform`         | Terraform HCL plugin extractor             |
| **thrift**            | `@dry-lint/thrift`            | Thrift IDL extractor                       |
| **typeorm**           | `@dry-lint/typeorm`           | TypeORM entity extractor                   |
| **typescript**        | `@dry-lint/typescript`        | TypeScript AST extractor                   |
| **typescript-config** | `@dry-lint/typescript-config` | Shared TypeScript configuration            |
| **xsd**               | `@dry-lint/xsd`               | XML Schema (XSD) extractor                 |
| **zod**               | `@dry-lint/zod`               | Zod schema extractor                       |

All packages live under `packages/` and are published separately under the `@dry-lint` scope.

---

## 🚀 Getting Started

Clone the monorepo:

```bash
git clone https://github.com/dry-lint/dry-lint.git
cd dry-lint
```

Install dependencies (using your preferred package manager):

```bash
# If you use bun:
bun install

# Or with npm
npm ci

# Or with Yarn
yarn install
```

---

## 🛠 CLI Usage

Install the CLI globally (or as a dev dependency):

```bash
npm install -g @dry-lint/cli
# or
yarn global add @dry-lint/cli
# or
bun add -g @dry-lint/cli
```

Run duplicate detection across your TS/Zod files:

```bash
dry [projectDir] [options]
```

### Options

- `-t, --threshold <num>` — similarity threshold (0–1, default `1`).
- `--ignore <patterns...>` — glob patterns to skip.
- `--json` — output JSON report.
- `--sarif` — output SARIF report.
- `--out <file>` — write report to file.
- `--fix` — generate alias stub file for exact matches.
- `--no-cache` — disable file-level caching.
- `--ui` — launch interactive Ink UI.

---

## 📚 API (dry-core)

```ts
import { findDuplicates } from '@dry-lint/core';

const groups = findDuplicates(filePaths, {
  threshold: 0.8,
  json: false,
  sarif: false,
  outFile: 'report.json',
});
```

- **`findDuplicates(files, options)`**: runs all registered extractors, groups duplicates, and reports.
- **`registerExtractor(fn)`**: plugin hook to add new extractors before you call `findDuplicates`.

---

## 🔌 Writing a Plugin

1. Create a new package (e.g. `packages/my-plugin`).
2. Depend on `@dry-lint/core`.
3. Call `registerExtractor((filePath, fileText) => Declaration[])` in your entrypoint.
4. Export your AST or normalized shape logic.
5. Import your plugin in the CLI entrypoint or any consumer.

**Example (TypeScript plugin):**

```ts
import { Project } from 'ts-morph';
import { registerExtractor, Declaration } from '@dry-lint/core';

registerExtractor((filePath, text) => {
  const project = new Project({ useInMemoryFileSystem: true });
  const sf = project.createSourceFile(filePath, text);
  return sf.getInterfaces().map(i => ({
    id: `${filePath}#${i.getName()}`,
    kind: 'ts-interface',
    shape: normalizeInterface(i),
    location: { file: filePath, name: i.getName() },
  }));
});
```

---

## 📦 Workspace & Build

We use Turborepo for fast, cached pipelines.

**`turbo.json`** (excerpt):

```jsonc
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["packages/*/dist/**"],
    },
    "test": {
      "dependsOn": ["^test"],
      "outputs": [],
    },
  },
}
```

Run builds & tests across all packages:

```bash
bun run build
bun run test   # this will invoke `vitest run` in each package
```

---

## 🤝 Contributing

1. Fork the repo and create your branch.
2. Add or update an extractor plugin under `packages/`.
3. Update docs and add tests.
4. Submit a PR — CI will build, lint, and test all packages automatically.

---

## 📄 License

MIT ©
