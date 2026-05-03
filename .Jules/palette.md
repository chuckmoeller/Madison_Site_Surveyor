## 2025-03-24 - Accessibility and Character Constraints
**Learning:** Proper semantic associations (label-input) and real-time feedback (character counters) significantly improve the accessibility and predictability of data entry forms. Icon-only buttons without ARIA labels are a recurring accessibility debt in this codebase.
**Action:** Always check for orphaned labels, missing length constraints in text areas, and ensure all icon-only interactive elements have descriptive `aria-label` attributes.
