<template>
    <div>
        <template v-if="typeof $props.reply?.basic === 'number'">
            <NuxtRating active-color="blue" :rating-value="$props.reply.basic" title="Celkový dojem" rating-size="1.2rem" /> {{ $props.reply.basic }}
        </template>
    </div>
</template>

<script setup lang="ts">
import { Feedback, ScheduleEvent, defaultQuestions } from '@/stores/cloud'

defineProps<{
    reply?: Feedback
    event?: ScheduleEvent
}>()

function getReply(reply: Feedback, event: ScheduleEvent) {
    let str = ''
    try {
        if (reply.complicated) {
            for (const c in reply.complicated) {
                const intC = parseInt(c)
                if (!isNaN(intC)) {
                    str += `${(event?.questions?.[intC] ?? defaultQuestions[intC]).substring(0, 3)}: `
                    str += `${reply.complicated[intC]}<br>`
                }
            }
        }
        if (reply.basic) {
            str += ' ' + reply.basic
        }
        if (reply.detail) {
            str += ' ' + reply.detail
        }
        if (reply.select) {
            str += '' + reply.select
        }
    } catch (e) {
        console.error(e)
    }
    return str
}
</script>

