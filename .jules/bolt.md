## 2025-05-15 - Parallelization of handleAnalyze
**Learning:** Sequential processing of multiple images using Gemini AI and database saves caused O(N) wait times. Additionally, storing all session images in every individual record led to O(N²) storage growth.
**Action:** Use `Promise.all` to parallelize image processing and store only the relevant image in each record to achieve O(max(latency)) time and O(N) space complexity.
