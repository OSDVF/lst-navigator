<template>
    <h4>Tvá zpětná vazba</h4>
    <p>
        <NuxtRating
            v-if="type === 'basic'" :read-only="false" :rating-value="props.data?.basic ?? 2.5"
            @rating-selected="syncBasic"
        />
        <br>
        <textarea v-model.lazy="syncDetail" placeholder="Podrobná odpověď" />
        <br>
        <template v-if="type === 'complicated'">
            <label v-for="(question, index) in complicatedQuestions" :key="`q${index}`">
                {{ question }}
                <NuxtRating
                    :rating-value="props.data.complicated?.[index]"
                    @rating-selected="(value: number) => syncComplicated(value, index)"
                />
            </label>
        </template>
    </p>
</template>
<script setup lang="ts">
export type Feedback = {
    basic?: number,
    detail?: string,
    complicated?: number[]
}
export type FeedbackType = 'basic' | 'complicated' | 'parallel'

const props = defineProps({
    data: {
        type: Object as PropType<Feedback>,
        required: false,
        default: () => ({
            basic: null,
            detail: '',
            complicated: []
        })
    },
    type: {
        type: String as PropType<FeedbackType>,
        required: false,
        default: 'basic'
    },
    complicatedQuestions: {
        type: Array as PropType<string[]>,
        required: false,
        default: () => []
    },
    onSetData: {
        type: Function as PropType<(data: Feedback) => void>,
        required: true
    }
})

const syncDetail = computed({
    get(): string {
        return props.data?.detail ?? ''
    },
    set(value: string): void {
        props.onSetData({
            ...props.data,
            detail: value
        })
    }
})

function syncBasic(value: number) {
    props.onSetData({
        ...props.data,
        basic: value
    })
}

function syncComplicated(value: number, index: number) {
    const prevComplicated = props.data.complicated ?? []
    prevComplicated[index] = value
    props.onSetData({
        ...props.data,
        complicated: prevComplicated
    })
}

</script>

<style lang="scss"></style>
