<template>
    <div>
        <FeedbackResultPart
            v-for="key in Object.keys(programPartsFeedback).filter(key=>!!programPartsFeedback[key as keyof typeof programPartsFeedback])" :key="`p${key}`"
            :schedule-part="onlyIntIndexed(cloudStore.scheduleParts)[key as any]"
            :feedback-parts="onlyIntIndexed(programPartsFeedback[key as any])"
            :make-link="(eIndex:string) => `/schedule/${key}/${eIndex}`"
            @set-data="(data: Feedback | null, eIndex: string, user: string) => cloudStore.feedback.set(key, eIndex, data, user)"
        />
        <NuxtLink to="other">
            <button class="large">
                <IconCSS name="mdi:chevron-double-right" /> Další části feedbacku
            </button>
        </NuxtLink>
    </div>
</template>

<script setup lang="ts">
import { Feedback } from '@/types/cloud'
import { onlyIntIndexed } from '@/utils/types'
import { useCloudStore } from '@/stores/cloud'

const cloudStore = useCloudStore()
const programPartsFeedback = computed(() => onlyIntIndexed(cloudStore.feedback.online) as Omit<typeof cloudStore.feedback.online[0], number>[])
</script>
