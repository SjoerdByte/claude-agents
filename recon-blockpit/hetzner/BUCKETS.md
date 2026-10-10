# Hetzner Object Storage recon - Blockpit buckets

Date: 2026-10-09.
Scope: `ct-unified-generated-reports.fsn1.your-objectstorage.com` and `ct-wiso-generated-reports.fsn1.your-objectstorage.com` (referenced by prod Angular bundle `whitelistedDomainsCors`).
Rules of engagement: GET/HEAD/OPTIONS only. No key enumeration. No PDF content fetched. Mapping only.

## Executive summary

Both bucket names resolve on the wildcard Hetzner DNS (`*.fsn1.your-objectstorage.com` -> `88.198.120.64`), but **both buckets return `NoSuchBucket` on every S3-compatible probe across every Hetzner region (fsn1 / nbg1 / hel1), virtual-hosted style AND path-style, for ListObjects, HEAD root, generic key probes, and every S3 subresource (`?location`, `?cors`, `?acl`, `?policy`, `?versioning`, `?lifecycle`, `?website`, `?encryption`)**. The 404 response is served by the Hetzner frontend router pre-Ceph (no `x-amz-request-id` or `x-amz-id-2` leaked, in contrast to the regional ListAllMyBuckets which does), confirming that the buckets as named genuinely do not exist on the public endpoint right now - not a 403 (private) or a 200 (public). No listing, no HEAD, no CORS reflection, no signed-URL abuse possible against these names.

Verdict: **no finding against these two bucket names as of today**. Three possibilities for the apparent gap vs the shipped Angular bundle: (1) buckets renamed / rolled behind presigned URLs with a different real backend name while the frontend still uses these strings for a substring-based token-strip whitelist (see note below), (2) the Hetzner storage product was migrated away from these two specific names (customer may have moved to R2 / cdn), (3) the names in `whitelistedDomainsCors` are vestigial / forward-looking. The next-session validation steps below will disambiguate once an authenticated session can call `GET /report/download/{id}` on gate.blockpit.io and read the `downloadUrl` field.

## Per-bucket probe table

Virtual-hosted = `https://<bucket>.fsn1.your-objectstorage.com/...`.
Path-style = `https://fsn1.your-objectstorage.com/<bucket>/...`.
All probes done anonymously (no AWS SigV4 header, no Authorization).

### ct-unified-generated-reports

| Probe | Style | Status | Body |
|---|---|---|---|
| HEAD / | vh | 404 | - |
| HEAD / | path | 404 | - |
| GET / | vh | 404 | `<Code>NoSuchBucket</Code>` RequestId=N/A HostId=N/A |
| GET / | path | 404 | `<Code>NoSuchBucket</Code>` |
| GET /?list-type=2 (v2 ListObjects) | vh | 404 | NoSuchBucket |
| GET /?list-type=2&max-keys=10 | vh | 404 | NoSuchBucket |
| GET /?max-keys=10 (v1) | vh | 404 | NoSuchBucket |
| GET /?prefix=&max-keys=10 | vh | 404 | NoSuchBucket |
| GET /?delimiter=/ | vh | 404 | NoSuchBucket |
| GET /?location | vh | 404 | NoSuchBucket |
| GET /?policy | vh | 404 | NoSuchBucket |
| GET /?versioning | vh | 404 | NoSuchBucket |
| GET /?lifecycle | vh | 404 | NoSuchBucket |
| GET /?cors | vh | 404 | NoSuchBucket |
| GET /?acl | vh | 404 | NoSuchBucket |
| GET /?encryption | vh | 404 | NoSuchBucket |
| GET /?website | vh | 404 | NoSuchBucket |
| GET /?tagging | vh | **501** | `<Code>NotImplemented</Code>` |
| GET /?logging | vh | **501** | NotImplemented |
| GET /?accelerate | vh | 501 | NotImplemented |
| GET /?notification | vh | 501 | NotImplemented |
| GET /?requestPayment | vh | 501 | NotImplemented |
| GET /index.html | vh | 404 | NoSuchBucket (not NoSuchKey) |
| GET /README | vh | 404 | NoSuchBucket |
| GET /robots.txt | vh | 404 | NoSuchBucket |
| OPTIONS / Origin=https://app.blockpit.io | vh | 404 | NoSuchBucket, no `access-control-*` headers reflected |
| OPTIONS / Origin=https://evil.example.com | vh | 404 | NoSuchBucket, no reflection |
| GET presigned-URL-shaped probe | vh | 404 | NoSuchBucket (not SignatureDoesNotMatch) |
| Alt region: GET https://ct-unified-generated-reports.nbg1.your-objectstorage.com/ | vh | 404 | NoSuchBucket |
| Alt region: GET https://ct-unified-generated-reports.hel1.your-objectstorage.com/ | vh | 404 | NoSuchBucket |

