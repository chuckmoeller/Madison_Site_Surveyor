## 2026-05-20 - Parallelized Monday.com Image Uploads
**Learning:** Sequential await calls in loops for network requests are a significant bottleneck, especially when dealing with multiple large assets like images. Parallelizing these requests with `Promise.all` can reduce the total synchronization time from minutes to seconds in high-latency environments.
**Action:** Always check for sequential await calls in loops when handling batch operations or multiple API requests, and use `Promise.all` where order of completion doesn't matter and individual error handling is preserved.
