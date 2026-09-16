# Architecture & Design Decisions (DECISIONS.md)

This log records every non-trivial judgment call made during the implementation of the EliteShip Courier & Logistics Management Platform with a one-line rationale.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-15 | Use Integer for all PKR currency amounts | Avoid floating-point arithmetic errors since PKR has no practical fractional subunit. |
| 2026-09-15 | Implement atomic database counter for tracking numbers with retry | Guaranteed race-condition-free unique sequence numbering across concurrent requests. |
| 2026-09-15 | Soft-cancel shipments and status records without hard deletion | Maintains unbroken historical and legal audit trails for logistics accountability. |
| 2026-09-15 | Server-side frozen `PricingSnapshot` record at shipment creation | Guarantees price immutability for past shipments when pricing rules change. |
| 2026-09-15 | Public tracking returns 404 for non-existent and unfindable numbers without revealing existence | Prevents enumeration attacks against the tracking system. |
| 2026-09-15 | Server-side role re-derivation from verified Supabase JWT on every request | Never trust user-provided role or user ID in request body or headers. |
| 2026-09-15 | In-app notification delivery service abstracted for pluggable channels | Easily allows future SMS/email providers without altering database schema. |
| 2026-09-15 | Leaflet + OpenStreetMap static hub location markers without simulated driver GPS | Strictly prevents fake tracking coordinates in compliance with real operational standards. |
| 2026-09-15 | Multi-hop hub movements tracked via dedicated `HubMovement` records | Keeps the core shipment state machine clean while maintaining full granular transit leg history. |
| 2026-09-15 | Badge component rewritten to use semantic variants (`success/info/warning/danger/default`) instead of raw color names | Semantic variant names decouple visual intent from implementation color and are more maintainable across theme changes. |
| 2026-09-15 | `ConfirmDialog` accepts both `confirmLabel`/`onCancel` AND `confirmText`/`onClose` prop pairs as aliases | Backward-compatible: old callers using `confirmText`/`onClose` still work; new pages use the clearer `confirmLabel`/`onCancel` names. |
| 2026-09-15 | Added simple inline `Toast` component export alongside `ToastProvider`/`useToast` | Pages with localized toast state (single transient message) can render a self-contained `<Toast>` without coupling to the global provider queue. |
| 2026-09-15 | Pinned `react-leaflet@4` (not v5) because v5 requires React 19 and this project uses React 18 | Maintains stability; can upgrade when React 19 is adopted. |
| 2026-09-15 | Added `"types": ["vite/client"]` to web tsconfig | Required for TypeScript to recognise `import.meta.env` provided by Vite's virtual types module. |
| 2026-09-15 | "Track Live" button in CustomerDashboard rendered as `<a href="/track?number=...">` instead of `Button as="a"` | Button component does not support an `as` prop. Using a plain anchor with equivalent Tailwind classes is simpler and type-safe. |
