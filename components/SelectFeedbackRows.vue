<template>
    <tr>
        <td
            :colspan="Object.keys(props.replies).length" class="caption"
            :title="stripHtml(config?.description ?? event?.description) || undefined" tabindex="-1">
            <div v-if="link">
                <NuxtLink :to="link" class="sticky left-0">
                    {{ (config?.name ?? event?.title) }}
                </NuxtLink>
            </div>
            <div v-else>
                <span class="sticky left-0">
                    {{ (config?.name ?? event?.title) }}
                </span>
            </div>
        </td>
    </tr>
    <!-- Filtered by selected option -->
    <tr v-for="(filteredByOption, option) in repliesByOption" :key="option">
        <td :title="Object.keys(filteredByOption.replies).join(', ') || undefined" tabindex="-1">
            <div
                class="absolute left-0 top-0 bottom-0 z--1"
                :style="{ width: `${100 * filteredByOption.count / maxCount}%`, background: randomColors?.[option] }" />
            <em>{{ option }} ({{ filteredByOption.count }})</em>
        </td>
        <template v-if="filteredByOption">
            <td>
                <FeedbackReply :reply="getAverage(filteredByOption.replies)" :questions="questions" />
            </td>
            <FeedbackHistogramRow
                v-if="admin.displayKind === 'histogram'" :questions="questions" :feedback-type="type"
                :replies="filteredByOption.replies" />
            <FeedbackIndividualRow
                v-else :questions="questions"
                :replies="tabulated.map(r => r?.select === option ? r : null)" :respondents="respondents"
                @set-data="$props.onSetData" />
        </template>
    </tr>
</template>

<script setup lang="ts">
import randomColor from 'randomcolor'
import type { FeedbackConfig, Feedback, ScheduleEvent, TabulatedFeedback } from '~/types/cloud'
import { getAverage } from '@/utils/types'
import { useAdmin } from '~/stores/admin'
import { stripHtml } from '~/utils/sanitize'

const props = defineProps<{
    config?: FeedbackConfig['individual'][0],
    event?: ScheduleEvent,
    replies: { [user: string]: Feedback },
    tabulated: TabulatedFeedback['replies'][''],
    respondents: string[],
    onSetData?: (data: Feedback | null, userIdentifier: string) => void,
    link?: string
}>()

const admin = useAdmin()
const questions = computed(() => (props.event ?? props.config)?.questions)
const type = computed(() => (props.event?.feedbackType ?? props.config?.type))
const options = computed(() => getParallelOrSelectEvents(props.event ?? props.config))
const randomColors: { [option: string]: string } = {}
if (options.value) {
    for (const option of options.value) {
        randomColors[option] = randomColor({ hue: 'green' })
    }
}

const repliesByOption = computed(() => {
    const result: {
        [option: string]: {
            /** By user */
            replies: { [user: string]: Feedback }, count: number
        }
    } = {}
    if (options.value) {
        for (const user in props.replies) {
            const reply = props.replies[user]
            for (const option of options.value) {
                if (reply.select === option) {
                    if (!result[option]) {
                        result[option] = { replies: {}, count: 0 }
                    }
                    result[option].replies[user] = reply
                }
            }
        }
    }
    for (const option in result) {
        result[option].count = Object.keys(result[option].replies).length
    }
    return result
})

const maxCount = computed(() => {
    const bySelected: { [option: string]: number } = {}
    for (const replyI in props.replies) {
        const reply = props.replies[replyI]
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
    switch ((event as ScheduleEvent).feedbackType ?? (event as typeof props.config)?.type) {
    case 'select':
        return event!.questions
    case 'parallel':
        return (event as ScheduleEvent)?.subtitle ? getParallelEvents(event!) : undefined
    }
    return []
}
</script>
