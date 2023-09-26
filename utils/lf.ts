const fallback = {
    get<T>(_key: string) {
        return Promise.resolve() as Promise<T>
    },
    set<T>(_key: string, _value: T) {
        return Promise.resolve()
    },
    remove(_key: string) {
        return Promise.resolve()
    }
}
export default (process.client
    ? (await import('@composi/idb' as any)).idb
    : fallback) as typeof fallback
