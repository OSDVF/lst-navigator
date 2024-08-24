<template>
    <input
        :value="p.modelValue.name" type="text" :placeholder="`Otázka ${p.index}`"
        @change="(ev) => e('update:modelValue', { ...p.modelValue, name: (ev.target as HTMLInputElement).value })"
    >
    <button type="button" title="Odebrat" @click="e('delete')">
        <Icon name="mdi:trash-can" />
    </button>
    <br>

    <label for="description">Popis</label><br>
    <textarea
        id="description" :value="p.modelValue.description" type="text" name="description"
        placeholder="Popisek otázky"
        @change="(ev) => e('update:modelValue', { ...p.modelValue, description: (ev.target as HTMLInputElement).value })"
    />

    <FeedbackTypeSelect
        class="mt-3"
        :type="p.modelValue.type ?? ''" 
        :questions="p.modelValue.questions"
        @update:type="t => e('update:modelValue', { ...p.modelValue, type: t ? t : undefined })"
        @update:questions="q => e('update:modelValue', { ...p.modelValue, questions: q })"
    />
</template>

<script setup lang="ts">
import type { FeedbackConfig } from '@/types/cloud'

const p = defineProps<{
    modelValue: FeedbackConfig['individual'][0],
    index: number
}>()

const e = defineEmits<{
    delete: [],
    'update:modelValue': [value: FeedbackConfig['individual'][0]]
}>()
</script>