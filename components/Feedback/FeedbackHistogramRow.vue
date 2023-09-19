<template>
    <td v-no-wrap-border>
        <template v-if="feedbackType === 'complicated' || repliesValues.find(r => r.complicated?.find(c => !!c))">
            <span
                v-for="(q, qIndex) in (questions || defaultQuestions)" :key="`q${qIndex}`"
                class="inline-block border-between"
            >
                <BarChart
                    :values="complicatedReplies[qIndex].hist" :min="0" :colors="complicatedColors[qIndex]"
                    :categories="HISTOGRAM_BUCKETS" :labels="HISTOGRAM_BUCKETS"
                    :popups="complicatedReplies[qIndex].individuals"
                />
                {{ q }}
            </span>
        </template>
        <div v-if="feedbackType === 'text'">
            <BarChart
                :values="clusteredTextIndexed" :min="0"
                :colors="randomcolor({ count: seenCategories.length, hue: 'orange' })"
                :categories="Object.keys(seenCategories)" :labels="seenCategories.map(c => c?.substring(0, 4))"
                :popups="buckets.map(b => Array.from(b).join('\n'))" class="rotated"
            />
            Podobné odpovědi
        </div>
        <div v-if="feedbackType == 'basic' || repliesValues.find(r => r.basic)">
            <BarChart
                :values="basicReplies.hist" :min="0" :colors="basicColors" :categories="HISTOGRAM_BUCKETS"
                :popups="basicReplies.individuals" :labels="HISTOGRAM_BUCKETS"
            />
            Celkový dojem
        </div>
    </td>
    <td colspan="100%">
        <table>
            <tbody>
                <tr v-for="detailReply in repliesWithDetails" :key="`d${detailReply.i}`">
                    <td>{{ detailReply.i }}</td>
                    <td>{{ detailReply.r.detail }}</td>
                </tr>
            </tbody>
        </table>
    </td>
</template>

<script setup lang="ts">
import randomcolor from 'randomcolor'
import { metaphone } from 'metaphone'
import { Feedback, FeedbackType } from '@/types/cloud'
import { defaultQuestions } from '~/stores/cloud'
import { mapObject } from '~/utils/types'

const HISTOGRAM_BUCKETS = [1, 2, 3, 4, 5]
const basicColors = randomcolor({ count: 5, hue: 'blue' })
const hues = ['yellow', 'orange', 'red']
const complicatedColors = hues.map(hue => randomcolor({ count: 5, hue }))

const props = defineProps<{
    replies: { [respondent: string]: Feedback },
    questions?: string[],
    feedbackType?: FeedbackType
}>()

const repliesValues = computed(() => Object.values(props.replies))

const repliesWithDetails = computed(() => {
    return Object.entries(props.replies).map(([i, r]) => ({ i, r })).filter(({ r }) => r.detail)
})

const complicatedReplies = computed(() => {
    const byQuestion = []
    for (const qIndex in (props.questions ?? defaultQuestions)) {
        byQuestion.push(
            getHistogram(mapObject(props.replies, r => typeof r?.complicated?.[qIndex] === 'number' ? r.complicated![qIndex] : null))
        )
    }
    return byQuestion
})
const basicReplies = computed(() => getHistogram(mapObject(props.replies, r => typeof r?.basic === 'number' ? r.basic : null)))

function getHistogram(replies: { [key: string | number]: number | null } | ArrayLike<number | null>) {
    const hist: number[] = []
    const individuals: string[] = []

    for (const rI in replies) {
        const r = replies[rI]
        if (r !== null) {
            if (!hist[r]) {
                hist[r] = 0
                individuals[r] = rI
            } else {
                individuals[r] += ', ' + rI
            }
            hist[r]++
        }
    }

    return { hist, individuals }
}

//
// For arbitary text values
//
const seenCategories = ref<(string | null)[]>([])
const buckets = ref<Set<string>[]>([])
const clusteredTextIndexed = computed(() => {
    const clustered = repliesValues.value.map(r => typeof r?.detail === 'string' ? metaphone(r.detail) : null)
    const result: number[] = []
    buckets.value = []

    for (const ci in clustered) {
        const v = clustered[ci]
        let i = seenCategories.value.indexOf(v)
        if (i === -1) {
            i = seenCategories.value.length
        }
        seenCategories.value[i] = v
        result[i] = (result[i] ?? 0) + 1
        if (v) {
            if (buckets.value[i]) {
                buckets.value[i].add(repliesValues.value[ci].detail as string)
            } else {
                buckets.value[i] = new Set([repliesValues.value[ci].detail as string])
            }
        }
    }
    return result
})

</script>
