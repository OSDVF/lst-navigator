<template>
    <div>
        <FeedbackResultPart
            v-for="key in Object.keys(programPartsFeedback).filter(key => !!programPartsFeedback[key as keyof typeof programPartsFeedback])"
            :key="`p${key}`" :section-key="key"
            :feedback-section="onlyIntIndexed(programPartsFeedback[key as any])"
            :make-link="(eIndex: string | number) => `/schedule/${key}/${eIndex}`"
            @set-data="(data, eIndex, user) => cloudStore.feedback.set(key, eIndex, data, user)" />
        <NuxtLink to="other">
            <button class="large">
                <Icon name="mdi:chevron-double-right" /> Další části feedbacku
            </button>
        </NuxtLink>
    </div>
</template>

<script setup lang="ts">
import { onlyIntIndexed } from '@/utils/utils'
import { useCloudStore } from '@/stores/cloud'

const cloudStore = useCloudStore()
const programPartsFeedback = computed(() => {
    const result: any[] = []
    for (const key in cloudStore.feedback.online) {
        const val = cloudStore.feedback.online[key]
        const id = (val as any).id
        if (typeof val === 'object' && !isNaN(parseInt(id))) {
            result[id] = val
        }
    }
    return result
})
</script>
