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
    const eventTitle = computed(() => metaDoc.value?.title)
    const eventSubtitle = computed(() => metaDoc.value?.subtitle)
    const eventDescription = computed(() => metaDoc.value?.description)
    const eventWeb = computed(() => metaDoc.value?.web)
    const networkError = computed(() => metaDoc.error.value)
    const metaLoading = computed(() => metaDoc.pending.value)
    const groupNames = computed(() => metaDoc.value?.groups ?? [])

    const scheduleDocument = shallowRef(getDocument('schedule'))
    const scheduleDoc = shallowRef(useDocument(scheduleDocument.value, { once: true, snapshotListenOptions: { includeMetadataChanges: false } }))
    const scheduleParts = computed(() => scheduleDoc.value?.parts)
    const scheduleLoading = computed(() => scheduleDoc.pending.value)

    return {
        eventDbName,
        getDocument,
        metaDocument,
        firebaseStorage,
        eventImage,
        eventTitle,
        eventSubtitle,
        eventDescription,
        eventWeb,
        networkError,
        metaLoading,
        scheduleParts,
        scheduleLoading,
        groupNames
    }
})
