<template>
    <SimpleSelect
        :allow-empty="allowEmpty ?? true" v-bind="$attrs" :model-value="modelIndexes" :labels="labels"
        tag-placeholder="Hodnota nebo regex" placeholder="Vyberte hodnoty nebo zadejte výraz" taggable multiple searchable
        @tag="(v: string) => $emit('new', v)"
        @update:model-value="(i) => $emit('update:modelValue', i.map((i) => p.options[i]))" />
</template>

<script lang="ts" setup generic="OptionType">
const p = defineProps<{
    modelValue: OptionType[],
    options: OptionType[],
    toString: (o: OptionType) => string,
    equals: (a: OptionType, b: OptionType) => boolean,
    allowEmpty?: boolean,
}>()
const labels = computed<Record<number,{ text: string }>>(() => Object.fromEntries(p.options.map((o,i) =>
    [i, { text: p.toString(o), icon: modelIndexes.value.includes(i) ? 'mdi:checkbox-outline' : 'mdi:checkbox-blank-outline' }])) as any ?? {})

const modelIndexes = computed(() => {
    const indexes: number[] = []
    for (const v of p.modelValue) {
        indexes.push(p.options.findIndex(o=>p.equals(o,v)))
    }
    return indexes
})

defineEmits<{
    'update:modelValue': [value: OptionType[]],
    new: [value: string]
}>()
</script>
