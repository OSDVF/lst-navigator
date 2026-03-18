import type { RouteLocationNormalized } from '#vue-router'

export function useInstallComplete(to?: RouteLocationNormalized) {
    const config = useRuntimeConfig()
    if (!config.public.featureInstallWizard) {
        return computed(() => true)
    }

    const settings = useSettings()
    const route = to || useRoute()

    return computed(() => !(route.query.install == 'true' || settings.installStep.value == 0) || settings.installStep.value >= config.public.installStepCount)
}