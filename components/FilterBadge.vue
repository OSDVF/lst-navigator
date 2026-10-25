<template>
    <div class="filter inline-flex">
        <Icon
            class="button" :tabindex="options ? 0 : undefined" :name="'mdi:filter' + (disabled ? '-outline' : '')"
            @click="options ? $emit('disable') : void 0" />
        <small>{{ title }}</small>
        <CheckboxSelect
            v-if="options" v-model="values" style="display: inline-block;" :options="options"
            :equals="(a, b) => a.value == b.value && a.search == b.search" :to-string="(o) => o.value"
            @new="(regex: string) => $emit('new', regex)" />
        <span v-else class="dotted-udnerline">
            {{values.map(v => v.value).join(', ')}}
        </span>
        <span class="button small" :tabindex="options ? 0 : undefined" @click="$emit('delete')">
            <Icon name="mdi:close" />
        </span>
    </div>
</template>

<script lang="ts" setup>
const values = defineModel<{
    value: string,
    search?: boolean,
}[]>({
    default: () => ([]),
})
defineProps<{
    parentLevel?: number,
    title: string,
    options?: {
        value: string,
        search: boolean,
    }[],
    disabled?: boolean,
}>()
defineEmits<{
    delete: [],
    disable: [],
    new: [string],
}>()
</script>
