<template>
    <article>
        <h2>
            <NuxtLink :to="router.currentRoute.value.fullPath">
                <Icon name="mdi:rss" /> Zpětná vazba <span class="muted">&ndash; část {{ feedbackPartIndex + 1 }}</span>
            </NuxtLink>

            <template v-if="cloud.resolvedPermissions.editEvent">
                <NuxtLink class="ml-2" :to="`/${cloud.selectedEvent}/admin/feedback`" title="Nastavení zpětné vazby">
                    <button type="button" class="large">
                        <Icon name="mdi:pencil" class="mb-0.5e" /> Upravit
                    </button>
                </NuxtLink>

                <NuxtLink
                    class="ml-2" :to="`/${cloud.selectedEvent}/admin/feedback/result`"
                    title="Výsledky zpětné vazby">
                    <button type="button" class="large">
                        <Icon name="mdi:spreadsheet" class="mb-0.5e" /> Výsledky
                    </button>
                </NuxtLink>
            </template>
        </h2>
        <NuxtLink v-if="feedbackPartIndex > 0" :to="`/${cloud.selectedEvent}/feedback/${feedbackPartIndex - 1}`">
            <Icon name="mdi:chevron-left" /> Vrátit se na předchozí část&ensp;
        </NuxtLink>
        <NuxtLink
            v-if="feedbackPartIndex < (cloud.feedbackConfig?.length ?? 0) - 1"
            :to="`/${cloud.selectedEvent}/feedback/${feedbackPartIndex + 1}`">
            Skočit na další část
            <Icon name="mdi:chevron-right" />
        </NuxtLink>
        <br>
        <NameChangeDialog>
            <br>
            Odpovídáš jako&ensp;
        </NameChangeDialog>
        <br>

        Tvé odpovědi jsou okamžitě uloženy a můžeš se k nim na tomto zařízení kdykoliv vrátit. {{
            cloud.eventDescription?.feedbackInfo }}
        <h2>{{ currentPart?.title }}</h2>
        <div v-for="(subPart, sIndex) in currentPart?.subparts" :key="`s${sIndex}`" class="mb-5 mt-2">
            <h4 v-if="subPart.title" class="mb-1">{{ subPart.title }}</h4>
            <fieldset v-for="(entry, eIndex) in subPart.entries" :key="`e${sIndex}${eIndex}`">
                <legend v-if="entry.title">
                    <h3>{{ entry.title }}
                        <NuxtLink
                            v-if="entry.time" title="Zobrazit v harmonogramu"
                            :to="`/${cloud.selectedEvent}/schedule/${subPart.primaryIndex}/${entry.secondaryIndex}`"
                            class="muted">&ensp;{{
                                toHumanTime(entry.time) }}
                        </NuxtLink>
                    </h3>
                </legend>
                <template v-if="entry.subtitle || entry.description">
                    <details
                        v-if="(entry.subtitle?.length ?? 0) + (entry.description?.length ?? 0) > 100"
                        class="hoverable">
                        <summary v-if="entry.subtitle">
                            <h4 class="inline-block">
                                {{ entry.subtitle }}
                            </h4>
                        </summary>
                        <!-- eslint-disable-next-line vue/no-v-html -->
                        <div class="p" v-html="entry.description ?? 'Žádné detaily'" />
                    </details>
                    <template v-else>
                        <h4 v-if="entry.subtitle">&nbsp;{{ entry.subtitle }}</h4>
                        <!-- eslint-disable-next-line vue/no-v-html -->
                        <div v-if="stripHtml(entry.description)" class="p" v-html="entry.description" />
                    </template>
                </template>
                <FeedbackForm
                    :detail-question="entry.detailQuestion" :type="entry.feedbackType"
                    :data="entry.data ?? undefined" :complicated-questions="entry.questions"
                    :select-options="entry.selectOptions"
                    @set-data="data => cloud.feedback.set(subPart.primaryIndex, entry.secondaryIndex, data)" />
            </fieldset>
        </div>
        <div v-if="!currentPart?.subparts.length" class="mt-5 mb-5">
            <NuxtLink class="large" :to="`/${cloud.selectedEvent}/schedule`">
                <Icon name="mdi:calendar-month" />
                Hodnotit v harmonogramu
            </NuxtLink>
            <p class="muted">
                Programy můžete hodnotit přímo v harmonogramu
            </p>
        </div>
        <br>
        <div class="flex justify-content-between">
            <button
                v-if="feedbackPartIndex > 0" class="large"
                @click="cloud.feedback.saveAgain(false).then(() => router.push(`/${cloud.selectedEvent}/feedback/${feedbackPartIndex - 1}`))">
                <Icon name="mdi:chevron-left" />
                Předchozí část
            </button>
            <NuxtLink v-else-if="currentPart?.subparts.length" class="large" :to="`/${cloud.selectedEvent}/schedule`">
                <Icon name="mdi:calendar-month" />
                Program a informace
            </NuxtLink>
            <button
                v-if="feedbackPartIndex < (cloud.feedbackConfig?.length ?? 0) - 1" class="large"
                @click="cloud.feedback.saveAgain(false).then(() => router.push(`/${cloud.selectedEvent}/feedback/${feedbackPartIndex + 1}`))">
                Pokračovat na další část
                <Icon name="mdi:chevron-right" />
            </button>
            <button
                v-else class="large d-block m-left-auto"
                @click="cloud.feedback.saveAgain(false).then(() => router.push(`/${cloud.selectedEvent}/feedback/thanks`))">
                <Icon name="mdi:check" />
                Dokončit
            </button>
        </div>
        <p v-if="cloud.feedback.fetchFailed" style="color:red">
            {{ cloud.feedback.error || 'Nepodařilo se uložit tvou odpověď' }}
            <button @click="cloud.feedback.saveAgain(true)">
                <Icon name="material-symbols:save" /> Zkusit znovu
            </button>
        </p>
        <br>
        <br>
        <br>
        <br>
        <br>
        <LazyClientOnly>
            <Teleport to="#additionalNav">
                <nav class="eventItemNav">
                    <NuxtLink
                        v-for="(feedbackPart, fIndex) in cloud.feedbackConfig" :key="feedbackPart.title"
                        :to="fIndex !== feedbackPartIndex ? `/${cloud.selectedEvent}/feedback/${fIndex}` : router.currentRoute.value.fullPath">
                        <Icon v-if="fIndex < feedbackPartIndex" name="mdi:chevron-left" />
                        {{ fIndex === feedbackPartIndex ? '• ' : null }}<span class="muted">#{{ fIndex + 1
                        }}</span>&ensp;{{
                            feedbackPart.title }}
                        <Icon v-if="fIndex > feedbackPartIndex" name="mdi:chevron-right" />
                    </NuxtLink>
                </nav>
            </Teleport>
        </LazyClientOnly>
    </article>
