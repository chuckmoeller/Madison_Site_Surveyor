# Palette 🎨 Journaling

## 2025-05-15 - Improving destructive actions safety
**Learning:** Destructive actions like "Clear All" in a photo-heavy field app should always have a confirmation dialog to prevent accidental data loss, especially when users are in high-pressure field environments.
**Action:** Always wrap `setItems([])` or similar destructive state changes in a `window.confirm` or a custom modal.

## 2025-05-15 - Guiding users from empty states
**Learning:** Empty states without a Call To Action (CTA) are dead ends. Providing a "Start New Survey" button in the History view keeps the user in the primary workflow.
**Action:** Ensure every empty state has at least one relevant action button to guide the user.

## 2025-05-15 - Semantic Interactive Elements
**Learning:** Interactive list items that trigger navigation or state changes should be implemented as `<button type="button">` instead of `<div>` with `onClick` to ensure keyboard accessibility and correct screen reader behavior.
**Action:** Use buttons for interactive elements and apply `text-left` and `w-full` for list-like items.
