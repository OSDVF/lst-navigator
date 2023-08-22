import { defineStore } from 'pinia'
import { FieldValue, collection, doc, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setDoc } from 'firebase/firestore'
import { useFirebaseStorage, useStorageFileUrl } from 'vuefire'
import { ref as storageRef } from '@firebase/storage'
import { getMessaging, getToken } from 'firebase/messaging'
import { useSettings } from '@/stores/settings'
import { usePersistentRef } from '@/utils/storage'

export type FeedbackType = 'basic' | 'complicated' | 'parallel' | 'select'
export type FeedbackConfig = {
    group?: string | RegExp, // title of parts of schedule to group by
    title: string,
    individual: {
        name: string,
        questions: string[]
        type?: FeedbackType,
        description?: string
    }[],
}
export type ScheduleEvent = {
    color?: string
    notify?: string[]
    subtitle?: string
    title?: string
    time?: number
    feedbackType?: FeedbackType,
    detailQuestion?: string,
    description?: string,
    questions?: string[],
    icon?: string // iconify code
}

export type Feedback = {
    basic?: number | FieldValue,
    detail?: string | FieldValue,
    complicated?: (number | null)[],
    select?: string | FieldValue
}

export const useCloudStore = defineStore('cloud', () => {
    const settings = useSettings()
    const firebaseApp = useFirebaseApp()

    const firestore = process.client
        ? initializeFirestore(firebaseApp, {
            localCache:
            persistentLocalCache(/* settings */{ tabManager: persistentMultipleTabManager() })
        })
        : useFirestore()
    const firebaseStorage = useFirebaseStorage()
    const config = useRuntimeConfig()

    const eventDbName = ref(config.public.dbCollectionName)

    function getDocument(docName: string, ...pathSegments: string[]) {
        return computed(() => {
            if (typeof eventDbName.value === 'undefined' || process.server) {
                return null
            }
            return doc(collection(firestore, eventDbName.value), docName, ...pathSegments)
        })
    }

    const metaDocument = getDocument('meta')
    const subscriptionsDocument = getDocument('subscriptions')
    const metaDoc = useDocument(metaDocument.value, { snapshotListenOptions: { includeMetadataChanges: false } })
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
    const feedbackConfig = computed<FeedbackConfig[]>(() => metaDoc.value?.feedback)
    const feedbackInfoText = computed(() => metaDoc.value?.feedbackInfo)

    const scheduleDocument = getDocument('schedule')
    const scheduleDoc = useDocument(scheduleDocument.value, { snapshotListenOptions: { includeMetadataChanges: false } })
    const feedbackDoc = getDocument('feedback')
    const onlineFeedbackRef = useDocument(feedbackDoc.value)

    const scheduleParts = computed<{
        date: string,
        name: string,
        program: ScheduleEvent[]
    }[]>(() => scheduleDoc.value?.parts)
    const scheduleLoading = computed(() => scheduleDoc.pending.value)

    const notesDocument = getDocument('notes')
    const offlineFeedback = usePersistentRef<{ [sIndex: number | string]: { [eIndex: number | string]: { [userIdentifier: string]: Feedback } } }>('lastNewFeedback', {})
    const feedbackDirtyTime = usePersistentRef('feedbackDirtyTime', new Date(0).getTime())
    const fetchingFeedback = ref(false)
    const couldNotFetchFeedback = ref(false)
    const feedbackError = ref()
    function setFeedbackData(sIndex: number | string, eIndex: number | string, data: Feedback) {
        fetchingFeedback.value = true
        offlineFeedback.value[sIndex] = { ...offlineFeedback.value[sIndex], [eIndex]: { [settings.userIdentifier]: data } }
        feedbackDirtyTime.value = new Date().getTime()

        setDoc(feedbackDoc.value!, {
            [sIndex]: {
                [eIndex]: {
                    [settings.userIdentifier]: data
                }
            },
            [settings.userIdentifier]: feedbackDirtyTime.value
        }, {
            merge: true
        }).then(() => { fetchingFeedback.value = couldNotFetchFeedback.value = false }).catch((e) => { feedbackError.value = e })
        setTimeout(() => {
            couldNotFetchFeedback.value = fetchingFeedback.value
            fetchingFeedback.value = false
        }, 5000)
    }

    function hydrateOfflineFeedback(onlineFeedback:any) {
        if (new Date(onlineFeedback?.[settings.userIdentifier] ?? 0).getTime() > feedbackDirtyTime.value) {
            for (const sIndex in onlineFeedback) {
                const sPart = onlineFeedback[sIndex]
                for (const eIndex in sPart) {
                    const ePart = sPart[eIndex]
                    const uPart = ePart[settings.userIdentifier]
                    if (uPart) {
                        let offSPart = offlineFeedback.value[sIndex]
                        if (!offSPart) { offSPart = {} }
                        let offEPart = offSPart[eIndex]
                        if (!offEPart) { offEPart = {} }
                        offEPart[settings.userIdentifier] = uPart
                        offSPart[eIndex] = offEPart
                        offlineFeedback.value[sIndex] = offSPart
                    }
                }
            }
        }
    }

    watch(onlineFeedbackRef, hydrateOfflineFeedback)
    hydrateOfflineFeedback(onlineFeedbackRef.value)

    function saveAgainAllFeedback() {
        fetchingFeedback.value = true
        const uploadingPromise = setDoc(feedbackDoc.value!, offlineFeedback.value, {
            merge: true
        }).then(() => { fetchingFeedback.value = couldNotFetchFeedback.value = false })
        setTimeout(() => {
            couldNotFetchFeedback.value = fetchingFeedback.value
            fetchingFeedback.value = false
        }, 5000)
        uploadingPromise.catch((e) => { feedbackError.value = e })
        return uploadingPromise
    }

    if (process.client) {
        navigator.serviceWorker.getRegistration().then((registration) => {
            if (registration?.active) {
                const messaging = getMessaging(firebaseApp)
                getToken(messaging, { vapidKey: config.public.messagingConfig.vapidKey, serviceWorkerRegistration: registration }).then((token) => {
                    if (token && subscriptionsDocument.value) {
                        setDoc(subscriptionsDocument.value, {
                            tokens: [
                                token
                            ]
                        }, { merge: true })
                    }
                })
            }
        })
    }
    return {
        eventDbName,
        getDocument,
        metaDocument,
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
        offlineFeedback,
        feedbackInfoText,
        setFeedbackData,
        saveAgainAllFeedback,
        couldNotFetchFeedback,
        feedbackError,
        fetchingFeedback,
        feedbackDirtyTime
    }
})
