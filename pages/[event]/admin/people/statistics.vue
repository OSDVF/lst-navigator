<template>
    <div>
        <article>
            <h3>Statistiky</h3>
            <div class="legend pb-1">
                <label class="info">Přihlášky přijány od: <span>{{ cloud.eventDescription?.applicationsStart ?? 'vždy'
                }}</span>
                    do
                    <span>{{ cloud.eventDescription?.applicationsEnd ?? 'vždy' }}</span></label>
                <label class="info">
                    <input v-model="applications.includeCancelled" type="checkbox">
                    Počítat i se zrušenými
                </label>
                <label class="info">Člověko×noci: <span>{{
                    applications.filteredMapped?.map(
                        a => maybe(toJSDate(a.mapped?.departure?.responses as string)?.getTime(),
                                   departure => maybe(toJSDate(a.mapped?.arrival?.responses as string)?.getTime(),
                                                      arrival => Math.floor((departure - arrival) / (1000 * 3600 * 24))) ?? 0) ?? 0)
                        .reduceRight((a, b) => a + b, 0)}}
                </span>
                </label>
                <label class="info">{{ "\u{1F9D1}\u{200D}\u{1F91D}\u{200D}\u{1F9D1}" }} <span>
                    {{ applications.filtered.length }}</span></label>
                <label class="info">Zrušené: <span>
                    {{applications.applications.filter(a => a.state == ApplicationState.CANCELLED).length}}
                </span></label>
                <label class="info">Odeslané emaily: <span>{{ applications.filtered.length - noEmailSent.length
                }}</span>
                    &nbsp;
                    <button
                        v-if="noEmailSent.length" title="Odeslat potvrzovací emaily zbývajícím"
                        @click="sendWhereNotSent">💌</button>
                </label>
            </div>
            <table class="borders collapse cell-p-1 col-stripes">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>{{ "\u{1F9D1}\u{200D}\u{1F4BC}" }}</th>
                        <th v-for="(stat, key) in statisticsKeys" :key="`h${key}`" :colspan="stat.length">
                            {{ key }}
                        </th>
                    </tr>
                    <tr>
                        <th />
                        <th />
                        <template v-for="(stat, key) in statisticsKeys" :key="`h${key}`">
                            <th v-for="key2 in stat" :key="`h${key}${key2}`">{{ key2 == 'any' ? 'Celkem' : key2 }}</th>
                        </template>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="day in statistics" :key="day.date.getTime()" class="info">
                        <td>{{ day.date.getDate() }}.{{ day.date.getMonth() + 1 }}.</td>
                        <td>{{ day.people }}</td>
                        <template v-for="(stat, key) in day.statistics" :key="`${day.date.getTime()}${key}`">
                            <td v-for="val in stat" :key="`${day.date.getTime()}${key}${val}`">{{ val || '' }}</td>
                        </template>
                    </tr>
                </tbody>
            </table>
            <h3>Délka pobytu</h3>
            <table class="borders collapse cell-p-1 col-stripes">
                <thead>
                    <tr>
                        <th>Délka pobytu</th>
                        <td v-for="(_, key) in stayPeriods" :key="`s${key}`">{{ key }}</td>
                    </tr>
                </thead>
                <thead>
                    <tr>
                        <th>Počet lidí</th>
                        <td v-for="(value, key) in stayPeriods" :key="`sv${key}`">{{ value }}</td>
                    </tr>
                </thead>
            </table>
        </article>
        <p v-if="error" class="error"><code>{{ error }}</code></p>
    </div>
</template>
<script lang="ts" setup>
import { ApplicationState } from '~/form-connector/src/responses'

definePageMeta({
    title: 'Statistiky',
    layout: 'admin',
    middleware: ['auth'],
})

const error = ref()
const cloud = useCloudStore()
const applications = useApplications()
const config = useRuntimeConfig()
const foodTypes = computed(() => {
    const types = new Set<string>(['any'])
    for (const a of applications.filteredMapped) {
        const r = a.record.overlays?.food || a.mapped?.food?.responses
        if (r) {
            types.add(r as string)
        }
    }
    return [...types.values()]
})

