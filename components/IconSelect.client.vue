<template>
    <Multiselect
        :id="p.id" ref="multiselect" :model-value="p.modelValue" :options="iconsAndInput"
        placeholder="Vyhledat ikonu" selected-label="Vybráno" select-label="Vybrat enterem"
        deselect-label="Odebrat enterem" :option-height="40" :options-limit="50" :limit="50"
        @update:model-value="(v: string) => e('update:modelValue', v)">
        <template #singleLabel="props">
            <Icon mode="svg" :name="props.option" /> {{ props.option }} <small
                v-if="props.option == input"
                class="muted">Neověřená ikona</small>
        </template>
        <template #option="props">
            <span class="flex-center">
                <Icon mode="svg" :name="props.option" size="24px" />&ensp;<small>{{ props.option }}</small>
                <small v-if="props.option == input" class="muted">&ensp;Neověřená ikona</small>
            </span>
        </template>
        <template #noOptions>
            Nenačetly se žádné ikony
        </template>
        <template #noResult>
            Žádné výsledky
        </template>

    </Multiselect>
    <small class="ml-2 muted">Kód ikony z <a
        href="https://icon-sets.iconify.design/mdi" target="_blank"
        rel="noopener noreferrer">iconify.design</a></small>
</template>

<script setup lang="ts">

const p = defineProps<{
    modelValue?: string,
    id?: string,
}>()

const e = defineEmits<{
    'update:modelValue': [value: string]
}>()


const icons = useIconList({ uncategorized: true, aliases: true })
const input = ref()
const multiselect = ref()

function updateValue() {
    input.value = multiselect.value?.$refs.search.value
}
watch(multiselect, () => {
    multiselect.value?.$refs.search.addEventListener('input', updateValue)
})
onBeforeUnmount(() => {
    multiselect.value?.$refs.search.removeEventListener('input', updateValue)
})
const iconsAndInput = computed(() => {
    if (!input.value || icons.value.includes(input.value)) {
        return icons.value
    }
    return [...icons.value, input.value]
})
</script>

<style lang="scss">
.multiselect__option {
    padding: .5rem;
}
</style>