## 2025-05-22 - Side effects of pnpm install
**Learning:** Running `pnpm install` in this environment can trigger a broad Git checkout that reverts uncommitted changes across the entire repository and causes massive deletions in `node_modules` (specifically within the `googleapis` package).
**Action:** Always verify or re-apply modifications after running installation commands, and use `git checkout node_modules/` to restore the dependency tree if it becomes corrupted.
