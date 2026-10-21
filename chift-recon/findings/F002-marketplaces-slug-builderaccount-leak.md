# F002 - Internal "test" builder account exposed on production marketplace

| Field | Value |
|---|---|
| Endpoint | `https://backend.chift.app/v2/marketplaces/{slug}` |
| Method | GET |
| Severity | Low |
| CVSS | AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N (3.7) |
| OWASP | A01:2021 - Broken Access Control (info disclosure) |
| Status | confirmed |

## Impact

`GET /v2/marketplaces/{slug}` is an unauthenticated catalog endpoint that
returns the full integration list for a marketplace plus:

- `marketplaceId` (UUID)
- `builderAccountId` (the Chift account that owns the marketplace)
- `builderAccountName` (the human-readable name of that account)
- `builderAccountConfig` (feature flags: `enterprise`, `premiumFeatures`,
  `allowMultiEnvironments`, `allowExternalUserInvitations`, …)
- `thirdPartyProviderClient`, `acdSsoEnabled`

For the production `chift` marketplace (`https://marketplaces.chift.app/chift`,
the one Chift's own customers reach when they browse "the Chift marketplace")
the owner is reported as:

```
builderAccountName : "Alexis - Test"
builderAccountId   : "d4ae6daa-e7af-41e1-be20-efab8eb1c917"
marketplaceId      : "e871e4b8-ab75-4e45-991a-9680c5034abd"
```

The `- Test` suffix in the owner name is the data-hygiene concern: Chift's
production marketplace is being driven from an account that is labeled as a
test/sandbox account. Any customer or competitor hitting the catalog gets a
flash of internal naming and can infer that the live marketplace is not owned
by a sanitised, customer-facing account.

Similarly the `test` slug (`GET /v2/marketplaces/test`) returns:

```
builderAccountName : "Demo Account"
builderAccountId   : "b230e324-186c-431e-b60d-4ec7baa8dec1"
builderAccountConfig.demo : true
```

The `builderAccountId` here is reused across many public endpoints and can be
used as an input to any `accountId`-taking endpoint (e.g. `POST /token`,
`POST /mcp-token`, `POST /v2/accounts/{accountId}/sessions`) when enumerating.

## Reproduction

### Request

```
GET /v2/marketplaces/chift HTTP/2
Host: backend.chift.app
```

### Response (trimmed to the relevant fields)

```
HTTP/2 200
content-type: application/json; charset=utf-8
content-length: 34145

{
  "integrations": [ ... 34 KB of integrations ... ],
  "marketplaceId": "e871e4b8-ab75-4e45-991a-9680c5034abd",
  "marketplaceName": "Chift",
  "marketplaceSlug": "chift",
  "builderAccountName": "Alexis - Test",
  "builderAccountId": "d4ae6daa-e7af-41e1-be20-efab8eb1c917",
  "builderAccountConfig": {
    "demo": false,
    "type": "oneApi",
    "allowSyncs": true,
    "enterprise": true,
    "chiftFooters": true,
    "premiumFeatures": [],
    "showIssuesPanel": false,
    "allowFlowPreview": false,
    "allowMultiEnvironments": false,
    "allowExternalUserInvitations": false,
    "showConsumerInternalReference": false
  },
  ...
}
```

## Fix

Rename the production `chift` marketplace's owning account to a non-test name
(e.g. "Chift") so the public catalog does not advertise an internal test
account. Separately, drop `builderAccountId` and `builderAccountConfig` from
the unauthenticated catalog response - clients that need those fields can
fetch them under their own authenticated session.
