# `@dry-lint/prop-types`

[![CI](https://github.com/dry-lint/dry-lint/actions/workflows/ci.yml/badge.svg)](https://github.com/dry-lint/dry-lint/actions/workflows/ci.yml) [![Docs](https://img.shields.io/badge/docs-%E2%9C%93-blue)](https://dry-lint.github.io/dry-lint/) [![License](https://img.shields.io/npm/l/@dry-lint/cli)](https://github.com/dry-lint/dry-lint/blob/main/LICENSE)

Part of the [**dry-lint**](https://github.com/dry-lint/dry-lint) monorepo.

Extracts prop type definitions from **React PropTypes declarations** (`.js` / `.jsx`) so you can detect duplicate or overlapping component prop shapes across your React codebase.

---

## Install

```bash
bun add -D @dry-lint/prop-types
```

---

## Configure

Add it to your `.drylintrc.json`:

```json
{
  "plugins": ["@dry-lint/prop-types"]
}
```

Run detection with the [CLI](https://www.npmjs.com/package/@dry-lint/cli). This plugin auto-registers itself.

---

## More

- [Monorepo & Other Plugins](https://github.com/dry-lint/dry-lint#-packages)
- [Core API Docs](https://github.com/dry-lint/dry-lint#-api-dry-lint)

---

## License

MIT — see [LICENSE](https://github.com/dry-lint/dry-lint/blob/main/LICENSE).
