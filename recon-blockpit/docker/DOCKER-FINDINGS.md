# Blockpit Docker Hub OSINT findings

Scope: `hub.docker.com/u/blockpit` org, 3 public repos, 13 tags (11 distinct amd64 image digests + 2 arm64 duplicates), all last pushed between 2019-04-01 and 2023-01-16. Pulled via raw Docker v2 registry API (`auth.docker.io` + `registry-1.docker.io`) without docker daemon. All manifests + config blobs saved; small (<10 KB) + a selection of mid-size layers extracted and inspected. Scratchpad fully purged after inspection; only sanitized configs + this write-up kept.

TL;DR: all 3 repos are **build/dev base images**, not application images. No application source, no `.env*`, no composer/package manifests, no live production credentials, no real TLS keys, no git remotes, no DB URLs. The only Blockpit-specific additions are an Apache vhost, a dev-grade `php-override.ini`, a dummy `example.com` self-signed TLS keypair reused across every tag, and (on `blockpit/php:8.1-latest`) a patch that disables the SPX PHP-profiler IP whitelist. All insecure-default findings are conditional on a production host actually inheriting from one of these base images unchanged - not confirmable without live probing (out of scope for this task).

## Per-image summary

| Image:tag | Arch | Size | Pulled | has_app_source | notable env vars | baked secrets | interesting URLs | risk |
|-----------|------|------|--------|----------------|------------------|---------------|------------------|------|
| blockpit/web:php-74 | amd64 | 276 MB | yes | no (empty /var/www/html/web/) | PHP 7.4.28, GPG_KEYS | 0 live | dev@florian-weinrich.com (ServerAdmin), blockpit.127.0.0.1.nip.io (ServerName) | Low: dev-mode php.ini + chmod 777 /var/www/html/ |
| blockpit/web:php-74-dev | amd64 | 243 MB | yes | no | PHP 7.4.16 | 0 live | same | Low: same, dev-tagged |
| blockpit/web:php-74-memcached | amd64 | 271 MB | yes | no | PHP 7.4.26 | 0 live | same | Low: same |
| blockpit/web:php-72 | amd64 | 253 MB | yes | no | PHP 7.2.13, PHP_MD5="" | 0 live | same | Low: same + EOL PHP 7.2 |
| blockpit/node:16 | amd64 | 379 MB | yes | no (empty /app/) | NODE 16.15.1, YARN 1.22.19 | 0 | - | Info: base image only, yarn/webpack/gulp globally |
| blockpit/node:14 | amd64 | 373 MB | yes | no | NODE 14.15.5, YARN 1.22.5 | 0 | - | Info: same |
| blockpit/node:12 | amd64 | 367 MB | yes | no | NODE 12.18.0, YARN 1.22.4 | 0 | - | Info: same |
| blockpit/node:11 | amd64 | 357 MB | yes | no | NODE 11.13.0, YARN 1.15.2 | 0 | - | Info: same, EOL node |
| blockpit/php:8.1-latest | amd64 | 227 MB | yes | no | PHP 8.1.8 | 0 live | same vhost + php-spx profiler compiled from NoiseByNorthwest/php-spx, patched to disable IP whitelist | Low-Medium (conditional): if production inherits unchanged, SPX profiler is world-accessible |
| blockpit/php:7.4-pgsql-latest | amd64 | 278 MB | yes | no | PHP 7.4.30 | 0 live | same + xdebug enabled | Low (conditional): xdebug in prod would leak debug data |
| blockpit/php:7.4-latest | amd64 | 275 MB | yes | no | PHP 7.4.28 | 0 live | same | Low: same |

Inventory, digests and sizes: see `INVENTORY.md`.

## Secret / credential candidates

| # | Image(s) | Path | Type | Live? | Severity guess |
|---|----------|------|------|-------|---------------|
| 1 | blockpit/php:8.1-latest | /tmp/disable_spx_ip_whitelist.patch (applied at build) | PHP SPX profiler access-control bypass (`check_access()` always returns 1). SPX is a lightweight profiler whose web UI exposes request params, PHP backtraces, SQL queries, file paths, memory. | Unknown. Would need live probing of any blockpit.io host returning X-Powered-By: PHP/8.1 for `?SPX_UI_URI=/` or `?SPX_KEY=`. | Hint only; if confirmed on prod -> High (information disclosure incl. runtime data). |
| 2 | all blockpit/web + blockpit/php tags | /usr/local/etc/php/conf.d/php-override.ini | display_errors=1, display_startup_errors=1, error_reporting=E_ALL | Unknown. Prod-only test: send a malformed query to a .php endpoint and check for a visible stacktrace or path. | Hint only; conditional Medium. |
| 3 | blockpit/php:7.4-pgsql-latest, 8.1-latest | docker-php-ext-enable xdebug (build history) | Xdebug extension compiled into base. Default xdebug.remote_host=127.0.0.1 so usually harmless unless xdebug.remote_connect_back / client_discovery_header are set. | Unknown. | Hint only; conditional Low. |
| 4 | all blockpit/web + blockpit/php tags | /var/www/server.key | RSA 2048 private key | Public-cert CN=example.com, O=OrgName, L=Leamington UK, IT Department. Standard Apache SSL tutorial sample, verbatim. Reused across every tag. **Not a Blockpit production key.** | NOT a finding. |
| 5 | blockpit/web + blockpit/php | RUN chmod -R 777 /var/www/html/ (build history) | world-writable DocumentRoot | Harmless in a container unless combined with bind-mounted host dir. | Info only. |

