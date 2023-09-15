import { defineStore, skipHydrate } from 'pinia'
import { DocumentReference, FieldValue, Firestore, arrayUnion, collection, deleteField, doc, getDoc, setDoc } from 'firebase/firestore'
import { useFirebaseStorage, useStorageFileUrl } from 'vuefire'
import { ref as storageRef } from '@firebase/storage'
import { getMessaging, getToken } from 'firebase/messaging'
import { GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect, signOut, browserLocalPersistence, User } from 'firebase/auth'
import { useSettings } from '@/stores/settings'
import { usePersistentRef } from '@/utils/persistence'
import { KnownCollectionName } from '@/utils/db'
import { EventDescription, EventSubdocuments, FeedbackConfig, Feedback, UpdatePayload, SchedulePart, Subscriptions, UserInfo, Permissions, UserLevel } from '@/types/cloud'
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
    const config = useRuntimeConfig()
    const firebaseApp = probe && useFirebaseApp()
    const firestore = probe && useFirestore()

    const firebaseStorage = probe && useFirebaseStorage()
    const selectedEvent = ref(config.public.defaultEvent)
    const auth = probe ? useFirebaseAuth() : null
    if (process.client) {
        auth?.setPersistence(browserLocalPersistence)
    }
    const app = useNuxtApp()

    const ed = firestore ? doc(firestore, 'events' as KnownCollectionName, selectedEvent.value) : null
    const eventDocuments = useDocument<EventDescription>(ed, {
        maxRefDepth: 4,
        once: !!process.server
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

    const eventImage = computed(() => eventData.value?.meta.image && firebaseStorage
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
        online: useDocument(fd, { snapshotListenOptions: { includeMetadataChanges: false }, once: !!process.server }),
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
    const userAuth = useCurrentUser()
    const usersCollection = firestore ? knownCollection(firestore, 'users') : null
    const ud = computed(() => userAuth.value?.uid && usersCollection ? doc(usersCollection, userAuth.value.uid) : null)

    const uPending = ref(false)
    async function updateUserInfo(newDoc: DocumentReference | null) { // User info is updated on-demand
        const wasPending = uPending.value
        if (newDoc) {
            uPending.value = true
            const data = await (await getDoc(newDoc)).data()
            if (data) { user.info.value = data as UserInfo }
        } else {
            user.info.value = null
        }
        if (!wasPending) {
            uPending.value = false
        }
    }
    const user = {
        auth: skipHydrate(userAuth),
        doc: skipHydrate(ud),
        info: ref<UserInfo | null>(null),
        error: ref(),
        pendingAction: uPending,
        pendingPopup: ref(false),
        async signOut() {
            user.pendingAction.value = true
            await signOut(auth!)
            isAuthenticated.value = false
            user.pendingAction.value = false
        },
        async signIn(useRedirect = false, secondAttempt = false): Promise<boolean> {
            if (!useRedirect) { user.pendingPopup.value = true }
            user.pendingAction.value = true
            try {
                // With emulators the popup version would throw cross-origin error
                (useRedirect === true && !config.public.emulators ? signInWithRedirect : signInWithPopup)(auth!, googleAuthProvider)
                user.pendingAction.value = false
                user.pendingPopup.value = false
                return true
            } catch (reason: any) {
                let reasonPretty = typeof reason === 'object' ? JSON.stringify(reason) : reason
                if (reasonPretty.length < 3) {
                    reasonPretty = reason
                }
                app.$Sentry.captureEvent(reason, {
                    data: reasonPretty
                })
                // eslint-disable-next-line no-console
                console.error('Failed signin', reasonPretty)
                user.error.value = reason
                let nextResult = false
                if (secondAttempt === true) {
                    alert('Přihlášení se nepodařilo provést')
                } else if (!useRedirect && confirm('Nepodařilo se přihlásit pomocí vyskakovacího okna. Zkusit jiný způsob?')) {
                    nextResult = await user.signIn(true, true)
                }
                user.pendingAction.value = false
                user.pendingPopup.value = false
                return nextResult
            }
        }
    }

    async function onSignIn(newUser: User) {
        await updateUserInfo(user.doc.value)
        if (user.doc.value) {
            if (user.info.value) {
                const signatureId = user.info.value.signatureId?.[selectedEvent.value]
                if (signatureId) {
                    if (confirm('Tento účet již byl použit pro zpětnou vazbu. Chcete do tohoto zařízení načíst vaši předchozí zpětnou vazbu? Bude přepsán aktuálně offline uložený stav.')) {
                        settings.userIdentifier = signatureId
                        settings.userNickname = user.info.value!.signature[selectedEvent.value]
                    }
                }
            }

            const now = new Date()
            const payload: Partial<UpdatePayload<UserInfo>> = {
                name: newUser.displayName || user.info.value?.name,
                signature: {
                    [selectedEvent.value]: settings.userNickname
                },
                signatureId: {
                    [selectedEvent.value]: arrayUnion(localStorage.getItem('uniqueIdentifier'))
                },
                subscriptions: {
                    [selectedEvent.value]: arrayUnion(messagingToken.value)
                },
                email: newUser.email || user.info.value?.email,
                photoURL: newUser.photoURL || user.info.value?.photoURL,
                lastLogin: now.getTime(),
                lastTimezone: now.getTimezoneOffset(),
                permissions: !user.info.value?.permissions?.[selectedEvent.value]
                    ? {
                        [selectedEvent.value]: UserLevel.Nothing
                    }
                    : undefined
            }
            // remove undefined values
            Object.keys(payload).forEach(key => payload[<keyof UserInfo>key] === undefined ? delete payload[<keyof UserInfo>key] : {})

            await setDoc(user.doc.value, payload, {
                merge: true
            })
            await updateUserInfo(user.doc.value)
        }
    }

    watch(settings, (newSettings) => {
        if (user.doc.value && userAuth.value?.uid && process.client) {
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

    const resolvedPermissions = computed<Permissions>(() => {
        if (config.public.debugUser) {
            return {
                editSchedule: true,
                eventAdmin: true,
                superAdmin: true
            }
        }
        if (user.info.value?.permissions && user.auth.value?.uid) {
            const onlinePermission = user.info.value.permissions?.[selectedEvent.value]
            return {
                editSchedule: onlinePermission === UserLevel.ScheduleAdmin || onlinePermission === UserLevel.Admin || user.info.value.permissions?.superAdmin === true,
                eventAdmin: onlinePermission === UserLevel.Admin || user.info.value.permissions?.superAdmin === true,
                superAdmin: user.info.value.permissions?.superAdmin === true
            }
        }
        return {
            editSchedule: false,
            eventAdmin: false,
            superAdmin: false
        }
    })

    const scheduleParts = computed<SchedulePart[]>(() => eventData.value?.meta.schedule?.parts ?? [])

    const notesDocument = currentEventDocument('notes')
    const offlineFeedback = usePersistentRef<{ [sIndex: number | string]: { [eIndex: number | string]: { [userIdentifier: string]: Feedback | null } } }>('lastNewFeedback', {})
    const messagingToken = usePersistentRef('messagingToken', '')
    const isAuthenticated = usePersistentRef('isAuthenticated', false)

    watch(messagingToken, (newToken) => {
        if (user.doc.value && userAuth.value?.uid && process.client) {
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
            userAuth.value = debugUser
        } else {
            await getRedirectResult(auth!).catch((reason) => {
                // eslint-disable-next-line no-console
                console.error('Failed redirect result', reason)
                app.$Sentry.captureEvent(reason, {
                    data: reason
                })
                user.error.value = reason
            })
            watch(ud, (newDoc) => {
                updateUserInfo(newDoc)
            })
            auth!.onAuthStateChanged({
                next: (user) => {
                    if (user) {
                        if (!isAuthenticated.value) {
                            onSignIn(user)
                            isAuthenticated.value = true
                        }
                    } else {
                        isAuthenticated.value = false
                    }
                    updateUserInfo(ud.value)
                },
                error: console.error,
                complete: () => { console.log('completed') }
            })
        }
    })

    if (process.client) {
        navigator.serviceWorker?.getRegistration().then((registration) => {
            if (registration?.active && firebaseApp) {
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
        eventsCollection: useCollection<EventDescription>(firestore ? knownCollection(firestore, 'events') : null, { maxRefDepth: 0, once: !!process.server }),
        probe
    }
})

