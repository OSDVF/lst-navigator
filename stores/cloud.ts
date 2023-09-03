import { defineStore, skipHydrate } from 'pinia'
import { FieldValue, Firestore, arrayUnion, collection, deleteField, doc, getDocs, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setDoc } from 'firebase/firestore'
import { useFirebaseStorage, useStorageFileUrl } from 'vuefire'
import { ref as storageRef } from '@firebase/storage'
import { getMessaging, getToken } from 'firebase/messaging'
import { GoogleAuthProvider, getRedirectResult, signInWithPopup, signOut } from 'firebase/auth'
import { getCurrentInstance } from 'vue-demi'
import { useSettings } from '@/stores/settings'
import { usePersistentRef } from '@/utils/persistence'
import { KnownCollectionName } from '@/utils/db'

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

export type EventSubdocuments = 'meta' | 'notes' | 'feedback' | 'subscriptions' | 'users'


export type EventMeta = {
    description: string,
    title: string,
    subtitle: string,
    schedule: {
        parts: SchedulePart[]
    }, // in the database this a reference to another document, but this reference is being resolved by vuefire
    image: string, // url
    feedback: FeedbackConfig[],
    feedbackInfo: string,
    groups: string[],
    web: string
}

export type EventDescription = {
    title: string,
    start: string, // in format 2023-01-30
    end: string,
    meta: EventMeta
} & {
        [key in EventSubdocuments]: string
    }

export type Permissions = {
    superAdmin: boolean,
    /**
     * Also has access to the administrator section and can edit feedback results
     */
    eventAdmin: boolean,
    /**
     * Can edit schedule on this event and has access to feedback results
     */
    editSchedule: boolean,
}

export type UserInfo = {
    permissions: { [key: 'superAdmin' | string]: boolean | 'admin' | 'schedule' }
    subscriptions: string[],
    signature: {
        [eventId: string]: string
    },
    signatureId: {
        [eventId: string]: string
    },
    name: string,
    email: string,
    photoURL: string,
    timestamp: number,
    timezone: number
}

export type UpdatePayload<T> = {
    [key in keyof T]: T[key] | FieldValue
}

export type Feedback = {
    basic?: number | FieldValue,
    detail?: string | FieldValue,
    complicated?: (number | null)[],
    select?: string | FieldValue
}

/**
 * Compile time check that this collection really exists (is checked by the server)
 */
export function knownCollection(firestore: Firestore, name: KnownCollectionName) {
    return collection(firestore, name)
}

export const defaultQuestions = [
    'Rečník',
    'Osobní přínos',
    'Srozumitelnost'
]

export const googleAuthProvider = new GoogleAuthProvider()

let probe = true
if (process.server) {
    // probe the firestore firstly because otherwise we get infinite loading
    try {
        await fetch('https://firestore.googleapis.com/', { signal: AbortSignal.timeout(5000) })
    } catch (e) {
        console.error(e)
        probe = false
    }
}

