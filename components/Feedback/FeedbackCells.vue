<template>
    <td>
        <NuxtLink v-if="event && link" :to="link" :title="stripHtml(event.description) || undefined">
            <strong>
                {{ event?.title }}
            </strong>
            ({{ Object.keys(replies).length }})
            <br>
            {{ event.subtitle }}
        </NuxtLink>
        <template v-else>
            <strong v-if="config?.name">{{ config?.name }}</strong>
            {{ config?.description ?? '\xa0' }} ({{ Object.keys(replies).length }})
        </template>
    </td>
    <td>
        <ol v-if="config?.type == 'multiple'">
            <li v-for="value in ordered" :key="`m${value}`" :title="value">{{ value?.substring(0, 12) }}</li>
        </ol>
        <FeedbackReply v-else :reply="getAverage(replies)" :questions="(event ?? config)?.questions" />
    </td>
    <FeedbackHistogramRow
        v-if="admin.displayKind === 'histogram'" :replies="replies"
        :feedback-type="event?.feedbackType ?? config?.type" :questions="(event ?? config)?.questions" />
    <FeedbackIndividualRow
        v-else :questions="event?.questions ?? config?.questions" :replies="tabulated"
        :respondents="respondents" @set-data="$props.onSetData" />
</template>
<script setup lang="ts">

import type { Feedback, FeedbackConfig, ScheduleItem, TabulatedFeedback } from '@/types/cloud'
import { useAdmin } from '@/stores/admin'
import { getAverage } from '@/utils/utils'
import { stripHtml } from '@/utils/sanitize'

const p = defineProps<{
    replies: { [user: string]: Feedback },
    tabulated: TabulatedFeedback['replies'][0],
    respondents: string[],
    event?: ScheduleItem,
    config?: FeedbackConfig['individual'][0],
    link?: string,
    onSetData?: (data: Feedback | null, userIdentifier: string) => void
}>()

const admin = useAdmin()

const sum = computed(() => {
    const s = getSum(p.replies).complicated
    return [...s, ...new Array((p.config?.questions.length ?? s.length) - s.length).fill(0)]
})
const ordered = computed(() => Array.from(p.config?.questions.keys() ?? []).toSorted(
    (a, b) => sum.value[b] - sum.value[a]).map(i => p.config?.questions[i]),
)

</script>
