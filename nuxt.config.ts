// https://nuxt.com/docs/api/configuration/nuxt-config
import fs from 'fs'
import childProcess from 'child_process'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import topLevelAwait from 'vite-plugin-top-level-await'
import { icons } from './icons.json'

const installStepCount = fs.readdirSync('./pages/install').length
const commitMessageTime = childProcess.execSync('git log -1 --pretty="%B %cI"').toString().trim()
const commitHash = childProcess.execSync('git rev-parse HEAD').toString().trim()
const compileTime = new Date().getTime().toString()
const compileTimeZone = new Date().getTimezoneOffset().toString()
const isDevMode = process.env.NODE_ENV !== 'production'

const config = defineNuxtConfig({
    app: {
        head: {
            title: process.env.APP_SHORT_NAME,
            link: [
                { rel: 'icon', type: 'image/png', href: '/android/android-launchericon-96-96.png' }
            ],
            meta: [
                { name: 'viewport', content: 'width=device-width, initial-scale=1, user-scalable=no' }
            ]
        }
    },
    build: {
        transpile: [
            'lru-cache'
        ]
    },
    css: [
        '~/assets/styles/base.scss',
        '~/assets/styles/components.scss'
    ],
    devtools: {
        enabled: process.env.NUXT_DEVTOOLS !== 'false',
        timeline: {
            enabled: true
        }
    },
    modules: [
        '@vite-pwa/nuxt',
        'nuxt-icon',
        '@pinia/nuxt',
        'nuxt-vuefire',
        '@vueuse/nuxt',
        '@vueuse/motion/nuxt',
        'nuxt-scheduler',
        'nuxt-rating'
    ],
    pwa: {
        devOptions: isDevMode
            ? {
                enabled: true,
                type: 'classic'
            }
            : undefined,
        filename: 'sw.ts',
        includeAssets: ['__/**'],
        injectManifest: {
            rollupFormat: 'iife',
            globIgnores: [
                '**/node_modules/**/*',
                '**/public/audio/silence.zip'
            ]
        },
        injectRegister: 'inline',
        manifest: {
            name: process.env.VITE_APP_NAME,
            short_name: process.env.VITE_APP_SHORT_NAME,
            icons
        },
        srcDir: 'utils',
        strategies: 'injectManifest',
        workbox: {
            sourcemap: true
        }
    },
    sourcemap: {
        server: true,
        client: true
    },
    vite: {
        build: {
            sourcemap: true
        },
        plugins: [
            topLevelAwait({
                // The export name of top-level await promise for each chunk module
                promiseExportName: '__tla',
                // The function to generate import names of top-level await promise in each chunk module
                promiseImportName: (i: any) => `__tla_${i}`
            }),
            sentryVitePlugin({
                authToken: process.env.SENTRY_AUTH_TOKEN,
                org: process.env.SENTRY_ORG,
                project: process.env.SENTRY_PROJECT,
                disable: isDevMode || !!process.env.SENTRY_DISABLE,
                release: {
                    name: commitHash
                }
            })
        ]
    },
    vuefire: {
        emulators: {
            enabled: process.env.FIREBASE_EMULATOR === 'true'
        },
        config: {
            apiKey: process.env.VITE_APP_APIKEY,
            authDomain: process.env.VITE_APP_AUTHDOMAIN,
            projectId: process.env.VITE_APP_PROJECTID,
            storageBucket: process.env.VITE_APP_STORAGEBUCKET,
            messagingSenderId: process.env.VITE_APP_MESSAGINGSENDERID,
            appId: process.env.VITE_APP_APPID,
            measurementId: process.env.VITE_APP_MEASUREMENTID
        },
        auth: true,
        appCheck: process.env.VITE_APP_RECAPTCHA && process.env.FIREBASE_APPCHECK !== 'false'
            ? {
                debug: isDevMode,
                key: process.env.VITE_APP_RECAPTCHA!,
                provider: 'ReCaptchaV3',
                isTokenAutoRefreshEnabled: true
            }
            : undefined
    },
    runtimeConfig: {
        public: {
            title: process.env.VITE_APP_SHORT_NAME,
            longName: process.env.VITE_APP_NAME,
            defaultEvent: process.env.VITE_APP_SELECTED_EVENT_COLLECTION,
            emulators: process.env.FIREBASE_EMULATOR === 'true',
            imageCacheFirst: isDevMode,
            installStepCount,
            compileTime,
            compileTimeZone,
            commitMessageTime,
            commitHash,
            messagingConfig: {
                title: process.env.VITE_APP_SHORT_NAME,
                body: process.env.VITE_APP_DEFAULT_NOTIFICATION_BODY,
                image: process.env.VITE_APP_DEFAULT_NOTIFICATION_IMAGE,
                icon: process.env.VITE_APP_DEFAULT_NOTIFICATION_ICON,
                vapidKey: process.env.VAPID_PUBLIC
            },
            ENV: process.env.NODE_ENV ?? 'production',
            SENTRY_ENABLED: (process.env.NODE_ENV ?? 'production') === 'production',
            SENTRY_DSN: process.env.VITE_APP_DSN,
            SENTRY_TRACE_PROPAGATION_TARGET: process.env.VITE_APP_TRACE_PROPAGATION_TARGET,
            debugUser: process.env.VITE_APP_DEBUG_USER
        }
    },
    ssr: true
})

fs.writeFileSync('./utils/swenv.js', `export default ${JSON.stringify({
    firebase: config.vuefire?.config,
    messaging: config.runtimeConfig!.public!.messagingConfig,
    commitHash
})}`)

export default config
