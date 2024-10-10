import { defineStore } from 'pinia'
import type { FeedbackConfig, ScheduleEvent } from '~/types/cloud'

export type DisplayKind = 'histogram' | 'individual'

export const useAdmin = defineStore('admin', function () {
    const displayKind = usePersistentRef<DisplayKind>('displayKind', 'histogram')
    const editingFeedback = usePersistentRef('editingFeedback', false)
    const anonymize = usePersistentRef('anonymize', true)
    const eventClipboard = usePersistentRef<ScheduleEvent | null>('eventClipboard', null)
    const feedbackConfigClipboard = usePersistentRef<FeedbackConfig | null>('feedbackConfigClipboard', null)

    return {
        anonymize,
        eventClipboard,
        feedbackConfigClipboard,
        displayKind,
        editingFeedback: computed(() => editingFeedback.value && displayKind.value === 'individual'),
        setEditingFeedback(value: boolean) {
            editingFeedback.value = value
        },
    }
})
