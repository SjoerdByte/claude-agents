# Disclosure email template

Reference voice: Sjoerd's own past disclosure emails. Match this structure and tone exactly, do not invent a different structure.

## Subject
"Responsible Disclosure: [severity tier] vulnerabilit(y/ies) on [domain]", for example "Responsible Disclosure: Critical vulnerabilities on example.com".

## Salutation
"Dear [Company] Security Team," if no contact is known. "Dear [Name] and team," if a named contact was found, for example in security.txt or from a prior reply.

## Opening paragraph
State the number of vulnerabilities and where they were found. State the test methodology briefly: self-created test accounts only, no real customer data modified, exported, or stored beyond what was necessary to confirm impact, test purchases or actions left incomplete or cleaned up afterward. If an unusual number of test artifacts were created, a one-line mention that details follow near the end is fine.

Never mention how authorization was obtained. No CEO, no named contact who granted permission, no contract or engagement basis. The email reads as independent responsible disclosure research, regardless of whether prior written permission exists for this target. That context stays internal, it is not for the recipient.

## Per finding
A plain-text title line, not numbered, ending in a parenthetical with severity and CVSS, for example "Cross-tenant IDOR on contact query leaking PII of approximately 34 million users (Critical, CVSS 9.1)". Findings are referred to by ordinal later in prose, "finding 1", "finding 2", not by a numeric label in the heading itself.

Under the title, in this order:
- Optional "Endpoint:" or "Endpoints:" line when a single clean endpoint identifies the issue.
- A paragraph describing the root cause and the confirmed impact, with concrete numbers where available: record counts, affected user estimates, financial impact in real currency figures, ID ranges.
- "Proof:" or "Reproduction:" followed by the exact curl command and the real, trimmed response body. Always include real request and response data here rather than a description of it, this is what the recipient actually checks.
- Optional explicit "Impact:" paragraph for the most severe or multi-step findings, when impact needs separating from the technical description.
- "Recommended fix:" or "Recommendation:" paragraph, specific to the root cause, not generic advice.

When a finding requires showing third-party data to prove cross-tenant or cross-account access, keep it to the minimum number of records that proves the point, per the data hygiene rule in CLAUDE.md. Prefer records spread across clearly different ranges or tenants over many records from one place, since that is what proves the issue rather than just its existence.

## Optional section: test artifacts to clean up
List any test accounts, orders, or records created during testing, by ID and the email used, and offer that they can be safely deleted. Include this section whenever more than one persistent test artifact exists.

## Closing, in this order
"Bounty and recognition": ask whether a bug bounty program or policy exists. Offer to discuss a reward if not. Offer to help verify the fix. Offer to coordinate disclosure timelines. Keep the tone collaborative, not demanding. For a critical, large-scale finding, one line anchoring expectations is acceptable, for example noting that comparable severity and scale typically warrants a reward at the higher end of the range, without naming a specific figure unprompted.

Then: "Let me know if you'd like any additional details or clarification from my side, I'm open to any and all questions."

Sign-off: "Kind regards, Sjoerd".

## Formatting rules
Plain text only. No markdown bold, no bullet points, no horizontal rule separators, no numbered section labels, no em dashes. Finding titles are never numbered in the email itself, even though they are referred to by order in the prose.
