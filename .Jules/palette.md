# Palette 🎨 UX & Accessibility Journal

## 2025-05-15 - Destructive Action Confirmation
**Learning:** Destructive actions like 'Clear All' in high-pressure field environments (like site surveys) can lead to significant data loss if triggered accidentally.
**Action:** Always wrap destructive state resets in a `window.confirm` dialog and provide clear visual distinction (e.g., red focus rings).

## 2025-05-15 - Camera Interface Accessibility
**Learning:** Icon-only buttons in full-screen camera overlays are particularly difficult for screen reader users and keyboard navigators if they lack proper labels and focus indicators.
**Action:** Ensure shutter buttons have explicit `aria-label="Take photo"` and dynamic labels for multi-photo capture states (e.g., `Finish (3)`). Apply high-contrast focus rings that remain visible against dark camera feeds.

## 2025-05-15 - Button Consistency
**Learning:** Explicitly setting `type="button"` on all interactive elements prevents accidental form submissions and ensures consistent behavior across different browser engines.
**Action:** Standardize on `type="button"` for all non-submit buttons and implement `focus-visible` styles using the primary brand color (emerald) for a unified experience.
