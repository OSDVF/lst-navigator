import { captureException } from '@sentry/nuxt'
import { GoogleAuthProvider } from 'firebase/auth'
import { skipHydrate } from 'pinia'

export const applicationFormDocumentPrefix = 'https://docs.google.com/forms/d'
export const applicationFormShortUrlPrefix = 'https://forms.gle/'

const gapi = (import.meta.client ? await import('google-api-javascript-client') : { gapi: { client: {} } } as unknown as typeof import('google-api-javascript-client')).gapi
export const useGapi = defineStore('gapi', () => {
    const error = ref()
    const loaded = ref(false)
    const loading = ref(false)
    const config = useRuntimeConfig()
    const pickerLoaded = new Promise((res, rej) => {
        if (import.meta.browser) {
            gapi.load('picker', {
                callback: res,
                onerror: rej,
            })
        }
    })

    const cloud = useCloudStore()
    if (config.public.featureForms && cloud.user.hasAdminScopes) {
        load()
    }

    async function adminReauth() {
        if (!cloud.user.hasAdminScopes) {
            if (cloud.user.auth?.providerData[0].providerId != GoogleAuthProvider.PROVIDER_ID) {
                if (confirm(`Tato funkce je dostupná pouze s přihlášením přes Google účet. Chcete se od účtu ${cloud.user.info?.email} odhlásit a přihlásit k jinému?`)) {
                    await cloud.user.signOut()
                    navigateTo('/login?google&redirect=' + useRoute().fullPath)
                }
                return false
            }
            // re-auth with correct scopes
            await cloud.user.signIn(undefined, undefined, undefined, undefined, true)
        }
        return true
    }

    function load(): Promise<typeof gapi.client> {
        if (loaded.value) {
            return Promise.resolve(gapi.client)
        }
        loading.value = true

        return new Promise<typeof gapi.client>((resolve, reject) => gapi.load('client:auth2', {
            callback: async () => {
                try {
                    watch(() => cloud.user.adminAuth?.accessToken, token => gapi.client.setToken(token ? {
                        access_token: token,
                    } : null), { immediate: true })
                    gapi.client.setApiKey(config.public.vuefire!.config!.apiKey!)
                    if (!await adminReauth()) {
                        reject()
                        return
                    }

                    await gapi.client.load('https://forms.googleapis.com/$discovery/rest?version=v1')
                    await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest')
                    error.value = undefined
                    loaded.value = true
                    resolve(gapi.client)
                } catch (e) {
                    error.value = e
                    console.error('Error initializing GAPI:', e)
                    captureException(e)
                    reject(e)
                } finally {
                    loading.value = false
                }
            },
            onerror: reject,
        }))
    }

    async function buildPicker() {
        await pickerLoaded
        if (!await adminReauth()) {
            return
        }
        if (!cloud.user.adminAuth?.accessToken) {
            return
        }
        return new google.picker.PickerBuilder()
            .setOAuthToken(cloud.user.adminAuth.accessToken)
            .setDeveloperKey(config.public.vuefire!.config!.apiKey!)
            .setAppId(config.public.vuefire!.config!.appId!.split(':')[1])
    }

    return {
        adminReauth,
        buildPicker,
        error,
        loaded,
        loading,
        client: skipHydrate(load),
    }
})

export function extractFormIdFromURL(documentUrl: string) {
    const url = new URL(documentUrl)//https://docs.google.com/forms/d/1W.../edit
    const [_, _forms, paramName, ...params] = url.pathname.split('/')
    const idParamIndex = paramName == 'u' ? 2 : 0
    const documentId = params[idParamIndex]
    if (documentId == 'e') {// probably a responder Url
        return undefined
    }
    const action = params[idParamIndex + 1]
    if (action == 'viewform') {
        return undefined
    }
    return documentId
}

export const scopes = [
    'https://www.googleapis.com/auth/forms',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/forms.body',
    'https://www.googleapis.com/auth/forms.responses.readonly',
]