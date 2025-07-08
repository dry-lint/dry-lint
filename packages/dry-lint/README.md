# `@dry-lint/dry-lint`

[![CI](https://github.com/dry-lint/dry-lint/actions/workflows/ci.yml/badge.svg)](https://github.com/dry-lint/dry-lint/actions/workflows/ci.yml) [![Docs](https://img.shields.io/badge/docs-%E2%9C%93-blue)](https://dry-lint.github.io/dry-lint/) [![License](https://img.shields.io/npm/l/@dry-lint/cli)](https://github.com/dry-lint/dry-lint/blob/main/LICENSE)

The **core engine** and registry for [**dry-lint**](https://github.com/dry-lint/dry-lint).
Provides the singleton extractor registry, structural similarity algorithms, and `ts-morph` project — powering all official plugins and the CLI.

---

## Install

You usually **don’t install `@dry-lint/dry-lint` directly**.
It’s included automatically when you install the CLI or any official plugins.

Example:

```bash
# Example: TypeScript + Zod plugins + CLI
bun add -D @dry-lint/cli @dry-lint/typescript @dry-lint/zod
```

The CLI depends on `@dry-lint/dry-lint` under the hood.

---

## How it works

`@dry-lint/dry-lint` exposes the core APIs:

```ts
import { registerExtractor, findDuplicates } from '@dry-lint/dry-lint';

registerExtractor((filePath, fileText) => {
  // Return an array of declarations for this file
  return [];
});

const groups = await findDuplicates(['src/**/*.ts'], { threshold: 0.9 });
```

Plugins use `registerExtractor` to plug in domain-specific parsers.
The CLI and custom Node scripts use `findDuplicates` to orchestrate extraction, grouping, and output.

---

## What replaced `@dry-lint/core`?

- The old `@dry-lint/core` is fully merged into this package.
- One singleton registry, one `ts-morph` project, no duplicate states.
- All plugins and the CLI now share the same stable core.

If you see any instructions to install `@dry-lint/core`, just use `@dry-lint/dry-lint` instead.

---

## Resources

- [Monorepo & Plugin List](https://github.com/dry-lint/dry-lint#-packages)
- [Official CLI](https://www.npmjs.com/package/@dry-lint/cli)
- [Full Documentation](https://dry-lint.github.io/dry-lint/)

---

## License

MIT — see [LICENSE](https://github.com/dry-lint/dry-lint/blob/main/LICENSE).
