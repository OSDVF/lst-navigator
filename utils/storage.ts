import { LocalKey, LocalStorage } from 'ts-localstorage'

export function usePersistentRef<T>(name: string, defaultValue:T) {
    const key = new LocalKey<T>(name, defaultValue, {
        hasDefaultValue: true
    })
    const internalRef = ref(typeof localStorage === 'undefined' ? defaultValue : LocalStorage.getItem(key)!)
    watch(internalRef, (newValue) => {
        LocalStorage.setItem(key, isRef(newValue) ? newValue.value as T : newValue as T)
    })
    return internalRef
}
