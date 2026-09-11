<template>
    <div>
        <FeedbackResultPart v-for="key in Object.keys(otherFeedback).filter(key => !!otherFeedback[key])"
            :key="`p${key}`" :feedback-section="otherFeedback[key as any]" :section-key="key"
            :config="{ config: config[key], name: key }"
            @set-data="(data, eIndex, user) => cloudStore.feedback.set(key, eIndex, data, user)" />
    </div>
</template>

<script setup lang="ts">
import type { Feedback, FeedbackConfig } from '@/types/cloud'

const cloudStore = useCloudStore()
const otherFeedback = computed(() => {
    const result: { [key: string]: { [key: string | number]: { [user: string]: Feedback } } } = {}
    const sections = cloudStore.feedback.online
    if (sections) {
        for (const key in sections) {
            const section = sections[key]
            const id = (section as any).id
            if (typeof section === 'object' && isNaN(parseInt(id)) && Object.hasOwn(config.value, id)) {
                const questions = fromUpdatePayload(section, {})!
                result[id] = Object.fromEntries(Object.keys(questions).toSorted().map(k => [k, (questions as any)[k]]))
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
