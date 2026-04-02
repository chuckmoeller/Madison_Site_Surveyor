# Bolt's Performance Journal

## 2025-05-14 - Parallelizing AI Analysis
**Learning:** Sequential processing of multiple images for AI analysis created a linear bottleneck. By using `Promise.all`, we can trigger all requests concurrently.
**Action:** Always look for sequential `await` calls in loops that handle independent external service requests (AI, DB, API) and parallelize them to reduce latency to $O(max(latency))$.

## 2025-05-14 - Initial Codebase Assessment
**Learning:** The application uses IndexedDB for local storage but lacks indexes on frequently queried fields like `status`. Current implementation of `getPendingSurveys` performs an O(N) in-memory filter.
**Action:** Implement IndexedDB indexing for the `status` field to optimize pending survey retrieval.
