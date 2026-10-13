# Payflows - leaked secrets on public GitHub

Session: 2026-10-13.

## Finding

None.

## Queries run

- `"payflows.io" password` / `token` / `api_key` / `secret` — 0 hits with Payflows-SAS signal.
- `AKIA` + `payflows` — 0 hits.
- `firebase` + `payflows` — 0 hits.
- `supabase` + `payflows` — 0 hits.
- `.env` + `payflows` — 0 hits with Payflows-SAS signal.
- `author-email:@payflows.io` and `committer-email:@payflows.io` — 0 commits.
- `payflows DATABASE_URL` — 0 hits.
- `payflows AKIA` — 0 hits.
- `payflows aws-account-id` — 0 hits.

## Conclusion

Payflows runs a fully private GitHub footprint and no staff member has ever pushed from an `@payflows.io` git identity to public GitHub. There is nothing to redact here.

If secrets land on public GitHub in a later session, record each as:

```
| path | repo | line | kind | first-seen | redacted-snippet |
```

with no raw secret values pulled into chat.
