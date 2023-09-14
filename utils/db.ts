export type KnownCollectionName = 'users' | 'events'
export const CollectionsList : KnownCollectionName[] = ['users', 'events']

export async function timeout<T>(prom: Promise<T>, time = 5000): Promise<T | void> {
    let timer: NodeJS.Timeout | null = null
    try {
        return await Promise.race([
            prom,
            new Promise<T>((_resolve, reject) => { timer = setTimeout(reject, time) })
        ])
    } finally {
        if (timer) { clearTimeout(timer) }
    }
}
