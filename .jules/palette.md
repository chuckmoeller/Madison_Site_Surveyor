## 2025-05-15 - ARIA Labels and Dynamic Content
**Learning:** Adding an `aria-label` to a button completely overrides its inner text for screen readers. If the button contains dynamic information (like a "Finish (3)" counter), that information must be explicitly included in the `aria-label` to avoid an accessibility regression.
**Action:** When adding `aria-label` to interactive elements, always verify if they contain dynamic text content and preserve that information in the label.
