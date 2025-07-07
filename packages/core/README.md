# `@dry-lint/core`

[![CI](https://github.com/dry-lint/dry-lint/actions/workflows/ci.yml/badge.svg)](https://github.com/dry-lint/dry-lint/actions/workflows/ci.yml) [![Docs](https://img.shields.io/badge/docs-%E2%9C%93-blue)](https://dry-lint.github.io/dry-lint/) [![License](https://img.shields.io/npm/l/@dry-lint/cli)](https://github.com/dry-lint/dry-lint/blob/main/LICENSE)

Part of the [**dry-lint**](https://github.com/dry-lint/dry-lint) monorepo.

This package provides the **core engine**: APIs to register custom extractors, normalize and hash declarations, and detect duplicate or similar structures. Use `@dry-lint/core` to build your own plugins or run duplicate detection in Node scripts without the CLI.

---

## Install

```bash
bun add @dry-lint/core
```

---

## 🛠 Example

```ts
import { findDuplicates, registerExtractor, Declaration } from '@dry-lint/core';

registerExtractor((filePath, fileText): Declaration[] => {
  // Extract declarations for this file
  return [];
});

const results = findDuplicates(['src/**/*.ts']);
console.log(results);
```

See [Writing a Plugin](https://github.com/dry-lint/dry-lint#-writing-a-plugin) for real examples.

---

## More

- [Monorepo & Plugins](https://github.com/dry-lint/dry-lint#-packages)
- [Official CLI](https://www.npmjs.com/package/@dry-lint/cli)
- [Full Documentation](https://dry-lint.github.io/dry-lint/)

---

## License

MIT — see [LICENSE](https://github.com/dry-lint/dry-lint/blob/main/LICENSE).
