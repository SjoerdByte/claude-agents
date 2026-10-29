# F003 -- Server-Side Configuration Schema Leaked in Client-Side JavaScript Bundle

| Field    | Value |
|----------|-------|
| Endpoint | `https://app.lucis.life/_next/static/chunks/140mw7wp42s04.js` |
| Method   | GET |
| Severity | Low |
| CVSS     | 3.7 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N) |
| OWASP    | A05:2021 Security Misconfiguration |

## Summary

The Next.js client-side JavaScript bundle at `app.lucis.life` includes the complete server-side environment variable configuration schema (Zod validation definitions). The file `140mw7wp42s04.js` contains **129 environment variable entries** with their names, descriptions, default values, and validation rules. While no actual secret VALUES are exposed, the schema provides a comprehensive map of the backend infrastructure, third-party integrations, internal URLs, and staff email addresses.

## Impact

An attacker gains detailed knowledge of:

1. **Complete infrastructure map**: Database technology (Prisma/PostgreSQL), AWS services (SES, SQS, S3, KMS), queue architecture, connection pool settings, shutdown behavior
2. **All third-party service integrations**: Stripe, Clerk, Terra (wearables), BigBlue (logistics), Biomes (microbiome), ElevenLabs (speech-to-text), LangGraph/LangSmith (AI), Azure OpenAI (gpt-5.4 deployment), Intercom, DexaScan, Randox, Eurofins, CustomerIO
3. **Internal staff email addresses**: theo@lucis.life, b@lucis.life, theo+cc@lucis.life, group@lucis.life, support@getlucis.com
4. **Staging/dev URLs**: api.stg.lucis.tech, localhost:4000, api.getlucis.com (legacy), qa.cf.e-clinical.gnla100.gnla.eurofinseu.com (Eurofins QA)
5. **S3 bucket naming pattern**: lucis-terra-payloads-prod
6. **Authentication mechanisms**: DEV_AUTH_BYPASS_TOKEN (description says development-only), Google Group reader SA for staff auth, Clerk machine keys, OIDC JWT key rotation setup
7. **Internal API key architecture**: Separate keys for Brain, Lumi (Slack coach), Support Inbox, Ops, NextJS server actions -- each scoped description reveals the access model
8. **MCP (Model Context Protocol) architecture**: MCP_BASE_URL, OAuth scopes (health:read, care:read, orders:read), door configuration

This information significantly reduces reconnaissance effort for targeted attacks against specific integrations.

## Proving Request

```
GET /_next/static/chunks/140mw7wp42s04.js HTTP/2
Host: app.lucis.life
```

## Proving Response (trimmed to sensitive entries)

```
STRIPE_SECRET_KEY:{category:R,description:"Stripe secret key"}
CLERK_SECRET_KEY:{category:R,description:"Clerk secret key"}
AWS_ACCESS_KEY_ID:{category:R,description:"AWS access key ID"}
AWS_SECRET_ACCESS_KEY:{category:R,description:"AWS secret access key"}
DATABASE_URL:{category:R,description:"Database connection URL"}
DATABASE_DIRECT_URL:{category:R,description:"Direct database connection URL"}
DEV_AUTH_BYPASS_TOKEN:{category:R,description:"Local-only shared secret that lets a request skip Google OAuth on role-guarded admin endpoints, so tests and headless browsers can reach the admin API. Refused unless APP_ENV=development -- the guard fails closed and logs an alert if it is set anywhere else. Never set in staging or production."}
PII_HASH_SECRET:{category:R,description:"Secret key for HMAC hashing of PII (emails, etc.) in logs"}
OIDC_JWT_PRIVATE_KEY:{category:R,description:"RSA private key (PEM) for signing partner OIDC JWTs"}
BRAIN_SERVICE_API_KEY:{category:R,description:"Internal import API key"}
LANGGRAPH_BRAIN_API_KEY:{category:R,description:"Langgraph API key used by backend workflow commands (brain deployment)"}
ELEVENLABS_API_KEY:{category:R,description:"ElevenLabs API key for speech-to-text"}
AZURE_API_KEY:{category:R,description:"Azure OpenAI API key used for the chat deployment"}
INTERCOM_SECRET_KEY:{category:R,description:"Intercom secret key"}
INTERCOM_ACCESS_TOKEN:{category:R,description:"Intercom REST API access token for admin-side member support reads"}
TERRA_API_KEY:{category:R,description:"Terra API key"}
TERRA_WEBHOOK_SECRET:{category:R,description:"Terra webhook secret"}
BIGBLUE_API_KEY:{category:R,description:"BigBlue API key"}
BIOMES_API_TOKEN:{category:R,description:"BIOMES API bearer token used by the activation client."}
DEXASCAN_API_KEY:{category:R,description:"DexaScan API key sent as the X-API-Key header by the booking client."}
STRAPI_READONLY_TOKEN:{category:R,description:"Read-only Strapi API token for published blog articles."}
PUBLIC_API_URL:{category:R,description:"... Local: http://localhost:4000. Staging: https://api.stg.lucis.tech. Production: https://api.lucis.life."}
EMAIL_DEV_LAB_NOTIFICATION_TO:{category:R,description:"... Unset keeps theo@lucis.life,b@lucis.life. Ignored in staging and production."}
EUROFINS_BASE_URL:{category:R,description:"Base URL for the Eurofins E-Clinical API (e.g. https://qa.cf.e-clinical.gnla100.gnla.eurofinseu.com)"}
MCP_BASE_URL:{category:R,description:"Public origin of the MCP process (main-mcp), e.g. https://mcp.lucis.life..."}
MCP_OAUTH_SCOPE:{category:R,description:"Clerk OAuth scope an MCP client must hold to call the health-data tools on /v1/mcp."}
```

Total entries: 129 server-side config variables with descriptions exposed in client bundle.

## Remediation

The server-side Zod configuration schema is being tree-shaken into the client bundle by Next.js/Turbopack. Ensure the config module is server-only by either:
- Adding `"use server"` directive or using `server-only` package import
- Moving the config schema into a file that is never imported from client components
- Using `next/dynamic` with `ssr: false` to avoid server imports in client bundles
