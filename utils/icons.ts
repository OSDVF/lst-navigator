export function useIconList({
    hidden = false,
    includePrefix = true,
    prefix = 'mdi',
    uncategorized = false,
} = {}) {
    const config = useRuntimeConfig()

    const offline = usePersistentRef<string[]>('iconList', [])
    console.log('Fetching icon list', config.public.iconifyCollection)
    fetch(`${config.public.iconifyCollection}?prefix=${prefix}`).then(async response => {
        if (response.ok) {
            const data = await response.json()
            offline.value = [
                ...(uncategorized ? data.uncategorized : []),
                ...Object.values(data.categories).flat(),
                ...(hidden ? data.hidden : []),
            ]
        }
    })
    return includePrefix ? computed(() => offline.value.map(v => prefix + ':' + v)) : offline
}