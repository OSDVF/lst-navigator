<template>
    <fieldset>
        <legend>
            <span class="muted">
                <Icon name="mdi:form-dropdown" /> {{  p.index + 1 }}
            </span>
            &nbsp;
            <input
                v-autowidth class="editable" :value="p.modelValue.name" type="text"
                :placeholder="`Otázka ${p.index}`"
                @change="(ev) => e('update:modelValue', { ...p.modelValue, name: (ev.target as HTMLInputElement).value })">
            <span class="button" title="Odebrat otázku" @click="e('delete')">
                <Icon name="mdi:trash-can" />
            </span>
        </legend>

        <FeedbackTypeSelect
            class="mb-1" :type="p.modelValue.type ?? ''" :questions="p.modelValue.questions"
            @update:type="(t: FeedbackType | '') => e('update:modelValue', { ...p.modelValue, type: t ? t : undefined })"
            @update:questions="(q: string[]) => e('update:modelValue', { ...p.modelValue, questions: q })" />

        <textarea
            id="description" ref="textarea" v-model="input" title="Popis otázky" class="w-full autosize mb-1 editable" type="text"
            name="description" placeholder="Popisek otázky"
            @change="(ev) => e('update:modelValue', { ...p.modelValue, description: (ev.target as HTMLInputElement).value })" />
    </fieldset>
</template>

<script setup lang="ts">
import type { FeedbackConfig, FeedbackType } from '@/types/cloud'

const p = defineProps<{
    modelValue: FeedbackConfig['individual'][0],
    index: number
}>()

const { textarea, input } = useTextareaAutosize({
    input: p.modelValue.description,
})
watch(p, (newProps)=> {
    input.value = newProps.modelValue.description ?? ''
})


const e = defineEmits<{
    delete: [],
    'update:modelValue': [value: FeedbackConfig['individual'][0]]
}>()
</script>