<template>
    <div>
        <FeedbackResultPart
            v-for="key in Object.keys(otherFeedback).filter(key => !!otherFeedback[key])" :key="`p${key}`"
            :feedback-parts="otherFeedback[key as any]" :config="config[key]"
            @set-data="(data: Feedback | null, eIndex: string, user: string) => cloudStore.feedback.set(key, eIndex, data, user)"
        />
    </div>
</template>

<script setup lang="ts">
import Lodash from 'lodash'
import { Feedback, FeedbackConfig } from '@/types/cloud'
import { useCloudStore } from '@/stores/cloud'
import { hasFeedback } from '~/utils/types'

function getKeyByValue<U extends { [key: string | number]: any }, T extends (o: U) => boolean>(o: U[''], predicate: T): string | undefined {
    for (const prop in o) {
        if (predicate(o[prop as keyof U])) { return prop }
    }
}

const cloudStore = useCloudStore()
const otherFeedback = computed(() => {
    const result: { [key: string]: { [key: string | number]: { [user: string]: Feedback } } } = {}
    const replies = cloudStore.feedback.online
    if (replies) {
        for (const key in replies) {
            const val = replies[key]
            if (typeof val === 'object' && isNaN(parseInt(key))) {
                result[key] = val
                const potentialOuter = getKeyByValue(replies, (r: any) => typeof r?.[key] === 'object')
                if (potentialOuter) {
                    result[key][0] = Lodash.merge(replies[potentialOuter][key], result[key][0])
                    delete replies[potentialOuter]
                }
            }
        }
    }
    return result
})
const config = computed(() => {
    const result: { [question: string]: FeedbackConfig['individual'][0] } = {}
    if (cloudStore.feedback.config) {
        for (const part of cloudStore.feedback.config) {
            if (part.individual) {
                for (const question of part.individual) {
                    result[question.name] = question
                }
            }
        }
    }
    return result
})
</script>
