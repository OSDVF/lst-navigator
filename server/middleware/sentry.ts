import * as Sentry from '@sentry/node'

export default defineEventHandler((event) => {
    const config = useRuntimeConfig()

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
