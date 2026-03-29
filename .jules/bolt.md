# Bolt ⚡ Performance Journal

## 2025-05-15 - Parallelizing AI Analysis
**Learning:** Sequential processing of multiple images during site surveys (e.g., HVAC nameplates or roofing defects) creates a significant UX bottleneck as users wait for each Gemini API call to complete one after another.
**Action:** Use `Promise.all` in `handleAnalyze` to trigger concurrent AI extraction and database saves, reducing total wait time from O(N) to approximately O(max(latency)).
