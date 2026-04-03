## 2025-05-15 - Visual Feedback and Accessibility Enhancements
**Learning:** Adding a brief 150ms "flash" effect (using `motion.div` from `motion/react`) provides essential confirmation for camera actions, while descriptive `aria-label` attributes on icon-only buttons significantly improve accessibility for screen readers. Using `useRef` to clean up `setTimeout` prevents potential React state updates on unmounted components.
**Action:** Always include visual confirmation for asynchronous or hardware actions and ensure all icon-only buttons have descriptive `aria-label` attributes.
