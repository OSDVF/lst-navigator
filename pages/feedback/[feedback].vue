<template>
    <article>
        <h1>
            <NuxtLink :to="router.currentRoute.value.fullPath">
                <Icon name="mdi:rss" /> Zpětná vazba <span class="muted">&ndash; část {{ feedbackPartIndex + 1 }}</span>
            </NuxtLink>
            <NuxtLink
                v-if="cloudStore.resolvedPermissions.editEvent" class="ml-2" to="/admin/feedback"
                title="Nastavení zpětné vazby">
                <button type="button" class="large">
                    <Icon name="mdi:pencil" class="baseline" /> Upravit
                </button>
            </NuxtLink>
        </h1>
        <NuxtLink v-if="feedbackPartIndex > 0" :to="`/feedback/${feedbackPartIndex - 1}`">
            <Icon name="mdi:chevron-left" /> Vrátit se na předchozí část&ensp;
        </NuxtLink>
        <NuxtLink
            v-if="feedbackPartIndex < (cloudStore.feedbackConfig?.length ?? 0) - 1"
            :to="`/feedback/${feedbackPartIndex + 1}`">
            Skočit na další část
            <Icon name="mdi:chevron-right" />
        </NuxtLink>
        <br>
        <NameChangeDialog v-if="feedbackPartIndex == 0">
            <br>
            Odpovídáš jako&ensp;
        </NameChangeDialog>
        <br>

        Každá tvá změna je hned uložena. Rozpracovaný formulář bude navždy zachován. {{ cloudStore.eventData?.feedbackInfo }}
        <h1>{{ currentPart?.title }}</h1>
        <div v-for="(subPart, sIndex) in currentPart?.subparts" :key="`s${sIndex}`">
            <h3>{{ subPart.title }}</h3>
            <fieldset v-for="(entry, eIndex) in subPart.entries" :key="`e${sIndex}${eIndex}`">
                <legend v-if="entry.title">
                    <h3>{{ entry.title }}</h3>
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
                        <h4>{{ entry.subtitle }}</h4>
                        <!-- eslint-disable-next-line vue/no-v-html -->
                        <div class="p" v-html="entry.description" />
                    </template>
                </template>
                <FeedbackForm
                    :detail-question="entry.detailQuestion" :type="entry.feedbackType"
                    :data="entry.data ?? undefined" :complicated-questions="entry.questions"
                    :select-options="entry.selectOptions"
                    @set-data="(data: Feedback) => cloudStore.feedback.set(subPart.primaryIndex, entry.secondaryIndex, data)" />
            </fieldset>
        </div>
        <br>
        <div class="flex justify-content-between">
            <button
                v-if="feedbackPartIndex > 0" class="large"
                @click="cloudStore.feedback.saveAgain().then(() => router.push(`/feedback/${feedbackPartIndex - 1}`))">
                <Icon name="mdi:chevron-left" />
                Předchozí část
            </button>
            <NuxtLink v-else class="large" to="/schedule">
                <Icon name="mdi:calendar-month" />
                Program a informace
            </NuxtLink>
            <button
                v-if="feedbackPartIndex < (cloudStore.feedbackConfig?.length ?? 0) - 1" class="large"
                @click="cloudStore.feedback.saveAgain().then(() => router.push(`/feedback/${feedbackPartIndex + 1}`))">
                Pokračovat na další část
                <Icon name="mdi:chevron-right" />
            </button>
            <button
                v-else class="large d-block m-left-auto"
                @click="cloudStore.feedback.saveAgain().then(() => router.push('/feedback/thanks'))">
                <Icon name="mdi:check" />
                Dokončit
            </button>
        </div>
        <p v-if="cloudStore.feedback.fetchFailed" style="color:red">
            {{ cloudStore.feedback.error || 'Nepodařilo se uložit tvou odpověď' }}
            <button @click="cloudStore.feedback.saveAgain">
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
                        v-for="(feedbackPart, fIndex) in cloudStore.feedbackConfig" :key="feedbackPart.title"
                        :to="fIndex !== feedbackPartIndex ? `/feedback/${fIndex}` : router.currentRoute.value.fullPath">
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
import { useCloudStore } from '@/stores/cloud'
import { useSettings } from '@/stores/settings'
import { getParallelEvents } from '@/utils/utils'
import type { FeedbackConfig, ScheduleItem, Feedback } from '@/types/cloud'
const router = useRouter()
const cloudStore = useCloudStore()
const settings = useSettings()
const feedbackPartIndex = parseInt(router.currentRoute.value.params.feedback as string) || 0

definePageMeta({
    middleware(to, from) {
        if (isNaN(parseInt(to.params.feedback as string))) {
            if (import.meta.client) { alert(`Neplatná část feedbackového dotazníku ${to.params.feedback}`) }
            return {
                path: '/feedback',
            }
        } else if (import.meta.browser && localStorage.getItem('transitions') == 'true') {// TODO: use settings.transitions
            to.meta.pageTransition = {
                name: +from.params.feedback > +to.params.feedback ? 'slide-right' : 'slide-left',
            }
        }
    },
})

const currentPart = computed(() => {
    const config: FeedbackConfig | undefined = cloudStore.feedbackConfig?.[feedbackPartIndex]
    const subparts: { title: string, primaryIndex: number | string, entries: (Partial<ScheduleItem> & { data: Feedback | null, secondaryIndex: number | string, selectOptions: string[] })[] }[] = []

    if (config?.group) {
        for (const scheduleIndex in cloudStore.days) {
            const day = cloudStore.days[scheduleIndex]
            const entries = []
            for (const eventIndex in day.program) {
                const eventEntry = day.program[eventIndex]
                if (eventEntry.title?.match(config.group)) {
                    entries.push({
                        ...eventEntry,
                        data: cloudStore.offlineFeedback?.[scheduleIndex]?.[eventIndex]?.[settings.userIdentifier],
                        secondaryIndex: eventIndex,
                        selectOptions: getParallelEvents(eventEntry),
                    })
                }
            }
            if (entries.length > 0) {
                subparts.push({
                    title: day.name,
                    primaryIndex: scheduleIndex,
                    entries,
                })
            }
        }
    }

    if (config?.individual) {
        for (const individualQuest of config.individual) {
            subparts.push({
                title: individualQuest.name,
                primaryIndex: config.title,
                entries: [{
                    secondaryIndex: individualQuest.name,
                    feedbackType: individualQuest.type,
                    detailQuestion: individualQuest.description,
                    selectOptions: individualQuest.questions,
                    questions: individualQuest.questions,
                    data: cloudStore.offlineFeedback?.[config.title]?.[individualQuest.name]?.[settings.userIdentifier] ?? cloudStore.offlineFeedback?.[individualQuest.name]?.[0]?.[settings.userIdentifier],
                }],
            })
        }
    }
    return {
        title: config?.title,
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
}

.eventItemNav {
    overflow-x: auto;
    width: 100vw;
}
</style>
