<template>
    <tr>
        <td
            :colspan="Object.keys(p.replies).length" class="caption"
            :title="stripHtml(p.config?.description ?? p.event?.description) || undefined" tabindex="0">
            <div v-if="p.link">
                <NuxtLink :to="p.link" class="sticky left-0">
                    {{ (p.config?.name ?? p.event?.title) }}
                </NuxtLink>
            </div>
            <div v-else>
                <span class="sticky left-0">
                    {{ (p.config?.name ?? p.event?.title) }}
                </span>
            </div>
        </td>
    </tr>
    <!-- Filtered by selected option -->
    <tr v-for="(filteredByOption, option) in repliesByOption" :key="option">
        <td :title="Object.keys(filteredByOption.replies).join(', ') || undefined" tabindex="0">
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
import type { FeedbackConfig, Feedback, ScheduleItem, TabulatedFeedback } from '~/types/cloud'
import { getAverage } from '@/utils/utils'
import { useAdmin } from '~/stores/admin'
import { stripHtml } from '~/utils/sanitize'

const p = defineProps<{
    config?: FeedbackConfig['individual'][0],
    event?: ScheduleItem,
    replies: { [user: string]: Feedback },
    tabulated: TabulatedFeedback['replies'][''],
    respondents: string[],
    onSetData?: (data: Feedback | null, userIdentifier: string) => void,
    link?: string
}>()

const admin = useAdmin()
const questions = computed(() => (p.event ?? p.config)?.questions)
const type = computed(() => (p.event?.feedbackType ?? p.config?.type))
const options = computed(() => getParallelOrSelectEvents(p.event ?? p.config))
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
        for (const user in p.replies) {
            const reply = p.replies[user]
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
    for (const replyI in p.replies) {
        const reply = p.replies[replyI]
        if (reply?.select) {
            if (!bySelected[reply.select as string]) {
                bySelected[reply.select as string] = 0
            }
            bySelected[reply.select as string]++
        }
    }
    return Math.max(...Object.values(bySelected))
})

function getParallelOrSelectEvents(event: ScheduleItem | typeof p.config) {
    switch ((event as ScheduleItem).feedbackType ?? (event as typeof p.config)?.type) {
    case 'select':
        return event!.questions
    case 'parallel':
        return (event as ScheduleItem)?.subtitle ? getParallelEvents(event!) : undefined
    }
    return []
}
</script>
