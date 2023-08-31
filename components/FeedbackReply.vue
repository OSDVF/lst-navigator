<template>
    <div>
        <template v-if="typeof $props.reply?.basic === 'number' && !isNaN($props.reply.basic)">
            <NuxtRating active-color="blue" :rating-value="$props.reply.basic" title="Celkový dojem" rating-size="1.2rem" />
            {{ Math.round(($props.reply.basic + Number.EPSILON) * 10) / 10 }}
        </template>
        <template v-if="$props.reply?.complicated">
            <template v-for="(compl, index) in $props.reply.complicated" :key="`c${index}`">
                <NuxtRating
                    :active-color="darkenColor('#ffff00', index/5)" :rating-value="compl"
                    :title="$props.event?.questions?.[index] ?? defaultQuestions[index]"
                    rating-size="1.2rem"
                /> {{ Math.round(((compl ?? 0) + Number.EPSILON) * 10) / 10 }}
            </template>
        </template>
    </div>
</template>

<script setup lang="ts">
import { Feedback, ScheduleEvent, defaultQuestions } from '@/stores/cloud'
import { darkenColor } from '@/utils/colors'

defineProps<{
    reply?: Feedback
    event?: ScheduleEvent
}>()

</script>

