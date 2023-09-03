import { App, initializeApp } from 'firebase-admin/app'
let app : App | null
export default function useFirebase () {
    const config = useRuntimeConfig()
    if (!app) {
        app = initializeApp(config.vuefire.options.config)
    }
    return app
}
