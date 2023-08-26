<template>
    <article>
        <h1>
            <NuxtLink :to="router.currentRoute.value.fullPath">
                <IconCSS name="mdi:rss" /> Zpětná vazba <span class="muted">&ndash; část {{ feedbackPartIndex + 1 }}</span>
            </NuxtLink>
        </h1>
        <NuxtLink v-if="feedbackPartIndex > 0" :to="`/feedback/${feedbackPartIndex + 1}`">
            <IconCSS name="mdi:chevron-left" /> Vrátit se na předchozí část&ensp;
        </NuxtLink>
        <NuxtLink
            v-if="feedbackPartIndex < cloudStore.feedbackConfig?.length - 1"
            :to="`/feedback/${feedbackPartIndex - 1}`"
        >
            Skočit na další část
            <IconCSS name="mdi:chevron-right" />
        </NuxtLink>
        <br>
        <NameChangeDialog>
            <br>
            Odpovídáš jako&ensp;
        </NameChangeDialog>
        <br>

        Každá tvá změna je hned uložena. {{ cloudStore.feedbackInfoText }}
        <h1>{{ currentPart?.title }}</h1>
        <div v-for="(subPart, sIndex) in currentPart?.subparts" :key="`s${sIndex}`">
            <h3>{{ subPart.title }}</h3>
            <fieldset v-for="(entry, eIndex) in subPart.entries" :key="`e${sIndex}${eIndex}`">
                <legend v-if="entry.title">
                    <h3>{{ entry.title }}</h3>
                </legend>
                <details v-if="entry.subtitle || entry.description" class="hoverable">
                    <summary v-if="entry.subtitle"><h4 class="inline-block">
                        {{ entry.subtitle }}
                    </h4></summary>
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <p v-html="entry.description ?? 'Žádné detaily'" />
                </details>
                <FeedbackForm
                    :detail-question="entry.detailQuestion" :type="entry.feedbackType" :data="entry.data"
                    :complicated-questions="entry.questions"
                    :select-options="entry.selectOptions"
                    @set-data="(data: Feedback) => cloudStore.setFeedbackData(subPart.primaryIndex, entry.secondaryIndex, data)"
                />
            </fieldset>
        </div>
        <br>
        <button
            v-if="feedbackPartIndex < cloudStore.feedbackConfig?.length - 1" class="large d-block m-left-auto"
            @click="cloudStore.saveAgainAllFeedback().then(() => router.push(`/feedback/${feedbackPartIndex + 1}`))"
        >
            Pokračovat na další část
            <IconCSS name="mdi:chevron-right" />
        </button>
        <button v-else class="large d-block m-left-auto" @click="cloudStore.saveAgainAllFeedback().then(() => router.push('/info'))">
            <IconCSS name="mdi:check" />
            Dokončit
        </button>
        <p v-if="cloudStore.couldNotFetchFeedback" style="color:red">
            {{ cloudStore.feedbackError || 'Nepodařilo se uložit tvou odpověď' }}
            <button @click="cloudStore.saveAgainAllFeedback">
                <IconCSS name="material-symbols:save" /> Zkusit znovu
            </button>
        </p>
        <br>
        <br>
        <br>
        <br>
        <ClientOnly>
            <Teleport to="#additionalNav">
                <ProgressBar v-if="cloudStore.fetchingFeedback" />
                <span v-if="cloudStore.couldNotFetchFeedback">
                    {{ cloudStore.feedbackError || 'Nepodařilo se odeslat tvou odpověď' }}
                </span>
                <nav class="eventItemNav">
                    <NuxtLink
                        v-for="(feedbackPart, fIndex) in cloudStore.feedbackConfig"
                        :key="feedbackPart.title" :to="fIndex !== feedbackPartIndex ? `/feedback/${fIndex}` : null"
                    >
                        <IconCSS v-if="fIndex < feedbackPartIndex" name="mdi:chevron-left" />
                        {{ fIndex === feedbackPartIndex ? '• ' : null }}<span class="muted">#{{ fIndex + 1 }}</span>&ensp;{{ feedbackPart.title }}
                        <IconCSS v-if="fIndex > feedbackPartIndex" name="mdi:chevron-right" />
                    </NuxtLink>
                </nav>
            </Teleport>
        </ClientOnly>
    </article>
</template>

<script setup lang="ts">
import { FeedbackConfig, useCloudStore, ScheduleEvent, Feedback } from '@/stores/cloud'
import { useSettings } from '@/stores/settings'
import { getParallelEvents } from '@/utils/types'
const router = useRouter()
const cloudStore = useCloudStore()
const settings = useSettings()
const feedbackPartIndex = parseInt(router.currentRoute.value.params.feedback as string) || 0
const currentPart = computed(() => {
    const config: FeedbackConfig | undefined = cloudStore.feedbackConfig?.[feedbackPartIndex]
    const subparts: {title: string, primaryIndex: number | string, entries: (Partial<ScheduleEvent> & {data: Feedback, secondaryIndex: number | string, selectOptions: string[]})[]}[] = []

    if (config?.group) {
        for (const scheduleIndex in cloudStore.scheduleParts) {
            const schedulePart = cloudStore.scheduleParts[scheduleIndex]
            const entries = []
            for (const eventIndex in schedulePart.program) {
                const eventEntry = schedulePart.program[eventIndex]
                if (eventEntry.title?.match(config.group)) {
                    entries.push({
                        ...eventEntry,
                        data: cloudStore.offlineFeedback?.[scheduleIndex]?.[eventIndex]?.[settings.userIdentifier],
                        secondaryIndex: eventIndex,
                        selectOptions: getParallelEvents(eventEntry)
                    })
                }
            }
            if (entries.length > 0) {
                subparts.push({
                    title: schedulePart.name,
                    primaryIndex: scheduleIndex,
                    entries
                })
            }
        }
    }

    if (config?.individual) {
        for (const individualQuest of config.individual) {
            subparts.push({
                title: individualQuest.name,
                primaryIndex: individualQuest.name,
                entries: [{
                    secondaryIndex: 0,
                    feedbackType: individualQuest.type,
                    detailQuestion: individualQuest.description,
                    selectOptions: individualQuest.questions,
                    questions: individualQuest.questions,
                    data: cloudStore.offlineFeedback?.[config.title]?.[individualQuest.name]?.[settings.userIdentifier]
                }]
            })
        }
    }
    return {
        title: config?.title,
        subparts
    }
})

</script>
<style lang="scss" scoped>
.hoverable {
    padding: 1rem;
    border-radius: .5rem;
    cursor: pointer;
    &:hover, &:focus, &:focus-within {
        background: #0000000a;
    }
    h4 {
        margin: .1rem 0;
    }
}
fieldset {
    border-radius: .5rem;
}
</style>
