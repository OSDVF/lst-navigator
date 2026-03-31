<template>
    <span>
        <Multiselect
            v-if="p.items?.length" :id="id ?? uid" v-bind="$attrs" ref="multiselect" v-model="realModel"
            select-label="Vybrat" deselect-label="Zrušit" selected-label="Vybráno" allow-empty
            :options="p.items.map(i => byId ? i.id : i.title)" :searchable="p.searchable ?? true"
            :placeholder="realModel ?? placeholder" @select="dirty = true">
            <template #singleLabel="props">
                <slot name="singleLabel" :option="props.option" :text="getBy(props.option)?.title">
                    {{ getBy(props.option)?.title }}
                </slot>
            </template>
            <template #option="props">
                <span>
                    <slot name="option" :option="props.option" :text="getBy(props.option)?.title">
                        {{ getBy(props.option)?.title }}&nbsp;
                        <small> {{ getBy(props.option)?.description }}</small>
                    </slot>
                </span>
            </template>
        </Multiselect>
        <input v-else v-model="model" type="text" v-bind="$attrs">
    </span>
</template>

<script setup lang="ts">
import type Multiselect from 'vue-multiselect'

const p = withDefaults(defineProps<{
    items?: { id: number, title: string, description?: string }[],
    byId?: boolean,
    id?: string,
    searchable?: boolean,
    placeholder?: string,
    real: boolean,
}>(), {
    id: undefined,
    items: undefined,
    placeholder: undefined,
    searchable: true,
})
const model = defineModel<string | number>()

const dirty = ref(false)
const realModel = computed({
    get() {
        return (p.real || dirty.value) ? model.value : undefined
    },
    set(value: string | number) {
        model.value = value
    },
})
const uid = useId()
function getBy(key: string | number) {
    return p.items?.find(i => i.id == key) ?? p.items?.find(i => i.title == key)
}
</script>