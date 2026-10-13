import re, pathlib
s = pathlib.Path('/home/user/claude-agents/recon-payflows/raw/luigi/index-bundle.js').read_text()

# Cognito user pool IDs look like eu-west-1_xxxxxx
pat = re.compile(r'[a-z]{2}-[a-z]+-[0-9]_[A-Za-z0-9]{6,}')
pools = set(pat.findall(s))
print('POOLS:', pools)

ident = re.compile(r'[a-z]{2}-[a-z]+-[0-9]:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
idents = set(ident.findall(s))
print('IDENTITIES:', idents)

# find lt definition
for m in re.finditer(r'(?:let|const|var|function)\s+lt\b', s):
    i = m.start()
    print('--- lt def at', i)
    print(s[i:i+800])
    print('===')

# search for sign-up endpoints
for m in re.finditer(r'cognito-idp\.[^\s"\'`]+', s):
    print('cognito-idp:', m.group(0))

# domain references
for m in re.finditer(r'oauthDomain[^,}]{0,120}', s):
    print('oauthDomain:', m.group(0))
