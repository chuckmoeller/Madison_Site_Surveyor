## 2026-03-02 - [Codebase Investigation]
**Learning:** Found that 'node_modules' are incorrectly tracked in Git history, and running 'pnpm install' causes many deletions/modifications. There's also a persistent lint error in 'src/components/CameraCapture.tsx'.
**Action:** Always run 'git restore node_modules' after 'pnpm install' to avoid polluting commits. Be aware of the existing lint error when running 'pnpm lint'.
