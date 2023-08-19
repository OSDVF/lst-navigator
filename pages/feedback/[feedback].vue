<template>
    <article>
        <h1>
            <NuxtLink :to="router.currentRoute.value.fullPath">
                Zpětná vazba <span class="muted">&ndash; část {{ feedbackPartIndex + 1 }}</span>
            </NuxtLink>
        </h1>
        <NuxtLink v-if="feedbackPartIndex > 0" :to="`/feedback/${feedbackPartIndex + 1}`">
            <IconCSS name="mdi:chevron-left" /> Vrátit se na předchozí část
        </NuxtLink>
        <NuxtLink
            v-if="feedbackPartIndex < cloudStore.feedbackConfig?.length - 1"
            :to="`/feedback/${feedbackPartIndex - 1}`"
        >
            Skočit na další část
            <IconCSS name="mdi:chevron-right" />
        </NuxtLink>
        <br>
        Každá tvá změna je hned uložena.
        <h1>{{ currentPart?.title }}</h1>
        <div v-for="(subPart, sIndex) in currentPart?.subparts" :key="`s${sIndex}`">
            <h3>{{ subPart.title }}</h3>
            <fieldset v-for="(entry, eIndex) in subPart.entries" :key="`e${sIndex}${eIndex}`">
                <legend>
                    <h3>{{ entry.title }}</h3>
                </legend>
                <h4>{{ entry.subtitle }}</h4>
                <FeedbackForm
                    :detail-question="entry.detailQuestion" :type="entry.type" :data="entry.data"
                    :complicated-questions="entry.questions"
                    @set-data="(data: Feedback) => setData(subPart.schedulePartIndex, entry.scheduleEntryIndex, data)"
                />
            </fieldset>
        </div>
        <br>
        <button
            v-if="feedbackPartIndex < cloudStore.feedbackConfig?.length - 1" class="large d-block m-left-auto"
            @click="setAllData().then(() => router.push(`/feedback/${feedbackPartIndex + 1}`))"
        >
            Pokračovat na další část
            <IconCSS name="mdi:chevron-right" />
        </button>
        <button v-else class="large d-block m-left-auto" @click="setAllData().then(() => router.push('/info'))">
            <IconCSS name="mdi:check" />
            Dokončit
        </button>
        <br>
        <br>
        <ClientOnly>
            <Teleport to="#additionalNav">
                <nav class="eventItemNav">
                    <NuxtLink
                        v-for="(feedbackPart, fIndex) in cloudStore.feedbackConfig?.filter((_x: any, i: number) => i != feedbackPartIndex)"
                        :key="feedbackPart.title" :to="`/feedback/${feedbackPartIndex - 1}`"
                    >
                        <IconCSS v-if="fIndex < feedbackPartIndex" name="mdi:chevron-left" />
                        {{ feedbackPart.title }}
                        <IconCSS v-if="fIndex > feedbackPartIndex" name="mdi:chevron-right" />
                    </NuxtLink>
                </nav>
            </Teleport>
        </ClientOnly>
    </article>
</template>

<script setup lang="ts">
import { setDoc } from 'firebase/firestore'
import { useCloudStore } from '@/stores/cloud'
import { Feedback } from '@/components/FeedbackForm.vue'
import { useSettings } from '@/stores/settings'
const router = useRouter()
const cloudStore = useCloudStore()
const settings = useSettings()
const feedbackPartIndex = parseInt(router.currentRoute.value.params.feedback as string) || 0
type FeedbackConfig = {
    group: string | RegExp, // title of parts of schedule to group by
    title: string
}
const currentPart = computed(() => {
    const config: FeedbackConfig | undefined = cloudStore.feedbackConfig?.[feedbackPartIndex]
    if (config?.group) {
        const subparts = []
        for (const scheduleIndex in cloudStore.scheduleParts) {
            const schedulePart = cloudStore.scheduleParts[scheduleIndex]
            const entries = []
            for (const eventIndex in schedulePart.program) {
                const eventEntry = schedulePart.program[eventIndex]
                if (eventEntry.title?.match(config.group)) {
                    entries.push({
                        title: eventEntry.title,
                        subtitle: eventEntry.subtitle,
                        type: eventEntry.feedbackType,
                        questions: eventEntry.questions,
                        detailQuestion: eventEntry.detailQuestion,
                        data: cloudStore.feedbackRef?.[scheduleIndex]?.[eventIndex]?.[settings.userIdentifier],
                        scheduleEntryIndex: eventIndex
                    })
                }
            }
            if (entries.length > 0) {
                subparts.push({
                    title: schedulePart.name,
                    schedulePartIndex: scheduleIndex,
                    entries
                })
            }
        }
        return {
            title: config.title,
            subparts
        }
    }
})

const fetchingFeedback = ref(false)
const couldNotFetch = ref(false)
const error = ref()
const lastNewFeedback = ref<{ [sIndex: number | string]: { [eIndex: number | string]: { [userIdentifier: string]: Feedback } } }>({})

function setData(sIndex: number | string, eIndex: number | string, data: Feedback) {
    fetchingFeedback.value = true
    lastNewFeedback.value[sIndex] = { ...lastNewFeedback.value[sIndex], [eIndex]: { [settings.userIdentifier]: data } }

    setDoc(cloudStore.feedbackDoc!, {
        [sIndex]: {
            [eIndex]: {
                [settings.userIdentifier]: data
            }
        }
    }, {
        merge: true
    }).then(() => { fetchingFeedback.value = couldNotFetch.value = false }).catch((e) => { error.value = e })
    setTimeout(() => {
        couldNotFetch.value = fetchingFeedback.value
        fetchingFeedback.value = false
    }, 5000)
}

function setAllData() {
    fetchingFeedback.value = true
    const uploadingPromise = setDoc(cloudStore.feedbackDoc!, lastNewFeedback.value, {
        merge: true
    }).then(() => { fetchingFeedback.value = couldNotFetch.value = false })
    setTimeout(() => {
        couldNotFetch.value = fetchingFeedback.value
        fetchingFeedback.value = false
    }, 5000)
    uploadingPromise.catch((e) => { error.value = e })
    return uploadingPromise
}

</script>
