// TODO feedback as subcollections
import { defineStore, skipHydrate } from 'pinia'
import { Firestore, type CollectionReference, type DocumentData, type DocumentReference, type FieldValue } from 'firebase/firestore'
import { arrayUnion, collection, deleteField, doc, getDoc } from 'firebase/firestore'
import { setDoc } from '~/utils/trace'
import { useCurrentUser, useFirebaseAuth, useFirebaseStorage, useStorageFileUrl } from 'vuefire'
import { ref as storageRef } from '@firebase/storage'
import { getMessaging, getToken } from 'firebase/messaging'
import { GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect, signOut, browserLocalPersistence, type User, browserPopupRedirectResolver } from 'firebase/auth'
import Lodash from 'lodash'
import { useSettings } from '@/stores/settings'
import { usePersistentRef } from '@/utils/persistence'
import { UserLevel } from '@/types/cloud'
import type { KnownCollectionName } from '@/utils/db'
import type { EventDescription, EventSubcollection, FeedbackConfig, Feedback, FeedbackSections, UpdatePayload, ScheduleDay, Subscriptions, UserInfo, Permissions, EventDocs, UpdateRecordPayload, ScheduleEvent } from '@/types/cloud'
import type { WatchCallback } from 'vue'
import type { ShallowRefMarker } from '@vue/reactivity'

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
    if (!(fs instanceof Firestore && typeof document === 'string' && typeof event === 'string' && segments.every((s) => typeof s === 'string'))) {
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
    const selectedEvent = usePersistentRef('selectedEvent-' + config.public.defaultEvent, config.public.defaultEvent)// invalidate the selected event when the default settings change
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

    const eventImage = computed(() => eventData.value?.image.type == 'cloud' && firebaseStorage
        ? useStorageFileUrl(storageRef(firebaseStorage, eventData.value?.image.data)).url.value
        : eventData.value?.image.data)
    const eventTitle = computed(() => eventData.value?.title)
    const eventSubtitle = computed(() => eventData.value?.subtitle)
    const eventDescription = computed(() => eventData.value?.description)
    const eventWeb = computed(() => eventData.value?.web)
    const groupNames = computed(() => eventData.value?.groups ?? [])
    const fc = currentEventCollection('feedback')
    const feedbackDirtyTime = usePersistentRef('feedbackDirtyTime', new Date(0).getTime())
    const feedbackRepliesRaw = skipHydrate(useCollection(fc, { snapshotListenOptions: { includeMetadataChanges: false }, once: !!import.meta.server }))
    const feedbackConfig = useSorted(useCollection<FeedbackConfig>(computed(() => firestore ? eventSubCollection(firestore, selectedEvent.value, 'feedbackConfig') : null)), (a, b) => parseInt(a.id) - parseInt(b.id))
    const feedback = {
        col: fc,
        dirtyTime: feedbackDirtyTime,
        error: ref(),
        fetchFailed: ref(false),
        fetching: ref(false),
        hydrate: hydrateOfflineFeedback,
        watchFetching(cb: WatchCallback<boolean, boolean>) {
            watch(feedback.fetching, cb)
        },
        infoText: computed(() => eventData.value?.feedbackInfo),
        online: computed(() => {
            const result: FeedbackSections = {}
            const replies = feedbackRepliesRaw.value as any
            if (replies) {
                for (const val of replies) {
                    const key = val.id
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
        /**
         * Set both online and offline feedback for a program item
         * @param sIndex Section index
         * @param eIndex Program item index
         * @param data Feedback data
         * @param userIdentifier Specify to set feedback for another user - it will not be saved offline
         */
        set(sIndex: number | string, eIndex: number | string, data: Feedback | null, userIdentifier?: string) {
            feedback.fetching.value = true
            if (typeof userIdentifier === 'undefined') {
                // when userIdentifier is not set, it means that the user is setting his own feedback
                // so cache it offline
                offlineFeedback.value[selectedEvent.value] = {
                    ...offlineFeedback.value[selectedEvent.value],
                    [sIndex]: {
                        ...offlineFeedback.value[selectedEvent.value]?.[sIndex],
                        [eIndex]: { [settings.userIdentifier]: data },
                    },
                }
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
            }, { merge: true }).catch((e) => { feedback.error.value = e })

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
                const section = payload[sIndex]
                for (const eIndex in section) {
                    const event = section[eIndex]
                    for (const uIndex in event) {
                        const reply = event[uIndex]
                        if (reply === null || typeof reply === 'undefined') {
                            event[uIndex] = deleteField()
                        }
                    }
                    section[eIndex] = event
                }
                promises.push(setDoc(doc(feedback.col.value!, sIndex), section, {
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
    const userAuth = config.public.debugUser ? ref(debugUser) : (config.public.ssrAuthEnabled || import.meta.client) ? useCurrentUser() : null
    const usersCollection = firestore ? knownCollection(firestore, 'users') : null
    const ud = computed(() => userAuth?.value?.uid && usersCollection ? doc(usersCollection, userAuth.value.uid) : null)

    const user = {
        auth: skipHydrate(userAuth),
        doc: skipHydrate(ud),
        info: config.public.debugUser ? ref(<UserInfo>{
            lastLogin: new Date().getTime(),
            name: 'Debug User',
            permissions: {
                superAdmin: true,
            },
            lastTimezone: new Date().getTimezoneOffset(),
            signature: {
                [selectedEvent.value]: 'Debug User',
            },
            signatureId: {
                [selectedEvent.value]: 'debug',
            },
            subscriptions: {

            },
            email: debugUser.email ?? undefined,
            photoURL: debugUser.photoURL ?? undefined,
        }) : useDocument<UserInfo>(ud),
        error: ref(),
        pendingPopup: ref(false),
        async signOut() {
            await signOut(auth!)
            isAuthenticated.value = false
        },
        async signIn(useRedirect = false, secondAttempt = false): Promise<boolean> {
            if (!useRedirect) { user.pendingPopup.value = true }
            try {
                // With emulators the popup version would throw cross-origin error
                await (useRedirect === true && !config.public.emulators ? signInWithRedirect : signInWithPopup)(auth!, googleAuthProvider, browserPopupRedirectResolver)
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
                user.pendingPopup.value = false
                return nextResult
            }
        },
    }

    async function onSignIn(newUser: User) {
        if (user.doc.value) {
            if (user.info.value) {
                const signatureId = user.info.value.signatureId?.[selectedEvent.value]
                if (signatureId) {
                    if (confirm('Tento účet již byl použit pro zpětnou vazbu. Chcete do tohoto zařízení načíst vaši předchozí zpětnou vazbu? Bude přepsán aktuálně offline uložený stav.')) {
                        settings.setUserIdentifier(signatureId)
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
        }
    }

    watch(settings, async (newSettings) => {// TODO check user diff and not set always
        if (newSettings && user.doc.value && userAuth?.value?.uid && import.meta.client) {
            await setDoc(user.doc.value, {
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
        if (user.auth?.value?.uid) {
            const onlinePermission = user.info.value?.permissions?.[selectedEvent.value]
            const superAdmin = user.info.value?.permissions?.superAdmin
            if (typeof onlinePermission !== 'undefined') {
                return {
                    editSchedule: [UserLevel.ScheduleAdmin.toString(), UserLevel.Admin.toString()].includes(onlinePermission.toString()) || superAdmin === true,
                    editEvent: onlinePermission.toString() === UserLevel.Admin.toString() || superAdmin === true,
                    superAdmin: superAdmin === true,
                }
            }
            return {
                editSchedule: superAdmin === true,
                editEvent: superAdmin === true,
                superAdmin: superAdmin === true,
            }
        }
        return {
            editSchedule: false,
            editEvent: false,
            superAdmin: false,
        }

    })
    const permissionNames = computed(() => ({
        ...(resolvedPermissions.value.superAdmin ? { [UserLevel.SuperAdmin]: 'SuperAdmin' } : {}), // super admin can make others super admins
        ...(resolvedPermissions.value.editEvent ? { [UserLevel.Admin]: 'Správce ' + eventTitle.value } : {}),
        [UserLevel.ScheduleAdmin]: 'Editor programu',
        [UserLevel.Nothing]: 'Nic',
    }))
    const scheduleCollection = useCollection<ScheduleDay>(computed(() => firestore ? eventSubCollection(firestore, selectedEvent.value, 'schedule') : null), {
        maxRefDepth: 1,
    })
    const days = skipHydrate(scheduleCollection)

    const suggestionsAndLast = useCollection(firestore ? knownCollection(firestore, 'suggestions') : null, { maxRefDepth: 0, once: !!import.meta.server })
    const suggestions = computed<ScheduleEvent[]>(() => suggestionsAndLast.value.filter((s) => s.id !== 'last'))
    const lastSuggestion = computed(() => {
        let last = suggestionsAndLast.value.find((s) => s.id === 'last')?.last
        if (isNaN(last)) {
            last = 0
        }
        return (last ?? -1) as number
    })

    const notesCollection = currentEventCollection('notes')
    const offlineFeedback = usePersistentRef<{ [event: string]: { [sIndex: number | string]: { [eIndex: number | string]: { [userIdentifier: string]: Feedback | null } } } }>('lastNewFeedback', {})
    const messagingToken = usePersistentRef('messagingToken', '')
    const isAuthenticated = usePersistentRef('isAuthenticated', false)

    watch(messagingToken, async (newToken) => {
        if (user.doc.value && userAuth?.value?.uid && import.meta.client) {
            await setDoc(user.doc.value, {
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
        if (new Date(onlineFeedback?.[settings.userIdentifier]?.updated ?? 0).getTime() > feedback.dirtyTime.value) {
            for (const sIndex in onlineFeedback) {
                const sPart = onlineFeedback[sIndex]
                for (const eIndex in sPart) {
                    const ePart = sPart[eIndex]
                    const uPart = ePart[settings.userIdentifier]
                    if (uPart) {
                        let offSPart = offlineFeedback.value[selectedEvent.value][sIndex]
                        if (!offSPart) { offSPart = {} }
                        let offEPart = offSPart[eIndex]
                        if (!offEPart) { offEPart = {} }
                        offEPart[settings.userIdentifier] = uPart
                        offSPart[eIndex] = offEPart
                        offlineFeedback.value[selectedEvent.value][sIndex] = offSPart
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
    hydrateOfflineFeedback(feedback.online.value)

    // Hydrate user
    if (import.meta.client) {
        setTimeout(async () => {
            await getRedirectResult(auth!).catch((reason) => {
                console.error('Failed redirect result', reason)
                app.$Sentry.captureEvent(reason, {
                    data: reason,
                })
                user.error.value = reason
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
                },
                error: console.error,
                complete: () => { console.log('completed') },
            })
        }, 1)
    }

    if (import.meta.client) {
        navigator.serviceWorker?.getRegistration().then(async (registration) => {
            if (registration?.active && firebaseApp) {
                const messaging = getMessaging(firebaseApp)
                await getToken(messaging, { vapidKey: config.public.messagingConfig.vapidKey, serviceWorkerRegistration: registration }).then(async (newToken) => {
                    if (newToken) {
                        messagingToken.value = newToken
                        if (subscriptionsCollection.value) {
                            await setDoc(doc(subscriptionsCollection.value, newToken), {
                                subscribed: true,
                            } as UpdateRecordPayload<Subscriptions>, { merge: true })
                        }
                    }
                })
            }
        }).catch(e => { console.error(e), app.$Sentry.captureException(e) })
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
        feedback: skipHydrate(feedback),
        feedbackConfig: feedbackConfig,
        offlineFeedback: skipHydrate(computed(() => offlineFeedback.value[selectedEvent.value])),
        permissionNames,
        resolvedPermissions,
        suggestions,
        lastSuggestion,
        user,
        eventsCollection: useCollection<EventDescription<DocumentData>>(firestore ? knownCollection(firestore, 'events') : null, { maxRefDepth: 0, once: !!import.meta.server }),
        probe,
    }
})

