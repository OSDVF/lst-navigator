// TODO feedback as subcollections
import { defineStore, skipHydrate } from 'pinia'
import { Firestore, type CollectionReference, type DocumentData, type FieldValue } from 'firebase/firestore'
import { arrayUnion, collection, deleteField, doc } from 'firebase/firestore'
import { setDoc, useDocument as useDocumentT, useCollection as useCollectionT } from '~/utils/trace'
import { updateCurrentUserProfile, useCurrentUser, useFirebaseAuth, useFirebaseStorage, useStorageFileUrl } from 'vuefire'
import { ref as storageRef } from '@firebase/storage'
import { getMessaging, getToken } from 'firebase/messaging'
import { GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect, signOut, browserLocalPersistence, type User, browserPopupRedirectResolver, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updatePassword, sendEmailVerification } from 'firebase/auth'
import { useSettings } from '@/stores/settings'
import { usePersistentRef } from '@/utils/persistence'
import { UserLevel } from '@/types/cloud'
import type { KnownCollectionName } from '@/utils/db'
import type { EventDescription, EventSubcollection, FeedbackConfig, Feedback, FeedbackSections, ScheduleDay, Subscriptions, UserInfo, Permissions, EventDocs, UpdateRecordPayload, ScheduleItem, Transfer } from '@/types/cloud'
import type { WatchCallback } from 'vue'
import * as Sentry from '@sentry/nuxt'
import merge from 'lodash.merge'

/**
 * Compile time check that this collection really exists (is checked by the server)
 * @__NO_SIDE_EFFECTS__
 */
export function knownCollection(firestore: Firestore, name: KnownCollectionName) {
    return collection(firestore, name)
}

export const defaultQuestions = [
    'Rečník',
    'Osobní přínos',
    'Srozumitelnost',
]

const googleAuthProvider = new GoogleAuthProvider()

