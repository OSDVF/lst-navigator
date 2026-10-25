<template>
    <Multiselect
        :disabled="p.disabled" :model-value="p.modelValue" v-bind="$attrs" :select-label="p.selectLabel ?? ''"
        :deselect-label="p.deselectLabel ?? ''" :selected-label="p.selectedLabel ?? ''"
        :preselect-first="p.preselectFirst ?? true" :allow-empty="p.allowEmpty ?? false"
        :options="Object.keys(p.labels)" :searchable="p.searchable ?? false" :multiple="multiple"
        @update:model-value="(e: Model) => emit('update:modelValue', e)">
        <template #singleLabel="props">
            <Icon v-if="p.labels[props.option as Opts]?.icon" :name="p.labels[props.option as Opts].icon!" />
            <slot name="singleLabel" :option="props.option" :text="p.labels[props.option as Opts].text">
                &nbsp;
                {{ p.labels[props.option as Opts].text ?? props.search }}
            </slot>
        </template>
        <template #tag="props">
            <slot name="tag" :option="props.option" :text="p.labels[props.option as Opts]?.text">
                <span class="multiselect__tag"><span>{{ isEmpty(props.option)
                                                   ? props.search : p.labels[props.option as Opts]?.text }}</span>
                    <i
                        tabindex="1" class="multiselect__tag-icon" @keypress.enter.prevent="props.remove(props.option)"
                        @mousedown.prevent="props.remove(props.option)" />
                </span>
            </slot>
        </template>
        <template #option="props">
            <span class="flex-center">
                <Icon v-if="p.labels[props.option as Opts]?.icon" :name="p.labels[props.option as Opts].icon!" />
                <slot name="option" :option="props.option" :text="p.labels[props.option as Opts]?.text">
                    &nbsp;
                    {{ p.labels[props.option as Opts]?.text ?? props.search }}
                </slot>
            </span>
        </template>
    </Multiselect>
</template>

<script lang="ts" setup
    generic="Opts extends keyof any, Multiple extends boolean, Model extends Multiple extends true ? Opts[] : Opts">
const p = defineProps<{
        modelValue: Model,
        labels: {
            [key in Opts]: {
                icon?: string,
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
        multiple?: Multiple,
    }>()

function isEmpty(opt: any) {
    if (opt === 0) { return false }
    if (Array.isArray(opt) && opt.length === 0) { return true }
    return !opt
}

const emit = defineEmits<{
        'update:modelValue': [value: Model],
    }>()
</script>
