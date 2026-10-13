#!/usr/bin/env python3
"""Final parse: hosts + interesting endpoints from all wayback files."""
import json
import os
import re
from urllib.parse import urlparse

RAW_DIR = "/home/user/claude-agents/substack-recon/raw"
OUT_SUBDOMAINS = "/home/user/claude-agents/substack-recon/subdomains/wayback.txt"
OUT_ENDPOINTS = "/home/user/claude-agents/substack-recon/subdomains/wayback_endpoints.txt"

ALLOWED_SUFFIXES = (
    ".substack.com",
    ".substackcdn.com",
    ".substack.pub",
    ".substack.net",
)
APEX_HOSTS = {"substack.com", "substackcdn.com", "substack.pub", "substack.net"}

INTERESTING_PATH = re.compile(
    r"(/api/|/admin|/internal|/debug|/graphql|/_next/|/\.well-known/|/wp-|/__|"
    r"/oauth|/callback|/download|/export|/webhook|/stripe|/paypal|/billing|"
    r"/subscription|/session|/token|/auth|/login|/signup|/register|"
    r"/account|/profile|/api-|/ajax|/health|/metric|/status|/version|/config|"
    r"/env|/sso|/saml|/jwt|/proxy|/upload|/robots\.txt|/sitemap)",
    re.IGNORECASE,
)
INTERESTING_EXT = re.compile(
    r"\.(json|env|yaml|yml|sql|bak|log|conf|config|ini|xml|rss|js\.map|"
    r"zip|tar|tgz|gz|rar|pem|key|crt|cer|p12|pfx|csv|xls|xlsx|doc|docx|pdf|"
    r"old|orig|swp|save|~)$",
    re.IGNORECASE,
)

def extract_host(url: str):
    try:
        url = url.strip().strip('"')
        if not url:
            return None, None
        if "://" not in url:
            url = "http://" + url
        p = urlparse(url)
        host = p.hostname
        if not host:
            return None, None
        host = host.lower().strip('.').split(':')[0]
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
    return host in APEX_HOSTS or host.endswith(ALLOWED_SUFFIXES)

def iter_urls_from_json(path: str):
    try:
        with open(path, errors='replace') as f:
            data = json.load(f)
        if not isinstance(data, list):
            return
        for i, row in enumerate(data):
            if i == 0:
                continue
            if isinstance(row, list) and row:
                yield str(row[0])
            elif isinstance(row, str):
                yield row
    except Exception:
        return

def iter_urlkeys_as_hosts(path: str):
    """SURT urlkey like 'com,substack,sub)/path' -> yield synthetic URL."""
    with open(path, errors='replace') as f:
        for line in f:
            line = line.strip()
            if not line or ')' not in line:
                continue
            if line.startswith('<'):
                continue
            if '[' in line or '{' in line:
                continue
            host_rev, _, path_part = line.partition(')')
            parts = host_rev.split(',')
            if not parts:
                continue
            host = '.'.join(reversed(parts))
            yield f"https://{host}{path_part}"

def main():
    hosts = set()
    endpoints = []
    total = 0

    for name in sorted(os.listdir(RAW_DIR)):
        full = os.path.join(RAW_DIR, name)
        if name.startswith('wayback-'):
            # Try JSON first; if it looks like SURT lines, fall through
            urls_iter = None
            try:
                with open(full) as f:
                    first = f.read(2).strip()
                if first.startswith('['):
                    urls_iter = iter_urls_from_json(full)
                elif ',' in first or first.isalpha():
                    urls_iter = iter_urlkeys_as_hosts(full)
            except Exception:
                continue
            if urls_iter is None:
                continue
            for url in urls_iter:
                total += 1
                host, path_only = extract_host(url)
                if not host or not is_allowed_host(host):
                    continue
                hosts.add(host)
                u_lower = url.lower()
                path_lower = (path_only or "").lower()
                score = 0
                if INTERESTING_PATH.search(path_lower):
                    score += 10
                if INTERESTING_EXT.search(path_lower):
                    score += 8
                for keyword in ('/admin', 'internal', '/debug', '/graphql', '.env',
                                '.sql', '.bak', 'swagger', 'openapi', 'phpinfo',
                                '.git/', 'backup', 'token=', 'secret=', 'access_token',
                                'api_key', '.well-known'):
                    if keyword in u_lower:
                        score += 5
                if score > 0:
                    display = url if len(url) < 500 else url[:500] + "...TRUNC"
                    endpoints.append((score, display))

    # Dedupe + sort endpoints
    endpoint_map = {}
    for score, url in endpoints:
        if url not in endpoint_map or endpoint_map[url] < score:
            endpoint_map[url] = score
    sorted_eps = sorted(endpoint_map.items(), key=lambda x: (-x[1], x[0]))

    os.makedirs(os.path.dirname(OUT_SUBDOMAINS), exist_ok=True)
    with open(OUT_SUBDOMAINS, 'w') as f:
        for h in sorted(hosts):
            f.write(h + "\n")
    with open(OUT_ENDPOINTS, 'w') as f:
        for url, score in sorted_eps[:2000]:
            f.write(f"{score}\t{url}\n")

    print(f"total_urls={total}")
    print(f"unique_hosts={len(hosts)}")
    print(f"interesting_endpoints={len(endpoint_map)}")
    print(f"saved_endpoints={min(2000, len(sorted_eps))}")
    print("--- hosts ---")
    for h in sorted(hosts):
        print(h)

if __name__ == '__main__':
    main()