let probe = true
if (!import.meta.browser) {
    // For the use case of SSR without internet access
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

    const firebaseStorage = probe && config.public.storageEnabled && useFirebaseStorage()
    const selectedEvent = usePersistentRef('selectedEvent-' + config.public.defaultEvent, config.public.defaultEvent)// invalidate the selected event when the default settings change
    function eventDoc(...path: (string | EventSubcollection)[]) {
        return doc(knownCollection(firestore!, 'events'), selectedEvent.value, ...path)
    }
    const auth = probe && (config.public.ssrAuthEnabled || import.meta.client) ? useFirebaseAuth() : null
    auth?.useDeviceLanguage()

    if (import.meta.client) {
        auth?.setPersistence(browserLocalPersistence)
    }

    const eventDocuments = useDocumentT<EventDescription<void>>(computed(() => firestore ? doc(firestore, 'events' as KnownCollectionName, selectedEvent.value) : null), {
        maxRefDepth: 5,
        wait: true,
    })

    function currentEventCollection(docName: EventSubcollection) {
        return computed(() => {
            if (!firestore) { return null }
            return eventSubCollection(firestore, selectedEvent.value, docName)
        })
    }

    const subscriptionsCollection = currentEventCollection('subscriptions')

    const eventImage = computed(() => eventDocuments.value?.image.type == 'cloud' && firebaseStorage
        ? useStorageFileUrl(storageRef(firebaseStorage, eventDocuments.value?.image.data)).url.value
        : eventDocuments.value?.image.data)

    //
    // Feedback
    //
    const fc = currentEventCollection('feedback')
    const feedbackDirtyTime = usePersistentRef('feedbackDirtyTime', new Date(0).getTime())
    const feedbackRepliesRaw = skipHydrate(useCollectionT(fc, { snapshotListenOptions: { includeMetadataChanges: false }, once: !!import.meta.server }))
    const feedbackConfig = useSorted(useCollectionT<FeedbackConfig>(computed(() => firestore ? eventSubCollection(firestore, selectedEvent.value, 'feedbackConfig') : null)), (a, b) => parseInt(a.id) - parseInt(b.id))
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
                                val[k as keyof typeof val] = merge(val[k as keyof typeof val], replies[k][0])
                                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                                delete replies[k]; delete result[innerKey]
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
                nickname: settings.userNickname,
            }, { merge: true }).catch((e) => { feedback.error.value = e })

            setTimeout(() => {
                feedback.fetchFailed.value = feedback.fetching.value
                feedback.fetching.value = false
            }, 5000)
        },
        saveAgain(force = true) {
            if(!force && !feedback.error.value && !feedback.fetchFailed.value && feedback.online.value?.[settings.userIdentifier]?.updated === feedbackDirtyTime.value) {
                return Promise.resolve()
            }

            feedback.fetching.value = true
            const promises = []

            // Convert null reply to deleteField
            const payload: { [sIndex: string | number]: { [eIndex: string | number]: { [uIndex: string]: Feedback | FieldValue | null } } } = offlineFeedback.value[selectedEvent.value]
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
            feedbackDirtyTime.value = new Date().getTime()
            promises.push(setDoc(doc(feedback.col.value!, settings.userIdentifier), {
                updated: feedbackDirtyTime.value,
                nickname: settings.userNickname,
            }, { merge: true }))


            const result = Promise.all(promises).then(() => { feedback.fetching.value = feedback.fetchFailed.value = false }).catch((e) => { feedback.error.value = e })
            setTimeout(() => {
                feedback.fetchFailed.value = feedback.fetching.value
                feedback.fetching.value = false
            }, 5000)
            return result
        },
    }

    watch(() => settings.userIdentifier, (newId) => {
        if (newId) {
            feedback.dirtyTime.value = 0// force refresh from remote
            feedback.hydrate(feedback.online.value)
        } else {// clear feedback if user is not logged in
            if (offlineFeedback.value[selectedEvent.value]) { offlineFeedback.value[selectedEvent.value] = {} }
        }
    })

    //
    // User auth
    //
    const userAuth = config.public.debugUser ? ref(debugUser) : (config.public.ssrAuthEnabled || import.meta.client) ? useCurrentUser() : ref()
    if (userAuth) {
        watch(userAuth, (newUser) => {
            if (newUser) {
                if (!wasAuthenticated.value) {
                    wasAuthenticated.value = true
                    onSignIn(newUser)
                }
            } else {
                wasAuthenticated.value = false
            }
        })
    }
    const usersCollection = firestore ? knownCollection(firestore, 'users') : null
    const ud = computed(() => userAuth?.value?.uid && usersCollection ? doc(usersCollection, userAuth.value.uid) : null)
    const uPending = ref(false)
    const uInfo = useDocumentT<UserInfo>(ud)

    function displayUserError(reason: any) {
        let reasonPretty = typeof reason === 'object' ? JSON.stringify(reason) : reason
        if (reasonPretty.length < 3) {
            reasonPretty = reason
        }
        if (process.env.SENTRY_DISABLED !== 'true') {
            Sentry.captureEvent(reason, {
                data: reasonPretty,
            })
        }

        console.error('Failed signin', reasonPretty)
        user.error.value = reason
    }

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
        }) : uInfo,
        error: ref(),
        pendingPopup: ref(false),
        pendingAction: computed(() => uPending.value),
        async changePassword(newPassword: string) {
            uPending.value = true
            try {
                await updatePassword(auth!.currentUser!, newPassword)
                user.error.value = null
                uPending.value = false
            } catch (reason: any) {
                displayUserError(reason)
                uPending.value = false
                throw reason
            }
        },
        async sendPasswordResetEmail(email: string) {
            uPending.value = true
            try {
                await sendPasswordResetEmail(auth!, email)
                user.error.value = null
                uPending.value = false
            } catch (reason: any) {
                uPending.value = false
                displayUserError(reason)
                throw reason
            }
        },
        async signOut() {
            uPending.value = true
            await signOut(auth!)
            wasAuthenticated.value = false
            uPending.value = false
        },
        async register(email: string, password: string) {
            uPending.value = true
            try {
                await createUserWithEmailAndPassword(auth!, email, password)
                sendEmailVerification(auth!.currentUser!)
                user.error.value = null
                uPending.value = false
            } catch (reason: any) {
                displayUserError(reason)
                uPending.value = false
                throw reason
            }
        },
        async signIn(useRedirect = false, secondAttempt = false, email?: string, password?: string): Promise<boolean> {
            if (!useRedirect) { user.pendingPopup.value = true }
            uPending.value = true
            try {
                user.error.value = null
                if (email && password) {
                    await signInWithEmailAndPassword(auth!, email, password)
                } else {
                    // With emulators the popup version would throw cross-origin error
                    await (useRedirect === true && !config.public.emulators ? signInWithRedirect : signInWithPopup)(auth!, googleAuthProvider, browserPopupRedirectResolver)
                }
                user.pendingPopup.value = false
                uPending.value = false
                return true
            } catch (reason: any) {
                displayUserError(reason)
                let nextResult = false
                if (!email || !password) {
                    if (secondAttempt === true) {
                        alert('Přihlášení se nepodařilo provést')
                    } else if (useRedirect !== true && confirm('Nepodařilo se přihlásit pomocí vyskakovacího okna. Zkusit jiný způsob?')) {
                        nextResult = await user.signIn(true, true, email, password)
                    }
                }
                uPending.value = false
                user.pendingPopup.value = false
                return nextResult
            }
        },
    }

    async function onSignIn(newUser: User) {
        if (user.doc.value && !localStorage.getItem('userIdentifierQuestion')) {// do not ask if the user is already being asked
            localStorage.setItem('userIdentifierQuestion', '1')
            if (user.info.value) {
                const signatureId = user.info.value.signatureId?.[selectedEvent.value]
                if (signatureId) {
                    if (confirm('Chcete do tohoto zařízení načíst data z předchozího používání této aplikace? Bude přepsán dosavadně offline uložený stav.')) {
                        settings.setUserIdentifier(signatureId)
                        settings.userNickname = user.info.value!.signature[selectedEvent.value] || settings.userNickname
                    }
                }
            }
            localStorage.removeItem('userIdentifierQuestion')

            if (newUser.providerData[0].providerId !== GoogleAuthProvider.PROVIDER_ID) {
                updateCurrentUserProfile({
                    displayName: settings.userNickname,
                })
            }

            const now = new Date()
            const payload: Partial<UserInfo> = {
                name: newUser.displayName || user.info.value?.name,
                signature: {
                    [selectedEvent.value]: settings.userNickname,
                },
                signatureId: {
                    [selectedEvent.value]: settings.userIdentifier,
                },
                subscriptions: {
                    [selectedEvent.value]: messagingToken.value,
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
                    [selectedEvent.value]: newSettings.userIdentifier,
                },
            }, {
                merge: true,
            })

            if (userAuth.value.providerData[0].providerId !== GoogleAuthProvider.PROVIDER_ID) {
                updateCurrentUserProfile({
                    displayName: newSettings.userNickname,
                })
            }
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
        ...(resolvedPermissions.value.editEvent ? { [UserLevel.Admin]: 'Správce ' + (eventDocuments.value?.title ?? '') } : {}),
        [UserLevel.ScheduleAdmin]: 'Editor programu',
        [UserLevel.Nothing]: 'Nic',
    }))
    const scheduleCollection = useCollectionT<ScheduleDay>(computed(() => firestore ? eventSubCollection(firestore, selectedEvent.value, 'schedule') : null), {
        maxRefDepth: 1,
    })
    const days = skipHydrate(scheduleCollection)

    const suggestionsAndLast = useCollectionT<ScheduleItem & { last: number }>(firestore ? knownCollection(firestore, 'suggestions') : null, { maxRefDepth: 0, once: !!import.meta.server })
    const suggestions = computed<ScheduleItem[]>(() => suggestionsAndLast.value.filter((s) => s.id !== 'last') as ScheduleItem[])
    const lastSuggestion = computed(() => {
        let last = suggestionsAndLast.value.find((s) => s.id === 'last')?.last ?? -1
        if (isNaN(last)) {
            last = 0
        }
        return last
    })

    const notesCollection = currentEventCollection('notes')
    const offlineFeedback = usePersistentRef<{ [event: string]: { [sIndex: number | string]: { [eIndex: number | string]: { [userIdentifier: string]: Feedback | null } } } }>('lastNewFeedback', {})
    const messagingToken = usePersistentRef('messagingToken', '')
    const wasAuthenticated = usePersistentRef('isAuthenticated', false)

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
    function hydrateOfflineFeedback(onlineFeedback?: any) {
        hydrationDebounce = null
        const now = new Date(onlineFeedback?.[settings.userIdentifier]?.updated ?? 0).getTime()
        if (now > feedback.dirtyTime.value) {
            for (const sIndex in onlineFeedback) {
                const sPart = onlineFeedback[sIndex]
                for (const eIndex in sPart) {
                    const ePart = sPart[eIndex]
                    const uPart = ePart[settings.userIdentifier]
                    if (uPart) {
                        let offSPart = toRaw(offlineFeedback.value[selectedEvent.value][sIndex])
                        if (!offSPart) { offSPart = {} }
                        let offEPart = offSPart[eIndex]
                        if (!offEPart) { offEPart = {} }
                        offEPart[settings.userIdentifier] = uPart
                        offSPart[eIndex] = offEPart
                        offlineFeedback.value[selectedEvent.value][sIndex] = offSPart
                    }
                }
            }
            feedback.dirtyTime.value = now
        }
    }   
    {
        let pendingOnlineFeedback: any
        watch(feedback.online, function (newOnlineFeedback) {
            pendingOnlineFeedback = newOnlineFeedback
            if (hydrationDebounce === null) {
                hydrationDebounce = setTimeout(() => hydrateOfflineFeedback(pendingOnlineFeedback), 800)
            }
        }, { immediate: true })
    }

    if (import.meta.browser) {
        // Hydrate user
        setTimeout(() => {
            getRedirectResult(auth!).catch((reason) => {
                console.error('Failed redirect result', reason)
                if (process.env.SENTRY_DISABLED !== 'true') {
                    Sentry.captureEvent(reason, {
                        data: reason,
                    })
                }
                user.error.value = reason
            })
        }, 1)

        navigator.serviceWorker?.getRegistration().then(async (registration) => {
            if (typeof config.public.notifications_vapidKey === 'string') {
                if (registration?.active && firebaseApp) {
                    const messaging = getMessaging(firebaseApp)
                    await getToken(messaging, { vapidKey: config.public.notifications_vapidKey, serviceWorkerRegistration: registration }).then(async (newToken) => {
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
            }
        }).catch(e => { console.error(e); if (process.env.SENTRY_DISABLED !== 'true') { Sentry.captureException(e) } })
    }
    return {
        currentEventCollection,
        days,
        eventData: eventDocuments,
        eventDoc,
        eventImage,
        eventLoading: skipHydrate(eventDocuments.pending),
        eventsCollection: useCollectionT<EventDescription<DocumentData>>(firestore ? knownCollection(firestore, 'events') : null, { maxRefDepth: 0, once: !!import.meta.server }),
        feedback: skipHydrate(feedback),
        feedbackConfig: feedbackConfig,
        networkError: skipHydrate(eventDocuments.error),
        notesCollection: skipHydrate(notesCollection),
        offlineFeedback: skipHydrate(computed(() => offlineFeedback.value[selectedEvent.value])),
        permissionNames,
        probe,
        resolvedPermissions,
        scheduleLoading: skipHydrate(scheduleCollection.pending),
        selectedEvent,
        suggestions,
        lastSuggestion,
        user,
    }
})