### ct-wiso-generated-reports

Identical probe matrix, identical results - every probe returns 404 NoSuchBucket (or 501 NotImplemented for tagging/logging/accelerate/notification/requestPayment). All three regions. No `access-control-*` reflected. No signed-URL error variation.

## DNS forensics (dns.txt)

| Hostname | A | SOA/NS |
|---|---|---|
| ct-unified-generated-reports.fsn1.your-objectstorage.com | 88.198.120.64 | wildcard (`*.fsn1`) under your-objectstorage.com SOA |
| ct-wiso-generated-reports.fsn1.your-objectstorage.com | 88.198.120.64 | wildcard |
| fsn1.your-objectstorage.com (regional) | 88.198.120.64 | SOA on your-objectstorage.com (ns1.your-server.de) |
| nbg1.your-objectstorage.com | 88.198.120.0 | same |
| hel1.your-objectstorage.com | 37.27.175.128 | same |
| your-objectstorage.com | 213.239.246.73 | NS: ns.second-ns.com, ns1.your-server.de, ns3.second-ns.de |

PTR for 88.198.120.64 has no record. The SOA responses for subdomain CNAME queries confirm there is no explicit CNAME: the regional subdomains are plain wildcard A records pointing to the Ceph gateway cluster.

Sanity: `GET https://fsn1.your-objectstorage.com/` (regional ListBuckets, anonymous) returns 200 + `<ListAllMyBucketsResult><Owner><ID>anonymous</ID></Owner><Buckets></Buckets></ListAllMyBucketsResult>` with full `x-amz-request-id: tx000002faefc07d38da685-006ac8cf58-8a583a56-fsn1-prod1-ceph3`. So the backend IS reachable from our vantage - it just reports no such bucket for either of the two names. The response fingerprint (`fsn1-prod1-ceph3`) confirms Hetzner Cloud's Ceph Object Gateway (radosgw).

## Naming-pattern analysis

Cannot be assessed - no object listing was obtained. If/when the buckets become listable in a future session, record first-8-char-redacted key prefixes to assess whether PDFs are keyed by `<userId>/<year>.pdf`, `<uuidv4>.pdf`, `report_<n>.pdf`, year-month path, etc. The highest-severity scenario is a listable bucket with keys formatted as `<userId>/<year>/<reportId>.pdf` where userId is small / sequential (predictable), because the whole PII corpus is then one `aws s3 cp --recursive` away for an unauth attacker.

## CORS findings

Neither bucket produces any `access-control-allow-origin`, `-methods`, `-headers`, `-credentials`, or `-max-age` headers on OPTIONS preflight with any Origin (both the real Blockpit origin `https://app.blockpit.io` and a dummy `https://evil.example.com`). The 404 body is identical for both origins. CORS is irrelevant until the bucket exists.

Important semantic note: the Angular bundle's `whitelistedDomainsCors` array is **mis-named** - it is NOT a CORS whitelist. The actual code is:
```
whitelistedDomainsCors.some(s => t.url.includes(s)) || t.url.includes('/auth/refresh') || t.url.includes('/v1/maintenance')
  ? n(t)                                    // pass request through WITHOUT bearer token
  : e.getValidToken().pipe(...)             // attach OAuth2 bearer
```
It is a **bearer-token-STRIP whitelist** used by the Angular HTTP interceptor to AVOID sending the Blockpit OAuth2 bearer when hitting the two Hetzner bucket hostnames (because those use short-lived AWS SigV4 query-string signatures, not Blockpit auth). Match is `String.prototype.includes` - plain substring, not hostname or regex. So any URL whose string contains `ct-unified-generated-reports`, `ct-wiso-generated-reports`, `cdn.blockpit.io`, or `fsn1.your-objectstorage.com` anywhere (path, query, fragment) suppresses token attachment. On the current frontend, the URL is only ever constructed from a backend-provided `downloadUrl` (e.g. from `GET /report/download/{id}` on gate.blockpit.io), so there is no user-controllable path to abuse the substring match on today's app. If a future feature lets a user influence a URL that the Angular HttpClient fetches, this substring match will quietly strip bearer tokens from attacker-chosen URLs that happen to contain any of these strings - minor hazard, log for later.

