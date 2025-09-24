<template>
    <div>
        <FeedbackResultPart
            v-for="key in Object.keys(otherFeedback).filter(key => !!otherFeedback[key])"
            :key="`p${key}`" :feedback-section="otherFeedback[key as any]" :section-key="key"
            :config="{ config: config[key], name: key }"
            @set-data="(data, eIndex, user) => cloudStore.feedback.set(key, eIndex, data, user)" />
    </div>
</template>

<script setup lang="ts">
import type { Feedback, FeedbackConfig } from '@/types/cloud'
import { useCloudStore } from '@/stores/cloud'

const cloudStore = useCloudStore()
const otherFeedback = computed(() => {
    const result: { [key: string]: { [key: string | number]: { [user: string]: Feedback } } } = {}
    const replies = cloudStore.feedback.online
    if (replies) {
        for (const key in replies) {
            const val = replies[key]
            const id = (val as any).id
            if (typeof val === 'object' && isNaN(parseInt(id)) && Object.hasOwn(config.value, id)) {
                result[id] = fromUpdatePayload(val, {})!
            }
        }
    }
    return result
})
const config = computed(() => {
    const result: { [category: string]: { [question: string]: FeedbackConfig['individual'][0] } } = {}
    if (Array.isArray(cloudStore.feedbackConfig)) {
        for (const part of cloudStore.feedbackConfig.toSorted((a, b) => (a as any).id - (b as any).id) || []) {
            if (part.individual) {
                if (!result[part.title]) {
                    result[part.title] = {}
                }
                for (const question of part.individual) {
                    result[part.title][question.name] = question
                }
            }
        }
    }
    return result
})
</script>
