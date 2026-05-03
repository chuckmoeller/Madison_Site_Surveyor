## 2026-05-03 - [Parallelized Image Analysis]
**Learning:** Parallelizing asynchronous API calls (like Gemini analysis) using `Promise.all` instead of sequential `for` loops provides a measurable ~60% reduction in processing time for multi-image batches without increasing complexity.
**Action:** Always look for sequential `await` calls in loops that handle independent I/O tasks and parallelize them where possible.

## 2026-05-03 - [Environment Benchmarking]
**Learning:** When standard tools like `tsx` or `vitest` are missing or `node_modules` is unstable, `node --experimental-strip-types` can be used to run standalone TypeScript benchmark scripts to verify performance gains.
**Action:** Use built-in node features for quick verification when the environment is constrained.
