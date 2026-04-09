## 2025-05-15 - Parallelize handleAnalyze
**Learning:** Parallelizing the AI analysis and database saving in `handleAnalyze` reduces the wait time from O(N) to O(max(latency)) of individual image processing, where N is the number of images. For 3 images, this resulted in a ~67% performance gain (from 1655ms to 552ms in benchmarks).
**Action:** Always look for sequential loops containing independent asynchronous operations and consider using `Promise.all` to execute them concurrently.
