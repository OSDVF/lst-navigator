<template>
    <div>
        <FeedbackResultPart
            v-for="key in Object.keys(otherFeedback).filter(key => !!otherFeedback[key])" :key="`p${key}`"
            :feedback-parts="otherFeedback[key as any]" :config="{config: config[key], name: key}"
            @set-data="(data: Feedback | null, eIndex: string, user: string) => cloudStore.feedback.set(key, eIndex, data, user)"
        />
    </div>
</template>

<script setup lang="ts">
import { Feedback, FeedbackConfig } from '@/types/cloud'
import { useCloudStore } from '@/stores/cloud'

const cloudStore = useCloudStore()
const otherFeedback = computed(() => {
    const result: { [key: string]: { [key: string | number]: { [user: string]: Feedback } } } = {}
    const replies = cloudStore.feedback.online
    if (replies) {
        for (const key in replies) {
            const val = replies[key]
            if (typeof val === 'object' && isNaN(parseInt(key))) {
                result[key] = val
            }
        }
    }
    return result
})
const config = computed(() => {
    const result: { [category: string]: { [question: string]: FeedbackConfig['individual'][0] } } = {}
    if (cloudStore.feedback.config) {
        for (const part of cloudStore.feedback.config) {
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
