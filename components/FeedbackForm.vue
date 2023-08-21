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
                    <select v-model="syncSelect">
                        <option v-for="parallelEvent in selectOptions" :key="parallelEvent" :value="parallelEvent">
                            {{ parallelEvent }}
                        </option>
                    </select>
                </td>
                <td>
                    <button title="Odstranit odpověd" @click="syncSelect = undefined">
                        <IconCSS name="mdi:trash" />
                    </button>
                </td>
            </tr>
            <tr v-if="type === 'select'">
                <td>Vyberte odpověd</td>
                <td>
                    <select v-model="syncSelect">
                        <option v-for="selectOption in selectOptions" :key="selectOption" :value="selectOption">
                            {{ selectOption }}
                        </option>
                    </select>
                </td>
                <td>
                    <button title="Odstranit odpověd" @click="syncSelect = undefined">
                        <IconCSS name="mdi:trash" />
                    </button>
                </td>
            </tr>
            <tr v-if="type === 'basic' || type === 'parallel'">
                <td>Celkový dojem</td>
                <td @pointerenter="permitSwipe = false" @pointerleave="permitSwipe = true">
                    <NuxtRating
                        v-if="updatedRating/* a hack to re-render on props update */" inactive-color="#aaa"
                        :read-only="false" :rating-value="props.data?.basic ?? 0"
                        :class="{ 'null': props.data?.basic === null || typeof props.data?.basic === 'undefined' }"
                        @rating-selected="syncBasic"
                    />
                </td>
                <td>
                    <button title="Odstranit odpověd" @click="syncBasic(undefined)">
                        <IconCSS name="mdi:trash" />
                    </button>
                </td>
            </tr>
            <template v-if="type === 'complicated'">
                <tr v-for="(question, index) in complicatedQuestions" :key="`q${index}`">
                    <td>{{ question }}</td>
                    <td @pointerenter="permitSwipe = false" @pointerleave="permitSwipe = true">
                        <NuxtRating
                            v-if="updatedRating" inactive-color="#aaa" :read-only="false"
                            :class="{ 'null': props.data.complicated?.[index] === null || typeof props.data.complicated?.[index] === 'undefined' }"
                            :rating-value="props.data.complicated?.[index] ?? 0"
                            @rating-selected="(value: number) => syncComplicated(index, value)"
                        />
                    </td>
                    <td>
                        <button title="Odstranit odpověd" @click="syncComplicated(index, undefined)">
                            <IconCSS name="mdi:trash" />
                        </button>
                    </td>
                </tr>
            </template>
            <tr v-if="type !== 'select'">
                <td colspan="2">
                    <textarea v-model.lazy="syncDetail" :placeholder="props.detailQuestion" />
                </td>
                <td>
                    <button title="Odstranit odpověd" @click="syncDetail = undefined">
                        <IconCSS name="mdi:trash" />
                    </button>
                </td>
            </tr>
        </tbody>
    </table>
</template>
<script setup lang="ts">
import { FieldValue, deleteField } from 'firebase/firestore'
import { FeedbackType, Feedback } from '@/stores/cloud'

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
        default: () => [
            'Rečník',
            'Osobní přínos',
            'Srozumitelnost'
        ]
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
            ...props.data,
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
            ...props.data,
            select: typeof value === 'undefined' ? deleteField() : value
        })
    }
})

function syncBasic(value?: number) {
    props.onSetData({
        ...props.data,
        basic: typeof value === 'undefined' ? deleteField() : value
    })
}

const updatedRating = ref(true)
watch(props, () => {
    updatedRating.value = false
    nextTick(() => {
        updatedRating.value = true
    })
})

const permitSwipe = inject<Ref<boolean>>('permitSwipe') ?? ref(false)

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
.average-rating {
    &::before {
        //nuxt-rating has this class for some reason
        position: static;
        -webkit-text-stroke: 1px #000000d0;
    }

    &.null::before {
        background-image:
            linear-gradient(90deg, var(--active-color) var(--percent), transparent var(--percent)),
            /* tint image */
            linear-gradient(to right, rgba(0, 0, 0, 0.0), rgba(0, 0, 0, 0)),
            /* checkered effect */
            linear-gradient(to right, black 50%, white 50%),
            linear-gradient(to bottom, black 50%, white 50%);
        background-blend-mode: normal, normal, exclusion, saturation;
        background-size: auto, 5px 5px, 5px 5px, 5px 5px;
        background-clip: text;
    }
}

.feedbackTable {
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
}
</style>
