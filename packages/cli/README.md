# `@dry-lint/cli`

[![CI](https://github.com/dry-lint/dry-lint/actions/workflows/ci.yml/badge.svg)](https://github.com/dry-lint/dry-lint/actions/workflows/ci.yml) [![Docs](https://img.shields.io/badge/docs-%E2%9C%93-blue)](https://dry-lint.github.io/dry-lint/) [![License](https://img.shields.io/npm/l/@dry-lint/cli)](https://github.com/dry-lint/dry-lint/blob/main/LICENSE)

The official CLI for [**dry-lint**](https://github.com/dry-lint/dry-lint).  
Detect duplicate declarations in TypeScript, Zod, OpenAPI, GraphQL, and more — with a plugin-driven architecture.

---

## 📦 Install

Add the CLI **and** the plugins you want:

```bash
# Example: TypeScript + Zod plugins
bun add -D @dry-lint/cli @dry-lint/typescript @dry-lint/zod
```

---

## ⚙️ Configure

Create a `.drylintrc.json` to specify which extractors to load:

```json
{
  "plugins": ["@dry-lint/typescript", "@dry-lint/zod"]
}
```

If no config is present, the CLI will auto-load all installed `@dry-lint/*` packages (except `core` and `cli`).

---

## 🚀 Usage

Run duplicate detection across your project:

```bash
npx dry [projectDir] [options]
```

### CLI options

- `-t, --threshold <num>` — similarity threshold (0–1, default `1`)
- `--ignore <patterns...>` — glob patterns to exclude
- `--json` — output a JSON report
- `--sarif` — output a SARIF report
- `--fix` — generate alias stubs for exact matches
- `--no-cache` — disable file-level caching
- `--ui` — launch the interactive Ink UI

---

## 📚 Resources

- [Monorepo & Plugin List](https://github.com/dry-lint/dry-lint#-packages)
- [Core API](https://github.com/dry-lint/dry-lint#-api-dry-core)
- [Full Documentation](https://dry-lint.github.io/dry-lint/)

---

## 📄 License

MIT — see [LICENSE](https://github.com/dry-lint/dry-lint/blob/main/LICENSE).
