# dry-lint Monorepo

A plugin‑driven duplicate declaration detection framework for TypeScript and Zod. This monorepo contains:

* **dry-core**: The shared engine for extracting, normalizing, hashing, and grouping any kind of declaration.
* **typescript-dry**: A plugin that registers TypeScript AST extractors (interfaces, types, enums).
* **zod-dry**: A plugin that registers Zod schema extractors (`z.object()`, `z.enum()`, etc.).
* **cli**: A user‑friendly CLI (`dry`) and optional Ink UI for interactive exploration.

> **Efficiency**: incremental file caching, parallel AST parsing, and optional fuzzy grouping.

---

## 📦 Packages

| Package            | npm Name               | Description                                 |
| ------------------ | ---------------------- | ------------------------------------------- |
| **dry-core**       | `@dry-lint/core`       | Core engine & API (registrations, grouping) |
| **typescript-dry** | `@dry-lint/typescript` | TypeScript extractor plugin                 |
| **zod-dry**        | `@dry-lint/zod`        | Zod schema extractor plugin                 |
| **cli**            | `@dry-lint/cli`        | CLI & Ink UI                                |

All packages live under `packages/` and are published separately under the `@dry-lint` scope.

---

## 🚀 Getting Started

Clone the monorepo:

```bash
git clone https://github.com/dry-lint/dry-lint.git
cd dry-lint
```

Install dependencies (using Yarn or pnpm workspaces):

```bash
yarn install
# or
pnpm install
```

---

## 🛠 CLI Usage

Install the CLI globally (or as a dev dependency):

```bash
npm install -g @dry-lint/cli
# or
yarn global add @dry-lint/cli
```

Run duplicate detection across your TS/Zod files:

```bash
dry --threshold 0.9 --ignore "**/node_modules/**" --json
```

### Options

* `-t, --threshold <num>`  — similarity threshold (0–1, default `1`).
* `--ignore <patterns...>`  — glob patterns to skip.
* `--json`                 — output JSON report.
* `--sarif`                — output SARIF report.
* `--out <file>`           — write report to file.
* `--fix`                  — generate alias stub file for exact matches.
* `--no-cache`             — disable file‑level caching.
* `--ui`                   — launch interactive Ink UI.

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

* **`collectDeclarations(files)`**: apply all registered extractors.
* **`groupDeclarations(decls, threshold)`**: exact + fuzzy dedupe.

Plugins register themselves via `registerExtractor(...)` on import.

---

## 🔌 Writing a Plugin

1. Create a new package (e.g. `packages/my-plugin`).
2. Depend on `@dry-lint/core`.
3. Call `registerExtractor((filePath, fileText) => Declaration[])`.
4. Export your AST or AST‑like normalization logic.
5. Import your plugin in the CLI entrypoint or any consumer.

**Example** (TypeScript plugin):

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
    location: { file: filePath, name: i.getName() }
  }));
});
```

---

## 📦 Workspace & Build

We use Yarn (or pnpm) workspaces and Turborepo for fast, cached pipelines.

**`turbo.json`**:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

Run all builds & tests in parallel:

```bash
yarn turbo run build test
```

---

## 🤝 Contributing

1. Fork the repo and create your branch.
2. Add or update an extractor plugin under `packages/`.
3. Update docs / add tests.
4. Submit a PR — CI will build & lint all packages.

---

## 📄 License

MIT © Your Name
