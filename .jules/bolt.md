## 2025-05-14 - Parallelization and Storage Optimization in Survey Analysis
**Learning:** The 'handleAnalyze' function was processing multiple images sequentially and storing the entire session's image array in every record, leading to O(N) latency and O(N^2) storage growth. Parallelizing with Promise.all and isolating image references to their respective records significantly improves speed and efficiency.
**Action:** Always check for opportunities to parallelize independent async operations and ensure data structures only store necessary references to avoid O(N^2) growth.
