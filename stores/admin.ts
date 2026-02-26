import { defineStore } from 'pinia'
import type { FeedbackConfig, ScheduleItem } from '~/types/cloud'
import { useLocalStorage } from '@vueuse/core'

export type DisplayKind = 'histogram' | 'individual'

export const useAdmin = defineStore('admin', function () {
    const displayKind = useLocalStorage<DisplayKind>('displayKind', 'histogram', {initOnMounted: true})
    const editingFeedback = useLocalStorage('editingFeedback', false, {initOnMounted: true})
    const anonymize = useLocalStorage('anonymize', true, {initOnMounted: true})
    const eventClipboard = useLocalStorage<ScheduleItem | null>('eventClipboard', null, {initOnMounted: true})
    const feedbackConfigClipboard = useLocalStorage<FeedbackConfig | null>('feedbackConfigClipboard', null, {initOnMounted: true})

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
