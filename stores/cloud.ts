// TODO feedback as subcollections
import { defineStore, skipHydrate } from 'pinia'
import { Firestore, type CollectionReference, type DocumentData, type DocumentReference, type FieldValue } from 'firebase/firestore';
import { arrayUnion, collection, deleteField, doc, getDoc } from 'firebase/firestore'
import { setDoc } from '~/utils/trace';
import { useCurrentUser, useFirebaseAuth, useFirebaseStorage, useStorageFileUrl } from 'vuefire'
import { ref as storageRef } from '@firebase/storage'
import { getMessaging, getToken } from 'firebase/messaging'
import { GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect, signOut, browserLocalPersistence, type User } from 'firebase/auth'
import Lodash from 'lodash'
import { useSettings } from '@/stores/settings'
import { usePersistentRef } from '@/utils/persistence'
import { UserLevel } from '@/types/cloud'
import type { KnownCollectionName } from '@/utils/db'
import type { EventDescription, EventSubcollection, FeedbackConfig, Feedback, UpdatePayload, ScheduleDay, Subscriptions, UserInfo, Permissions, EventDocs, UpdateRecordPayload, ScheduleEvent } from '@/types/cloud'

/**
 * Compile time check that this collection really exists (is checked by the server)
 */
export function knownCollection(firestore: Firestore, name: KnownCollectionName) {
    return collection(firestore, name)
}

export const defaultQuestions = [
    'Rečník',
    'Osobní přínos',
    'Srozumitelnost',
]

export const googleAuthProvider = new GoogleAuthProvider()


let probe = true
if (import.meta.server) {
    // probe the firestore firstly because otherwise we get infinite loading
    try {
        await fetch('https://firestore.googleapis.com/', { signal: AbortSignal.timeout(5000) })
    } catch (e) {

        console.error(e)
        probe = false
    }
}

export function eventSubCollection(fs: Firestore, event: string, document: EventSubcollection, ...segments: string[]): CollectionReference {
    // typecheck:
    if(!(fs instanceof Firestore && typeof document === 'string' && typeof event === 'string' && segments.every((s) => typeof s === 'string'))){
        throw new Error(`Invalid arguments ${fs} ${event}, ${document}, ${segments.join(', ')}`)
    }
    return collection(fs, 'events', event, document, ...segments)
}

export function eventDocs(fs: Firestore, name: string): EventDocs {
    return {
        event: doc(knownCollection(fs, 'events'), name),
        notes: eventSubCollection(fs, name, 'notes'),
        feedback: eventSubCollection(fs, name, 'feedback'),
        feedbackConfig: eventSubCollection(fs, name, 'feedbackConfig'),
        schedule: eventSubCollection(fs, name, 'schedule'),
        subscriptions: eventSubCollection(fs, name, 'subscriptions'),
        users: eventSubCollection(fs, name, 'users'),
    }
}


