import { doc } from 'firebase/firestore'
import type { QuestionResponse, ResponseRecord } from '~/form-connector/src/responses'
import type { SyncState } from '~/form-connector/src/settings'
import type { EventSettings } from '~/form-connector/src/types'
import { ApplicationState, type Application, type ApplicationFormSettings } from '~/types/cloud'
import { useDocument as useDocumentT, useCollection as useCollectionT } from '~/utils/trace'

export const useApplications = defineStore('applications', () => {
    const e = useSelectedEvent()
    const fs = useFirestore()
    const applications = useCollectionT<ResponseRecord & Application>(computed(() => fs ? knownCollection(fs, 'applications', e.value, 'responses') : null), {
        wait: true,
        snapshotListenOptions: {
            includeMetadataChanges: false,
        },
    })
    const settings = useDocumentT<EventSettings<string> & SyncState & ApplicationFormSettings>(computed(() => fs ? doc(knownCollection(fs, 'applications'), e.value) : null))

    const includeCancelled = ref(false)
    const filtered = computed(() => applications.value.filter(a => includeCancelled.value || a.state != ApplicationState.REJECTED))
    const filteredMapped = computed(() => filtered.value.map(a => ({
        record: a,
        mapped: maybe(settings.value?.fields, f => mapFields(a, f)),
    })))

    type MappedRecord = {
        [key in keyof ApplicationFormSettings['fields']]: QuestionResponse;
    } & {
        [questionIndex: number]: QuestionResponse
    }

    function mapFields(record: ResponseRecord, fields: ApplicationFormSettings['fields']): Partial<MappedRecord> {
        const mapped: Partial<MappedRecord> = {}
        for (const key in fields) {
            const f = fields[key]
            mapped[key as keyof ApplicationFormSettings['fields']] = record.questions.find(q => typeof f == 'number' ? q.id == f : q.title == f)
        }

        return mapped
    }
    return {
        applications,
        filtered,
        filteredMapped,
        includeCancelled,
        loadingApplications: applications.pending,
        mapFields,
        settings,
    }
})