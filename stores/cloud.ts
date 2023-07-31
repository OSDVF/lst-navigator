import { defineStore } from 'pinia'
import { collection, doc, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { useFirebaseStorage, useStorageFileUrl } from 'vuefire'
import { ref as storageRef } from '@firebase/storage'

export const useCloudStore = defineStore('cloud', () => {
    const firebaseApp = useFirebaseApp()
    const firestore = initializeFirestore(firebaseApp, {
        localCache:
            persistentLocalCache(/* settings */{ tabManager: persistentMultipleTabManager() })
    })
    const firebaseStorage = useFirebaseStorage()
    const config = useRuntimeConfig()

    const eventDbName = ref(config.public.dbCollectionName)

    function getDocument(docName: string) {
        if (typeof eventDbName.value === 'undefined') {
            return null
        }
        return doc(collection(firestore, eventDbName.value), docName)
    }

    const metaDocument = shallowRef(getDocument('meta'))
    const metaDoc = shallowRef(useDocument(metaDocument.value, { once: true, snapshotListenOptions: { includeMetadataChanges: false } }))
    const eventImage = computed(() => metaDoc.value?.image
        ? useStorageFileUrl(storageRef(firebaseStorage, metaDoc.value?.image)).url.value
        : null)
    const eventTitle = shallowRef(metaDoc.value?.title)
    const eventSubtitle = shallowRef(metaDoc.value?.subtitle)
    const networkError = shallowRef(metaDoc.error.value)
    const networkLoading = computed(() => metaDoc.pending.value)

    return {
        eventDbName,
        getDocument,
        metaDocument,
        firebaseStorage,
        eventImage,
        eventTitle,
        eventSubtitle,
        networkError,
        networkLoading
    }
})
