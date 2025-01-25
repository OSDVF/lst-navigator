import * as Sentry from '@sentry/nuxt'

const config = useRuntimeConfig()

const sentryConfig: Partial<Sentry.BrowserOptions> = {
    enabled: config.public.SENTRY_ENABLED,
    debug: config.public.ENV !== 'production',
    dsn: config.public.SENTRY_DSN,
    release: config.public.commitHash,
    environment: config.public.ENV,
}
Sentry.init({
    ...sentryConfig,
    integrations: [Sentry.replayIntegration({
        _experiments: {
            captureExceptions: true,
        },
    }),
    Sentry.browserSessionIntegration(),
    Sentry.vueIntegration({
        tracingOptions: {
            trackComponents: true,
            hooks: ['activate', 'create', 'destroy', 'mount', 'update'],
        },
    })],
    // Capture Replay for 10% of all sessions,
    // plus for 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
})