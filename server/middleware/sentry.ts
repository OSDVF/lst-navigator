import * as Sentry from '@sentry/nuxt'

export default defineEventHandler(async (event) => {
    if(process.env.SENTRY_DISABLED !== 'true') {
        Sentry.setExtra('event', event)
    }
})
