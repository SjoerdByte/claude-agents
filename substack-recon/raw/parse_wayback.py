#!/usr/bin/env python3
"""Parse Wayback CDX JSON output and extract hosts + interesting endpoints."""
import json
import os
import sys
import re
from urllib.parse import urlparse, unquote

RAW_DIR = "/home/user/claude-agents/substack-recon/raw"
OUT_SUBDOMAINS = "/home/user/claude-agents/substack-recon/subdomains/wayback.txt"
OUT_ENDPOINTS = "/home/user/claude-agents/substack-recon/subdomains/wayback_endpoints.txt"

ALLOWED_SUFFIXES = (
    ".substack.com",
    ".substackcdn.com",
    ".substack.pub",
    ".substack.net",
)
# Also allow the apex domains themselves
APEX_HOSTS = {"substack.com", "substackcdn.com", "substack.pub", "substack.net"}

# Patterns to classify "interesting" endpoints
INTERESTING_PATH = re.compile(
    r"(/api/|/admin|/internal|/debug|/graphql|/_next/|/\.well-known/|/wp-|/__|"
    r"/oauth|/callback|/download|/export|/webhook|/stripe|/paypal|/billing|"
    r"/subscription|/session|/token|/auth|/login|/signup|/register|/user|"
    r"/account|/profile|/api-|/ajax|/health|/metric|/status|/version|/config|"
    r"/env|/key|/secret|/token|/sso|/saml|/jwt|/proxy|/upload|/assets/|"
    r"/static|/build|/dist|/node_modules|/robots\.txt|/sitemap)",
    re.IGNORECASE,
)
INTERESTING_EXT = re.compile(
    r"\.(json|env|yaml|yml|sql|bak|log|conf|config|ini|xml|rss|txt|js\.map|map|"
    r"zip|tar|tgz|gz|rar|pem|key|crt|cer|p12|pfx|csv|xls|xlsx|doc|docx|pdf|"
    r"old|orig|swp|save|~)$",
    re.IGNORECASE,
)

def extract_host(url: str):
    try:
        # Clean up weird characters in CDX URLs
        url = url.strip().strip('"')
        if not url:
            return None, None
        if "://" not in url:
            url = "http://" + url
        p = urlparse(url)
        host = p.hostname
        if not host:
            return None, None
        host = host.lower().strip('.')
        # Drop port if any
        host = host.split(':')[0]
        # Validate it's a plausible hostname (not spam)
        if not re.match(r'^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?$', host):
            return None, None
        if len(host) > 253:
            return None, None
        return host, p.path or "/"
    except Exception:
        return None, None

def is_allowed_host(host: str) -> bool:
    if not host:
        return False
    if host in APEX_HOSTS:
        return True
    return host.endswith(ALLOWED_SUFFIXES)

def iter_urls_from_cdx(path: str):
    """CDX JSON format is a list of lists [[header], [url], ...]"""
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            data = json.load(f)
        if not isinstance(data, list):
            return
        for i, row in enumerate(data):
            if i == 0:
                continue  # header row
            if isinstance(row, list) and row:
                yield str(row[0])
            elif isinstance(row, str):
                yield row
    except Exception as e:
        sys.stderr.write(f"parse error for {path}: {e}\n")

def iter_urls_from_cc(path: str):
    """CommonCrawl index is JSONL."""
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('<'):
                    continue
                try:
                    obj = json.loads(line)
                    u = obj.get('url')
                    if u:
                        yield u
                except Exception:
                    continue
    except Exception as e:
        sys.stderr.write(f"CC parse error for {path}: {e}\n")

def main():
    hosts = set()
    endpoints = []  # list of (score, url)

    files = []
    for name in os.listdir(RAW_DIR):
        if name.startswith('wayback-') and name.endswith('.json'):
            files.append((os.path.join(RAW_DIR, name), 'cdx'))
        if name.startswith('commoncrawl-substack') and name.endswith('.jsonl'):
            files.append((os.path.join(RAW_DIR, name), 'cc'))

    total_urls = 0
    for path, kind in files:
        iter_fn = iter_urls_from_cdx if kind == 'cdx' else iter_urls_from_cc
        for url in iter_fn(path):
            total_urls += 1
            host, path_only = extract_host(url)
            if not host:
                continue
            if not is_allowed_host(host):
                continue
            hosts.add(host)
            # Score endpoints
            u_lower = url.lower()
            path_lower = (path_only or "").lower()
            # Trim very long URLs
            display_url = url if len(url) < 400 else url[:400] + "...TRUNC"
            score = 0
            if INTERESTING_PATH.search(path_lower):
                score += 10
            if INTERESTING_EXT.search(path_lower):
                score += 8
            # Admin / internal strong hints
            for keyword in ('admin', 'internal', 'debug', 'graphql', '.env',
                            '.sql', '.bak', 'swagger', 'openapi', 'phpinfo',
                            '.git/', '.ds_store', 'backup', 'secret', 'token='):
                if keyword in u_lower:
                    score += 5
            if score > 0:
                endpoints.append((score, display_url))

    # Dedupe endpoints by URL, keep max score
    endpoint_map = {}
    for score, url in endpoints:
        if url not in endpoint_map or endpoint_map[url] < score:
            endpoint_map[url] = score

    sorted_endpoints = sorted(endpoint_map.items(), key=lambda x: (-x[1], x[0]))

    # Save hosts
    os.makedirs(os.path.dirname(OUT_SUBDOMAINS), exist_ok=True)
    with open(OUT_SUBDOMAINS, 'w') as f:
        for h in sorted(hosts):
            f.write(h + "\n")

    # Save endpoints (max 2000 lines)
    with open(OUT_ENDPOINTS, 'w') as f:
        for url, score in sorted_endpoints[:2000]:
            f.write(f"{score}\t{url}\n")

    print(f"total_urls_scanned={total_urls}")
    print(f"unique_hosts={len(hosts)}")
    print(f"interesting_endpoints={len(endpoint_map)}  (saved max 2000)")

    # Return top 20 host preview
    print("--- top hosts preview ---")
    for h in list(sorted(hosts))[:40]:
        print(h)
    print("--- top endpoints preview ---")
    for url, score in sorted_endpoints[:30]:
        print(f"{score}\t{url}")

if __name__ == '__main__':
    main()
