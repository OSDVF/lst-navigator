import { LocalKey, LocalStorage } from 'ts-localstorage'
import type { UnwrapRef } from 'vue'

export function usePersistentRef<T>(name: string, defaultValue: T) {
    const key = new LocalKey<T>(name, defaultValue, {
        hasDefaultValue: true
    })
    let internalRef : Ref<UnwrapRef<T>>
    if (typeof localStorage !== 'undefined') {
        internalRef = ref(LocalStorage.getItem(key)!)
    }
    internalRef = ref(defaultValue)
    onMounted(() => {
        if (typeof localStorage !== 'undefined') {
            const storedVal = ref(LocalStorage.getItem(key)!).value
            if (storedVal !== internalRef.value) {
                internalRef.value = storedVal
            }
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
