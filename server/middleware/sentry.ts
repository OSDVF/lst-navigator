export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()

    const Sentry = await import('@sentry/node')
    Sentry.init({
        enabled: config.public.SENTRY_ENABLED,
        debug: config.public.ENV !== 'production',
        dsn: config.public.SENTRY_DSN,
        release: config.public.commitHash,
        environment: config.public.ENV,
    })

    Sentry.configureScope((scope) => {
        scope.setExtra('event', event)
    })
})
