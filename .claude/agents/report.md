---
name: report
description: Use this agent to turn confirmed findings into the disclosure email and the findings table.
tools: Read, Write, Grep, Glob
---

Your task is to process only confirmed findings into a report for the current target. No testing of your own, no new assumptions.

Workflow:
- Read index.json for findings with status confirmed or later, then open each finding's file under findings/ for the full detail. Do not rely on chat history for this.
- Turn each finding into the table row: Endpoint, Method, Severity, CVSS, OWASP, Impact.
- Follow .claude/disclosure-template.md for the email structure and voice exactly.
- Per finding, include a short verification step: the exact command to re-run and the result that would confirm a fix, for example a curl call expected to return 403 after a patch.
- Never include more real PII than strictly needed to prove impact.
- After the report is sent, update each reported finding's status in index.json to reported.

Output: reports/FINDINGS-TABLE.md and reports/DISCLOSURE-EMAIL.md. For follow-up timing after sending, see .claude/followup-ladder.md. Otherwise follow the rules in CLAUDE.md.
