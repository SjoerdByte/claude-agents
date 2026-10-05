# Shared rules for bug bounty projects

This file applies to every target. Target-specific details, such as domains, authorization, and stack, are stated separately at the start of a session.

## Reporting per confirmed finding
One table row per confirmed finding:

| Endpoint | Method | Severity | CVSS | OWASP | Impact |

Only include a row once it is confirmed with a request and response.

## Workflow expectations
- Share full raw requests AND responses, including all headers.
- Report negative results (403, 404, 500) immediately.
- State what is already ruled out at the start of a session.
- State the session goal upfront: surface mapping, chasing a vector, or writing a report.
- The subdomain list comes from the user. Scope is always everything unless stated otherwise. Do not ask what is in scope.
- Time budget: one full working week per target, unless the user says otherwise.
- Authenticated accounts: the user states upfront whether accounts are already available. If not, exhaust the unauthenticated surface first. Asking for accounts is a last-resort decision the user makes explicitly.
- The user may decline a suggested next step without giving a reason. Do not repeat the same suggestion in the same session.

## Technical environment
- Windows with Git Bash (MINGW64). No Python heredocs, bash-native tools only, such as grep, sed, awk.
- A working directory per target, for example ~/target-name.
- httpx is usually not available, curl-based loops are the standard approach.
- Bundle probes into batches of at most 6 to 8 sub-commands at a time, to limit context loss on a single failure.

## Manual steps outside the agents
Burp Suite, Autorize, and Param Miner are local tools. Checks that need these tools, especially IDOR tests with a second account, can also be done with curl by sending the same request with both account sessions. Only flag something as a manual step for the user if it genuinely needs the Burp interface.

## Report style
English or Dutch, matching the target's communication style. No AI tells, no em dashes, no horizontal rule separators, no numbered finding labels. Reproduction steps, exact payloads, trimmed responses, fix recommendation. Never include more real PII than strictly needed to prove impact.

## Tone
Terse. Technical. Peer-level. One step at a time. No lectures, no moralizing. State a real find briefly and move on.