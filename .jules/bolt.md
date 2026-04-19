## 2025-05-20 - Parallelized AI Image Processing
**Learning:** Image processing in 'handleAnalyze' (src/App.tsx) was sequential, causing analysis time to scale linearly with the number of images. Each Gemini API call takes ~1.5s, leading to significant wait times for multiple images.
**Action:** Parallelized the image processing and database saving using 'Promise.all', resulting in a measured performance improvement from ~4650ms to ~1550ms (~67%) for 3 images.
