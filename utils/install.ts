import type {RouteLocationNormalized} from '#vue-router'

export function useInstallComplete(to?: RouteLocationNormalized) {
    const config = useRuntimeConfig()
    const settings = useSettings()
    const route = to || useRoute()

    return computed(() => !(route.query.install == 'true' || settings.installStep == 0) || settings.installStep >= config.public.installStepCount)
}