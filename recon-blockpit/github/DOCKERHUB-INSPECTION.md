# Docker Hub `blockpit` org inspection

Date: 2026-10-09. OSINT only, no live probing of blockpit.io hosts.

Enumeration source: `hub.docker.com/v2/repositories/blockpit/?page_size=100` + per-repo `/tags/`. Raw JSON saved to:

- `recon-blockpit/raw/dockerhub-repos.json`
- `recon-blockpit/raw/dockerhub-tags-{web,node,php}.json`
- `recon-blockpit/raw/docker/*` (prior session, kept)
- `recon-blockpit/docker/configs/*.json` (image config blobs, prior session, kept)

Underlying image inspection was carried out via the raw v2 registry API (`auth.docker.io` token + `registry-1.docker.io/v2/.../manifests/.../blobs/`), no daemon required. Small/mid layers were extracted to scratchpad, grepped against the full secrets wordlist from the mission (`.env*`, `*.pem`, `id_rsa*`, `.aws/credentials`, `.npmrc`, `.docker/config.json`, `serviceAccount*.json`, `/app`, `/var/www`, `/srv`, `/usr/src/app`, `node_modules/.package-lock.json`, `wp-config.php`, `settings.py`, `database.yml`, `application.{yml,properties}`), then purged. Only sanitized configs + candidate snippets remain.

## 1. Repos

| Repo | Tags count | Last push (last_updated) | Storage size | Pulls | Notes |
|------|-----------:|--------------------------|-------------:|------:|-------|
| blockpit/web | 4 | 2022-04-06 | 2.09 GB | 1930 | PHP+Apache dev base images |
| blockpit/node | 4 | 2023-01-16 | 2.04 GB | 584 | Node 11/12/14/16 build toolkit |
| blockpit/php | 5 | 2022-08-01 | 2.05 GB | 535 | PHP 7.4/8.1 base, multi-arch |

Three public repos. No READMEs on any of them. All linux. Last push 2023-01-16 (`blockpit/node:16`). Date registered 2019-04-01 to 2022-04-07. No private repos visible unauth (none advertised either).

Distinct image/digest pairs: 11 amd64 + 3 arm64 (two tags are multi-arch: `php:7.4-latest` and `php:8.1-latest`; arm64 digests are byte-identical in config to amd64 twins so skipped for layer extraction).

See `/home/user/claude-agents/recon-blockpit/docker/INVENTORY.md` for the full tag-level table (digests, per-arch sizes, last_updated per tag).

## 2. Image configs

ENV vars listed are only Blockpit-added or non-upstream-standard ones; upstream `PATH` / `PHPIZE_DEPS` / `PHP_URL` / `PHP_SHA256` / `GPG_KEYS` / `NODE_VERSION` / `YARN_VERSION` are present on every tag and omitted here. "baked_source" = any application source under `/app`, `/var/www/html/web`, `/srv`, `/usr/src/app` beyond upstream vendor files. Labels: EVERY image has an empty `Labels` map, no `org.opencontainers.image.*` keys baked in, so there is nothing to pivot to internal git from label metadata.

| image:tag | ENV added (non-upstream) | baked_source | Labels | build/commit SHA leak | maintainer / author |
|-----------|--------------------------|--------------|--------|-----------------------|---------------------|
| blockpit/web:php-72 | none (upstream only) | no, `/var/www/html/web/` empty | none | none | - (no Author field) |
| blockpit/web:php-74 | none | no | none | none | - |
| blockpit/web:php-74-dev | none | no | none | none | - (pushed by DH user `squeezedlight` per registry metadata) |
| blockpit/web:php-74-memcached | none | no | none | none | - |
| blockpit/node:11 | none | no, `/app/.babelrc` only | none | none | - |
| blockpit/node:12 | none | no, `/app/.babelrc` only | none | none | - |
| blockpit/node:14 | none | no, `/app/.babelrc` only | none | none | - |
| blockpit/node:16 | none | no, `/app/.babelrc` only | none | none | - |
| blockpit/php:7.4-latest | none | no | none | none | - |
| blockpit/php:7.4-pgsql-latest | none | no | none | none | - |
| blockpit/php:8.1-latest | none | no | none | moby.buildkit.buildinfo.v1 base64 blob names `docker.io/library/php:8.1-apache @ sha256:f1c5dba2a2981f91ec31b9596d4165acd0b46e58382e4762248 7e130a21e420d` as upstream pin (public upstream, no leak) | - |

