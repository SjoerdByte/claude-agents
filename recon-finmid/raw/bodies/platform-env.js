window._env_ = {
  ENV: 'live',
  KEYCLOAK_URL: 'https://auth.finmid.com/auth',
  KEYCLOAK_REALM: 'platform',
  KEYCLOAK_CLIENT_ID: 'platform-ui',
  SENTRY_DSN:
    'https://4b1c03daa770496ea47842993243bfa3@o1053131.ingest.sentry.io/6771581',
  SENTRY_RATE: 0.5, // controls performance tracing in Sentry. between 0 and 1

  GATEWAY_URL: 'https://platform.gateway.finmid.com',

  BACKOFFICE_SANDBOX_URL: '', // not to be used on live env.

  FORMAT_MONEY_DEFAULT_MINIMUM_FRACTION_DIGITS: 2,

  POSTHOG_KEY: 'phc_yAikBwmVcfMeSO4ozsg8nuQVP901j2rQ8oO4Vv69BaQ',
};
