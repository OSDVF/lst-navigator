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
        <FeedbackReply :reply="getAverage(replies)" :questions="(event ?? config)?.questions" />
    </td>
    <FeedbackHistogramRow
        v-if="admin.displayKind === 'histogram'" :replies="replies"
        :feedback-type="event?.feedbackType ?? config?.type"
        :questions="(event ?? config)?.questions"
    />
    <FeedbackIndividualRow
        v-else :questions="event?.questions ?? config?.questions" :replies="tabulated"
        :respondents="respondents"
        @set-data="$props.onSetData"
    />
</template>
<script setup lang="ts">

import type { Feedback, FeedbackConfig, ScheduleItem, TabulatedFeedback } from '@/types/cloud'
import { useAdmin } from '@/stores/admin'
import { getAverage } from '@/utils/utils'
import { stripHtml } from '@/utils/sanitize'

defineProps<{
    replies: { [user: string]: Feedback },
    tabulated: TabulatedFeedback['replies'][0],
    respondents: string[],
    event?: ScheduleItem,
    config?: FeedbackConfig['individual'][0],
    link?: string,
    onSetData?:(data: Feedback | null, userIdentifier: string) => void
}>()

const admin = useAdmin()

</script>
