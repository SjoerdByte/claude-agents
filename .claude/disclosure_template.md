# Disclosure email template

Five reference mails exist: Deblock, Abby, DICE, Shotgun, Bloomon. Match this structure and voice exactly.

## Subject
"Responsible Disclosure: [severity tier] vulnerabilit(y/ies) on [domain]"
Examples: "Responsible Disclosure: Critical vulnerabilities on deblock.com", "Responsible Disclosure: Critical vulnerabilities on dice.fm"

## Salutation
"Dear [Company] Security Team," when no named contact is known.
"Dear [Name] and team," when a named contact was found, for example in security.txt or from a prior reply.

## Opening paragraph
One paragraph. State the number of vulnerabilities and where they were found. Then state the testing methodology: self-created test accounts only, no real customer data accessed, modified, or stored beyond what was necessary to confirm each finding, test purchases or actions left in pending state or cleaned up afterward. If an unusual number of test artifacts were created, add one line that details follow near the end.

Never mention how authorization was obtained. No CEO, no written permission, no engagement basis. The email reads as independent responsible disclosure research, regardless of whether prior permission exists. That stays internal.

## Per finding
A plain-text title line, not numbered, not bolded, ending in a parenthetical with severity and CVSS score, for example "Cross-tenant IDOR on contact query leaking PII of approximately 34 million users (Critical, CVSS 9.1)". Findings are referred to by ordinal in prose, "finding 1", "finding 2", not by a numeric label in the title itself.

Under the title, in this order:

"Endpoint:" or "Endpoints:" line, one or two lines with the exact URL or DNS target. Skip this line only when the finding is purely architectural with no single endpoint, such as a wallet key escrow design issue.

Problem paragraph. One or two paragraphs describing the root cause and what is misconfigured or missing. Include concrete numbers where available: record counts, ID ranges, rate measurements, permission sets. For OTP brute-force findings, include the timing and the math showing feasibility.

"Reproduction:" or "Step N," section. The exact curl commands, GraphQL mutations, or dig output, followed by the real trimmed response body. Always include real request and response data rather than a description of it. For multi-step flows like account creation plus exploit, number the steps explicitly. For cross-tenant findings, show 3 to 5 data points across clearly different ID ranges or tenants to prove full coverage, not just one.

"Impact:" paragraph, optional but use it for the highest-severity or most multi-step findings, when impact needs separating from the technical description. For findings affecting millions of records or financial assets, be specific about scale and regulatory context, for example GDPR, financial regulation, or crypto custody.

"Recommendation:" or "Recommended fix:" paragraph, specific to the root cause. Name the fix, not just the category.

## Additional findings teaser (optional but high-value)
When there are more findings beyond what is detailed in the email, include a short "Additional findings" paragraph at the end of the findings section naming the categories without full detail, for example subdomain takeovers, hardcoded API keys, debug endpoints, WebSocket issues. End with a line like "I am happy to share the complete report if there is interest." This creates leverage for the bounty conversation without giving everything away up front.

## Test artifacts to clean up
Include this section whenever more than one persistent test artifact was created. List each by ID and the email address used, and note that they can be safely deleted. For guest list invitations or similar side effects on other users' data, list which events or resources were affected and offer to help revoke them.

## Bounty and recognition
Ask whether a bug bounty policy or program exists. If not, welcome a discussion about a reward. Offer to coordinate disclosure timelines and help verify the fix. For critical findings affecting large numbers of users or financial assets, one sentence anchoring expectations is appropriate, referencing the severity and scale in plain language, for example noting that findings of this severity typically warrant consideration at the higher end of what the platform offers, without naming a specific figure unprompted. Keep the tone collaborative throughout, never demanding.

Close with: "Let me know if you'd like any additional details or clarification from my side, I'm open to any and all questions." or a close equivalent.

## Sign-off
"Kind regards," then a blank line, then "Sjoerd".

## Formatting rules
Plain text only. No markdown bold, no bullet points, no horizontal rule separators, no numbered section labels in finding titles. Steps within a reproduction section can be numbered. Findings are referred to by ordinal in prose only. No em dashes anywhere.
