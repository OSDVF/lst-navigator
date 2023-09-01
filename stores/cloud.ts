import { defineStore } from 'pinia'
import { FieldValue, Firestore, collection, deleteField, doc, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setDoc } from 'firebase/firestore'
import { useFirebaseStorage, useStorageFileUrl } from 'vuefire'
import { ref as storageRef } from '@firebase/storage'
import { getMessaging, getToken } from 'firebase/messaging'
import { IdTokenResult, User } from 'firebase/auth'
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

export type SchedulePart = {
    date: string,
    name: string,
    program: ScheduleEvent[]
};

export type Feedback = {
    basic?: number | FieldValue,
    detail?: string | FieldValue,
    complicated?: (number | null)[],
    select?: string | FieldValue
}
export const defaultQuestions = [
    'Rečník',
    'Osobní přínos',
    'Srozumitelnost'
]

export const useCloudStore = defineStore('cloud', () => {
    const settings = useSettings()
    const firebaseApp = useFirebaseApp()

    let firestore: Firestore | null = null
    if (process.client) {
        try {
            firestore = initializeFirestore(firebaseApp, {
                localCache:
                    persistentLocalCache(/* settings */{ tabManager: persistentMultipleTabManager() })
            })
        } catch (e) {
            firestore = useFirestore()
        }
    }
    const firebaseStorage = useFirebaseStorage()
    const config = useRuntimeConfig()

    const eventDbName = ref(config.public.dbCollectionName)

    function getDocument(docName: string, ...pathSegments: string[]) {
        return computed(() => {
            if (typeof eventDbName.value === 'undefined' || process.server || !firestore) {
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
    const scheduleDoc = useDocument(scheduleDocument.value, { wait: true, snapshotListenOptions: { includeMetadataChanges: false } })
    const feedbackDoc = getDocument('feedback')
    const onlineFeedbackRef = useDocument(feedbackDoc.value, { snapshotListenOptions: { includeMetadataChanges: false } })

    const usersDocument = getDocument('users')
    const usersDoc = useDocument(usersDocument.value, { snapshotListenOptions: { includeMetadataChanges: false } })
    const onlineUser = useCurrentUser()
    const user = usePersistentRef('user', onlineUser.value) // offline-stored user

    onMounted(function() {
        if (config.public.debugUser) {
            user.value = debugUser
        } else {
            watch(onlineUser, (newUser) => {
                if (newUser) {
                    user.value = newUser
                }
            })
        }
    })

    const permissions = computed<'admin' | string>(() => config.public.debugUser ? 'admin' : user.value?.uid ? usersDoc.value?.permissions?.[user.value.uid] : null)

    const scheduleParts = computed<SchedulePart[]>(() => scheduleDoc.value?.parts)
    const scheduleLoading = computed(() => scheduleDoc.pending.value)

    const notesDocument = getDocument('notes')
    const offlineFeedback = usePersistentRef<{ [sIndex: number | string]: { [eIndex: number | string]: { [userIdentifier: string]: Feedback | null } } }>('lastNewFeedback', {})
    const feedbackDirtyTime = usePersistentRef('feedbackDirtyTime', new Date(0).getTime())
    const fetchingFeedback = ref(false)
    const couldNotFetchFeedback = ref(false)
    const feedbackError = ref()

    function setFeedbackData(sIndex: number | string, eIndex: number | string, data: Feedback | null, userIdentifier?: string) {
        fetchingFeedback.value = true
        if (typeof userIdentifier === 'undefined') {
            offlineFeedback.value[sIndex] = { ...offlineFeedback.value[sIndex], [eIndex]: { [settings.userIdentifier]: data } }
        }
        userIdentifier ??= settings.userIdentifier
        feedbackDirtyTime.value = new Date().getTime()

        setDoc(feedbackDoc.value!, {
            [sIndex]: {
                [eIndex]: {
                    [userIdentifier]: data !== null ? data : deleteField()
                }
            },
            [userIdentifier]: feedbackDirtyTime.value
        }, {
            merge: true
        }).then(() => { fetchingFeedback.value = couldNotFetchFeedback.value = false }).catch((e) => { feedbackError.value = e })
        setTimeout(() => {
            couldNotFetchFeedback.value = fetchingFeedback.value
            fetchingFeedback.value = false
        }, 5000)
    }

    let hydrationDebounce: null | NodeJS.Timeout = null
    function hydrateOfflineFeedback(onlineFeedback: any) {
        hydrationDebounce = null
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


    watch(onlineFeedbackRef, function () {
        if (hydrationDebounce === null) {
            hydrationDebounce = setTimeout(hydrateOfflineFeedback, 800)
        }
    })
    hydrateOfflineFeedback(onlineFeedbackRef.value)

    watch(settings, (newSettings) => {
        if (feedbackDoc.value && user.value && process.client) {
            setDoc(feedbackDoc.value, {
                [user.value.uid]: {
                    offlineUserName: newSettings.userNickname,
                    offlineUserIdentifier: localStorage.getItem('uniqueIdentifier')
                }
            }, {
                merge: true
            })
        }
    })

    function saveAgainAllFeedback() {
        fetchingFeedback.value = true

        // Convert null reply to deleteField
        const payload: { [sIndex: string | number]: { [eIndex: string | number]: { [uIndex: string]: Feedback | FieldValue | null } } } = offlineFeedback.value
        for (const sIndex in payload) {
            const schedulePart = payload[sIndex]
            for (const eIndex in schedulePart) {
                const event = schedulePart[eIndex]
                for (const uIndex in event) {
                    const reply = event[uIndex]
                    if (reply === null || typeof reply === 'undefined') {
                        event[uIndex] = deleteField()
                    }
                }
                schedulePart[eIndex] = event
            }
            payload[sIndex] = schedulePart
        }

        const uploadingPromise = setDoc(feedbackDoc.value!, payload, {
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
        navigator.serviceWorker?.getRegistration().then((registration) => {
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
        feedbackDirtyTime,
        onlineFeedbackRef,
        permissions,
        user
    }
})
