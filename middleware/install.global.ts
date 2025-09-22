import type { WatchHandle } from 'vue'

// middleware/install.global.ts
export default defineNuxtRouteMiddleware(async (to) => {
    if (import.meta.server || import.meta.prerender || import.meta.env.INSTALL_WIZARD === 'false') {
        return
    }
    const config = useRuntimeConfig()
    if(!config.public.installWizard) {
        return
    }

    const installComplete = useInstallComplete(to)
    const settings = useSettings()


    if (!installComplete.value &&
        !config.public.noInstallRedirect.some(u => to.name?.toString().includes(u)) &&
        !to.name?.toString().includes('update') && !to.path?.toString().includes('install')) {
        const app = useNuxtApp()
        let stop: WatchHandle | null
        stop = watch(app.$hydrated, h => {
            if (h) {
                setTimeout(() => navigateTo({
                    path: '/install/' + settings.installStep,
                    query: {
                        ...to.query,
                        to: to.fullPath,
                    },
                    force: true,
                    replace: true,
                }), 0)
                stop?.()
                stop = null
            }
        }, { immediate: true })
    }
})
