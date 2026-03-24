<template>
    <div class="legend">
        <h3>Statistiky</h3>
        <label class="info">Přihlášky přijány od: <span>{{ cloud.eventDescription?.applicationsStart ?? 'vždy' }}</span>
            do
            <span>{{ cloud.eventDescription?.applicationsEnd ?? 'vždy' }}</span></label>
        <label class="info">Počítat i se zrušenými:
            <input v-model="applications.includeCancelled" type="checkbox"></label>
        <label class="info">Člověko×noci: <span>{{
            applications.filteredMapped?.map(a => maybe(toJSDate(a.mapped?.departure?.responses as
                                                            string)?.getTime(),
                                                        departure => maybe(toJSDate(a.mapped?.arrival?.responses as string)?.getTime(), arrival => Math.floor(
                                                            (departure - arrival) / (1000 * 3600 * 24)), () => 0), () => 0))
                .reduceRight((a, b) => a + b, 0)}}
        </span>
        </label>

        <label class="info">{{ "\u{1F9D1}\u{200D}\u{1F91D}\u{200D}\u{1F9D1}" }} <span>
            {{ applications.filtered.length }}</span></label>

        <label class="info">Zrušené: <span>
            {{applications.applications.filter(a => a.state == ApplicationState.CANCELLED).length}}
        </span></label>

        <label class="info">Odeslané emaily: <span>{{ applications.filtered.length - noEmailSent.length }}</span>
            <button
                v-if="noEmailSent.length" title="Odeslat potvrzovací emaily zbývajícím"
                @click="sendWhereNotSent">💌</button>
        </label>

        <label v-for="day in statistics" :key="day.date.getTime()" class="info">
            {{ day.date.getDate() }}.{{ day.date.getMonth() + 1 }}. {{ day.people }} {{ "\u{1F9D1}\u{200D}\u{1F4BC}" }}
            &nbsp;
            <span v-for="(stat, key, i) in day.statistics" :key="key">
                {{ key }}: {{ stat }}
                <small>
                    {{ }}
                </small>
                {{ i == Object.keys(day.statistics).length - 1 ? ',' : '' }}
            </span>
        </label>
        <p v-if="error" class="error"><code>{{ error }}</code></p>
    </div>
</template>
<script lang="ts" setup>
import { ApplicationState } from '~/types/cloud'

definePageMeta({
    title: 'Statistiky',
    layout: 'admin',
    middleware: ['auth'],
})

const error = ref()
const cloud = useCloudStore()
const applications = useApplications()
const config = useRuntimeConfig()
const formData = await useApplicationFormData(extractFormIdFromURL(cloud.eventDescription!.formDocument!)!, error)

type Statistics = {
    date: Date,
    /**
     * How many people this day
     */
    people: number,
    meals: {
        [foodType: string]: number,
        all: number,
    }[]
    statistics: {
        [name: string]: {
            /** count of responses with that value */
            [value: string]: number
        }
    },
}

const noEmailSent = computed(() => applications.filtered?.filter(a => !a.confiramtionSent))

function sendWhereNotSent() {

}

const statistics = computed(() => {
    if (!applications.filteredMapped || !cloud.eventDescription || !applications.settings) { return [] }

    const days: Record<number, Statistics> = {}
    const foodField = applications.settings?.fields.food ?? maybeInt(config.public.applicationDefaultFoodField)
    const foodTypes = formData.value.items?.find(i => typeof foodField == 'number' ? parseInt(i.itemId!, 16) == foodField : i.title == foodField)?.questionItem?.question?.choiceQuestion?.options
    const mealNames = applications.settings.values.mealNames

    for (const a of applications.filteredMapped) {
        const departure = toJSDate(a.mapped?.departure?.responses as string ?? cloud.eventDescription.end)
        const arrival = toJSDate(a.mapped?.arrival?.responses as string ?? cloud.eventDescription.start)
        const [firstMeal, lastMeal] = maybe(mealNames, n => [
            maybeIndex(n.findIndex(n => n == a.mapped?.firstMeal?.responses)) ?? 0,
            maybeIndex(n.findIndex(n => n == a.mapped?.lastMeal?.responses)) ?? mealNames.length - 1,
        ]) ?? [0, mealNames.length - 1]

        for (let day: Date = arrival; day <= departure; day.setDate(day.getDate() + 1)) {
            const current = days[day.getTime()]
            if (typeof current === 'undefined') {
                const newStat: Statistics = {
                    date: day,
                    people: 1,
                    meals: Array(mealNames.length ?? 0).fill(
                        Object.fromEntries(foodTypes?.map(o => [o.value ?? '', 0]) ?? []),
                    ),
                    statistics: {},
                }
                addStatistics(firstMeal, lastMeal, newStat)
                days[day.getTime()] = newStat
            } else {
                days[day.getTime()].people++
                addStatistics(firstMeal, lastMeal, days[day.getTime()])
            }
        }
    }
    //return as array sorted by date
    return Object.entries(days).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(a => a[1])

    function addStatistics(firstMeal: number, lastMeal: number, stat: Statistics) {
        for (let i = firstMeal; i <= lastMeal; i++) {
            stat.meals[i].all++
            for (const t of foodTypes ?? []) {
                if (t.value) {
                    stat.meals[i][t.value]++
                }
            }
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

.info {
    border-left: 2px solid rgba(128, 128, 128, 0.451);
    padding-left: .5rem;
    margin-right: .5rem;
}
</style>