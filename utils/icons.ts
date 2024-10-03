export function useIconList({
    aliases = false,
    hidden = false,
    includePrefix = true,
    prefix = 'mdi',
    uncategorized = false,
} = {}) {
    const config = useRuntimeConfig()

    const offline = usePersistentRef<string[]>('iconList', [])
    const lastFetch = usePersistentRef<number>('iconListFetch', 0)

    const now = Date.now()
    const expired = now - lastFetch.value > 1000 * 60 * 60 * 24 * 5 // 5 days

    if (expired) {
        fetch(`${config.public.iconifyCollection}?prefix=${prefix}`).then(async response => {
            if (response.ok) {
                const data = await response.json()
                offline.value = [
                    ...(uncategorized ? data.uncategorized : []),
                    ...Object.values(data.categories).flat(),
                    ...(hidden ? data.hidden : []),
                    ...(aliases ? Object.keys(data.aliases) : []),
                ]
                lastFetch.value = now
            }
        })
    }
    return includePrefix ? computed(() => offline.value.map(v => prefix + ':' + v)) : offline
}