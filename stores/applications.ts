import { doc } from 'firebase/firestore'
import { setDoc as setDocT, useDocument as useDocumentT, useCollection as useCollectionT } from '~/utils/trace'
import { ApplicationState, type QuestionResponse, type ResponseRecord } from '~/form-connector/src/responses'
import type { SyncState } from '~/form-connector/src/settings'
import type { EventSettings } from '~/form-connector/src/types'
import type { Application, ApplicationFormSettings, EventDescription, SpecialApplicationFields, UserInfo } from '~/types/cloud'


export const useApplications = defineStore('applications', () => {
    const cloud = useCloudStore()
    const config = useRuntimeConfig()
    const fs = useFirestore()
    const applications = useCollectionT<ResponseRecord & Application>(computed(() => fs ? knownCollection(fs, 'applications', cloud.selectedEvent, 'responses') : null), {
        wait: true,
        snapshotListenOptions: {
            includeMetadataChanges: false,
        },
    })
    const settings = useDocumentT<EventSettings<string> & SyncState & ApplicationFormSettings>(computed(() => fs ? doc(knownCollection(fs, 'applications'), cloud.selectedEvent) : null))

    const includeCancelled = ref(false)
    const filtered = computed(() => applications.value.filter(a => includeCancelled.value || a.state != ApplicationState.REJECTED))
    const filteredMapped = computed(() => filtered.value.map(a => ({
        record: a,
        mapped: maybe(settings.value?.fields, f => mapFields(a, f, cloud.eventDescription)),
    })))

    type MappedRecord = {
        [key in keyof ApplicationFormSettings['fields']]: QuestionResponse;
    } & {
        [questionIndex: number]: QuestionResponse
    }

    function mapFields(record: ResponseRecord, fields: ApplicationFormSettings['fields'], event?: EventDescription<void> | null): Partial<MappedRecord> {
        const mapped: Partial<MappedRecord> = {}
        for (const key in fields) {
            const f = fields[key]
            const val = record.questions.find(q => typeof f == 'number' ? q.id == f : q.title == f)
            switch (key as SpecialApplicationFields) {
            case 'arrival':
                mapped[key] = event ? {
                    id: 0,
                    title: config.public.applicationDefaultArrivalField,
                    responses: event.start,
                    ...val,
                } : val
                break
            case 'departure':
                mapped[key] = event ? {
                    id: 0,
                    title: config.public.applicationDefaultDepartureField,
                    responses: event.end,
                    ...val,
                } : val
                break
            default:
                mapped[key] = val
            }
        }

        return mapped
    }
    /**
     * Name will be the password
     */
    async function singInParticipant(name: string, verify: string, differentEmail?: string, applications?: ReturnType<typeof useApplications>) {
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

        if (cloud.user.doc) {
            //logged in
            return updateUserInfo(response.id)
        }

        await cloud.user.register(differentEmail ?? verify, name)

        await new Promise<void>(resolve => {
            const stop = watch(() => cloud.user.info, newInfo => {
                if (newInfo) {
                    stop()
                    resolve()
                }
            }, { immediate: true })
        })
        return updateUserInfo(response.id)

        function updateUserInfo(responseId: string) {
            return setDocT(cloud.user.doc!, {
                responseId: {
                    ...cloud.user.info?.responseId,
                    [cloud.selectedEvent]: responseId,
                },
            } as UserInfo, { merge: true })
        }
    }
    return {
        applications,
        filtered,
        /** Will have arrival and departure set to the participant's response or to event border dates */
        filteredMapped,
        includeCancelled,
        loadingApplications: applications.pending,
        mapFields,
        settings,
        singInParticipant,
    }
})

export const ApplicationStateUI = {
    [ApplicationState.NEW]: {
        name: 'Nová',
        icon: 'stars',
        class: 'new',
    },
    [ApplicationState.CONFIRMED]: {
        name: 'Přijatá',
        icon: 'check',
        class: 'confirmed',
    },
    [ApplicationState.CANCELLED]: {
        name: 'Zrušená',
        icon: 'cancel',
        class: 'cancelled',
    },
    [ApplicationState.REJECTED]: {
        name: 'Odmítnutá',
        icon: 'minus-circle',
        class: 'rejected',
    },
}