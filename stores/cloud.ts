// TODO feedback as subcollections
import { defineStore, skipHydrate } from 'pinia'
import { FieldValue, Firestore, writeBatch, type CollectionReference } from 'firebase/firestore'
import { arrayUnion, collection, deleteField, doc } from 'firebase/firestore'
import { setDoc as setDocT, useDocument as useDocumentT, useCollection as useCollectionT } from '~/utils/trace'
import { updateCurrentUserProfile, useCurrentUser, useFirebaseAuth } from 'vuefire'
import { getMessaging, getToken } from 'firebase/messaging'
import {
    GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect, signOut, browserLocalPersistence, type User, browserPopupRedirectResolver, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updatePassword, sendEmailVerification,
    reauthenticateWithPopup,
    reauthenticateWithRedirect,
    type UserCredential,
} from 'firebase/auth'
import { useSettings } from '@/stores/settings'
import { useLocalStorage } from '@vueuse/core'
import { UserLevel } from '@/types/cloud'
import * as Sentry from '@sentry/nuxt'
import union from 'lodash.union'
import merge from 'lodash.merge'
import { scopes } from './gapi'

import type { KnownCollectionName } from '@/utils/db'
import type { EventDescription, EventSubcollection, FeedbackConfig, Feedback, FeedbackSections, ScheduleDay, Subscriptions, UserInfo, Permissions, EventDocs, UpdateRecordPayload, ScheduleItem, UpdatePayload } from '@/types/cloud'
import type { WatchCallback } from 'vue'
import type { RuntimeConfig } from 'nuxt/schema'
import type { Router } from '#vue-router'

/**
 * Compile time check that this collection really exists (is checked by the server)
 * @__NO_SIDE_EFFECTS__
 */
export function knownCollection(firestore: Firestore, name: KnownCollectionName, ...pathSegments: string[]) {
    return collection(firestore, name, ...pathSegments)
}

export const defaultQuestions = [
    'Rečník',
    'Osobní přínos',
    'Srozumitelnost',
]

export const googleAuthProvider = new GoogleAuthProvider()

let probe = true
if (!import.meta.browser && import.meta.env.FIREBASE_EMULATOR !== 'true') {
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
    return knownCollection(fs, 'events', event, document, ...segments)
}

/// Get references of all documents and collections corresponding to a specific event
export function eventDocs(fs: Firestore, name: string): EventDocs {
    return {
        event: doc(knownCollection(fs, 'events'), name),
        groups: eventSubCollection(fs, name, 'groups'),
        duties: eventSubCollection(fs, name, 'duties'),
        notes: eventSubCollection(fs, name, 'notes'),
        feedback: eventSubCollection(fs, name, 'feedback'),
        feedbackConfig: eventSubCollection(fs, name, 'feedbackConfig'),
        schedule: eventSubCollection(fs, name, 'schedule'),
        subscriptions: eventSubCollection(fs, name, 'subscriptions'),
    }
}

