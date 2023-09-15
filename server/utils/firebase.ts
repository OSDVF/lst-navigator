import { App, initializeApp } from 'firebase-admin/app'
import type { Nitro } from 'nitropack'
import type { Nuxt } from '@nuxt/schema'
let app : App | null
export default function useFirebase (init?: {nitro?: Nitro, nuxt?: Nuxt}) {
    const { nitro, nuxt } = init ?? {}
    const config = nitro?.options.runtimeConfig ?? nuxt?.options.runtimeConfig ?? useRuntimeConfig()
    if (!app && config.vuefire?.options) {
        app = initializeApp(config.vuefire.options.config)
    }
    return app
}
