import { App, initializeApp } from 'firebase-admin/app'
import type { Nitro } from 'nitropack'
import type { Nuxt } from '@nuxt/schema'
let app : App | null
export default function useFirebase (init: {nitro?: Nitro, nuxt?: Nuxt}) {
    const { nitro, nuxt } = init ?? {}
    const config = (nitro?.options.runtimeConfig.vuefire as any)?.options.config ?? (nuxt?.options as any).vuefire.config
    if (!app && config) {
        app = initializeApp(config)
    }
    return app
}