Known-non-findings honoured: no Firebase keys, no OAuth client IDs, no GCP project IDs raised as findings.

## Internal URLs / hostnames discovered

Only three distinct non-upstream hostnames surface anywhere in the layers:

- `blockpit.127.0.0.1.nip.io` - dev-only wildcard-DNS trick, resolves to 127.0.0.1. Not a Blockpit-controlled host. No cross-ref value.
- `dev@florian-weinrich.com` - email in Apache `ServerAdmin`. Confirms the Docker Hub pusher `florianweinrich` is from `florian-weinrich.com`, a contractor domain (already recorded as a pivot in index.json).
- `https://github.com/NoiseByNorthwest/php-spx.git` - public upstream, build-time clone. No value.

Zero new `*.blockpit.io` subdomains discovered. `new-hosts-from-docker.txt` therefore holds only the (non-blockpit) nip.io hostname for completeness.

## Pivot opportunities

- `dev@florian-weinrich.com` baked into the Apache ServerAdmin field of every web/php image. Already-known Docker Hub handle `florianweinrich` is now tied to the real contractor domain `florian-weinrich.com`. Low-value - this is OSINT only, the person is an external contractor rather than current Blockpit staff.
- `php-74-dev` was pushed by Docker Hub user `squeezedlight` (per prior session); contents are identical in shape to the `php-74` image pushed by `lukasfrank` - consistent with multiple contractors sharing the same base-image repo. No new email / handle leaks.
- No `.git` directory inside any inspected layer. No `git log` / `remote.origin.url` extractable.
- No SSH authorized_keys, no `id_rsa`, no `.aws/credentials`, no `.npmrc`, no `.docker/config.json`.
- Image labels: empty for every image. No `org.opencontainers.image.source` link back to a repo. No build-URL leak.

## Dockerfile reconstruction per image family

### blockpit/node:{11,12,14,16}

```
FROM node:<VERSION>-stretch (11) / -buster (12,14) / -bullseye (16)
RUN apt-get update && apt-get install apt-transport-https -y
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update && apt-get install yarn -y
RUN npm install -g webpack
RUN npm install -g webpack-cli
# node:11 only: yarn global add webpack-cli ; yarn global add gulp@3.9.1
WORKDIR /app
RUN echo '{"presets":["es2015"],"plugins":["transform-runtime"]}' > ./.babelrc
CMD ["bash"]
```
Note: these all stop at `/app` empty - no application code baked. Clear "build-time toolkit" image.

### blockpit/web:php-72 / php-74 / php-74-memcached / php-74-dev AND blockpit/php:7.4-latest / 7.4-pgsql-latest / 8.1-latest

```
FROM php:<VER>-apache  (php:7.2.13-apache / php:7.4.*-apache / php:8.1.8-apache)
RUN apt-get install apache2
RUN a2enmod http2 ssl headers
RUN docker-php-ext-configure gd --with-freetype-dir=/usr/include/ --with-jpeg-dir=/usr/include/; docker-php-ext-install -j$(nproc) gd intl mysqli pdo_mysql opcache zip bcmath sodium soap exif  (variations per tag)
# php-74-memcached only: + libmemcached-dev + pecl install memcached
# php-7.4-pgsql only: + libpq-dev + pdo_pgsql pgsql + docker-php-ext-enable xdebug
# php-8.1-latest only: + docker-php-ext-enable xdebug + ADD disable_spx_ip_whitelist.patch
#                     + docker-php-source extract
#                     + git clone https://github.com/NoiseByNorthwest/php-spx.git /usr/src/php/ext/spx --branch release/latest
#                     + cd /usr/src/php/ext/spx && git apply /tmp/disable_spx_ip_whitelist.patch
#                     + phpize && ./configure && make && make install
#                     + docker-php-ext-enable spx
RUN docker-php-ext-enable ssh2
ADD ./config/php/php-override.ini /usr/local/etc/php/conf.d/php-override.ini
RUN a2enmod rewrite
ADD ./config/apache/apache-config.conf /etc/apache2/sites-enabled/000-default.conf
RUN service apache2 restart
RUN chown -R www-data:www-data /var/www/html/
RUN chmod -R 777 /var/www/html/
RUN usermod -u 1000 www-data
RUN usermod -G www-data www-data
RUN curl -sL https://deb.nodesource.com/setup_11.x (php-72, php-74-dev) / setup_14.x (newer) | bash -
RUN apt-get install -y nodejs
# baked-in TLS: server.crt .csr .key under /var/www/ (dummy example.com, same across tags)
CMD ["apache2-foreground"]
```

## Deliverables

- `recon-blockpit/docker/INVENTORY.md` - tag inventory
- `recon-blockpit/docker/DOCKER-FINDINGS.md` - this file
- `recon-blockpit/docker/secrets-candidates.txt` - raw candidate list (also negative results)
- `recon-blockpit/docker/configs/*.json` - full config blobs for every image (env vars, history, layers)
- `recon-blockpit/docker/new-hosts-from-docker.txt` - new hosts (none in-scope)
- `recon-blockpit/raw/docker/*` - raw Docker Hub API responses
