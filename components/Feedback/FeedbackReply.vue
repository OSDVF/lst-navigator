<template>
    <div>
        <template v-if="typeof $props.reply?.basic === 'number' && !isNaN($props.reply.basic)">
            <NuxtRating
                :read-only="!admin.editingFeedback" active-color="blue" :rating-value="$props.reply.basic"
                title="Celkový dojem" rating-size="1.2rem" @rating-selected="(val: number) => controls?.syncBasic(val)"
            />
            {{ Math.round(($props.reply.basic + Number.EPSILON) * 10) / 10 }}
        </template>
        <template v-if="$props.reply?.complicated?.length">
            <template v-for="(compl, index) in $props.reply.complicated" :key="`c${index}`">
                <NuxtRating
                    :read-only="!admin.editingFeedback" :active-color="darkenColor('#ffff00', index / 5)"
                    :rating-value="compl" :title="questions?.[index] ?? defaultQuestions[index]"
                    rating-size="1.2rem" @rating-selected="(val: number) => controls?.syncComplicated(index, val)"
                /> {{
                    Math.round(((compl ?? 0) + Number.EPSILON) * 10) / 10 }}
            </template>
        </template>
        <template v-else-if="$props.reply?.detail">
            <textarea v-if="controls && admin.editingFeedback" v-model="controls!.syncDetail.value" />
            <div v-else class="scroll-y mh-5 focus-expand" tabindex="0">
                {{ $props.reply.detail }}
            </div>
        </template>
        <template v-if="$props.reply.select">
            <select v-if="questions && controls && admin.editingFeedback" v-model="controls.syncSelect.value">
                <option v-for="question in questions" :key="question" :value="question">
                    {{ question }}
                </option>
            </select>
            <div v-else class="scroll-y mh-5 focus-expand" tabindex="0">
                {{ $props.reply.select }}
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { Feedback } from '@/types/cloud'
import { defaultQuestions } from '@/stores/cloud'
import { darkenColor } from '@/utils/colors'
import useFeedbackControls from '@/utils/feedbackControls'
import { useAdmin } from '@/stores/admin'

const props = defineProps<{
    reply: Feedback
    questions?: string[]
    respondent?: string,
    onSetData?:(value: Feedback, respondent: string) => void
}>()

const admin = useAdmin()

const controls = props.onSetData
    ? useFeedbackControls({
        props: {
            data: props.reply,
            complicatedQuestions: props.questions || defaultQuestions,
            onSetData: (value:Feedback) => props.onSetData?.(value, props.respondent!)
        }
    })
    : null

</script>

<style lang="scss">
.feedbackResult {
    textarea {
        border:0;
        scrollbar-width: auto;
    }
}
</style>

