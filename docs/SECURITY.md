# Security checklist

Tracked against the spec's security checklist. Updated as each control is
implemented; finalized with a full pass in Phase 12.

- [ ] No hard-coded secrets
- [ ] No password stored in plain text (delegated entirely to Supabase Auth)
- [ ] Admin routes protected server-side (not just UI hidden)
- [ ] RLS enabled on every table with user-scoped data
- [ ] RLS policies exercised by tests
- [ ] Payment screenshots private (non-public bucket, signed URLs only)
- [ ] Signed URLs used wherever a private asset is served
- [ ] Price/discount always recalculated server-side
- [ ] Stock validated server-side, race-safe (no overselling)
- [ ] Authorization checked in every Server Action / Route Handler, not just middleware/proxy
- [ ] Input validated with Zod on both client and server
- [ ] File upload validated (type, size)
- [ ] Parameterized queries only (Supabase client — no raw string SQL concatenation)
- [ ] Output encoding relies on React's default escaping; no `dangerouslySetInnerHTML` with untrusted input
- [ ] Auth endpoints rate-limited (Postgres-backed, no Redis)
- [ ] Account deletion is a safe soft-delete/anonymization, not a hard delete of order history
- [ ] Admin-sensitive actions write to `audit_logs`
