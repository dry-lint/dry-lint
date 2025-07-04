# dry-lint Monorepo

[![CI](https://github.com/dry-lint/dry-lint/actions/workflows/ci.yml/badge.svg)](https://github.com/dry-lint/dry-lint/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/@dry-lint/cli)](https://www.npmjs.com/package/@dry-lint/cli) [![downloads](https://img.shields.io/npm/dw/@dry-lint/cli)](https://www.npmjs.com/package/@dry-lint/cli) [![CLI size](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/dry-lint/dry-lint/main/size-cli-badge.json)](https://github.com/dry-lint/dry-lint/actions/workflows/size-badge.yml) [![codecov](https://codecov.io/gh/dry-lint/dry-lint/branch/main/graph/badge.svg)](https://codecov.io/gh/dry-lint/dry-lint) [![docs](https://img.shields.io/badge/docs-%E2%9C%93-blue)](https://dry-lint.github.io/dry-lint/) [![license](https://img.shields.io/npm/l/@dry-lint/cli)](LICENSE)

`dry-lint` is a **plugin‑driven** framework for detecting duplicate or overlapping declarations across _any_ source format – TypeScript, JSON, SQL, Terraform, OpenAPI, … you name it.

- **Core** – normalises, hashes, and groups declarations.
- **CLI** – fast, cached, and interactive (`npx dry`).
- **Extractors** – small packages (plugins) you add only when you need them.

> ⚡ **Performance‑first:** incremental file caching, parallel parsing, and optional fuzzy grouping.

---

## 📦 Packages

| Package        | npm                        | What it extracts                |
| -------------- | -------------------------- | ------------------------------- |
| core           | `@dry-lint/core`           | Engine & public API             |
| cli            | `@dry-lint/cli`            | Command‑line interface & Ink UI |
| asyncapi       | `@dry-lint/asyncapi`       | AsyncAPI operations & schemas   |
| avro           | `@dry-lint/avro`           | Avro records / enums / unions   |
| cloudformation | `@dry-lint/cloudformation` | CloudFormation stacks           |
| css            | `@dry-lint/css`            | CSS selectors & variables       |
| graphql        | `@dry-lint/graphql`        | GraphQL types & operations      |
| json           | `@dry-lint/json`           | Generic JSON shapes             |
| k8s            | `@dry-lint/k8s`            | Kubernetes manifests            |
| mongoose       | `@dry-lint/mongoose`       | Mongoose models                 |
| openapi        | `@dry-lint/openapi`        | OpenAPI operations & schemas    |
| prisma         | `@dry-lint/prisma`         | Prisma models                   |
| prop‑types     | `@dry-lint/prop-types`     | React PropTypes                 |
| proto          | `@dry-lint/proto`          | Protocol‑Buffers IDL            |
| sql            | `@dry-lint/sql`            | SQL DDL (tables, indexes)       |
| terraform      | `@dry-lint/terraform`      | Terraform HCL                   |
| thrift         | `@dry-lint/thrift`         | Thrift IDL                      |
| typeorm        | `@dry-lint/typeorm`        | TypeORM entities                |
| typescript     | `@dry-lint/typescript`     | TS interfaces / types / enums   |
| xsd            | `@dry-lint/xsd`            | XML Schema                      |
| zod            | `@dry-lint/zod`            | Zod validators                  |

> All extractor packages live under `packages/` and are published under the `@dry-lint` scope.

---

## 🚀 Quick start

```bash
# 1 – install cli + the plugins you need
bun add -D @dry-lint/cli \
           @dry-lint/typescript \
           @dry-lint/zod

# 2 – tell dry‑lint which plugins to load
echo '{ "plugins": ["@dry-lint/typescript", "@dry-lint/zod"] }' > .drylintrc.json

# 3 – run it
npx dry src/  # or just `npx dry` for the current folder
```

### CLI flags

| Flag               | Description                            |
| ------------------ | -------------------------------------- |
| `-t, --threshold`  | Similarity threshold (0‑1, default 1)  |
| `--ignore`         | Glob patterns to exclude               |
| `--json / --sarif` | Machine‑readable reports               |
| `--fix`            | Generate alias stubs for exact matches |
| `--no-cache`       | Disable file‑level caching             |
| `--ui`             | Launch interactive Ink UI              |

If **no `.drylintrc`** is found, the CLI falls back to _auto‑discovering_ every installed `@dry-lint/*` package (except `core` & `cli`).

---

## 📚 Using the Core API

```ts
import { registerExtractor, findDuplicates, Declaration } from '@dry-lint/core';

registerExtractor((filePath, text): Declaration[] => {
  /* …return your declarations… */
  return [];
});

const results = findDuplicates(['src/**/*.ts']);
console.log(results);
```

See the [Writing a Plugin](#-writing-a-plugin) section below for more detail.

---

## 🔌 Writing a Plugin

1. `bun add -D @dry-lint/core` in a new package under `packages/`.
2. Implement `registerExtractor` in your entrypoint.
3. Publish as `@dry-lint/my‑plugin`. ✅ That’s it – users list it in `.drylintrc.json`.

```ts
import { registerExtractor, Declaration } from '@dry-lint/core';

registerExtractor((filePath, source): Declaration[] => {
  // analyse source → return custom Declaration objects
  return [];
});
```

---

## 🏗 Workspace & Build

We use **Turborepo** for fast, cached pipelines.

```bash
bun run build   # builds every package (cache‑aware)
bun run test    # runs Vitest across the monorepo
```

---

## 🤝 Contributing

1. Fork, then create a feature branch.
2. Add or update a plugin under `packages/`.
3. Update docs & add tests.
4. Open a PR – the CI will run builds, lint, and tests.

---

## 📄 License

MIT ©
