# F022 - Multi-Environment Configuration Leaked in Production SPA Bundle

## Summary

| Field | Value |
|-------|-------|
| Severity | Medium |
| CVSS 3.1 | 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N) |
| OWASP | A05:2021 - Security Misconfiguration |
| Endpoint | https://app.spiko.io/assets/EnvProvider-DoYzqs6M.js |
| Status | Confirmed |

## Description

The production SPA bundle at app.spiko.io ships complete configuration objects for all environments (production, staging, preprod, development) in a single JavaScript file. This exposes internal infrastructure details, API keys, blockchain addresses, and feature flags for non-production environments to any visitor.

## Exposed Data Per Environment

### All Environments
- Full API endpoint URLs (investor-api, public-api, auth)
- Ory SDK URLs for each auth realm
- WalletConnect project IDs (4 different IDs)
- Redemption Ethereum wallet addresses
- Turnstile CAPTCHA site keys (signup and signin variants)
- reCAPTCHA v3 site keys
- Typeform form IDs per locale
- Feature flag states (darkMode, euroDirectDebit, selfServiceEmailChange, socialSignInProviders, ukAml, etc.)
- Hidden share class names
- SAFO stablecoin subscriber configuration

### Staging-Specific Exposure
- Tolgee translation API key: tgpak_gfpw...gi (read-only but still a credential)
- Social sign-in providers: ["google", "apple"] (production only has Google)
- safoStablecoinSubscribers: "everyone" (production restricts to specific UUID)

### Development Environment
- Local development ports and URLs (localhost:4455, :4000, :4500, :4200)
- Development WalletConnect project ID
- Test Ethereum addresses

## Impact

1. Complete infrastructure mapping for all environments without any probing
2. Staging API key exposure (Tolgee)
3. Feature flag differences reveal what's being tested before production deployment
4. Blockchain addresses for all environments may allow transaction monitoring
5. Knowledge of which social providers are enabled per environment aids targeted attacks
6. Development configuration reveals internal architecture and port assignments

## Proof

```bash
curl -s https://app.spiko.io/assets/EnvProvider-DoYzqs6M.js | grep -oP 'investorApiUrl:[^,}]+' | head -5
```

Output:
```
investorApiUrl:https://investor-api.spiko.io
investorApiUrl:https://investor-api.staging.spiko.io
investorApiUrl:https://investor-api.preprod.spiko.io
investorApiUrl:http://localhost:4455
```

WalletConnect project IDs:
```
Production: 0b9ae7ee34b0ce77c81cf9b50f60c169
Staging:    561cf255c3cd6bfed8f76cc3eece99ae
Preprod:    8239ea4612ce84fca8dd3ae09ec87613
Dev:        df093874f76c64ea0bf2371da5f20fee
```

## Remediation

1. Ship only the active environment's configuration in each build (use build-time environment variable injection)
2. Remove development configuration entirely from production bundles
3. Remove Tolgee API key from client-side code
4. Consider moving feature flags to a server-side evaluation model
