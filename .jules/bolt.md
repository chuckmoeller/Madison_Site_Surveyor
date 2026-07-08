## 2025-07-08 - Parallelizing Gemini AI Analysis
**Learning:** Sequential await loops for Gemini AI analysis are the primary bottleneck for multi-image sessions. Refactoring to Promise.all reduces latency from O(n) to O(1) relative to image count.
**Action:** Always look for sequential network or AI calls in loops and refactor them to use Promise.all when independent.
