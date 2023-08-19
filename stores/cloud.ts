import { defineStore } from 'pinia'
import { collection, doc, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setDoc } from 'firebase/firestore'
import { useFirebaseStorage, useStorageFileUrl } from 'vuefire'
import { ref as storageRef } from '@firebase/storage'
import { getMessaging, getToken } from 'firebase/messaging'

export type FeedbackType = 'basic' | 'complicated' | 'parallel'
export type ScheduleEvent = {
    color?: string
    notify?: string[]
    subtitle?: string
    title?: string
    time?: number
    feedbackType?: FeedbackType,
    detailQuestion?: string,
    description?: string,
    questions?: [],
    icon?: string // iconify code
}

export const useCloudStore = defineStore('cloud', () => {
    const firebaseApp = useFirebaseApp()
    const firestore = initializeFirestore(firebaseApp, {
        localCache:
            persistentLocalCache(/* settings */{ tabManager: persistentMultipleTabManager() })
    })
    const firebaseStorage = useFirebaseStorage()
    const messaging = getMessaging()
    const config = useRuntimeConfig()

    const eventDbName = ref(config.public.dbCollectionName)

    function getDocument(docName: string, ...pathSegments: string[]) {
        if (typeof eventDbName.value === 'undefined') {
            return null
        }
        return doc(collection(firestore, eventDbName.value), docName, ...pathSegments)
    }

    const metaDocument = shallowRef(getDocument('meta'))
    const subscriptionsDocument = shallowRef(getDocument('subscriptions'))
    const metaDoc = shallowRef(useDocument(metaDocument.value, { snapshotListenOptions: { includeMetadataChanges: false } }))
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
    const feedbackConfig = computed(() => metaDoc.value?.feedback)

    const scheduleDocument = shallowRef(getDocument('schedule'))
    const scheduleDoc = shallowRef(useDocument(scheduleDocument.value, { snapshotListenOptions: { includeMetadataChanges: false } }))
    const feedbackDoc = shallowRef(getDocument('feedback'))
    const feedbackRef = shallowRef(useDocument(feedbackDoc.value))

    const scheduleParts = computed<{
        date: string,
        name: string,
        program: ScheduleEvent[]
    }[]>(() => scheduleDoc.value?.parts)
    const scheduleLoading = computed(() => scheduleDoc.pending.value)

    const notesDocument = shallowRef(getDocument('notes'))

    navigator.serviceWorker.getRegistration().then((registration) => {
        getToken(messaging, { vapidKey: config.public.messagingConfig.vapidKey, serviceWorkerRegistration: registration }).then((token) => {
            if (token && subscriptionsDocument.value) {
                setDoc(subscriptionsDocument.value, {
                    tokens: [
                        token
                    ]
                }, { merge: true })
            }
        })
    })
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
        groupNames,
        notesDocument,
        feedbackConfig,
        feedbackDoc,
        feedbackRef
    }
})
