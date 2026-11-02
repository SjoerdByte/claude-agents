# Booking engine & dev portal recon notes

## Booking engine URL pattern (confirmed via Amenitiz support docs)
- Per-hotel booking engine: https://{hotel}.amenitiz.io/booking/room#DatesGuests-BE
- Hotel site root 302 -> /{locale} (e.g. /fr). Booking flow under /booking/room.
- JS served from CloudFront d1cmur5l0xva3h.cloudfront.net/packs/ (NOT behind Cloudflare challenge -> fetchable from the agent env).
- la-maison-folia.amenitiz.io = website-builder build, "site-en-construction" (no active booking). Its packs are the website_rendering product, no API routes.

## Live per-hotel hosts (probed root, plain curl)
Direct Amenitiz-served (302 -> /fr), clearly in stated scope:
- chalet-le-brame.amenitiz.io/fr
- les-chenes-verts-84120.amenitiz.io/fr
- ostal-de-pombonne.amenitiz.io/fr
- auberge-danthy.amenitiz.io/fr
Custom-domain (301), Amenitiz engine on hotel's own domain (in scope: runs target code):
- hotel-santorini.amenitiz.io -> www.hotel-santorini-cyclades.com
- villamia-abidjan.amenitiz.io -> www.villamia-abidjan.com
- kimi-residence.amenitiz.io -> www.kimihotel.com
- villa-rosa.amenitiz.io -> www.villa-rosa-karibella.com
403 at root: chalet-le-camigane.amenitiz.com, ododo.amenitiz.com (CF edge block)

## Dev portal
- developers.amenitiz.com = hosted Stoplight docs SPA (title "Amenitiz | Stoplight"). Spec is lazy-loaded via JS; not in initial HTML; sitemap.xml returns SPA fallback. Needs a browser or the Stoplight project API to extract the OpenAPI spec (which would enumerate object-ID routes). Third-party directory (unverified) claims base api.amenitiz.com/v1/ with POST /reservations.

## Env constraint
- From the agent proxy IP, Cloudflare challenges all deep app paths incl. /fr (403, 4547 bytes). Root redirects are cached and pass. CF-protected app/booking paths must be driven from the user's own browser/IP.
