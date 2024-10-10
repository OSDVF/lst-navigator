import { skipHydrate } from 'pinia'
import { LocalKey, LocalStorage } from 'ts-localstorage'
import type { UnwrapRef } from 'vue'

export function usePersistentRef<T>(name: string, defaultValue: T) {
    const key = new LocalKey<UnwrapRef<T>, true>(name, toRaw(defaultValue) as UnwrapRef<T>, {
        hasDefaultValue: true,
    })
    const internalRef = ref(toRaw(defaultValue))
    if (typeof localStorage !== 'undefined') {
        internalRef.value = LocalStorage.getItem(key)
    }
    const app = useNuxtApp()
    const hydrate = () => {
        if (typeof localStorage !== 'undefined') {
            const storedVal = LocalStorage.getItem(key)
            if (storedVal !== internalRef.value) {
                internalRef.value = storedVal
                if (import.meta.dev) {
                    console.log('Hydrated', name, storedVal)
                }
            }
        }
        triggerRef(internalRef)
    }
    if (getCurrentInstance()) {
        onMounted(hydrate)
    } else {
        app.hook('app:mounted', hydrate)
    }
    watch(internalRef, (newValue) => {
        LocalStorage.setItem(key, isRef(newValue) ? newValue.value as UnwrapRef<T> : newValue)
        if (import.meta.dev) {
            console.log('Persisted', name, newValue)
        }
    }, {
        deep: true,
    })
    return skipHydrate(internalRef)
}
