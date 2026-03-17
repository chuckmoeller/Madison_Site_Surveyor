## 2025-05-14 - O(N^2) Storage Anti-pattern in Survey Processing
**Learning:** Found a critical performance bottleneck in `handleAnalyze` where every individual survey record created during a session was redundantly storing the entire array of session images. For a session with N images, this resulted in O(N^2) space complexity in IndexedDB, leading to rapid storage bloat and slow database operations.
**Action:** Always verify that records being persisted only contain the data specific to that record. Refactored the loop to store only the relevant image per `SurveyRecord`.

## 2025-05-14 - Parallelizing I/O-bound Operations
**Learning:** The application performed Gemini AI analysis and Monday.com image uploads sequentially. While safe, this significantly increased user wait time for multi-image captures.
**Action:** Use `Promise.all` or `Promise.allSettled` for concurrent I/O-bound tasks like AI processing and file uploads to reduce latency from O(N) to O(1) network-wise.
