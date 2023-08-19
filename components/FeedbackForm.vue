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
            <tr v-if="type === 'basic'">
                <td>Celkový dojem</td>
                <td>
                    <NuxtRating inactive-color="#ccc" :read-only="false" :rating-value="props.data?.basic ?? 2.5" @rating-selected="syncBasic" />
                </td>
                <td>
                    <button title="Resetovat odpověd" @click="syncBasic(undefined)">
                        <IconCSS name="mdi:trash" />
                    </button>
                </td>
            </tr>
            <template v-if="type === 'complicated'">
                <tr v-for="(question, index) in complicatedQuestions" :key="`q${index}`">
                    <td>{{ question }}</td>
                    <td>
                        <NuxtRating
                            inactive-color="#ccc"
                            :read-only="false" :rating-value="props.data.complicated?.[index] ?? 2.5"
                            @rating-selected="(value: number) => syncComplicated(index, value)"
                        />
                    </td>
                    <td>
                        <button title="Resetovat odpověd" @click="syncComplicated(index, undefined)">
                            <IconCSS name="mdi:trash" />
                        </button>
                    </td>
                </tr>
            </template>
            <tr>
                <td colspan="2">
                    <textarea v-model.lazy="syncDetail" :placeholder="props.detailQuestion" />
                </td>
                <td>
                    <button title="Resetovat odpověd" @click="syncDetail = undefined">
                        <IconCSS name="mdi:trash" />
                    </button>
                </td>
            </tr>
        </tbody>
    </table>
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
        return props.data?.detail
    },
    set(value: string | undefined): void {
        if (typeof value === 'undefined') {
            const prev = props.data
            delete prev.detail
            props.onSetData(prev)
            return
        }
        props.onSetData({
            ...props.data,
            detail: value
        })
    }
})

function syncBasic(value?: number) {
    if (typeof value === 'undefined') {
        const prev = props.data
        delete prev.basic
        props.onSetData(prev)
        return
    }
    props.onSetData({
        ...props.data,
        basic: value
    })
}

function syncComplicated(index: number, value?: number) {
    const prevComplicated = props.data.complicated ?? []
    if (typeof value !== 'undefined') {
        prevComplicated[index] = value
    } else {
        delete prevComplicated[index]
    }
    props.onSetData({
        ...props.data,
        complicated: prevComplicated
    })
}

</script>

<style lang="scss">
.average-rating::before {
    //nuxt-rating has this class for some reason
    position: static;
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
