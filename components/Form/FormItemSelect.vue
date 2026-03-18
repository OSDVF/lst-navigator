<template>
    <span>
        <Multiselect
            v-if="p.items" v-model="model" v-bind="$attrs" select-label="Vybrat" deselect-label="Zrušit"
            selected-label="Vybráno" allow-empty :options="p.items.map(i => i.title)" searchable :placeholder="model">
            <template #singleLabel="props">
                <slot
                    name="singleLabel" :option="props.option"
                    :text="p.items.find(i => i.title == props.option)?.title">
                    {{p.items.find(i => i.title == props.option)?.title}}
                </slot>
            </template>
            <template #option="props">
                <span>
                    <slot
                        name="option" :option="props.option"
                        :text="p.items.find(i => i.title == props.option)?.title">
                        {{p.items.find(i => i.title == props.option)?.title}}&nbsp;
                        <small> {{p.items.find(i => i.title == props.option)?.description}}</small>
                    </slot>
                </span>
            </template>
        </Multiselect>
        <input v-else v-model="model" type="text" v-bind="$attrs">
    </span>
</template>

<script setup lang="ts">
const model = defineModel<string>({ default: '' })
const p = defineProps<{
    items?: { title: string, description?: string }[]
}>()
</script>