<template>
    <td v-for="(reply, rIndex) in replies" :key="`r${rIndex}`">
        <div>
            <template v-if="reply">
                <FeedbackReply
                    :reply="reply" :event="event"
                    @set-data="typeof $props.onSetData !== 'undefined' ? (val: Feedback) => $props.onSetData!(val, respondents[rIndex]) : null"
                />
                <button
                    v-show="admin.editingFeedback"
                    @click="$props.onSetData!(null, respondents[rIndex])"
                >
                    <IconCSS name="mdi:trash" />
                </button>
            </template>
        </div>
    </td>
</template>

<script setup lang="ts">
import { Feedback, ScheduleEvent } from '@/stores/cloud'
import { useAdmin } from '@/stores/admin'

defineProps<{
    onSetData?:(data: Feedback | null, userIdentifier: string) => void,
    replies: Feedback[],
    respondents: string[]
    event: ScheduleEvent
}>()

const admin = useAdmin()


</script>
