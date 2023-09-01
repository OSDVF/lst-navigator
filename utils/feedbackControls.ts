import { deleteField, FieldValue } from 'firebase/firestore'
import { Feedback } from '@/stores/cloud'

type Props = {
    data: Feedback,
    onSetData: (data: Feedback) => void,
    complicatedQuestions: string[]
}
export default function useFeedbackControls({ props }: {props: Props}) {
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

    return {
        syncComplicated,
        syncBasic,
        syncDetail,
        syncSelect
    }
}
