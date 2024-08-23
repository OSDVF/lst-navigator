<template>
    <Multiselect
        :id="p.id"
        :model-value="p.modelValue" :options="icons" placeholder="Vyhledat ikonu"
        selected-label="Vybráno" select-label="Vybrat enterem" deselect-label="Odebrat enterem" :option-height="40" :options-limit="50" :limit="50"
        @update:model-value="(v: string) => e('update:modelValue', v)">
        <template #singleLabel="props">
            <Icon :name="props.option" /> {{ props.option }}
        </template>
        <template #option="props">
            <span class="flex-center">
                <Icon :name="props.option" size="24px" />&ensp;<small>{{ props.option }}</small>
            </span>
        </template>
        <template #noOptions>
            Nenačetly se žádné ikony
        </template>
        <template #noResult>
            Žádné výsledky
        </template>

    </Multiselect>
</template>

<script setup lang="ts">
const p = defineProps<{
    modelValue?: string,
    id?: string,
}>()

const e = defineEmits<{
    'update:modelValue': [value: string]
}>()

const icons = useIconList({ uncategorized: true })
</script>

<style lang="scss">
.multiselect__option {
    padding: .5rem;
}
</style>