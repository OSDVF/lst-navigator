<template>
    <h4>Tvá zpětná vazba</h4>
    <p>
        <NuxtRating :read-only="false" :rating-value="props.data?.basic ?? 2.5" @rating-selected="syncBasic" />
        <br>
        <textarea v-model.lazy="syncDetail" placeholder="Podrobná odpověď" />
        <br>
        <button @click="props.onSetData(updatedData)">
            Uložit
        </button>
    </p>
</template>
<script setup lang="ts">
export type Feedback = {
    basic?: number,
    detail?: string
}

const props = defineProps({
    data: {
        type: Object as PropType<Feedback>,
        required: false,
        default: () => ({
            basic: null,
            detail: ''
        })
    },
    type: {
        type: String as PropType<'basic' | 'detail'>,
        required: false,
        default: 'basic'
    },
    onSetData: {
        type: Function as PropType<(data: Feedback) => void>,
        required: true
    }
})
const updatedData = ref(props.data)

const syncDetail = computed({
    get(): string {
        return props.data?.detail ?? ''
    },
    set(value: string): void {
        props.onSetData(updatedData.value = {
            ...props.data,
            detail: value
        })
    }
})

function syncBasic (value: number) {
    props.onSetData(updatedData.value = {
        ...props.data,
        basic: value
    })
}

</script>

<style lang="scss"></style>
