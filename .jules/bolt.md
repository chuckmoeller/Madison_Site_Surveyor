## 2025-05-14 - Parallelized Image Analysis in handleAnalyze
**Learning:** Sequential processing of multiple images for AI analysis created a linear latency bottleneck ($O(N)$). By parallelizing the `processNameplate`/`processRoofImage` calls and database saves using `Promise.all`, the processing time was reduced to $O(\max(latency))$, yielding a ~67% performance improvement for 3 images.
**Action:** Always check for sequential loops containing asynchronous I/O or service calls and parallelize them when order doesn't matter or is preserved by `Promise.all`.