</template>

<script setup lang="ts">
import { getParallelEvents } from '@/utils/utils'
import type { FeedbackConfig, ScheduleItem, Feedback } from '@/types/cloud'
const router = useRouter()
const cloud = useCloudStore()
const feedbackPartIndex = parseInt(router.currentRoute.value.params.feedback as string) || 0

definePageMeta({
    middleware(to, from) {
        if (isNaN(parseInt(to.params.feedback as string))) {
            if (import.meta.client) { alert(`Neplatná část feedbackového dotazníku ${to.params.feedback}`) }
            return {
                path: `/${to.params.event}/feedback`,
            }
        } else if (import.meta.browser && localStorage.getItem('transitions') == 'true') {// TODO: use settings.transitions
            to.meta.pageTransition = {
                name: +from.params.feedback > +to.params.feedback ? 'slide-right' : 'slide-left',
            }
        }
    },
})

onMounted(() => {
    if (cloud.eventDescription?.id == router.currentRoute.value.params.event) {
        if (!feedbackEnabled(cloud.eventDescription)) {
            const warned = useSessionStorage('noFeedbackWarned-' + cloud.selectedEvent, false)
            if (!warned.value) {
                warned.value = true
                alert(`Zpětná vazba k této události by měla probíhat v čase ${cloud.eventDescription?.start ?? 'od začátku události'} až do ${cloud.eventDescription?.feedbackEnd ?? cloud.eventDescription?.end ?? 'konce události'}. Pokračujte s tímto vědomím.`)
            }
        }
    }
})


