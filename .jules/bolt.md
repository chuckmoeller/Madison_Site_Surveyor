## 2025-05-15 - Parallel Image Processing in handleAnalyze
**Learning:** Sequential processing of multiple images (AI analysis followed by DB save) in a loop is a significant bottleneck. Parallelizing these operations using `Promise.all` can reduce processing time by ~67% for a typical batch of 3 images, as the network-bound AI calls and I/O-bound DB saves can happen concurrently.
**Action:** Always look for sequential loops containing asynchronous operations (API calls, DB ops) that can be parallelized, especially when order doesn't strictly matter or can be handled after `Promise.all`.
