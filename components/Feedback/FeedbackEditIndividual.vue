<template>
    <fieldset>
        <legend>
            <span class="muted">
                <Icon name="mdi:form-dropdown" /> {{ p.index + 1 }}
            </span>
            &nbsp;
            <input
                v-autowidth="{
                    overflowParent: false,
                    parentLevel: 2,
                }" class="editable" :value="p.modelValue.name" type="text" :placeholder="`Otázka ${p.index}`" required
                @change="nameChange">
        </legend>

        <FeedbackTypeSelect
            :disabled="disabled" class="mb-1" :type="p.modelValue.type ?? ''"
            :questions="p.modelValue.questions"
            @update:type="(t: FeedbackType | '') => e('update:modelValue', { ...p.modelValue, type: t ? t : undefined })"
            @update:questions="(q: string[]) => e('update:modelValue', { ...p.modelValue, questions: q })" />

        <textarea
            id="description" ref="textarea" v-model="input" title="Popis otázky"
            class="w-full autosize mb-1 editable" type="text" name="description" placeholder="Popisek otázky"
            @change="descriptionChange" />

        <span class="error" v-if="error">{{ error }}</span>

        <div class="relative">
            <div v-show="!p.disabled" :class="{ 'fieldset-edit': true, disabled: p.disabled, 'edit-bottom': true }">
                <span class="button" title="Odebrat otázku" @click="e('delete')">
                    <Icon name="mdi:trash-can" />
                </span>

                <span v-if="p.index > 0" class="button" title="Posunout otázku nahoru" @click="e('moveUp', index)">
                    <Icon name="mdi:arrow-up" />
                </span>
                <span v-if="!last" class="button" title="Posunout otázku dolů" @click="e('moveDown', index)">
                    <Icon name="mdi:arrow-down" />
                </span>

                <span class="button" title="Přidat otázku" @click="e('insert')">
                    +
                    <Icon name="mdi:form-dropdown" />
                </span>
            </div>
        </div>
    </fieldset>
</template>

<script setup lang="ts">
import type { FeedbackConfig, FeedbackType } from '@/types/cloud'

const p = defineProps<{
    modelValue: FeedbackConfig['individual'][0],
    index: number,
    disabled?: boolean,
    last: boolean,
}>()

const { textarea, input } = useTextareaAutosize({
    input: p.modelValue.description,
})
watch(() => p.modelValue, (newValue) => {
    error.value = 0
    input.value = newValue.description ?? ''
})

const e = defineEmits<{
    insert: [],
    delete: [],
    'update:modelValue': [value: FeedbackConfig['individual'][0]],
    moveUp: [index: number],
    moveDown: [index: number],
}>()

const error = ref()

function descriptionChange(ev: Event) {
    const t = ev.target as HTMLInputElement
    const val = t.value
    
    if(val && p.modelValue.name) {
        error.value = 0
        e('update:modelValue', { ...p.modelValue, description: val})
    } else {
        error.value = 'Otázka musí mít kromě popisu také název'
        t.value = p.modelValue.description || ''
    }
} 

function nameChange(ev: Event) {
    const t = ev.target as HTMLInputElement
    const val = t.value
    
    if(val) {
        error.value = 0
        e('update:modelValue', { ...p.modelValue, name: val})
    } else {
        error.value = 'Otázka musí mít název'
        t.value = p.modelValue.name
    }
}
</script>

<style lang="scss">
.edit-bottom {
    position: absolute;
    bottom: -28px;
    right: 0;
}
</style>