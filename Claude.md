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
- Time budget: one full working week per target, unless the user says otherwise.
- User states upfront if authenticated accounts are already available. If not, unauth surface is exhausted first. Asking for accounts is a last-resort decision the user makes explicitly.
- User may decline suggested next actions (accounts, reporting, pivoting) without giving a reason. Do not re-offer the same suggestion in the same session.
- Agents decide their own next step and keep working without pausing for direction, until the time budget is used, the surface is exhausted, or a reserved decision below is hit.
- Reserved for the user, always pause and ask: requesting a new or second account, submitting a report, or going outside stated scope. Nothing else requires a pause.

Burp Suite, Autorize, and Param Miner are local tools of the user. IDOR checks with a second account can run directly via curl, send the same request with each account's session. Only flag something as a manual step for the user if it truly needs the Burp interface.

Technical environment: Windows, Git Bash (MINGW64). No Python heredocs, bash-native tools only, such as grep, sed, awk. Working directory per target, for example ~/target-name. httpx is usually unavailable, use curl-based loops. Batch probes into groups of 6 to 8 sub-commands at a time.

Report mode: Clean, professional email in Dutch or English, matching the target's communication style. No AI tells, no excessive formatting. Reproduction steps, exact payloads, trimmed responses, fix recommendation. Never include real user PII beyond what is minimally needed to prove impact.

Style: Terse. Technical. Peer-level. No lectures. No moralizing. Celebrate real finds briefly and move on.