## Potential-finding draft (per Claude.md CVSS rubric)

**None, as of this probe.** Buckets as named do not exist on the public Hetzner endpoints, in any region, via any S3-compatible access path. Known-non-findings clause of Claude.md: a bucket NAME alone is not a finding, only a misconfigured POLICY is. Here we have neither name resolution to a real bucket nor a misconfigured policy on a real bucket.

Pre-registered hypothetical: IF the live/auth agent in the next session confirms that `GET /report/download/{id}` returns a `downloadUrl` pointing at these buckets AND the bucket name on that URL differs from `ct-unified-generated-reports` / `ct-wiso-generated-reports` (e.g. a prefixed-with-tenant real name), re-run this whole probe matrix against the actual bucket name discovered. IF, instead, the backend has moved to a non-Hetzner store (Cloudflare R2 under `cdn.blockpit.io`'s CloudFront, Backblaze B2, GCS, Vercel Blob), probe THAT. Hypothetical worst-case CVSS to prepare for: unauth ListObjects + unauth GET of per-user tax PDFs = AV:N/AC:L/PR:N/UI:N/S:C/C:H -> ~9.0+ (CVSS 3.1), OWASP A01 Broken Access Control + A02 Cryptographic Failures (if PDFs contain PII in cleartext at rest). Not raising a finding against the current state.

## Related signal

- `cdn.blockpit.io` is NOT a Hetzner front - it is CloudFront + AWS S3 (`x-amz-server-side-encryption: AES256`, `x-amz-version-id`, `via: 1.1 ...cloudfront.net`, `server: cloudflare`). Image assets served at `/images/illustrations/...` are public and expected. Root listing on cdn.blockpit.io returns 403 `AccessDenied` with real `RequestId=30T17GV9JX0W4EVD` from S3 - cdn.blockpit.io root is private, which is the correct posture.
- `whitelistedUsers` in the same prod env block leaks 4 internal account emails (already noted in open_threads of index.json): `mail@florianwimmer.at` (CEO), `guineapig@blockpit.io`, `daniil.rabizo@blockpit.io`, `blockpitdemo@gmail.com`.

## Next-session validation steps for the live/auth agent

1. Create an own Blockpit account, generate one tax PDF for any supported tax year, click "Download report" in the UI. Capture (Burp or chrome devtools) the full flow: `GET /report/download/{id}` on gate.blockpit.io -> response JSON `downloadUrl` field. Record the **real** hostname and the **real** bucket name on that signed URL. If the hostname is NOT `*.fsn1.your-objectstorage.com`, this entire file is already answered - re-run probe against the real host. If it IS `*.fsn1.your-objectstorage.com`, verify the bucket name on that URL (expect it to differ from the two names seen in `whitelistedDomainsCors`; the strings in the Angular bundle are then substring hits against a longer real bucket name).
2. From the captured `downloadUrl`, strip the `X-Amz-Signature` / `X-Amz-Credential` / `X-Amz-Date` / `X-Amz-Expires` query string and re-request. If the bucket's ACL permits public read, the PDF comes back. If `AccessDenied`, the per-object ACL is private (good) and signature is the only path (expected).
3. Attempt the ListObjects (`?list-type=2&max-keys=10`) on the REAL bucket name discovered in step 1. If 200, parse the first ~1000 keys to confirm naming pattern (userId prefix? UUID? sequential?). If 403 AccessDenied, the bucket is private at the collection level (good). Record the response fingerprint for the finding file.
4. Try HEAD on a neighboring key: if the generated-PDF path is e.g. `12345/2024/report.pdf` and you own `12345`, try `12346/2024/report.pdf`. If `AccessDenied`, per-object ACL is private. If `NoSuchKey`, the object simply isn't there (not a vuln - but means the whole corpus is accessible-when-exists). This is the real criticality test.
5. Separately: file a note that the Angular `whitelistedDomainsCors` is semantically a bearer-token-strip whitelist that uses `String.includes` on user-controllable (eventually) URLs. Not a finding today, but mark it so the live/auth agent revisits it after mapping a user-URL-input vector.

## Deliverables

- `/home/user/claude-agents/recon-blockpit/hetzner/BUCKETS.md` (this file)
- `/home/user/claude-agents/recon-blockpit/hetzner/dns.txt`
- `/home/user/claude-agents/recon-blockpit/hetzner/cors-probe.txt`
- `/home/user/claude-agents/recon-blockpit/hetzner/raw/*` (all headers + bodies for every probe; XML error bodies only, no PDF bytes)
