// middleware/install.global.ts
export default defineNuxtRouteMiddleware(async (to) => {
    if (import.meta.server || import.meta.prerender) {
        return
    }

    const installComplete = useInstallComplete(to)
    const settings = useSettings()

    if (!installComplete.value && !to.name?.toString().includes('update') && !to.path?.toString().includes('install')) {
        setTimeout(() => navigateTo({
            path: '/install/' + settings.installStep,
            query: {
                ...to.query,
                to: to.fullPath,
            },
            force: true,
            replace: true,
        }), 0)
    }
})
