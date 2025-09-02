// https://nuxt.com/docs/api/configuration/nuxt-config
import fs from 'fs'
import firebaseConfig from './firebase.json'

import {
    installStepCount,
    commitMessageTime,
    commitHash,
    compileTime,
    compileTimeZone,
} from './utils/constants'

const isDevMode = process.env.NODE_ENV !== 'production'
const prerenderDays = parseInt(process.env.PRERENDER_DAYS ?? '0') || 0

const messagingConfig = {
    notifications_title: process.env.VITE_APP_SHORT_NAME ?? 'Upomínka z aplikace',
    notifications_body: process.env.VITE_APP_DEFAULT_NOTIFICATION_BODY,
    notifications_image: process.env.VITE_APP_DEFAULT_NOTIFICATION_IMAGE,
    notifications_icon: process.env.VITE_APP_DEFAULT_NOTIFICATION_ICON,
    notifications_vapidKey: process.env.VAPID_PUBLIC,
}

const defaultMaskColor = '#fbce70ff'
const defaultThemeColor = '#ffffff'

if (typeof process.env.VITE_APP_SELECTED_EVENT_COLLECTION === 'undefined' && !process.argv.includes('prepare')) {
    console.error('VITE_APP_SELECTED_EVENT_COLLECTION is not set')
    process.exit(1)
}