/**
 * Encapsulates all reactive communication with firestore
 */
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

    const router = useRouter()
    const selectedEvent = useSelectedEvent(router, config)

    function eventDoc(...path: (string | EventSubcollection)[]) {
        return doc(knownCollection(firestore!, 'events'), selectedEvent.value, ...path)
    }
    const auth = probe && (config.public.ssrAuthEnabled || import.meta.client) ? useFirebaseAuth() : null
    auth?.useDeviceLanguage()

    if (import.meta.client) {
        auth?.setPersistence(browserLocalPersistence)
    }
    const eventDescription = useDocumentT<EventDescription<void>>(computed(() => firestore ? doc(firestore, 'events' as KnownCollectionName, selectedEvent.value) : null), {
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
    const groups = skipHydrate(useCollectionT(currentEventCollection('groups'), { snapshotListenOptions: { includeMetadataChanges: false }, once: !!import.meta.server }))
    const duties = skipHydrate(useCollectionT(currentEventCollection('duties'), { snapshotListenOptions: { includeMetadataChanges: false }, once: !!import.meta.server }))

    //
    // Feedback
    //
    const fc = currentEventCollection('feedback')
    const feedbackDirtyTime = skipHydrate(useLocalStorage('feedbackDirtyTime', new Date(0).getTime(), { initOnMounted: true }))
    const feedbackRepliesRaw = skipHydrate(useCollectionT(fc, { snapshotListenOptions: { includeMetadataChanges: false }, once: !!import.meta.server }))
    const feedbackConfig = useSorted(useCollectionT<FeedbackConfig>(currentEventCollection('feedbackConfig')), (a, b) => parseInt(a.id) - parseInt(b.id))
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
        /** Delete feedback for all user for this event */
        async clear() {
            return deleteCollection(feedback.col.value!)
        },
        async deleteUser(uid: string) {
            const batch = writeBatch(firestore!)
            for (const partIndex in feedback.online.value) {
                if (!feedbackConfig.value.some((f) => f.title == partIndex)) {
                    continue // skip user activity records
                }

                const part = feedback.online.value[partIndex]
                for (const questionIndex in part) {
                    const question = part[questionIndex as keyof typeof part] as UpdateRecordPayload<Feedback>
                    if (typeof question == 'object') {
                        question[uid] = deleteField()
                        console.debug(`Remove ${partIndex}/${questionIndex}/${uid}`)
                    }
                }

                batch.set(doc(feedback.col.value!, partIndex), part, { merge: true })
                batch.delete(doc(feedback.col.value!, settings.userIdentifier.value))

                console.debug(`Remove user ${partIndex}/${uid}`)
            }
            await batch.commit()
        },
        /**
         * Set both online and offline feedback for a program item
         * @param sIndex Section index
         * @param eIndex Program item index
         * @param data Feedback data
         * @param userIdentifier Specify to set feedback for another user - it will not be saved offline
         */
        set(sIndex: number | string, eIndex: number | string, data: UpdatePayload<Feedback | null>, userIdentifier?: string) {
            feedback.fetching.value = true
            if (typeof userIdentifier === 'undefined') {
                // when userIdentifier is not set, it means that the user is setting his own feedback
                // so cache it offline
                offlineFeedback.value[selectedEvent.value] = {
                    ...offlineFeedback.value[selectedEvent.value],
                    [sIndex]: {
                        ...offlineFeedback.value[selectedEvent.value]?.[sIndex],
                        [eIndex]: { [settings.userIdentifier.value]: data },
                    },
                }
            }
            userIdentifier ??= settings.userIdentifier.value
            feedbackDirtyTime.value = new Date().getTime()

            setDocT(doc(feedback.col.value!, sIndex.toString()), {
                [eIndex]: {
                    [userIdentifier]: data !== null ? data : deleteField(),
                },
            }, { merge: true })
                .then(() => { feedback.fetching.value = feedback.fetchFailed.value = false }).catch((e) => { feedback.error.value = e })

            setDocT(doc(feedback.col.value!, userIdentifier), {
                updated: feedbackDirtyTime.value,
                nickname: settings.userNickname.value,
            }, { merge: true }).catch((e) => { feedback.error.value = e })

            setTimeout(() => {
                feedback.fetchFailed.value = feedback.fetching.value
                feedback.fetching.value = false
            }, 5000)
        },
        saveAgain(force = true) {
            if (!force && !feedback.error.value && !feedback.fetchFailed.value && feedback.online.value?.[settings.userIdentifier.value]?.updated === feedbackDirtyTime.value) {
                return Promise.resolve()
            }

            feedback.fetching.value = true
            const promises = []

            // Convert null reply to deleteField
            const payload: { [sIndex: string | number]: { [eIndex: string | number]: { [uIndex: string]: UpdatePayload<Feedback> | FieldValue | null } } } = offlineFeedback.value[selectedEvent.value]
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
                promises.push(setDocT(doc(feedback.col.value!, sIndex), section, {
                    merge: true,
                }))
            }
            feedbackDirtyTime.value = new Date().getTime()
            promises.push(setDocT(doc(feedback.col.value!, settings.userIdentifier.value), {
                updated: feedbackDirtyTime.value,
                nickname: settings.userNickname.value,
            }, { merge: true }))


            const result = Promise.all(promises).then(() => { feedback.fetching.value = feedback.fetchFailed.value = false }).catch((e) => { feedback.error.value = e })
            setTimeout(() => {
                feedback.fetchFailed.value = feedback.fetching.value
                feedback.fetching.value = false
            }, 5000)
            return result
        },
    }

    watch(settings.userIdentifier, (newId) => {
        if (newId) {
            feedback.dirtyTime.value = 0// force refresh from remote
            feedback.hydrate(feedback.online.value)
            const nick = feedback.online.value[newId]
            if (typeof nick !== 'undefined' && typeof nick.nickname == 'string') {
                settings.userNickname.value = nick.nickname
            }
        } else {// clear feedback if user is not logged in
            if (offlineFeedback.value[selectedEvent.value]) { offlineFeedback.value[selectedEvent.value] = {} }
        }
    })

    //
    // User auth
    //
    const userAuth = config.public.debugUser ? ref(debugUser) : (config.public.ssrAuthEnabled || import.meta.client) ? useCurrentUser() : ref()
    if (userAuth.value) {
        watch(userAuth, async (newUser: User) => {
            if (newUser) {
                if (!wasAuthenticated.value) {
                    wasAuthenticated.value = true
                    if (config.public.debugUser) {
                        onSignIn(newUser)
                    } else if (typeof newUser.metadata.lastSignInTime != 'undefined') {
                        // is already registered
                        watch(uInfo, () => onSignIn(newUser), { once: true })
                    } else {
                        // logs in for the first time
                        onSignIn(newUser)
                    }
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
        auth: skipHydrate(userAuth as Ref<User | null>),
        doc: skipHydrate(ud),
        info: config.public.debugUser ? ref(<UserInfo>{
            lastLogin: new Date().getTime(),
            name: 'Debug User',
            permissions: {
                superAdmin: true,
            },
            lastTimezone: new Date().getTimezoneOffset(),
            responseId: {},
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
        adminAuth: useLocalStorage<{ accessToken: string, expirationTime: number, scopes: string[] }>('adminAuth', {
            accessToken: '',
            expirationTime: 0,
            scopes: [],
        }),
        async deleteData() {
            user.adminAuth.value = undefined
            await feedback.deleteUser(settings.userIdentifier.value)
            await deleteDoc(doc(notesCollection.value!, settings.userIdentifier.value))
            settings.setUserIdentifier(settings.generateUID())
        },
        hasAdminScopes: computed((() => {
            const currentScopes = user.adminAuth.value.scopes
            return user.isGoogleSignedIn.value && user.adminAuth.value.expirationTime > new Date().getTime() && scopes.every(s => currentScopes.includes(s))
        }) as (() => boolean)),
        hydrateFromCredential(result: UserCredential) {
            const credential = GoogleAuthProvider.credentialFromResult(result)
            user.adminAuth.value = {
                accessToken: credential!.accessToken!,
                expirationTime: new Date().getTime() + (parseInt(result._tokenResponse.expiresIn!) * 1000),
                scopes: JSON.parse(result._tokenResponse.rawUserInfo!).granted_scopes.split(' '),
            }
        },
        isGoogleSignedIn: computed(() => userAuth.value?.uid && userAuth.value?.providerData[0].providerId == GoogleAuthProvider.PROVIDER_ID),
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
        /**
         * Name will be the password
         */
        async singInParticipant(name: string, verify: string, differentEmail?: string, applications?: ReturnType<typeof useApplications>) {
            if (!name || !verify) {
                return false
            }

            const a = applications ?? useApplications()
            const nameField = a.settings?.fields.name ?? config.public.applicationDefaultNameField
            const verifyField = differentEmail ? (a.settings?.fields.phone ?? config.public.applicationDefaultPhoneField) : (a.settings?.fields.name ?? config.public.applicationDefaultNameField)
            const nameTrimmed = name.trim()
            const verifyTrimmed = verify.trim()
            const response = a.applications.find(ap => {
                const nameResponse = ap.questions.find(q => typeof nameField == 'number' ? q.id == nameField : q.title == nameField)?.responses
                const verifyResponse = ap.questions.find(q => typeof verifyField == 'number' ? q.id == verifyField : q.title == verifyField)?.responses
                return nameResponse?.toString().trim() == nameTrimmed && verifyResponse?.toString().trim() == verifyTrimmed
            })
            if (!response) {
                return false
            }

            if (user.doc.value) {
                //logged in
                return updateUserInfo(response.id)
            }
            
            await user.register(differentEmail ?? verify, name)
            
            await new Promise<void>(resolve => {
                const stop = watch(user.info, newInfo => {
                    if (newInfo) {
                        stop()
                        resolve()
                    }
                }, { immediate: true })
            })
            return updateUserInfo(response.id)

            function updateUserInfo(responseId: string) {
                return setDocT(user.doc.value!, {
                    responseId: {
                        ...user.info.value?.responseId,
                        [selectedEvent.value]: responseId,
                    },
                } as UserInfo, { merge: true })
            }
        },
        async signOut() {
            uPending.value = true
            await signOut(auth!)
            user.adminAuth.value = undefined
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
        async signIn(useRedirect = false, secondAttempt = false, email?: string, password?: string, admin?: boolean): Promise<boolean> {
            if (config.public.featureForms && !config.public.emulators && (router.currentRoute.value.fullPath.includes('admin') || admin)) {
                const currentScopes = googleAuthProvider.getScopes()
                for (const scope of scopes) {
                    if (!currentScopes.includes(scope)) {
                        googleAuthProvider.addScope(scope)
                    }
                }
            }
            if (!useRedirect) { user.pendingPopup.value = true }
            uPending.value = true
            try {
                user.error.value = null
                if (email && password) {
                    await signInWithEmailAndPassword(auth!, email, password)
                } else {
                    // With emulators the popup version would throw cross-origin error
                    const result = await (user.auth.value ?
                        ((useRedirect === true || config.public.emulators) ? reauthenticateWithRedirect : reauthenticateWithPopup)(user.auth.value!, googleAuthProvider, browserPopupRedirectResolver)
                        : ((useRedirect === true || config.public.emulators) ? signInWithRedirect : signInWithPopup)(auth!, googleAuthProvider, browserPopupRedirectResolver))
                    user.hydrateFromCredential(result)
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
                    } else if (useRedirect !== true && confirm(retrySignInText)) {
                        nextResult = await user.signIn(true, true, email, password, admin)
                    }
                }
                uPending.value = false
                user.pendingPopup.value = false
                return nextResult
            }
        },
    }

    async function onSignIn(newUser: User) {
        if (user.doc.value) {// do not ask if the user is already being asked in different browser tab
            if (user.info.value) {
                const signatureId = user.info.value.signatureId?.[selectedEvent.value]
                if (signatureId) {
                    settings.setUserIdentifier(signatureId)
                    settings.userNickname.value = user.info.value!.signature[selectedEvent.value] || settings.userNickname.value
                }
            }

            if (newUser.providerData[0].providerId !== GoogleAuthProvider.PROVIDER_ID) {
                updateCurrentUserProfile({
                    displayName: settings.userNickname.value,
                })
            }

            const now = new Date()
            const payload: UserInfo = {
                name: newUser.displayName || user.info.value?.name,
                signature: {
                    ...user.info.value?.signature,
                    [selectedEvent.value]: settings.userNickname.value,
                },
                responseId: user.info.value?.responseId ?? {},// do not update
                signatureId: {
                    ...user.info.value?.signatureId,
                    [selectedEvent.value]: settings.userIdentifier.value,
                },
                subscriptions: {
                    ...user.info.value?.subscriptions,
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
                    : undefined!,
            }
            // remove undefined values
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            Object.keys(payload).forEach(key => payload[<keyof UserInfo>key] === undefined ? delete payload[<keyof UserInfo>key] : {})

            await setDocT(user.doc.value, payload, {
                merge: true,
            })
        }
    }

    watch([settings.userNickname, settings.userIdentifier], async ([nick, ident]) => {// TODO check user diff and not set always
        if (nick && user.doc.value && userAuth?.value?.uid && import.meta.client) {
            await setDocT(user.doc.value, {
                signature: {
                    ...user.info.value?.signature,
                    [selectedEvent.value]: nick,
                },
                signatureId: {
                    ...user.info.value?.signatureId,
                    [selectedEvent.value]: ident,
                },
            }, {
                merge: true,
            })

            if (userAuth.value.providerData[0].providerId !== GoogleAuthProvider.PROVIDER_ID) {
                updateCurrentUserProfile({
                    displayName: nick,
                })
            }
        }
    })

    const resolvedPermissions = computed<Permissions>(() => {
        if (config.public.debugUser) {
            return {
                participant: true,
                showApplications: true,
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
                    participant: !!user.info.value?.responseId[selectedEvent.value],
                    showApplications: [UserLevel.ShowApplications.toString(), UserLevel.ScheduleAdmin.toString(), UserLevel.Admin.toString()].includes(onlinePermission.toString()) || superAdmin === true,
                    editSchedule: [UserLevel.ScheduleAdmin.toString(), UserLevel.Admin.toString()].includes(onlinePermission.toString()) || superAdmin === true,
                    editEvent: onlinePermission.toString() === UserLevel.Admin.toString() || superAdmin === true,
                    superAdmin: superAdmin === true,
                }
            }
            return {
                participant: superAdmin === true,
                showApplications: superAdmin === true,
                editSchedule: superAdmin === true,
                editEvent: superAdmin === true,
                superAdmin: superAdmin === true,
            }
        }
        return {
            participant: false,
            showApplications: false,
            editSchedule: false,
            editEvent: false,
            superAdmin: false,
        }

    })
    const permissionNames = computed(() => ({
        ...(resolvedPermissions.value.superAdmin ? { [UserLevel.SuperAdmin]: 'SuperAdmin' } : {}), // super admin can make others super admins
        ...(resolvedPermissions.value.editEvent ? { [UserLevel.Admin]: 'Správce ' + (eventDescription.value?.title ?? '') } : {}),
        [UserLevel.ScheduleAdmin]: 'Editor programu',
        [UserLevel.ShowApplications]: 'Zobrazení přihlášek',
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
    const offlineFeedback = skipHydrate(useLocalStorage<{ [event: string]: { [sIndex: number | string]: { [eIndex: number | string]: { [userIdentifier: string]: UpdatePayload<Feedback> | FieldValue | null } } } }>('lastNewFeedback', {}, { initOnMounted: true }))
    const messagingToken = skipHydrate(useLocalStorage('messagingToken', '', { initOnMounted: true }))
    const wasAuthenticated = skipHydrate(useLocalStorage('isAuthenticated', false, { initOnMounted: true }))

    watch(messagingToken, async (newToken) => {
        if (user.doc.value && userAuth?.value?.uid && import.meta.client) {
            await setDocT(user.doc.value, {
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
        const now = new Date(onlineFeedback?.[settings.userIdentifier.value]?.updated ?? 0).getTime()
        if (now > feedback.dirtyTime.value) {
            let off = toRaw(offlineFeedback.value?.[selectedEvent.value])
            if (!off) {
                off = {}
            }
            for (const sIndex in onlineFeedback) {
                const sPart = onlineFeedback[sIndex]
                for (const eIndex in sPart) {
                    const ePart = sPart[eIndex]
                    const uPart = ePart[settings.userIdentifier.value]
                    if (uPart) {
                        let offSPart = off[sIndex]
                        if (!offSPart) { offSPart = {} }
                        let offEPart = offSPart[eIndex]
                        if (!offEPart) { offEPart = {} }
                        offEPart[settings.userIdentifier.value] = uPart
                        offSPart[eIndex] = offEPart
                        off[sIndex] = offSPart
                    }
                }
            }
            offlineFeedback.value[selectedEvent.value] = off
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
            getRedirectResult(auth!).then(result => {
                if (result) {
                    user.hydrateFromCredential(result)
                }
            }).catch((reason) => {
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
                                await setDocT(doc(subscriptionsCollection.value, newToken), {
                                    subscribed: true,
                                } as UpdateRecordPayload<Subscriptions>, { merge: true })
                            }
                        }
                    })
                }
            }
        }).catch(e => { console.error(e); if (process.env.SENTRY_DISABLED !== 'true') { Sentry.captureException(e) } })
    }

    const eventsCollection = useCollectionT<EventDescription<void>>(firestore ? knownCollection(firestore, 'events') : null, { maxRefDepth: 0, once: !!import.meta.server })
    const visibleEvents = computed(() => {
        const events: (EventDescription<void> & { id: string, a: boolean, f: boolean })[] = []
        for (const e of eventsCollection.value) {
            const s = shouldShowEvent(e)
            if (s ?? config.public.showEventsWithoutInteractions) {
                const a = applicationsEnabled(e)
                const f = feedbackEnabled(e)
                if (a || f || config.public.showEventsWithoutInteractions) {
                    events.push({
                        ...e, f, a, id: e.id,
                    })
                }
            }
        }
        return events.sort((a, b) => toJSDate(a.order ?? a.start).getTime() - toJSDate(b.order ?? b.start).getTime())
    })
    const participantSectionVisible = computed(() => (eventDescription.value?.formDocument && resolvedPermissions.value.participant) || (!eventDescription.value?.formDocument && (groups.value.length || duties.value.length)))
    return {
        currentEventCollection,
        days,
        duties,
        eventDescription,
        eventDoc,
        eventLoading: skipHydrate(eventDescription.pending),
        eventsCollection,
        feedback: skipHydrate(feedback),
        feedbackConfig: feedbackConfig,
        groups,
        networkError: skipHydrate(eventDescription.error),
        notesCollection: skipHydrate(notesCollection),
        offlineFeedback: skipHydrate(computed(() => offlineFeedback.value[selectedEvent.value])),
        participantSectionVisible,
        permissionNames,
        probe,
        resolvedPermissions,
        scheduleLoading: skipHydrate(scheduleCollection.pending),
        /** ID */
        selectedEvent,
        suggestions,
        /**
         * Events shown on main page sorted by date ascending
         */
        visibleEvents,
        lastSuggestion,
        user,
    }
})

export function shouldShowEvent<T>(e: EventDescription<T>): boolean | undefined {
    const now = new Date().getTime()
    if (e.showFrom && toJSDate(e.showFrom).getTime() > now) {
        return false
    } else if (e.showTo && toJSDate(e.showTo).getTime() >= now) {
        return true
    }

    if (e.showTo && toJSDate(e.showTo).getTime() < now) {
        return false
    } else if (e.showFrom && toJSDate(e.showFrom).getTime() <= now) {
        return true
    }
    return undefined
}

export function fromUpdatePayload<T>(data: UpdatePayload<T> | FieldValue | null, previousData: T): Partial<T> | null {
    const newData = data
    if (newData instanceof FieldValue) {
        return fromUpdatePayload({ a: newData }, { a: null })?.a ?? null
    } else {
        for (const key in newData) {
            const v = newData[key] as any
            if (typeof v == 'object' && Object.hasOwn(v, '_methodName') && v) {
                switch (v._methodName) {
                case 'arrayUnion':
                    console.debug('arrayUnion', data, previousData)
                    newData[key] = union<any>(previousData[key] as any, v.Uu) as any
                    break
                case 'deleteField':
                    console.debug('deleteField', data, previousData)
                    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                    delete newData[key]
                    break
                default:
                    console.debug('unknown ' + v._methodName, data, previousData)
                }
            }
        }
    }

    return newData as Partial<T>
}

export const retrySignInText = 'Nepodařilo se přihlásit pomocí vyskakovacího okna. Zkusit jiný způsob?'
export function useSelectedEvent(router?: Router, config?: RuntimeConfig) {
    const router2 = router ?? useRouter()
    const config2 = config ?? useRuntimeConfig()
    return computed(() => router2.currentRoute.value.params.event as string || config2.public.defaultEvent)
}