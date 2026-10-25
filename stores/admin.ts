import { defineStore } from 'pinia'
import type { FeedbackConfig, ScheduleItem } from '~/types/cloud'
import { useLocalStorage } from '@vueuse/core'

export type DisplayKind = 'histogram' | 'individual'

export const useAdmin = defineStore('admin', function () {
    const config = useRuntimeConfig()

    const displayKind = useLocalStorage<DisplayKind>('displayKind', 'histogram', { initOnMounted: true })
    const editingFeedback = useLocalStorage('editingFeedback', false, {initOnMounted: true})
    const anonymize = useLocalStorage('anonymize', true, {initOnMounted: true})
    const eventClipboard = useLocalStorage<ScheduleItem | null>('eventClipboard', null, {initOnMounted: true})
    const feedbackConfigClipboard = useLocalStorage<FeedbackConfig | null>('feedbackConfigClipboard', null, {initOnMounted: true})
    const onlyTaggedEvents = useLocalStorage('onlyTaggedEvents', !!config.public.filterTags.length, { initOnMounted: true })
    const feedbackFilters = useLocalStorage<{
        [event: string]: {
            [section: string]: {
                [question: string | number]: {
                    values: {
                        value: string,
                        /** Was the value submitted as a serach term? */
                        search: boolean,
                    }[],//or
                    disabled: boolean,
                }[]//and
            }
        }
    }>('feedbackFilters', {}, {initOnMounted: true})

    return {
        anonymize,
        eventClipboard,
        feedbackConfigClipboard,
        feedbackFilters,
        displayKind,
        editingFeedback: computed(() => editingFeedback.value && displayKind.value === 'individual'),
        onlyTaggedEvents,
        setEditingFeedback(value: boolean) {
            editingFeedback.value = value
        },
    }
})
