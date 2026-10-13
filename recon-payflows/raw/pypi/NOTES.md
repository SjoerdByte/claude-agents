# pypi.payflows.io - probe log

## Bucket identification
- Direct S3 virtual-host probes against candidate bucket names (us-east-1 default):
  - `payflows-pypi.s3.amazonaws.com` -> HTTP 403 AccessDenied, `x-amz-bucket-region: eu-west-1` (bucket exists)
  - `payflows-pypi.s3.us-east-1.amazonaws.com` -> 301 PermanentRedirect with explicit `<Bucket>payflows-pypi</Bucket>` and `<Endpoint>payflows-pypi.s3-eu-west-1.amazonaws.com</Endpoint>`
  - All other candidates returned 404 NoSuchBucket (or DNS 000)
- Confirmed CloudFront origin: `payflows-pypi` in region `eu-west-1`

## Access controls on the origin bucket (all unauthenticated)
| Op | Status | Code |
|---|---|---|
| GET / (direct S3) | 403 | AccessDenied |
| GET /?list-type=2 | 403 | AccessDenied |
| GET /?list-type=2&max-keys=5 | 403 | AccessDenied |
| GET /?policy | 403 | AccessDenied |
| GET /?acl | 403 | AccessDenied |
| GET /?versioning | 403 | AccessDenied |
| GET / via s3-website endpoint | 404 | NoSuchWebsiteConfiguration (BucketName=payflows-pypi echoed) |

## Content enumeration via CloudFront (NoSuchKey means object does not exist)
Over 50 candidate paths tried, all returned NoSuchKey:
- `/`, `/simple/`, `/simple/index.html`, `/simple/packages.html`
- `/packages/`, `/pypi/`, `/pypi/simple/`, `/pypi/index.html`
- `/robots.txt`, `/sitemap.xml`, `/.well-known/`, `/favicon.ico`, `/index.json`, `/last-modified`
- `/+simple/`, `/root/pypi/+simple/`, `/web/+index/` (devpi styles)
- `/simple/{payflows,payflows-core,payflows-sdk,payflows-client,luigi,luigi-payflows,mystix,fawkes,bouncer,intake,counterparty,pyflows,warden,kyc,aml,payflows-common,payflows-utils,payflows-auth,payflows-schema,payflows-models,payflows-io,compliance,onboarding}/`
- `/packages/{same list}/`
- `/api/`, `/api/v1/`, `/api/v2/`, `/health`, `/healthz`, `/version`, `/install`, `/upload`, `/pyproject.toml`, `/requirements.txt`, `/setup.py`, `/config.json`, `/manifest.json`, `/crossdomain.xml`

CloudFront rewrites only root `/` -> `index.html`; subpaths are forwarded verbatim.

## Verdict
No publicly reachable content and no public enumeration primitive. CloudFront+OAC in front of a correctly locked-down S3 bucket. The bucket name `payflows-pypi` is leaked by the standard S3 PermanentRedirect XML, but a bucket-name disclosure alone (without a listable or writable primitive) is below reportable severity and is listed as expected behavior for public CF distributions.

Nothing to report. Thread closed.