const stayPeriods = computed(() => {
    const periods: number[] = []
    for (const a of applications.filteredMapped) {
        const departure = toJSDate(a.mapped?.departure?.responses as string ?? cloud.eventDescription?.end)
        const arrival = toJSDate(a.mapped?.arrival?.responses as string ?? cloud.eventDescription?.start)
        if (arrival && departure) {
            const period = (departure.getTime() - arrival.getTime()) / (3600 * 1000 * 24)
            periods[period] = (periods[period] ?? 0) + 1
        }
    }
    return periods
})

type Statistics = {
    date: Date,
    /**
     * How many people this day
     */
    people: number,
    statistics: {
        /** e. g. food type */
        [name: string]: {
            any: number,
            /** count of responses with that value */
            [value: string]: number
        }
    },
}

const noEmailSent = computed(() => applications.filtered?.filter(a => !a.confirmationSent))

function sendWhereNotSent() {

}

const statisticsKeys = computed(() => {
    const keys: Record<keyof Statistics['statistics'], string[]> = {}
    if (!applications.settings) {
        return keys
    }
    const mealNames = applications.settings.values.mealNames
    for (const n of mealNames) {
        keys[n] = foodTypes.value
    }

    return keys
})

const statistics = computed(() => {
    if (!applications.filteredMapped || !cloud.eventDescription || !applications.settings) { return [] }

    const days: Record<number, Statistics> = {}
    const mealNames = applications.settings.values.mealNames
    const eventFirstMeal = parseInt(config.public.applicationDefaultEventFirstMealIndex) || 0
    const eventLastMeal = parseInt(config.public.applicationDefaultEventLastMealIndex) || (mealNames.length - 1)

    for (const a of applications.filteredMapped) {
        const arrival = toJSDate(a.mapped?.arrival?.responses as string ?? cloud.eventDescription.start)
        const departure = toJSDate(a.mapped?.departure?.responses as string ?? cloud.eventDescription.end)
        const [firstMeal, lastMeal] = maybe(mealNames, n => [
            maybeIndex(n.findIndex(n => n == a.mapped?.firstMeal?.responses)) ?? eventFirstMeal,
            maybeIndex(n.findIndex(n => n == a.mapped?.lastMeal?.responses)) ?? eventLastMeal,
        ]) ?? [0, mealNames.length - 1]
        const foodType = (a.record.overlays?.food as string) ?? a.mapped?.food?.responses.toString() ?? foodTypes.value[0] ?? 'Jiné'

        for (let day: Date = new Date(arrival); day <= departure; day.setDate(day.getDate() + 1)) {
            const dayKey = day.getTime()
            if (typeof days[dayKey] === 'undefined') {
                const newStat: Statistics = {
                    date: new Date(dayKey),
                    people: 1,
                    statistics: Object.fromEntries(mealNames.map(
                        n => [n, Object.fromEntries([['any', 0]].concat(foodTypes.value.map(o => [o ?? 'Jiné', 0])))],
                    )),
                }
                days[dayKey] = newStat
                addStatistics(+day === +arrival ? firstMeal : 0, +day === +departure ? lastMeal : (mealNames.length - 1), foodType, dayKey)
            } else {
                days[dayKey].people++
                addStatistics(+day === +arrival ? firstMeal : 0, +day === +departure ? lastMeal : (mealNames.length - 1), foodType, dayKey)
            }
        }
    }
    //return as array sorted by date
    return Object.entries(days).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(a => a[1])

    function addStatistics(firstMeal: number, lastMeal: number, type: string, key: number) {
        for (let i = firstMeal; i <= lastMeal; i++) {
            days[key].statistics[mealNames[i]][type]++
            days[key].statistics[mealNames[i]].any++
        }
    }
})

</script>

<style lang="scss">
$halfGray: rgba(128, 128, 128, 0.432);

.legend {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: .5rem;
    border-bottom: 1px solid $halfGray;
    margin-bottom: .5rem;
}

.info:not(:first-child) {
    border-left: 2px solid #80808073;
    padding-left: .5rem;
    margin-right: .5rem;
}

table.borders {

    td,
    th {
        border: 1px solid #79797982
    }
}

table.collapse {
    border-collapse: collapse;
}
</style>´
