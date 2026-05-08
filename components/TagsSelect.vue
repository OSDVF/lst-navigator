<template>
    <SimpleSelect
        :allow-empty="allowEmpty ?? true" v-bind="$attrs" :model-value="modelValue" :labels="labels"
        tag-placeholder="Přidat jako nový štítek" placeholder="Vyhledat nebo přidat štítek" taggable multiple
        @update:model-value="(v: OptionType[]) => $emit('update:modelValue', v)" />
</template>

<script lang="ts" setup generic="OptionType extends string">
const p = defineProps<{
    modelValue: OptionType[],
    options: OptionType[],
    allowEmpty?: boolean,
}>()
const labels = computed<Record<OptionType, { text: string }>>(() => Object.fromEntries(p.options.map(o => [o, { text: o }])) as any)

defineEmits<{
    'update:modelValue': [value: OptionType[]],
}>()
</script>