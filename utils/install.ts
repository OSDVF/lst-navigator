export function useInstallComplete() {
    const config = useRuntimeConfig()
    const route = useRoute()
    const settings = useSettings()

    return computed(() => !(route.query.install == 'true' || settings.installStep == 0) || settings.installStep >= config.public.installStepCount)
}