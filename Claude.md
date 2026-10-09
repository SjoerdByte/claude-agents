# Shared rules for bug bounty projects

This file applies to every target. Target-specific details, such as domains, authorization, and stack, are stated separately at the start of a session.

For every confirmed finding, output a one-row table entry:

| Endpoint | Method | Severity | CVSS | OWASP | Impact |

## Workflow expectations
- Paste full raw requests AND responses, including all headers.
- Share negative results (403, 404, 500) immediately, dead ends matter.
- State what is already ruled out at session start.
- State session goal upfront: surface mapping, chase a vector, or write report.
- Subdomain list comes from the user. Scope is always everything unless stated otherwise. Do not ask what's in scope.
- Time budget: one full working week per target, unless the user says otherwise. Track estimated hours spent in index.json, see Session continuity, so this is enforceable.
- User states upfront if authenticated accounts are already available. If not, unauth surface is exhausted first. Asking for accounts is a last-resort decision the user makes explicitly.
- User may decline suggested next actions (accounts, reporting, pivoting) without giving a reason. Do not re-offer the same suggestion in the same session.
- Agents decide their own next step and keep working without pausing for direction, until the time budget is used, the surface is exhausted, or a reserved decision below is hit.
- Reserved for the user, always pause and ask: requesting a new or second account, submitting a report, or going outside stated scope. Nothing else requires a pause.

## High-value attack patterns
Check these first on every target, they have produced the highest-severity findings before:
- Any endpoint that fetches an object by ID, REST or GraphQL. Test with your own ID, then with a neighboring or guessed ID, authenticated and unauthenticated. Sequential or predictable IDs plus missing tenant or owner scoping is the single most reliable path to a critical finding.
- Signup and account-creation flows. Check whether a usable session can be reached without email verification or CAPTCHA. This is what turns a cross-tenant IDOR into a critical reachable by anyone, not just existing users.
- Mass assignment. PATCH or PUT your own profile or user object with extra fields that should not be user-writable: role, partner_id, tenant_id, organization_id, status. Confirm what unlocks afterward.
- GraphQL specifically: try introspection if enabled, then walk every query and mutation that takes an object ID, your own and someone else's.
- Any backend sitting behind a CDN or WAF. Check for the real origin IP via old DNS records, CNAME chains, TLS certificate SANs, and passive DNS or certificate transparency history. Direct origin access often bypasses every edge protection at once.
- Firebase or Supabase backends. Query the REST or RTDB or Firestore API directly with the anon key, do not assume frontend restrictions are enforced server-side via row level security or rules.
- Discount, coupon, voucher, or promo code endpoints. Check whether codes can be listed, queried, or generated without authentication.
- Auth token lifecycle. Check whether a token is rotated on login and actually invalidated on logout or password reset, not just the client-side cookie cleared.

## Scope clarification
A service is in scope if it runs the target's code or stores the target's data, regardless of hostname or vendor. Firebase, Supabase, Cloud Functions, Cloud Run, Firebase Storage, Firestore, and S3 buckets owned by the target are first-party even on a google or amazon hostname. Only treat something as third-party, and out of scope, when it is a separate company's own product the target merely links to or embeds, such as a payment processor's hosted checkout page.

## Known non-findings
Do not raise these as findings, they are intentional:
- Firebase Web API keys, public by design.
- /__/firebase/init.json and similar Firebase client config endpoints.
- OAuth or OIDC client IDs appearing in redirect URLs.
- Firebase or Google Cloud project IDs, not secrets.
If one of these leads to a real issue, such as a misconfigured security rule, report the misconfiguration, not the key or ID itself.

## CVSS rubric
Keep scoring consistent across sessions and models:
- Unauthenticated access to PII of more than 100 users: AV:N/AC:L/PR:N/UI:N/S:C/C:H, never below 8.0.
- Authenticated IDOR exposing another user's data: usually AV:N/AC:L/PR:L/UI:N/S:U/C:H, around 6.5 to 7.5 depending on data sensitivity.
- Subdomain takeover: phishing and cookie theft only is medium, serving the main app's content or stealing session tokens is high.
When unsure, say so explicitly in the finding rather than picking a number silently.

## Data hygiene
Pull the minimum data needed to prove impact. Once a trimmed snippet is saved into a finding file, delete any raw data file holding more than that, such as full user exports or bulk PII dumps. Nothing with real emails, names, or geolocation should remain on disk past the end of the session, except the minimal snippet inside the finding file itself.

## Manual Burp triggers
Everything curl can do, do with curl. Only ask the user to use Burp for:
- Param Miner, for header or parameter discovery.
- Autorize, for session-swap IDOR testing at scale, roughly 10 or more endpoints at once.
- Repeater, for request smuggling or desync testing.

## Known failure modes
- The safety classifier can latch into a cautious auto-mode after a flagged message, causing repeated unnecessary pauses. If a session suddenly stops proceeding without a clear reason, say so and suggest a fresh session rather than fighting it.
- The outbound network proxy sometimes returns a 502 for a host that would otherwise be NXDOMAIN. Treat a 502 on the first request to a brand-new host as inconclusive, retry once before ruling it dangling or dead.

## Technical environment
Do not assume the OS. Run `uname -a` at the start of a session. On a Linux cloud container, standard Unix and Python tooling is available. On Windows Git Bash (MINGW64), avoid Python heredocs and stick to bash-native tools such as grep, sed, awk, since quoting breaks there. Working directory per target, for example ~/target-name. httpx is often unavailable, curl-based loops are a safe fallback either way. Batch probes into groups of 6 to 8 sub-commands at a time.

## Session continuity
Every target's working directory holds:
- index.json, a compact machine-readable state file: target, authorization, scope_note, ruled_out, open_threads, pending_decisions, hours_spent, and a findings array with one entry per finding (id, endpoint, method, severity, cvss, owasp, status, a one-line summary, and the path to its file).
- findings/, one markdown file per finding, named like F001-short-slug.md, holding the full narrative, raw request and response, and reproduction steps for that finding only. Never let index.json hold full raw evidence, only the summary and the path.
- reports/, the final outputs written by the report agent.

At the start of any session, before anything else, read index.json if it exists. Update it immediately after a meaningful step: a new confirmed finding, a ruled out item, a change in open threads, or time spent. Finding status values: unverified, confirmed, reported, accepted, paid, disputed, retest-needed.

Once index.json exists, do not restate its full content in chat. Read it, then only mention what is relevant to the current step.

## Report style
Follow .claude/disclosure-template.md exactly for the email itself. Clean, professional, in Dutch or English matching the target's communication style. No AI tells, no em dashes, no bold bullets, no horizontal rule separators, no numbered finding labels outside the template's own numbering.

## Tone
Terse. Technical. Peer-level. No lectures. No moralizing. Celebrate real finds briefly and move on.
