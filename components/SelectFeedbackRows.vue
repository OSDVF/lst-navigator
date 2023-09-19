<template>
    <caption :title="config?.description ?? event?.description">
        {{ (config?.name ?? event?.title) }}
    </caption>
    <!-- Filtered by selected option -->
    <tr v-for="(option, oIndex) in getParallelOrSelectEvents(event ?? config)" :key="oIndex">
        <td :set="filteredReplies = Object.fromEntries(Object.entries(replies).filter(([_rKey, r]) => r.select == option))" :title="Object.keys(filteredReplies).join(', ')">
            <div
                :set="thisCount = Object.keys(filteredReplies).length" class="absolute left-0 top-0 bottom-0 z--1"
                :style="{ width: `${100 * thisCount / maxCount}%`, background: randomColor({ hue: 'green' }) }"
            />
            <em>{{ option }} ({{ thisCount }})</em>
        </td>
        <template v-if="filteredReplies">
            <td>
                <FeedbackReply :reply="getAverage(filteredReplies)" :questions="questions" />
            </td>
            <FeedbackHistogramRow
                v-if="admin.displayKind === 'histogram'" :questions="questions" :feedback-type="type"
                :replies="filteredReplies"
            />
            <FeedbackIndividualRow
                v-else :questions="questions"
                :replies="tabulated.map(r => r?.select === option ? r : null)" :respondents="respondents"
                @set-data="(data: Feedback | null, user: string) => $props.onSetData!(data, eIndex.toString(), user)"
            />
        </template>
    </tr>
</template>

<script setup lang="ts">
import randomColor from 'randomcolor'
import { FeedbackConfig, Feedback, ScheduleEvent, TabulatedFeedback } from '~/types/cloud'
import { getAverage } from '@/utils/types'
import { useAdmin } from '~/stores/admin'

const props = defineProps<{
    config: FeedbackConfig['individual'][0],
    event?: ScheduleEvent,
    replies: { [user: string]: Feedback },
    tabulated: TabulatedFeedback['replies'][''],
    respondents: string[],
    onSetData?:(data: Feedback | null, eIndex: string, userIdentifier: string) => void,
}>()

const admin = useAdmin()
const questions = computed(() => (props.event ?? props.config).questions)
const type = computed(() => (props.event?.feedbackType ?? props.config?.type))

const maxCount = computed(() => {
    const bySelected : {[option:string]:number} = {}
    for (const reply of props.tabulated) {
        if (reply?.select) {
            if (!bySelected[reply.select as string]) {
                bySelected[reply.select as string] = 0
            }
            bySelected[reply.select as string]++
        }
    }
    return Math.max(...Object.values(bySelected))
})

function getParallelOrSelectEvents(event: ScheduleEvent | typeof props.config) {
    switch ((event as ScheduleEvent).feedbackType ?? (event as typeof props.config).type) {
    case 'select':
        return event.questions
    case 'parallel':
        return (event as ScheduleEvent).subtitle && getParallelEvents(event)
    }
    return []
}
</script>
