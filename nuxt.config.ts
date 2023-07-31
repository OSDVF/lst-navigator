// https://nuxt.com/docs/api/configuration/nuxt-config
import { icons } from './icons.json'

export default defineNuxtConfig({
    ssr: false,
    devtools: {
        enabled: true,
        timeline: {
            enabled: true
        }
    },
    css: ['~/assets/styles/base.scss'],
    modules: [
        '@vite-pwa/nuxt',
        'nuxt-icon',
        '@pinia/nuxt',
        'nuxt-vuefire',
        '@vueuse/nuxt'
    ],
    pwa: {
        includeAssets: ['icon.jpg'],
        strategies: 'injectManifest',
        filename: 'sw.ts',
        manifest: {
            name: process.env.VITE_APP_NAME,
            short_name: process.env.VITE_APP_SHORT_NAME,
            icons
        }
    },
    vuefire: {
        config: {
            apiKey: process.env.VITE_APP_APIKEY,
            authDomain: process.env.VITE_APP_AUTHDOMAIN,
            projectId: process.env.VITE_APP_PROJECTID,
            storageBucket: process.env.VITE_APP_STORAGEBUCKET,
            messagingSenderId: process.env.VITE_APP_MESSAGINGSENDERID,
            appId: process.env.VITE_APP_APPID,
            measurementId: process.env.VITE_APP_MEASUREMENTID
        },
        appCheck: {
            debug: process.env.NODE_ENV !== 'production',
            isTokenAutoRefreshEnabled: true,
            provider: 'ReCaptchaV3',
            key: process.env.VITE_APP_RECAPTCHA!
        }
    },
    runtimeConfig: {
        public: {
            title: process.env.VITE_APP_SHORT_NAME,
            dbCollectionName: process.env.VITE_APP_SELECTED_EVENT_COLLECTION,
            imageCacheFirst: process.env.NODE_ENV !== 'production'
        }
    },
    app: {
        head: {
            title: process.env.APP_SHORT_NAME,
            link: [
                { rel: 'icon', type: 'image/png', href: '/android/android-launchericon-96-96.png' },
                // Add web app manifest
                { rel: 'manifest', href: '/manifest.webmanifest' }
            ]
        }
    }
})
