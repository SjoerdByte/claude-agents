Vector: q-staging-sandbox
Date: 2026-10-09

Queries actually executed via mcp__github__search_code:
  1. "staging.anyday.io" OR "sandbox.anyday.io" ................. 0 hits (OR-of-literals suppressed by GitHub)
  2. "staging.anyday.io" ....................................... 1 hit  (rix4uni/BugBountyData/data/anyday.io.txt)
  3. "sandbox.anyday.io" ....................................... 1 hit  (same)
  4. "admin.staging.anyday.io" ................................. 0 hits
  5. "anyday.io" staging ....................................... 10 hits (noise + rix4uni)
  6. "anyday.io" sandbox ....................................... 8 hits  (noise + rix4uni)
  7. "anyday.io" admin ......................................... 19 hits (official org found!)
  8. "api.anyday.io" ........................................... 0 hits  (NOT referenced in public code — pure API host, interesting)
  9. "anyday.io" org:anyday-payments ........................... 12 hits (plugin repos, my.anyday.io API paths)
  10. org:anyday-payments repo listing .......................... 3 repos (Magento2, WooCommerce, Magento1)
  11. "staging" org:anyday-payments ............................. 0 hits  (plugins never reference staging in-repo)

Key finding: Anyday's official GitHub organization is `anyday-payments` with 3 public plugin repos.
  All plugins hit the live production API at my.anyday.io; no staging/sandbox hostnames appear
  anywhere in the plugin code or docs.

Additional subdomain enumeration data (3rd-party):
  rix4uni/BugBountyData/data/anyday.io.txt contains ONLY:
    staging.anyday.io
    sandbox.anyday.io
    connect.anyday.io
  (all 3 already in our target scope, no new subdomains contributed)

New endpoints discovered (from anyday-payments org plugins):
  Base: https://my.anyday.io
  POST  /api/v1/authentication/login       (ManagerInterface::ANYDAY_AUTH_URL — login endpoint)
  POST  /api/v1/orders                     (URL_AUTORIZE — order create/authorize)
  POST  /api/v1/orders/{id}/capture        (URL_CAPTURE)
  POST  /api/v1/orders/{id}/refund         (URL_REFUND)
  GET   /webshopPriceTag/anyday-price-tag-{en|da}-es2015.js  (static price-tag JS)

CSP: Anyday Magento2 whitelists host="*.anyday.io" (etc/csp_whitelist.xml) — confirms wildcard
     Content-Security-Policy allowance on merchant pages.

Tech signals:
  - PHP (Magento 1/2, WooCommerce) — merchant-side only
  - Angular suspected on my.anyday.io (/webshopPriceTag/anyday-price-tag-*-es2015.js naming matches
    Angular ng build --target=es2015 output)
  - .NET / Hangfire on services.internal.anyday.io (per scope)
