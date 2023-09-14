import { App, initializeApp } from 'firebase-admin/app'
import type { Nitro } from 'nitropack'
let app : App | null
export default function useFirebase (nitro?: Nitro) {
    const config = nitro ? nitro.options.runtimeConfig : useRuntimeConfig()
    if (!app) {
        app = initializeApp(config.vuefire.options.config)
    }
    return app
}
