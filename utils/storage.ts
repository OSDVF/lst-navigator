import { LocalKey, LocalStorage } from 'ts-localstorage'

export function usePersistentRef<T>(name: string, defaultValue: T) {
    const key = new LocalKey<T>(name, defaultValue, {
        hasDefaultValue: true
    })
    const internalRef = ref(defaultValue)
    onMounted(() => {
        if (typeof localStorage !== 'undefined') {
            internalRef.value = ref(LocalStorage.getItem(key)!).value
        }
        watch(internalRef, (newValue) => {
            LocalStorage.setItem(key, isRef(newValue) ? newValue.value as T : newValue as T)
        }, {
            deep: true
        })
        triggerRef(internalRef)
    })
    return internalRef
}