Non-config pivot info in every `web` and `php` config: build host is Debian via standard `php:*-apache` upstream, no CI runner id, no git remote URL, no committer email, no build timestamp beyond the base-image's own history timestamps (2022-07-12 upstream, 2022-08-01 Blockpit layer for php:8.1-latest). `moby.buildkit.buildinfo.v1` present only on `blockpit/php:*` (buildkit-era builds); content for all three decodes to the upstream base-image pin only.

## 3. Secrets / config leaks

Catalogue of every path matched against the mission's secret/config wordlist. Severity is a guess; everything here is a conditional risk pending live confirmation and is **not** raised as a `findings[]` entry in index.json unless impact is proven. Snippets kept locally in `recon-blockpit/docker/secrets-candidates.txt`.

| image:tag | path | type | severity guess | snippet / raw ref |
|-----------|------|------|----------------|-------------------|
| blockpit/web:* and blockpit/php:* | /var/www/server.key | RSA 2048 private key | NO FINDING - dummy `example.com` cert (CN=example.com, O=OrgName, L=Leamington UK, "IT Department"), verbatim Apache SSL tutorial sample, reused across every tag. notBefore 2021-11-22 / notAfter 2035-08-01. Not a Blockpit production key. | `secrets-candidates.txt` entry 1-5 |
| blockpit/web:* and blockpit/php:* | /usr/local/etc/php/conf.d/php-override.ini | PHP config | hint-only, conditional Medium | `display_errors=1`, `display_startup_errors=1`, `error_reporting=E_ALL`, `max_execution_time=240`, `memory_limit=2G`. If any blockpit.io host inherits this unchanged, stacktraces leak to clients. Needs live probe to raise. |
| blockpit/php:8.1-latest | /tmp/disable_spx_ip_whitelist.patch (applied at build) | source patch | hint-only, if confirmed live -> High | 2-line patch making SPX profiler `check_access()` return 1 unconditionally. If php-spx is enabled in a production php-8.1 blockpit host, `?SPX_UI_URI=/` or `?SPX_KEY=xxx` would expose full request params, PHP backtraces, SQL, file paths, memory. |
| blockpit/php:7.4-pgsql-latest, 8.1-latest | docker-php-ext-enable xdebug (build history) | PHP ext | hint-only, conditional Low | xdebug compiled into base. Default `remote_host=127.0.0.1`, usually harmless unless `remote_connect_back` is on in a prod host. |
| blockpit/web:*, blockpit/php:* | RUN chmod -R 777 /var/www/html/ (build history) | world-writable DocumentRoot | info only | harmless inside a container unless combined with a host bind-mount. |
| ALL blockpit/*:* | - | `.env*`, `*.env`, `config.yml`, `config.json`, `application.{yml,properties}`, `settings.py`, `wp-config.php`, `database.yml`, `id_rsa*`, `*.pem` (non-Apache), `authorized_keys`, `.ssh/`, `.npmrc`, `.pypirc`, `.docker/config.json`, `.aws/credentials`, `credentials.json`, `serviceAccount*.json`, `node_modules/.package-lock.json` | - | NEGATIVE - no match in any layer across any tag. | n/a |
| blockpit/node:* | `/app/` | app source | NEGATIVE - every tag's `/app/` holds only the generated `.babelrc` (`{"presets":["es2015"],"plugins":["transform-runtime"]}`) and nothing else. Clear "build-time toolkit" image. | n/a |
| blockpit/web:*, blockpit/php:* | `/var/www/html/web/` | app DocumentRoot | NEGATIVE - the vhost's DocumentRoot path exists empty. Downstream Dockerfiles are expected to `COPY` or bind-mount the actual app. No baked source. | n/a |
| ALL blockpit/*:* | `/etc/shadow` | password hashes | NEGATIVE - all accounts have `*` (disabled passwords). | n/a |

Known non-findings from Claude.md honoured: no Firebase keys, OAuth client IDs or GCP project IDs raised as findings. The CryptoTax API JWT bearer-flow endpoints and Angular `clientSecret:yne8cq00xogLg4LcIosYMcBkCWMPcF8cZaZfx15B` seen elsewhere in index.json are from other surfaces, not from any Docker Hub image.

## 4. Internal URLs / hostnames found

| image:tag | host / URL / email | context | in-scope? |
|-----------|--------------------|---------|-----------|
| blockpit/web:* and blockpit/php:* | blockpit.127.0.0.1.nip.io | Apache vhost `ServerName` in `/etc/apache2/sites-enabled/000-default.conf` | NO - `nip.io` wildcard DNS trick, resolves to 127.0.0.1 loopback, not Blockpit-controlled. |
| blockpit/web:* and blockpit/php:* | dev@florian-weinrich.com | Apache vhost `ServerAdmin` | pivot only - ties Docker Hub pusher `florianweinrich` to the external contractor domain `florian-weinrich.com` (already noted in prior session). Not Blockpit infra. |
| blockpit/php:8.1-latest | https://github.com/NoiseByNorthwest/php-spx.git | `git clone` in build history | NO - public upstream dependency, no pivot value. |
| blockpit/php:8.1-latest | docker.io/library/php:8.1-apache@sha256:f1c5dba2... | moby.buildkit.buildinfo.v1 source pin | NO - public upstream base. |

Zero new `*.blockpit.io` subdomains discovered across all 11 image/tag combos. No `gitlab.blockpit.io`, no `github.com/blockpit-internal`, no `*.internal`, no internal registry references in any `node_modules/.package-lock.json` or similar (none baked in to search). No CI runner URLs, no S3 bucket URLs, no cloud project IDs leaked via ENV or Labels.

## 5. Pivot summary

- Three Docker Hub repos exist (`blockpit/{web,node,php}`), all last-pushed between 2019 and 2023-01-16, all public, all build-time dev base images. No application image is published under `blockpit/*`.
- No image contains application source, `.env*`, API keys, SSH keys, DB URLs, cloud credentials, internal git/CI URLs or non-empty labels.
- No `org.opencontainers.image.source` label on any image, so there is no label-based pivot into an internal git repo.
- Conditional hints (SPX whitelist patch, display_errors, xdebug) only matter if a live blockpit.io host actually ships from one of these base images without re-overriding those settings. That is a live-probe question outside this task's OSINT scope and was NOT verified against production hosts.
- The only new OSINT datapoint beyond prior sessions is confirmation of the Docker Hub pusher-to-contractor-domain link via `dev@florian-weinrich.com` baked into vhost ServerAdmin on every web/php tag.

## Deliverables

- This report: `recon-blockpit/github/DOCKERHUB-INSPECTION.md`
- Raw repo list: `recon-blockpit/raw/dockerhub-repos.json`
- Raw tag lists: `recon-blockpit/raw/dockerhub-tags-{web,node,php}.json`
- Previous-session companion report (deeper per-tag detail + Dockerfile reconstructions): `recon-blockpit/docker/DOCKER-FINDINGS.md`
- Inventory: `recon-blockpit/docker/INVENTORY.md`
- Image config blobs (ENV, history, layer digests): `recon-blockpit/docker/configs/*.json`
- Raw secrets candidate list (positive + negative): `recon-blockpit/docker/secrets-candidates.txt`
- New hostnames found: `recon-blockpit/docker/new-hosts-from-docker.txt` (none in-scope)
