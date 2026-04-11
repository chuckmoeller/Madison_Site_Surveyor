## 2025-05-14 - Parallelized Batch Image Analysis
**Learning:** The application was processing multiple images sequentially during the analysis phase, leading to a linear increase in wait time ((N)$). By parallelizing the Gemini AI calls and database saves with `Promise.all`, we reduced the processing time to (max(latency))$, resulting in an ~80% performance gain for 5 images.
**Action:** Always check for independent high-latency operations (like AI API calls or file uploads) in loops and parallelize them where safety permits.