export const useCloudStore = defineStore('cloud', () => {
    const settings = useSettings()
    const firebaseApp = useFirebaseApp()
    const firebaseStorage = useFirebaseStorage()
    const config = useRuntimeConfig()
    const selectedEvent = ref(config.public.defaultEvent)
    const auth = useFirebaseAuth()

    let firestore: Firestore | null = null

    if (probe) {
        try {
            firestore = initializeFirestore(firebaseApp, {
                localCache:
                    persistentLocalCache(/* settings */{ tabManager: persistentMultipleTabManager() })
            })
        } catch (e) {
            console.error(e)

            try {
                firestore = useFirestore()
            } catch (e) {
                console.error(e)
            }
        }
    }

    const eventDocuments = useDocument<EventDescription>(firestore ? doc(firestore, 'events' as KnownCollectionName, selectedEvent.value) : null, {
        maxRefDepth: 4
    })

    function currentEventDocument(docName: EventSubdocuments) {
        return computed(() => {
            if (!firestore) { return null }
            return doc(firestore, selectedEvent.value, docName)
        })
    }

    const subscriptionsDocument = currentEventDocument('subscriptions')

    const eventImage = computed(() => eventDocuments.value?.meta.image
        ? useStorageFileUrl(storageRef(firebaseStorage, eventDocuments.value?.meta.image)).url.value
        : null)
    const eventTitle = computed(() => eventDocuments.value?.meta.title)
    const eventSubtitle = computed(() => eventDocuments.value?.meta.subtitle)
    const eventDescription = computed(() => eventDocuments.value?.meta.description)
    const eventWeb = computed(() => eventDocuments.value?.meta.web)
    const groupNames = computed(() => eventDocuments.value?.meta.groups ?? [])
    const fd = currentEventDocument('feedback')
    const feedbackDirtyTime = usePersistentRef('feedbackDirtyTime', new Date(0).getTime())
    const feedback = {
        config: computed<FeedbackConfig[] | undefined>(() => eventDocuments.value?.meta.feedback),
        doc: fd,
        dirtyTime: feedbackDirtyTime,
        error: ref(),
        fetchFailed: ref(false),
        fetching: ref(false),
        infoText: computed(() => eventDocuments.value?.meta.feedbackInfo),
        online: useDocument(fd, { snapshotListenOptions: { includeMetadataChanges: false } }),
        set(sIndex: number | string, eIndex: number | string, data: Feedback | null, userIdentifier?: string) {
            feedback.fetching.value = true
            if (typeof userIdentifier === 'undefined') {
                offlineFeedback.value[sIndex] = { ...offlineFeedback.value[sIndex], [eIndex]: { [settings.userIdentifier]: data } }
            }
            userIdentifier ??= settings.userIdentifier
            feedbackDirtyTime.value = new Date().getTime()

            setDoc(feedback.doc.value!, {
                [sIndex]: {
                    [eIndex]: {
                        [userIdentifier]: data !== null ? data : deleteField()
                    }
                },
                [userIdentifier]: feedbackDirtyTime.value
            }, {
                merge: true
            }).then(() => { feedback.fetching.value = feedback.fetchFailed.value = false }).catch((e) => { feedback.error.value = e })
            setTimeout(() => {
                feedback.fetchFailed.value = feedback.fetching.value
                feedback.fetching.value = false
            }, 5000)
        },
        saveAgain() {
            feedback.fetching.value = true

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

            const uploadingPromise = setDoc(feedback.doc.value!, payload, {
                merge: true
            }).then(() => { feedback.fetching.value = feedback.fetchFailed.value = false })
            setTimeout(() => {
                feedback.fetchFailed.value = feedback.fetching.value
                feedback.fetching.value = false
            }, 5000)
            uploadingPromise.catch((e) => { feedback.error.value = e })
            return uploadingPromise
        }
    }

    const onlineUserAuth = useCurrentUser()
    const offlineAuth = usePersistentRef('user', onlineUserAuth.value ? { ...onlineUserAuth.value } : null) // offline-stored user
    const userAuth = computed({
        get() {
            return onlineUserAuth.value ?? offlineAuth.value
        },
        set(value) {
            /* offlineUser.value.displayName = value?.displayName
            offlineUser.value.email = value?.email
            offlineUser.value.emailVerified = value?.emailVerified
            offlineUser.value.photoURL = value?.photoURL
            offlineUser.value.uid = value?.uid
            offlineUser.value.providerId = value?.providerId
            offlineUser.value.phoneNumber = value?.phoneNumber
            offlineUser.value.isAnonymous = value?.isAnonymous
            offlineUser.value.emailVerified = value?.emailVerified
            offlineUser.value.metadata = value?.metadata
            offlineUser.value.providerData = value?.providerData
            offlineUser.value.refreshToken = value?.refreshToken */
            if (!value) {
                offlineAuth.value = value
            } else if (!offlineAuth.value) {
                offlineAuth.value = {} as any
            }
            for (const key in value) {
                if (typeof value[key as keyof typeof value] !== 'function') {
                    (offlineAuth.value as any)[key]! = value[key as keyof typeof value]
                }
            }
        }
    })
    const usersCollection = firestore ? knownCollection(firestore, 'users') : null
    const user = {
        auth: userAuth,
        doc: firestore && userAuth.value?.uid && usersCollection ? skipHydrate(doc(usersCollection, userAuth.value!.uid)) : null,
        info: useDocument<UserInfo>(null),
        error: ref(),
        async signOut() {
            await signOut(auth!)
            userAuth.value = null
        },
        signIn() {
            signInWithPopup(auth!, googleAuthProvider)
                .then((result) => {
                    if (user.doc) {
                        const signatureId = user.info.value!.signatureId[selectedEvent.value]
                        if (signatureId) {
                            if (confirm('Tento účet již byl použit pro zpětnou vazbu. Chcete do tohoto zařízení načíst vaši předchozí zpětnou vazbu? Bude přepsán aktuálně offline uložený stav.')) {
                                settings.userIdentifier = signatureId
                                settings.userNickname = user.info.value!.signature[selectedEvent.value]
                            }
                        }

                        const now = new Date()
                        setDoc(user.doc, {
                            name: result.user.displayName,
                            signature: {
                                [selectedEvent.value]: settings.userNickname
                            },
                            signatureId: {
                                [selectedEvent.value]: settings.userIdentifier
                            },
                            subscriptions: arrayUnion(),
                            email: result.user.email,
                            photoURL: result.user.photoURL,
                            timestamp: now.getTime(),
                            timezone: now.getTimezoneOffset()
                        } as Partial<UpdatePayload<UserInfo>>, {
                            merge: true
                        })
                    }
                }).catch((reason) => {
                    console.error('Failed signin', reason)
                    user.error.value = reason
                })
        }
    }
    user.info = useDocument<UserInfo>(user.doc)

    onMounted(function () {
        if (config.public.debugUser) {
            userAuth.value = debugUser
        } else {
            watch(onlineUserAuth, (newUser) => {
                if (newUser) {
                    userAuth.value = newUser
                }
            })
        }
    })

    const resolvedPermissions = computed<Permissions>(() => config.public.debugUser
        ? {
            editSchedule: true,
            eventAdmin: true,
            superAdmin: true
        }
        : user.info.value?.permissions
            ? {
                editSchedule: user.info.value.permissions[selectedEvent.value] === 'schedule' || user.info.value.permissions[selectedEvent.value] === 'admin' || user.info.value.permissions.superAdmin === true,
                eventAdmin: user.info.value.permissions[selectedEvent.value] === 'admin' || user.info.value.permissions.superAdmin === true,
                superAdmin: user.info.value.permissions.superAdmin === true
            }
            : {
                editSchedule: false,
                eventAdmin: false,
                superAdmin: false
            })

    const scheduleParts = computed<SchedulePart[]>(() => eventDocuments.value?.meta.schedule?.parts ?? [])

    const notesDocument = currentEventDocument('notes')
    const offlineFeedback = usePersistentRef<{ [sIndex: number | string]: { [eIndex: number | string]: { [userIdentifier: string]: Feedback | null } } }>('lastNewFeedback', {})
    const messagingToken = usePersistentRef('messagingToken', '')

    let hydrationDebounce: null | NodeJS.Timeout = null
    function hydrateOfflineFeedback(onlineFeedback: any) {
        hydrationDebounce = null
        if (new Date(onlineFeedback?.[settings.userIdentifier] ?? 0).getTime() > feedback.dirtyTime.value) {
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


    watch(feedback.online, function () {
        if (hydrationDebounce === null) {
            hydrationDebounce = setTimeout(hydrateOfflineFeedback, 800)
        }
    })
    hydrateOfflineFeedback(feedback.online)


    watch(settings, (newSettings) => {
        if (feedback.doc.value && userAuth.value?.uid && process.client) {
            setDoc(feedback.doc.value, {
                [userAuth.value.uid]: {
                    offlineUserName: newSettings.userNickname,
                    offlineUserIdentifier: localStorage.getItem('uniqueIdentifier')
                }
            }, {
                merge: true
            })
        }
    })

    // only on client side
    onMounted(() => {
        getRedirectResult(auth!).catch((reason) => {
            console.error('Failed redirect result', reason)
            user.error.value = reason
        })
    })

    if (process.client) {
        navigator.serviceWorker?.getRegistration().then((registration) => {
            if (registration?.active) {
                const messaging = getMessaging(firebaseApp)
                getToken(messaging, { vapidKey: config.public.messagingConfig.vapidKey, serviceWorkerRegistration: registration }).then((newToken) => {
                    if (newToken) {
                        messagingToken.value = newToken
                        if (subscriptionsDocument.value) {
                            setDoc(subscriptionsDocument.value, {
                                tokens: arrayUnion(newToken)
                            }, { merge: true })
                        }
                    }
                })
            }
        })
    }
    return {
        selectedEvent,
        eventImage,
        eventTitle,
        eventSubtitle,
        eventDescription,
        eventWeb,
        networkError: eventDocuments.error.value,
        metaLoading: eventDocuments.pending.value,
        scheduleParts,
        groupNames,
        notesDocument: skipHydrate(notesDocument),
        feedback,
        offlineFeedback: skipHydrate(offlineFeedback),
        resolvedPermissions,
        user,
        eventsCollection: useCollection(firestore ? knownCollection(firestore, 'events') : null, { maxRefDepth: 0 })
    }
})
