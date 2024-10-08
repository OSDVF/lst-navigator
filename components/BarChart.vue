<template>
    <div class="bar-chart">
        <div
            v-for="(value, index) in normalizedValues" :key="index" tabindex="-1" class="bar"
            :style="{ height: `${value * 100}%`, '--count': normalizedValues.length, background: colors[index] }"
            :title="(filteredValues.v[index]?.toString() ?? 'N/A') + (popups && filteredValues.p[index] ? (`:\n${filteredValues.p[index]}`) : '')">
            <span class="label">{{ labels[index] ?? '\xa0'
            }}<span v-if="value > 0" class="muted">({{
                filteredValues.v[index] }})
            </span>
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
import randomcolor from 'randomcolor'
import { setColorTransparency } from '~/utils/colors'

const props = defineProps<{
    values: { [key: number]: number },
    resolution?: number,
    labels?: string[] | number[],
    popups?: string[],
    categories?: number[] | string[], // key of 'values' that will always be displayed no matter if there are no values for that key. Labels must be also supplied if categories are set
    colors?: string[],
    max?: number,
    min?: number,
    rotated?: boolean
}>()

const filteredValues = computed(() => {
    const v = []
    const p = []
    if (props.categories) {
        for (const i of Object.values(props.categories)) {
            if (typeof props.values[i] === 'undefined') {
                v.push(0)
            } else {
                v.push(props.values[i])
            }
            if (typeof props.popups?.[i] === 'undefined') {
                p.push('')
            } else {
                p.push(props.popups[i])
            }
        }
    } else {
        const maximumKey = Math.max(...Object.keys(props.values).map(x => parseInt(x)))
        let minKey = Math.min(...Object.keys(props.values).map(x => parseInt(x)))
        if (!isFinite(minKey)) {
            minKey = 0
        }
        for (let i = minKey; i <= maximumKey; i++) {
            if (typeof props.values[i] === 'undefined') {
                v.push(0)
            } else {
                v.push(props.values[i])
            }
            if (typeof props.popups?.[i] === 'undefined') {
                p.push('')
            } else {
                p.push(props.popups[i])
            }
        }
    }
    return { v, p }
})

const max = computed(() => {
    if (typeof props.max !== 'undefined') {
        return props.max
    }
    const v = filteredValues.value.v

    let max = v[0] ?? 0
    for (const i in v) {
        if (v[i] > max) {
            max = v[i]
        }
    }
    return max
})

const min = computed(() => {
    if (typeof props.min !== 'undefined') {
        return props.min
    }
    const v = filteredValues.value.v

    let min = v[0] ?? 0
    for (const i in v) {
        if (v[i] < min) {
            min = v[i]
        }
    }
    return min
})

const range = computed(() => max.value - min.value)

const normalizedValues = computed(() => {
    return filteredValues.value.v.map(v => (v - min.value) / range.value)
})

const labels = computed(() => {
    if (typeof props.labels !== 'undefined') {
        return props.labels
    }
    return Object.keys(props.values)
})

const colors = computed(() => {
    if (typeof props.colors !== 'undefined') {
        return props.colors
    }
    return randomcolor({ count: filteredValues.value.v.length }).map(c => setColorTransparency(c, 0.8))
})

</script>
<style lang="scss">
.bar-chart {
    white-space: nowrap;

    &>.bar {
        width: calc(100% / var(--count));
        min-width: 1.5rem;
        display: inline-flex;
        position: relative;
        align-items: flex-end;
        justify-content: center;
    }

    .label {
        position: relative; //To appear before the chart
        padding: 0 .2rem;
    }

    &.rotated {
        .label {
            position: absolute;
            bottom: 50%;
            transform: rotate(-90deg) translateX(50%) translateY(50%);
            transform-origin: bottom;
        }
    }
}
</style>
