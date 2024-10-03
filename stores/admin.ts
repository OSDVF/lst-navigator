import { defineStore } from 'pinia'
import type { ScheduleEvent } from '~/types/cloud'

export type DisplayKind = 'histogram' | 'individual'

export const useAdmin = defineStore('admin', function () {
    const displayKind = usePersistentRef<DisplayKind>('displayKind', 'histogram')
    const editingFeedback = usePersistentRef('editingFeedback', false)
    const anonymize = usePersistentRef('anonymize', true)
    const clipboard = usePersistentRef<ScheduleEvent | null>('eventClipboard', null)

    return {
        anonymize,
        clipboard,
        displayKind,
        editingFeedback: computed({
            get: () => editingFeedback.value && displayKind.value === 'individual',
            set: (value: boolean) => { editingFeedback.value = value },
        }),
    }
})
