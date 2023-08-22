export default (process.client
    ? (await import('localforage')).default
    : {
        getItem<T>() {
            return Promise.resolve() as Promise<T>
        },
        setItem() {
            return Promise.resolve()
        }
    }) as typeof import('localforage')
