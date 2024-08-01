import type { FieldValue } from 'firebase/firestore';
import { deleteField } from 'firebase/firestore'
import type { Feedback } from '@/types/cloud'

type Props = {
    data: MaybeRefOrGetter<Feedback>,
    onSetData: (data: Feedback) => void,
    complicatedQuestions: MaybeRefOrGetter<string[]>
}
export default function useFeedbackControls({ props }: {props: Props}) {
    function syncComplicated(index: number, value?: number) {
        const prevComplicated = new Array(toValue(props.complicatedQuestions).length).fill(null) as (number | null)[]
        const data = toValue(props.data)
        const compl = data.complicated
        if (compl) {
            for (const i in compl) {
                prevComplicated[i] = compl[i]
            }
        }
        if (typeof value !== 'undefined') {
            prevComplicated[index] = value
        } else if (typeof prevComplicated[index] !== 'undefined') {
            prevComplicated[index] = null
        }

        props.onSetData({
            ...data,
            complicated: prevComplicated,
        })
    }

    const syncDetail = computed({
        get(): string | undefined {
            return toValue(props.data).detail as string | undefined
        },
        set(value: string | undefined): void {
            props.onSetData({
                ...toValue(props.data),
                detail: typeof value === 'undefined' ? deleteField() : value,
            })
        },
    })

    const syncSelect = computed({
        get() {
            return toValue(props.data)?.select
        },
        set(value: string | undefined | FieldValue) {
            props.onSetData({
                ...toValue(props.data),
                select: typeof value === 'undefined' ? deleteField() : value,
            })
        },
    })

    function syncBasic(value?: number) {
        props.onSetData({
            ...toValue(props.data),
            basic: typeof value === 'undefined' ? deleteField() : value,
        })
    }

    return {
        syncComplicated,
        syncBasic,
        syncDetail,
        syncSelect,
    }
}
