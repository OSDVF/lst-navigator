<template>
    <table class="feedbackTable">
        <!--<thead>
            <tr>
                <th>
                    Otázka
                </th>
                <th>
                    Odpověd
                </th>
                <th>
                    Akce
                </th>
            </tr>
        </thead>-->
        <tbody>
            <tr v-if="type === 'parallel'">
                <td>
                    Účastnil*a jsem se
                </td>
                <td>
                    <select v-model="syncSelect" @pointerenter="permitSwipe = false" @pointerleave="permitSwipe = true">
                        <option v-for="parallelEvent in selectOptions" :key="parallelEvent" :value="parallelEvent">
                            {{ parallelEvent }}
                        </option>
                    </select>
                </td>
                <td>
                    <button
                        title="Odstranit odpověd" @pointerenter="permitSwipe = false" @pointerleave="permitSwipe = true"
                        @click="syncSelect = undefined"
                    >
                        <IconCSS name="mdi:trash" />
                    </button>
                </td>
            </tr>
            <tr v-if="type === 'select'">
                <td>Vyberte odpověd</td>
                <td>
                    <select v-model="syncSelect" @pointerenter="permitSwipe = false" @pointerleave="permitSwipe = true">
                        <option v-for="selectOption in selectOptions" :key="selectOption" :value="selectOption">
                            {{ selectOption }}
                        </option>
                    </select>
                </td>
                <td>
                    <button
                        title="Odstranit odpověd" @pointerenter="permitSwipe = false" @pointerleave="permitSwipe = true"
                        @click="syncSelect = undefined"
                    >
                        <IconCSS name="mdi:trash" />
                    </button>
                </td>
            </tr>
            <tr v-if="type === 'basic' || type === 'parallel'">
                <td>Celkový dojem</td>
                <td @pointerenter="permitSwipe = false" @pointerleave="permitSwipe = true">
                    <NuxtRating
                        v-if="updatedRating.basic/* a hack to re-render on props update */" inactive-color="#aaa"
                        :read-only="false" :rating-value="normalizedData.basic ?? 0"
                        :class="{ 'null': normalizedData.basic === null || typeof normalizedData.basic === 'undefined' }"
                        @rating-selected="syncBasic"
                    />
                </td>
                <td>
                    <button
                        title="Odstranit odpověd" @pointerenter="permitSwipe = false" @pointerleave="permitSwipe = true"
                        @click="syncBasic(undefined)"
                    >
                        <IconCSS name="mdi:trash" />
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
                            @rating-selected="(value: number) => syncComplicated(index, value)"
                        />
                    </td>
                    <td>
                        <button
                            title="Odstranit odpověd" @pointerenter="permitSwipe = false"
                            @pointerleave="permitSwipe = true" @click="syncComplicated(index, undefined)"
                        >
                            <IconCSS name="mdi:trash" />
                        </button>
                    </td>
                </tr>
            </template>
            <tr v-if="type !== 'select'">
                <td colspan="2">
                    <textarea
                        v-model.lazy="syncDetail" v-paste-model :placeholder="props.detailQuestion"
                        @pointerenter="permitSwipe = false" @pointerleave="permitSwipe = true"
                    />
                </td>
                <td>
                    <button
                        title="Odstranit odpověd" @pointerenter="permitSwipe = false" @pointerleave="permitSwipe = true"
                        @click="syncDetail = undefined"
                    >
                        <IconCSS name="mdi:trash" />
                    </button>
                </td>
            </tr>
        </tbody>
    </table>
</template>
<script setup lang="ts">
import { FieldValue, deleteField } from 'firebase/firestore'
import { FeedbackType, Feedback, defaultQuestions } from '@/stores/cloud'

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
        default: () => defaultQuestions
    },
    selectOptions: {
        type: Array as PropType<string[]>,
        required: false,
        default: () => []
    },
    detailQuestion: {
        type: String,
        required: false,
        default: 'Tipy a připomínky'
    },
    onSetData: {
        type: Function as PropType<(data: Feedback) => void>,
        required: true
    }
})

const syncDetail = computed({
    get(): string | undefined {
        return props.data?.detail as string | undefined
    },
    set(value: string | undefined): void {
        props.onSetData({
            ...normalizedData.value,
            detail: typeof value === 'undefined' ? deleteField() : value
        })
    }
})

const syncSelect = computed({
    get() {
        return props.data?.select
    },
    set(value: string | undefined | FieldValue) {
        props.onSetData({
            ...normalizedData.value,
            select: typeof value === 'undefined' ? deleteField() : value
        })
    }
})

function syncBasic(value?: number) {
    props.onSetData({
        ...normalizedData.value,
        basic: typeof value === 'undefined' ? deleteField() : value
    })
}

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

const updatedRating = ref({
    basic: true,
    complicated: true
})
watch(props, (newVal, oldVal) => {
    if (newVal.data.basic !== oldVal.data.basic) {
        updatedRating.value.basic = false
        nextTick(() => {
            updatedRating.value.basic = true
        })
    }
    if (newVal.data.complicated !== oldVal.data.complicated) {
        updatedRating.value.complicated = false
        nextTick(() => {
            updatedRating.value.complicated = true
        })
    }
})

const permitSwipe = inject<Ref<boolean>>('permitSwipe', ref(false))

function syncComplicated(index: number, value?: number) {
    const prevComplicated = new Array(props.complicatedQuestions.length).fill(null) as (number | null)[]
    if (props.data.complicated) {
        for (const i in props.data.complicated) {
            prevComplicated[i] = props.data.complicated[i]
        }
    }
    if (typeof value !== 'undefined') {
        prevComplicated[index] = value
    } else if (typeof prevComplicated[index] !== 'undefined') {
        prevComplicated[index] = null
    }

    props.onSetData({
        ...props.data,
        complicated: prevComplicated
    })
}

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
