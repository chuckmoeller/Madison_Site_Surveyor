## 2026-04-20 - Parallelize Image Analysis
**Learning:** Parallelizing Gemini AI analysis and database saves using Promise.all reduced processing time by ~67% for 3 images (from 4659ms to 1550ms in simulation). This is highly effective for I/O-bound tasks where individual operations are independent.
**Action:** Identify sequential 'await' loops in data processing flows and refactor to concurrent execution where safe.
