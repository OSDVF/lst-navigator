<template>
    <table class="feedbackTable">
        <tbody>
            <tr v-if="type === 'parallel'">
                <td>
                    <label :for="`${uid}S`">Účastnil*a jsem se</label>
                </td>
                <td>
                    <select
                        :id="`${uid}S`"
                        v-model="controls.syncSelect.value" @pointerenter="permitSwipe = false"
                        @pointerleave="permitSwipe = true">
                        <option v-for="parallelEvent in selectOptions" :key="parallelEvent" :value="parallelEvent">
                            {{ parallelEvent }}
                        </option>
                    </select>
                </td>
                <td>
                    <button
                        title="Odstranit odpověd" @pointerenter="permitSwipe = false"
                        @pointerleave="permitSwipe = true" @click="controls.syncSelect.value = undefined">
                        <Icon name="mdi:trash" />
                    </button>
                </td>
            </tr>
            <tr v-if="type === 'select'">
                <td><label :for="uid">Vyberte odpověd</label></td>
                <td>
                    <select
                        :id="uid"
                        v-model="controls.syncSelect.value" @pointerenter="permitSwipe = false"
                        @pointerleave="permitSwipe = true">
                        <option v-for="selectOption in selectOptions" :key="selectOption" :value="selectOption">
                            {{ selectOption }}
                        </option>
                    </select>
                </td>
                <td>
                    <button
                        title="Odstranit odpověd" @pointerenter="permitSwipe = false"
                        @pointerleave="permitSwipe = true" @click="controls.syncSelect.value = undefined">
                        <Icon name="mdi:trash" />
                    </button>
                </td>
            </tr>
            <tr v-if="type === 'basic' || type === 'parallel'">
                <td>Celkový dojem</td>
                <td @pointerenter="permitSwipe = false" @pointerleave="permitSwipe = true">
                    <NuxtRating
                        v-if="updatedRating.basic/* a hack to re-render on props update */"
                        inactive-color="#aaa" :read-only="false" :rating-value="normalizedData.basic ?? 0"
                        :class="{ 'null': normalizedData.basic === null || typeof normalizedData.basic === 'undefined' }"
                        @rating-selected="controls.syncBasic" />
                </td>
                <td>
                    <button
                        title="Odstranit odpověd" @pointerenter="permitSwipe = false"
                        @pointerleave="permitSwipe = true" @click="controls.syncBasic(undefined)">
                        <Icon name="mdi:trash" />
                    </button>
                </td>
            </tr>
            <template v-if="type === 'complicated'">
                <tr v-for="(question, index) in complicatedQuestions" :key="`q${index}`">
                    <td>{{ question }}</td>
                    <td @pointerenter="permitSwipe = false" @pointerleave="permitSwipe = true">
                        <NuxtRating
                            v-if="updatedRating.complicated" inactive-color="#aaa" :read-only="false"
                            :class="{ 'null': normalizedData.complicated?.[index] === null || typeof normalizedData.complicated?.[index] === 'undefined' }"
                            :rating-value="normalizedData.complicated?.[index] ?? 0"
                            @rating-selected="(value: number) => controls.syncComplicated(index, value)" />
                    </td>
                    <td>
                        <button
                            title="Odstranit odpověd" @pointerenter="permitSwipe = false"
                            @pointerleave="permitSwipe = true" @click="controls.syncComplicated(index, undefined)">
                            <Icon name="mdi:trash" />
                        </button>
                    </td>
                </tr>
            </template>
            <tr v-if="type !== 'select'">
                <td colspan="2">
                    <textarea
                        v-model.lazy="controls.syncDetail.value" v-no-overflow v-paste-model
                        :placeholder="props.detailQuestion ?? 'Tipy a připomínky'" @pointerenter="permitSwipe = false"
                        @pointerleave="permitSwipe = true" />
                </td>
                <td>
                    <button
                        title="Odstranit odpověd" @pointerenter="permitSwipe = false"
                        @pointerleave="permitSwipe = true" @click="controls.syncDetail.value = undefined">
                        <Icon name="mdi:trash" />
                    </button>
                </td>
            </tr>
        </tbody>
    </table>
</template>
<script setup lang="ts">
import { defaultQuestions } from '@/stores/cloud'
import type { Feedback, FeedbackType } from '@/types/cloud'
import useFeedbackControls from '@/utils/feedbackControls'

const props = defineProps({
    data: {
        type: Object as PropType<Feedback>,
        required: false,
        default: () => ({
            basic: null,
            detail: '',
            complicated: [],
        }),
    },
    type: {
        type: String as PropType<FeedbackType>,
        required: false,
        default: 'basic',
    },
    complicatedQuestions: {
        type: Array as PropType<string[]>,
        required: false,
        default: () => defaultQuestions,
    },
    selectOptions: {
        type: Array as PropType<string[]>,
        required: false,
        default: () => [],
    },
    detailQuestion: {
        type: String,
        required: false,
        default: 'Tipy a připomínky',
    },
    onSetData: {
        type: Function as PropType<(data: Feedback) => void>,
        required: true,
    },
})

const uid = useId()

const normalizedData = computed(() => {
    const result: Feedback = {}
    // probably FieldValue - somthing like deleteField()
    for (const prop in props.data) {
        const val = props.data[prop as keyof Feedback]
        const t = typeof val
        if ((t !== 'object' && t !== 'undefined') || Array.isArray(val)) {
            result[prop as keyof Feedback] = val as any
        }
    }
    return result
})

const controls = useFeedbackControls({
    props: {
        data: normalizedData,
        complicatedQuestions: props.complicatedQuestions ?? defaultQuestions,
        onSetData: props.onSetData,
    },
})

const updatedRating = ref({
    basic: true,
    complicated: true,
})
watch(normalizedData, (newVal, oldVal) => {
    if (newVal.basic !== oldVal.basic) {
        updatedRating.value.basic = false
        nextTick(() => {
            updatedRating.value.basic = true
        })
    }
    if (newVal.complicated !== oldVal.complicated) {
        updatedRating.value.complicated = false
        nextTick(() => {
            updatedRating.value.complicated = true
        })
    }
})

const permitSwipe = inject('permitSwipe', ref(false))

</script>

<style lang="scss">
.feedbackTable {
    width: 100%;

    td {
        border: 2px solid transparent;

        &>button {
            color: rgba(255, 0, 0, 0.5);
            border: 2px solid transparent;
            background: transparent;
            cursor: pointer;

            &:hover {
                color: #454545
            }
        }
    }

    textarea,
    select {
        width: 100%;
        font-size: 1.1rem;
    }
}
</style>
