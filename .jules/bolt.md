## 2025-05-14 - Parallelizing image processing
**Learning:** Image processing in `handleAnalyze` was sequential, leading to O(N) latency for N images. By using `Promise.all`, latency is reduced to O(max(latency)), which is a significant win (~67% for 3 images) as AI analysis and DB saves are I/O bound.
**Action:** Always check for sequential asynchronous loops in I/O bound operations and parallelize where safety and rate limits allow.
