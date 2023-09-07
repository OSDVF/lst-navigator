import { defineStore, skipHydrate } from 'pinia'
import { DocumentReference, FieldValue, Firestore, arrayUnion, collection, deleteField, doc, getDoc, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setDoc } from 'firebase/firestore'
import { useFirebaseStorage, useStorageFileUrl } from 'vuefire'
import { ref as storageRef } from '@firebase/storage'
import { getMessaging, getToken } from 'firebase/messaging'
import { GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth'
import { useSettings } from '@/stores/settings'
import { usePersistentRef } from '@/utils/persistence'
import { KnownCollectionName } from '@/utils/db'
import { EventDescription, EventSubdocuments, FeedbackConfig, Feedback, UpdatePayload, SchedulePart, Subscriptions, UserInfo, Permissions } from '@/types/cloud'
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
        // eslint-disable-next-line no-console
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
    const app = useNuxtApp()

    let firestore: Firestore | null = null

    if (probe) {
        try {
            firestore = initializeFirestore(firebaseApp, {
                localCache:
                    persistentLocalCache(/* settings */{ tabManager: persistentMultipleTabManager() })
            })
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e)

            try {
                firestore = useFirestore()
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error(e)
            }
        }
    }

    const ed = firestore ? doc(firestore, 'events' as KnownCollectionName, selectedEvent.value) : null
    const eventDocuments = useDocument<EventDescription>(ed, {
        maxRefDepth: 4
    })

    const eventData = useAsyncData('defaultEventData', () => eventDocuments.promise.value, {
        watch: [eventDocuments]
    }).data

    function currentEventDocument(docName: EventSubdocuments) {
        return computed(() => {
            if (!firestore) { return null }
            return doc(firestore, selectedEvent.value, docName)
        })
    }

    const subscriptionsDocument = currentEventDocument('subscriptions')

    const eventImage = computed(() => eventData.value?.meta.image
        ? useStorageFileUrl(storageRef(firebaseStorage, eventData.value?.meta.image)).url.value
        : null)
    const eventTitle = computed(() => eventData.value?.meta.title)
    const eventSubtitle = computed(() => eventData.value?.meta.subtitle)
    const eventDescription = computed(() => eventData.value?.meta.description)
    const eventWeb = computed(() => eventData.value?.meta.web)
    const groupNames = computed(() => eventData.value?.meta.groups ?? [])
    const fd = currentEventDocument('feedback')
    const feedbackDirtyTime = usePersistentRef('feedbackDirtyTime', new Date(0).getTime())
    const feedback = {
        config: computed<FeedbackConfig[] | undefined>(() => eventData.value?.meta.feedback),
        doc: fd,
        dirtyTime: feedbackDirtyTime,
        error: ref(),
        fetchFailed: ref(false),
        fetching: ref(false),
        infoText: computed(() => eventData.value?.meta.feedbackInfo),
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

    const offlineAuth = usePersistentRef('user', auth?.currentUser ? { ...auth?.currentUser } : null) // offline-stored user
    const userProxy = computed({
        get() {
            return offlineAuth.value
        },
        set(value) {
            if (!value) {
                offlineAuth.value = value
                return
            } else if (!offlineAuth.value) {
                offlineAuth.value = {} as any
            }
            for (const key in value) {
                try {
                    if (typeof value[key as keyof typeof value] !== 'function') {
                        (offlineAuth.value as any)[key]! = value[key as keyof typeof value]
                    }
                    // eslint-disable-next-line no-console
                } catch (e) { console.log(e) }
            }
        }
    })
    const usersCollection = firestore !== null ? knownCollection(firestore, 'users') : null
    const ud = skipHydrate(computed(() => userProxy.value?.uid && usersCollection ? doc(usersCollection, userProxy.value.uid) : null))

    async function updateUserInfo(newDoc: DocumentReference | null) {
        if (newDoc) {
            const data = await (await getDoc(newDoc)).data()
            if (data) { user.info.value = data as UserInfo }
        }
    }
    const user = {
        auth: offlineAuth,
        doc: ud,
        info: ref<UserInfo | null>(null),
        error: ref(),
        async signOut() {
            userProxy.value = null
            await signOut(auth!)
        },
        signIn(useRedirect = false) {
            (useRedirect === true ? signInWithRedirect : signInWithPopup)(auth!, googleAuthProvider)
                .then((result) => {
                    userProxy.value = result.user
                    updateUserInfo(user.doc.value)
                    if (user.doc.value && user.info.value) {
                        const signatureId = user.info.value.signatureId?.[selectedEvent.value]
                        if (signatureId) {
                            if (confirm('Tento účet již byl použit pro zpětnou vazbu. Chcete do tohoto zařízení načíst vaši předchozí zpětnou vazbu? Bude přepsán aktuálně offline uložený stav.')) {
                                settings.userIdentifier = signatureId
                                settings.userNickname = user.info.value!.signature[selectedEvent.value]
                            }
                        }

                        const now = new Date()
                        setDoc(user.doc.value, {
                            name: user.info.value.name || user.auth.value?.displayName,
                            signature: {
                                [selectedEvent.value]: settings.userNickname
                            },
                            signatureId: {
                                [selectedEvent.value]: arrayUnion(localStorage.getItem('uniqueIdentifier'))
                            },
                            subscriptions: {
                                [selectedEvent.value]: arrayUnion(messagingToken.value)
                            },
                            email: user.info.value.email || user.auth.value?.email,
                            photoURL: user.info.value.photoURL || user.auth.value?.photoURL,
                            lastLogin: now.getTime(),
                            lastTimezone: now.getTimezoneOffset()
                        } as Partial<UpdatePayload<UserInfo>>, {
                            merge: true
                        })
                    }
                }).catch((reason) => {
                    const reasonPretty = typeof reason === 'object' ? JSON.stringify(reason) : reason
                    app.$Sentry.captureEvent(reason, {
                        data: reasonPretty
                    })
                    // eslint-disable-next-line no-console
                    console.error('Failed signin', reasonPretty)
                    user.error.value = reason
                    if (confirm('Nepodařilo se přihlásit pomocí vyskakovacího okna. Zkusit jiný způsob?')) {
                        user.signIn(true)
                    }
                })
        }
    }

    watch(ud, (newDoc) => {
        updateUserInfo(newDoc)
    })
    updateUserInfo(ud.value)

    watch(settings, (newSettings) => {
        if (user.doc.value && userProxy.value?.uid && process.client) {
            setDoc(user.doc.value, {
                signature: {
                    [selectedEvent.value]: newSettings.userNickname
                },
                signatureId: {
                    [selectedEvent.value]: localStorage.getItem('uniqueIdentifier')
                }
            }, {
                merge: true
            })
        }
    })

    const resolvedPermissions = computed<Permissions>(() => config.public.debugUser
        ? {
            editSchedule: true,
            eventAdmin: true,
            superAdmin: true
        }
        : user.info.value?.permissions && user.auth.value?.uid
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

    const scheduleParts = computed<SchedulePart[]>(() => eventData.value?.meta.schedule?.parts ?? [])

    const notesDocument = currentEventDocument('notes')
    const offlineFeedback = usePersistentRef<{ [sIndex: number | string]: { [eIndex: number | string]: { [userIdentifier: string]: Feedback | null } } }>('lastNewFeedback', {})
    const messagingToken = usePersistentRef('messagingToken', '')

    watch(messagingToken, (newToken) => {
        if (user.doc.value && userProxy.value?.uid && process.client) {
            setDoc(user.doc.value, {
                subscriptions: {
                    [selectedEvent.value]: arrayUnion(newToken)
                }
            }, {
                merge: true
            })
        }
    })

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

    // Hydrate user
    onMounted(async () => {
        if (config.public.debugUser) {
            userProxy.value = debugUser
        } else {
            watch(useCurrentUser(), (newUser) => {
                if (newUser) {
                    userProxy.value = newUser
                }
            })

            await getRedirectResult(auth!).then((token) => {
                if (token?.user) {
                    userProxy.value = token.user
                }
            }).catch((reason) => {
                // eslint-disable-next-line no-console
                console.error('Failed redirect result', reason)
                app.$Sentry.captureEvent(reason, {
                    data: reason
                })
                user.error.value = reason
            })
            if (!userProxy.value) {
                userProxy.value = await getCurrentUser()
            }
        }
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
                                [newToken]: true
                            } as UpdatePayload<Subscriptions>, { merge: true })
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
        eventsCollection: useCollection(firestore !== null ? knownCollection(firestore, 'events') : null, { maxRefDepth: 0 })
    }
})

