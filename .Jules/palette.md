## 2025-05-14 - Empty States and Semantic Labels

**Learning:** Empty states for primary application workflows (like Survey History) should avoid dead ends by providing a clear Call-to-Action (CTA) to guide the user back to the main flow. Semantic association between labels and inputs is critical for screen reader users and provides a larger click target for all users.

**Action:** Always include a high-visibility CTA in empty states. Ensure every form input has a unique `id` associated with its `label` via `htmlFor`.
