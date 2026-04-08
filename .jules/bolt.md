## 2024-05-20 - Sequential Image Analysis Bottleneck
**Learning:** Sequential processing of multiple images during 'handleAnalyze' (src/App.tsx) created a significant bottleneck (O(N) latency). Additionally, storing the entire session array in each record caused O(N²) storage growth.
**Action:** Use 'Promise.all' to parallelize AI analysis and database saves. Store only the specific image relevant to each record to ensure O(N) storage efficiency.

## 2024-05-20 - Measured Performance Gains
**Learning:** Parallelizing 3 images with ~500ms AI latency and ~50ms DB latency reduced processing time from ~1650ms to ~550ms, a theoretical improvement of ~67%.
**Action:** Always prefer 'Promise.all' for independent I/O-bound operations like AI processing or database writes.