export const useCloudStore = defineStore('cloud', () => {
    const config = useRuntimeConfig()
    const firebaseApp = probe && useFirebaseApp()
    const settings = useSettings()
    let firestore: null | Firestore = null
    try {
        firestore = probe ? useFirestore() : null
    } catch (e) { // DOMExcepton  [TimeoutError]: The operation was aborted due to timeout
        console.error(e)
    }

    const firebaseStorage = probe && useFirebaseStorage()
    const selectedEvent = ref(config.public.defaultEvent)
    function eventDoc(...path: (string | EventSubcollection)[]) {
        return doc(knownCollection(firestore!, 'events'), selectedEvent.value, ...path)
    }
    const auth = probe && (config.public.ssrAuthEnabled || import.meta.client) ? useFirebaseAuth() : null
    if (import.meta.client) {
        auth?.setPersistence(browserLocalPersistence)
    }
    const app = useNuxtApp()

    const ed = firestore ? doc(firestore, 'events' as KnownCollectionName, selectedEvent.value) : null
    const eventDocuments = useDocument<EventDescription<void>>(ed, {
        maxRefDepth: 5,
        once: !!import.meta.server,
        wait: true,
    })

    const eventData = useAsyncData('defaultEventData', () => eventDocuments.promise.value ?? {}, {//TODO useAsyncData should not return undefined?
        watch: [eventDocuments],
    }).data

    function currentEventCollection(docName: EventSubcollection) {
        return computed(() => {
            if (!firestore) { return null }
            return eventSubCollection(firestore, selectedEvent.value, docName)
        })
    }

    const subscriptionsCollection = currentEventCollection('subscriptions')

    const eventImage = computed(() => eventData.value?.image && firebaseStorage
        ? useStorageFileUrl(storageRef(firebaseStorage, eventData.value?.image)).url.value
        : null)
    const eventTitle = computed(() => eventData.value?.title)
    const eventSubtitle = computed(() => eventData.value?.subtitle)
    const eventDescription = computed(() => eventData.value?.description)
    const eventWeb = computed(() => eventData.value?.web)
    const groupNames = computed(() => eventData.value?.groups ?? [])
    const fc = currentEventCollection('feedback')
    const feedbackDirtyTime = usePersistentRef('feedbackDirtyTime', new Date(0).getTime())
    const feedbackRepliesRaw = shallowRef(useCollection(fc, { snapshotListenOptions: { includeMetadataChanges: false }, once: !!import.meta.server }))
    const feedbackConfig = shallowRef(useCollection<FeedbackConfig>(firestore ? eventSubCollection(firestore, selectedEvent.value, 'feedbackConfig') : null))
    const feedback = {
        config: feedbackConfig,
        col: fc,
        dirtyTime: feedbackDirtyTime,
        error: ref(),
        fetchFailed: ref(false),
        fetching: ref(false),
        infoText: computed(() => eventData.value?.feedbackInfo),
        online: computed(() => {
            const result: { [key: string]: number | { [key: string | number]: { [user: string]: Feedback } } } = {}
            const replies = feedbackRepliesRaw.value as any
            if (replies) {
                for (const key in replies) {
                    const val = replies[key as keyof typeof replies]
                    if (typeof val === 'object' && val !== null) {
                        for (const innerKey in val) {
                            const k = innerKey as keyof typeof replies
                            if (typeof replies[k] === 'object' && isNaN(parseInt(innerKey))) {
                                val[k as keyof typeof val] = Lodash.merge(val[k as keyof typeof val], replies[k][0])
                                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                                delete replies[k], delete result[innerKey]
                            }
                        }
                    }
                    result[key] = val as any
                }
            }
            return result
        }),
        set(sIndex: number | string, eIndex: number | string, data: Feedback | null, userIdentifier?: string) {
            feedback.fetching.value = true
            if (typeof userIdentifier === 'undefined') {
                offlineFeedback.value[sIndex] = { ...offlineFeedback.value[sIndex], [eIndex]: { [settings.userIdentifier]: data } }
            }
            userIdentifier ??= settings.userIdentifier
            feedbackDirtyTime.value = new Date().getTime()

            setDoc(doc(feedback.col.value!, sIndex.toString()), {
                [eIndex]: {
                    [userIdentifier]: data !== null ? data : deleteField(),
                },
            }, { merge: true })
                .then(() => { feedback.fetching.value = feedback.fetchFailed.value = false }).catch((e) => { feedback.error.value = e })

            setDoc(doc(feedback.col.value!, userIdentifier), {
                updated: feedbackDirtyTime.value,
            }, { merge: true })

            setTimeout(() => {
                feedback.fetchFailed.value = feedback.fetching.value
                feedback.fetching.value = false
            }, 5000)
        },
        saveAgain() {
            feedback.fetching.value = true
            const promises = []

            // Convert null reply to deleteField
            const payload: { [sIndex: string | number]: { [eIndex: string | number]: { [uIndex: string]: Feedback | FieldValue | null } } } = offlineFeedback.value
            for (const sIndex in payload) {
                const day = payload[sIndex]
                for (const eIndex in day) {
                    const event = day[eIndex]
                    for (const uIndex in event) {
                        const reply = event[uIndex]
                        if (reply === null || typeof reply === 'undefined') {
                            event[uIndex] = deleteField()
                        }
                    }
                    day[eIndex] = event
                }
                promises.push(setDoc(doc(feedback.col.value!, sIndex), day, {
                    merge: true,
                }))
            }

            const result = Promise.all(promises).then(() => { feedback.fetching.value = feedback.fetchFailed.value = false }).catch((e) => { feedback.error.value = e })
            setTimeout(() => {
                feedback.fetchFailed.value = feedback.fetching.value
                feedback.fetching.value = false
            }, 5000)
            return result
        },
    }
    const userAuth = (config.public.ssrAuthEnabled || import.meta.client) ? useCurrentUser() : null
    const usersCollection = firestore ? knownCollection(firestore, 'users') : null
    const ud = computed(() => userAuth?.value?.uid && usersCollection ? doc(usersCollection, userAuth.value.uid) : null)

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
                await (useRedirect === true && !config.public.emulators ? signInWithRedirect : signInWithPopup)(auth!, googleAuthProvider)
                user.pendingAction.value = false
                user.pendingPopup.value = false
                return true
            } catch (reason: any) {
                let reasonPretty = typeof reason === 'object' ? JSON.stringify(reason) : reason
                if (reasonPretty.length < 3) {
                    reasonPretty = reason
                }
                app.$Sentry.captureEvent(reason, {
                    data: reasonPretty,
                })

                console.error('Failed signin', reasonPretty)
                user.error.value = reason
                let nextResult = false
                if (secondAttempt === true) {
                    alert('Přihlášení se nepodařilo provést')
                } else if (useRedirect !== true && confirm('Nepodařilo se přihlásit pomocí vyskakovacího okna. Zkusit jiný způsob?')) {
                    nextResult = await user.signIn(true, true)
                }
                user.pendingAction.value = false
                user.pendingPopup.value = false
                return nextResult
            }
        },
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
                    [selectedEvent.value]: settings.userNickname,
                },
                signatureId: {
                    [selectedEvent.value]: arrayUnion(localStorage.getItem('uniqueIdentifier')),
                },
                subscriptions: {
                    [selectedEvent.value]: arrayUnion(messagingToken.value),
                },
                email: newUser.email || user.info.value?.email,
                photoURL: newUser.photoURL || user.info.value?.photoURL,
                lastLogin: now.getTime(),
                lastTimezone: now.getTimezoneOffset(),
                permissions: !user.info.value?.permissions?.[selectedEvent.value]
                    ? {
                        [selectedEvent.value]: UserLevel.Nothing,
                    }
                    : undefined,
            }
            // remove undefined values
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            Object.keys(payload).forEach(key => payload[<keyof UserInfo>key] === undefined ? delete payload[<keyof UserInfo>key] : {})

            await setDoc(user.doc.value, payload, {
                merge: true,
            })
            await updateUserInfo(user.doc.value)
        }
    }

    watch(settings, (newSettings) => {// TODO check user diff and not set always
        if (newSettings && user.doc.value && userAuth?.value?.uid && import.meta.client) {
            setDoc(user.doc.value, {
                signature: {
                    [selectedEvent.value]: newSettings.userNickname,
                },
                signatureId: {
                    [selectedEvent.value]: localStorage.getItem('uniqueIdentifier'),
                },
            }, {
                merge: true,
            })
        }
    })

    const resolvedPermissions = computed<Permissions>(() => {
        if (config.public.debugUser) {
            return {
                editSchedule: true,
                editEvent: true,
                superAdmin: true,
            }
        }
        const onlinePermission = user.info.value?.permissions?.[selectedEvent.value]
        if (typeof onlinePermission !== 'undefined' && user.auth?.value?.uid) {
            return {
                editSchedule: [UserLevel.ScheduleAdmin.toString(), UserLevel.Admin.toString()].includes(onlinePermission.toString()) || user.info.value!.permissions?.superAdmin === true,
                editEvent: onlinePermission.toString() === UserLevel.Admin.toString() || user.info.value!.permissions?.superAdmin === true,
                superAdmin: user.info.value!.permissions?.superAdmin === true,
            }
        }
        return {
            editSchedule: false,
            editEvent: false,
            superAdmin: false,
        }
    })
    const scheduleCollection = useCollection<ScheduleDay>(firestore ? eventSubCollection(firestore, selectedEvent.value, 'schedule') : null, { maxRefDepth: 0, once: !!import.meta.server })
    const days = shallowRef(scheduleCollection)
    const suggestionsAndLast = useCollection(firestore ? knownCollection(firestore, 'suggestions') : null, { maxRefDepth: 0, once: !!import.meta.server })
    const suggestions = computed<ScheduleEvent[]>(() => suggestionsAndLast.value.filter((s) => s.id !== 'last'))
    const lastSuggestion = computed(() => (suggestionsAndLast.value.find((s) => s.id === 'last') ?? -1) as number)

    const notesCollection = currentEventCollection('notes')
    const offlineFeedback = usePersistentRef<{ [sIndex: number | string]: { [eIndex: number | string]: { [userIdentifier: string]: Feedback | null } } }>('lastNewFeedback', {})
    const messagingToken = usePersistentRef('messagingToken', '')
    const isAuthenticated = usePersistentRef('isAuthenticated', false)

    watch(messagingToken, (newToken) => {
        if (user.doc.value && userAuth?.value?.uid && import.meta.client) {
            setDoc(user.doc.value, {
                subscriptions: {
                    [selectedEvent.value]: arrayUnion(newToken),
                },
            }, {
                merge: true,
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
            userAuth!.value = debugUser
        } else {
            await getRedirectResult(auth!).catch((reason) => {

                console.error('Failed redirect result', reason)
                app.$Sentry.captureEvent(reason, {
                    data: reason,
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
                complete: () => { console.log('completed') },
            })
        }
    })

    if (import.meta.client) {
        navigator.serviceWorker?.getRegistration().then((registration) => {
            if (registration?.active && firebaseApp) {
                const messaging = getMessaging(firebaseApp)
                getToken(messaging, { vapidKey: config.public.messagingConfig.vapidKey, serviceWorkerRegistration: registration }).then((newToken) => {
                    if (newToken) {
                        messagingToken.value = newToken
                        if (subscriptionsCollection.value) {
                            setDoc(doc(subscriptionsCollection.value, newToken), {
                                subscribed: true,
                            } as UpdateRecordPayload<Subscriptions>, { merge: true })
                        }
                    }
                })
            }
        })
    }
    return {
        selectedEvent,
        currentEventCollection,
        eventDoc,
        eventImage,
        eventTitle,
        eventSubtitle,
        eventDescription,
        eventWeb,
        networkError: skipHydrate(eventDocuments.error),
        eventLoading: skipHydrate(eventDocuments.pending),
        days,
        scheduleLoading: skipHydrate(scheduleCollection.pending),
        groupNames,
        notesCollection: skipHydrate(notesCollection),
        feedback,
        offlineFeedback: skipHydrate(offlineFeedback),
        resolvedPermissions,
        suggestions,
        lastSuggestion,
        user,
        eventsCollection: useCollection<EventDescription<DocumentData>>(firestore ? knownCollection(firestore, 'events') : null, { maxRefDepth: 0, once: !!import.meta.server }),
        probe,
    }
})

