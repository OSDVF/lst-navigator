import * as Sentry from '@sentry/nuxt'

export default defineEventHandler(async (event) => {
    Sentry.setExtra('event', event)
})