const currentPart = computed(() => {
    type Entry = (Partial<ScheduleItem> & { data: Feedback | null, secondaryIndex: number | string, selectOptions: string[] })

    const currentConfig: FeedbackConfig | undefined = cloud.feedbackConfig?.[feedbackPartIndex]
    const subparts: { title?: string, primaryIndex: number | string, entries: Entry[] }[] = reactive([])

    if (currentConfig?.group) {
        for (const scheduleIndex in cloud.days) {
            const day = cloud.days[scheduleIndex]
            const entries: Entry[] = reactive([])
            const exp: string = currentConfig.group!.toString()
            function addScheduleItem(scheduleItem: ScheduleItem, index: number | string) {
                entries.push({
                    ...scheduleItem,
                    data: fromUpdatePayload(cloud.offlineFeedback?.[scheduleIndex]?.[index]?.[cloud.user.signatureId], {}),
                    secondaryIndex: index,
                    selectOptions: getParallelEvents(scheduleItem),
                })
            }
            if (exp.match(/[a-zA-Z0-9 ]|,/g)?.length == exp.length) {
                for (const name of exp.split(',')) {
                    const eventIndex = day.program.findIndex(event => event.title?.match(name))
                    if (eventIndex !== -1) {
                        const eventEntry = day.program[eventIndex]
                        addScheduleItem(eventEntry, eventIndex)
                    }
                }
            }
            else {
                for (const eventIndex in day.program) {
                    const eventEntry = day.program[eventIndex]
                    if (eventEntry.title?.match(currentConfig.group)) {
                        addScheduleItem(eventEntry, eventIndex)
                    }
                }
            }
            if (entries.length > 0) {
                subparts.push({
                    title: currentConfig.dayTitles !== false ? day.name : '',
                    primaryIndex: scheduleIndex,
                    entries,
                })
            }
        }
    }

    if (currentConfig?.individual) {
        const entries: Entry[] = reactive([])
        for (const individualQuest of currentConfig.individual) {
            entries.push({ // single entry
                title: individualQuest.name,
                secondaryIndex: individualQuest.name,
                feedbackType: individualQuest.type,
                detailQuestion: individualQuest.description,
                selectOptions: individualQuest.questions,
                questions: individualQuest.questions,
                data: fromUpdatePayload(
                    cloud.offlineFeedback?.[currentConfig.title]?.[individualQuest.name]?.[cloud.user.signatureId] ?? cloud.offlineFeedback?.[individualQuest.name]?.[0]?.[cloud.user.signatureId], {},
                ),
            })
        }
        subparts.push({
            title: currentConfig.group ? 'Obecné otázky' : undefined,
            primaryIndex: currentConfig.title,
            entries,
        })
    }
    return {
        title: currentConfig?.title,
        subparts,
    }
})

</script>
<style lang="scss" scoped>
.hoverable {
    padding: 0 1rem 1rem 1rem;
    border-radius: .5rem;
    cursor: pointer;

    &:hover,
    &:focus,
    &:focus-within {
        background: #0000000a;
    }

    h4 {
        margin: .1rem 0;
    }
}

fieldset {
    border-radius: .5rem;

    h4 {
        margin-top: 0
    }

    h3 {
        margin-bottom: .6em;
    }
}

.eventItemNav {
    overflow-x: auto;
    width: 100vw;
}
</style>
