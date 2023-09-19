<template>
    <td>
        <NuxtLink v-if="event" :to="makeLink?.()">
            <strong>
                {{ event?.title }}
            </strong>
            ({{ Object.keys(replies).length }})
        </NuxtLink>
        <template v-else>
            {{ config?.name }}
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
        v-else :event="event" :replies="tabulated"
        :respondents="respondents"
        @set-data="$props.onSetData"
    />
</template>
<script setup lang="ts">

import { Feedback, FeedbackConfig, ScheduleEvent, TabulatedFeedback } from '@/types/cloud'
import { useAdmin } from '@/stores/admin'
import { getAverage } from '@/utils/types'

defineProps<{
    replies: { [user: string]: Feedback },
    tabulated: TabulatedFeedback['replies'][0],
    respondents: string[],
    event?: ScheduleEvent,
    config?: FeedbackConfig['individual'][0],
    makeLink?:() => string,
    onSetData?:(data: Feedback | null, userIdentifier: string) => void
}>()

const admin = useAdmin()

</script>
