<template>
    <Multiselect
        :disabled="p.disabled" :model-value="p.modelValue" v-bind="$attrs" :select-label="p.selectLabel ?? ''"
        :deselect-label="p.deselectLabel ?? ''" :selected-label="p.selectedLabel ?? ''"
        :preselect-first="p.preselectFirst ?? true" :allow-empty="p.allowEmpty ?? false"
        :options="Object.keys(p.labels)" :searchable="p.searchable ?? false"
        @update:model-value="(e: keyof Opts) => emit('update:modelValue', e)">
        <template #singleLabel="props">
            <Icon :name="p.labels[props.option as keyof Opts].icon" />
            <slot name="singleLabel" :option="props.option" :text="p.labels[props.option as keyof Opts].text">
                &nbsp;
                {{ p.labels[props.option as keyof Opts].text }}
            </slot>
        </template>
        <template #option="props">
            <span class="flex-center">
                <Icon :name="p.labels[props.option as keyof Opts].icon" />
                <slot name="option" :option="props.option" :text="p.labels[props.option as keyof Opts].text">
                    &nbsp;
                    {{ p.labels[props.option as keyof Opts].text }}
                </slot>
            </span>
        </template>
    </Multiselect>
</template>

<script lang="ts" setup generic="Opts">
const p = defineProps<{
    modelValue: keyof Opts,
    labels: {
        [key in keyof Opts]: {
            icon: string,
            text: string,
        }
    },
    searchable?: boolean,
    allowEmpty?: boolean,
    preselectFirst?: boolean,
    deselectLabel?: string,
    selectLabel?: string,
    selectedLabel?: string,
    disabled?: boolean,
}>()

const emit = defineEmits<{
    'update:modelValue': [value: keyof Opts],
}>()
</script>