## 2025-05-15 - Camera Shutter Flash & Accessibility Polish
**Learning:** Visual feedback for a shutter action is a critical micro-UX touch that provides immediate confirmation of success. Additionally, ensuring ARIA labels match dynamic button text prevents screen reader confusion.
**Action:** Use `motion.div` for a quick (150ms) opacity fade-out to simulate a flash, and ensure `aria-label` logic mirrors visual text changes in dynamic buttons.
