import { type Query, getDocs, limit, orderBy, query, writeBatch, type Firestore, type CollectionReference  } from 'firebase/firestore'

function log() {
    const c = useRuntimeConfig()
    return c.public.logWrites
}

export async function deleteCollection(fs: Firestore, col: CollectionReference, batchSize: number) {
    if (log()) {
        console.log('Deleting collection ' + col.path)
    }
    const q = query(col, orderBy('__name__'), limit(batchSize))

    return new Promise<void>((resolve, reject) => {
        deleteQueryBatch(fs, q, resolve).catch(reject)
    })
}

async function deleteQueryBatch(fs: Firestore, query: Query, resolve: () => void) {
    if (!fs) { return }
    const snapshot = await getDocs(query)

    const batchSize = snapshot.size
    if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve()
        return
    }

    // Delete documents in a batch
    const batch = writeBatch(fs)
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
    })
    await batch.commit()

    // Recurse on the next process tick, to avoid
    // exploding the stack.
    nextTick(() => {
        deleteQueryBatch(fs, query, resolve)
    })
}