const config = defineNuxtConfig({
    app: {
        head: {
            title: process.env.APP_SHORT_NAME,
            link: [
                { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96x96.png' },
                { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
                { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
                { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: process.env.MASK_COLOR ?? defaultMaskColor },
            ],
            meta: [
                { name: 'viewport', content: 'width=device-width, initial-scale=1, user-scalable=no' },
                { name: 'msapplication-TileColor', content: process.env.MASK_COLOR ?? defaultMaskColor },
                { name: 'apple-mobile-web-app-capable', content: 'yes' },
                { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
                { name: 'apple-mobile-web-app-title', content: process.env.APP_SHORT_NAME },
                { name: 'application-name', content: process.env.APP_SHORT_NAME },
                { name: 'description', content: process.env.APP_DESCRIPTION },
                { name: 'format-detection', content: 'telephone=no' },
                { name: 'mobile-web-app-capable', content: 'yes' },
            ],
        },
    },
    build: {
        transpile: [
            'lru-cache',
        ],
    },
    compatibilityDate: '2025-01-30',
    css: [
        '~/assets/styles/_index.scss',
        '~/assets/styles/components.scss',
    ],
    devServerHandlers: [
        {
            route: '/__/auth/',
            async handler(event) {
                const questIndex = event.path.indexOf('?')
                if (['/iframe', '/handler'].includes(event.path.substring(0, questIndex === -1 ? undefined : questIndex))) {
                    event.headers.set('Content-Type', 'text/html; charset=utf-8')
                    event.headers.set('Cache-Control', 'no-store')
                    return event.respondWith(new Response(await fs.promises.readFile('./public/__/auth/handler', { encoding: 'utf-8' }), {
                        headers: {
                            'Content-Type': 'text/html',
                        },
                    }))
                }
            },
        },
    ],
    devtools: {
        enabled: process.env.NUXT_DEVTOOLS !== 'false',
        timeline: {
            enabled: true,
        },
    },
    experimental: {
        headNext: true,
        polyfillVueUseHead: false,
        payloadExtraction: false,
    },
    hooks: {
        'app:resolve'(app) {
            if(process.env.SENTRY_DISABLE == 'true') {
                app.plugins = app.plugins.filter((x) => !x.src.includes('sentry'))
            }
        },
        'build:manifest' (manifest) {
            const notWanted = ['sentry']
            // remove preload links
            for (const key in manifest) {
                const entry = manifest[key]
                entry.dynamicImports = entry.dynamicImports?.filter((x) => !notWanted.some((y) => x.includes(y)))
                entry.preload = entry.preload = false
                entry.prefetch = false
            }
        },
    },
    icon: {
        serverBundle: 'remote',
        provider: 'iconify',
    },
    ignore: [
        'maintenance/**',
    ],
    modules: [
        ...(process.env.SENTRY_DISABLE !== 'true' ? ['@sentry/nuxt/module'] : []),
        '@vite-pwa/nuxt',
        '@nuxt/icon',
        '@pinia/nuxt',
        'nuxt-vuefire',
        '@vueuse/nuxt',
        '@vueuse/motion/nuxt',
        'nuxt-scheduler',
        'nuxt-rating',
        '@nuxt/eslint',
        'nuxt-vitalizer',
    ],
    nitro: {
        prerender: {
            crawlLinks: false,
            failOnError: true,
            routes: [
                '/',
                '/feedback',
                '/info',
                '/login',
                '/schedule',
                '/settings',
                '/update',
                ...[...Array(prerenderDays).keys()].map((i) => `/schedule/${i}`),
            ],
        },
        esbuild: {
            options: {
                target: 'esnext',
            },
        },
    },
    pwa: {
        devOptions: isDevMode
            ? {
                enabled: true,
                type: 'classic',
            }
            : undefined,
        filename: 'sw.ts',
        pwaAssets: {
            injectThemeColor: false,
            config: true,
        },
        injectManifest: {
            globIgnores: [
                '**/__/**',
                '**/schedule/+([0-9])/*',//ignore the leaf level schedule pages
                '**/android/**',
                '**/ios/**',
                '**/windows11/**',
                '**/audio/silence.zip',
                '**/404',
            ],
            sourcemap: true,
            globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        },
        injectRegister: 'inline',
        manifest: {
            name: process.env.VITE_APP_NAME,
            short_name: process.env.VITE_APP_SHORT_NAME,
            start_url: './schedule?install=true',
            id: process.env.APP_ID,
            theme_color: process.env.THEME_COLOR ?? defaultThemeColor,
            description: process.env.APP_DESCRIPTION,
            background_color: process.env.BACKGROUND_COLOR ?? defaultThemeColor,
            icons: [
                {
                    src: 'pwa-64x64.png',
                    sizes: '64x64',
                    type: 'image/png',
                    purpose: 'any',
                },
                {
                    src: 'pwa-192x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any',
                },
                {
                    src: 'pwa-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any',
                },
            ],
        },
        srcDir: 'utils',
        strategies: 'injectManifest',
    },
    sourcemap: {
        client: true,
    },
    ...(process.env.SENTRY_DISABLE !== 'true' ? {
        sentry: {
            sourceMapsUploadOptions: {
                enabled: process.env.SENTRY_DISABLE !== 'true',
                org: process.env.SENTRY_ORG,
                project: process.env.SENTRY_PROJECT,
                authToken: process.env.SENTRY_AUTH_TOKEN,
            },
        },
    } : {}),
    routeRules: {
        '/clear': {
            headers: {
                [firebaseConfig.hosting.headers[0].headers[0].key]: firebaseConfig.hosting.headers[0].headers[0].value,
            },
        },
        '/admin/**': {
            prerender: false,
            static: false,
        },
        '/__/auth/handler': {
            headers: {
                'Content-Type': 'text/html',
            },
        },
        '/__/auth/iframe': {
            headers: {
                'Content-Type': 'text/html',
            },
        },
    },
    vite: {
        build: {
            target: 'esnext',
            modulePreload: false,
            minify: 'esbuild',
            rollupOptions: {
                output: {
                    manualChunks(id: string) {
                        if (id.toLowerCase().includes('@sentry')) { // the @ is important so plugins/sentry.*.ts is not included
                            return 'sentry'
                        }
                        if (id.toLowerCase().includes('firebase')) {
                            return 'firebase'
                        }
                    },
                },
            },
        },
        resolve: {
            alias: [
                {
                    find: 'path', replacement: 'path-browserify',
                },
                {
                    find: '@composi/idb/types', replacement: '@composi/idb/src/index.js',
                },
                ...(process.env.SENTRY_DISABLE === 'true' ? [{
                    find: '@sentry/nuxt', replacement: './dummy.ts',
                }] : []),
            ],
        },
        // revert chunk name
        $client: {
            build: {
                modulePreload: false,
                sourcemap: true,
                rollupOptions: {
                    output: {
                        chunkFileNames: '_nuxt/[name].[hash].js',
                        entryFileNames: '_nuxt/[name].[hash].js',
                    },
                },
            },
        },
    },
    vuefire: {
        emulators: {
            enabled: process.env.FIREBASE_EMULATOR === 'true',
        },
        config: {
            apiKey: process.env.VITE_APP_APIKEY,
            authDomain: process.env.VITE_APP_AUTHDOMAIN,
            projectId: process.env.VITE_APP_PROJECTID,
            storageBucket: process.env.VITE_APP_STORAGEBUCKET,
            appId: process.env.VITE_APP_APPID,
            measurementId: process.env.VITE_APP_MEASUREMENTID,
            ...(process.env.NOTIFICATIONS === 'true' ? { messagingSenderId: process.env.VITE_APP_MESSAGINGSENDERID } : {}),
        },
        auth: {
            enabled: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
            sessionCookie: !process.argv.includes('generate'),
        },
        appCheck: process.env.VITE_APP_RECAPTCHA && process.env.FIREBASE_APPCHECK !== 'false'
            ? {
                debug: isDevMode,
                key: process.env.VITE_APP_RECAPTCHA!,
                provider: 'ReCaptchaV3',
                isTokenAutoRefreshEnabled: true,
            }
            : undefined,
    },
    runtimeConfig: {
        public: {
            title: process.env.VITE_APP_SHORT_NAME,
            longName: process.env.VITE_APP_NAME,
            defaultEvent: process.env.VITE_APP_SELECTED_EVENT_COLLECTION,
            emulators: process.env.FIREBASE_EMULATOR === 'true',
            icon: process.env.ICON,
            imageCacheFirst: isDevMode,
            installStepCount,
            compileTime,
            compileTimeZone,
            commitMessageTime,
            commitHash,
            themeColor: process.env.THEME_COLOR ?? defaultThemeColor,
            welcome: process.env.WELCOME,
            signatureInfo: process.env.SIGNATURE_INFO,
            ENV: process.env.NODE_ENV ?? 'production',
            SENTRY_ENABLED: (process.env.NODE_ENV ?? 'production') === 'production',
            SENTRY_DSN: process.env.VITE_APP_DSN,
            SENTRY_TRACE_PROPAGATION_TARGET: process.env.VITE_APP_TRACE_PROPAGATION_TARGET,
            debugUser: process.env.VITE_APP_DEBUG_USER,
            ssrAuthEnabled: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            storageEnabled: !!process.env.VITE_APP_STORAGEBUCKET,
            supportEmail: process.env.SUPPORT_EMAIL,
            iconifyCollection: process.env.ICONIFY_COLLECTION,
            maxSuggestions: process.env.MAX_SUGGESTIONS,
            logWrites: process.env.LOG_WRITES === 'true',
            ...(process.env.NOTIFICATIONS === 'true' ? messagingConfig : {}),
        },
    },
    ssr: true,
})

fs.writeFileSync('./utils/swenv.js', `export default ${JSON.stringify({
    firebase: config.vuefire?.config,
    messaging: messagingConfig,
    commitHash,
    sentry: {
        enabled: config.runtimeConfig!.public!.SENTRY_ENABLED,
        autoSessionTracking: true,
        debug: process.env.NODE_ENV !== 'production',
        dsn: process.env.VITE_APP_DSN,
        release: commitHash,
        environment: process.env.NODE_ENV ?? 'production',
    },
    hostnames: [
        'localhost',
        config.vuefire!.config.authDomain,
        'api.iconify.design',
    ],
})}`)

export default config
