# Blockpit Docker Hub Public Image Inventory

Enumerated 2026-10-09 from `https://hub.docker.com/v2/repositories/blockpit/`.
Org `blockpit`: 3 public repositories, no READMEs on any repo. All images Linux.

| Repo | Tag | Arch | Size (MB) | Last Updated | Digest (short) | Notes |
|------|-----|------|-----------|--------------|----------------|-------|
| blockpit/web | php-74 | amd64 | 275.8 | 2022-04-06 | sha256:b0a70e95 | newest `web` tag |
| blockpit/web | php-74-memcached | amd64 | 270.6 | 2021-11-22 | sha256:01846f4a | memcached variant |
| blockpit/web | php-74-dev | amd64 | 243.2 | 2021-03-17 | sha256:2f81c678 | dev variant (highest likely to leak) |
| blockpit/web | php-72 | amd64 | 252.8 | 2019-04-01 | sha256:123efc8d | legacy PHP 7.2 |
| blockpit/node | 16 | amd64 | 379.4 | 2023-01-16 | sha256:8ee89a4e | newest overall |
| blockpit/node | 14 | amd64 | 373.4 | 2021-02-23 | sha256:821221e7 | |
| blockpit/node | 12 | amd64 | 367.2 | 2020-06-08 | sha256:1921bce4 | |
| blockpit/node | 11 | amd64 | 356.9 | 2019-09-04 | sha256:5bef079c | |
| blockpit/php | 8.1-latest / 8.1-20220801 | amd64,arm64 | 226.8 / 220.8 | 2022-08-01 | sha256:29360aec / sha256:6c5c0ccf | duplicate digest |
| blockpit/php | 7.4-pgsql-latest | amd64,arm64 | 278.3 / 271.7 | 2022-06-14 | sha256:e0fa6011 / sha256:565ac6c2 | PostgreSQL variant |
| blockpit/php | 7.4-latest / 7.4-20220407 | amd64,arm64 | 275.3 / 268.6 | 2022-04-07 | sha256:c2f152cd / sha256:607b6179 | duplicate digest |

Raw JSON: `raw/docker/blockpit-{web,node,php}-{repo,tags}.json`.

Distinct image/digest pairs to inspect (dedup `latest` aliases): 11 amd64 + 3 arm64 = 14 total; arm64 skipped (same source Dockerfile as the amd64 twin for the two tags that have both).
