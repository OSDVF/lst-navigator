<template>
    <article
        :style="{
            'overflow-x': movingOrTrainsitioning ? 'hidden' : undefined,
        }">
        <h1><template v-if="eventData?.icon">
                <Icon :name="eventData.icon" />
            </template>
            {{ eventData?.title }}&ensp;
            <span class="muted">
                {{ toHumanTime(eventData?.time) }}
                <NuxtLink :to="`/schedule/${dayIndex}/edit/${eventItemIndex}`" title="Upravit program">
                    <Icon name="mdi:pencil" />
                </NuxtLink>
            </span>
        </h1>
        <h3>{{ eventData?.subtitle }}</h3>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="p" v-html="eventData?.description ?? 'Žádné podrobnosti'" />

        <h1>
            <Icon name="mdi:rss" /> Zpětná vazba
        </h1>
        <template v-if="eventData?.feedbackType">
            <h4>Tvá zpětná vazba</h4>
            <small>Odpovídáš jako <NuxtLink
                class="dotted-underline" to="/settings"
                title="Jméno je možné nastavit v nastavení">
                {{ settings?.userNickname || 'anonym' }}</NuxtLink></small>
            <FeedbackForm
                :data="currentFeedbackValue" :type="eventData?.feedbackType"
                :complicated-questions="eventData?.questions" :select-options="getParallelEvents(eventData)"
                :detail-question="eventData?.detailQuestion"
                @set-data="(data: Feedback) => cloudStore.feedback.set(dayIndex, eventItemIndex, data)" />
            <p v-if="cloudStore.feedback.fetchFailed">
                Nepodařilo se uložit tvou odpověď
                <br>
                {{ cloudStore.feedback.error }}
                <br>
                <button @click="cloudStore.feedback.saveAgain">
                    <Icon name="material-symbols:save" /> Zkusit uložit znovu
                </button>
            </p>
        </template>
        <p v-else>
            Není k dispozici
        </p>
        <h1>Tvé poznámky&ensp;
            <Icon tabindex="0" title="Experimentální funkce" name="mdi:alert" style="color: rgb(97, 63, 0);opacity: .5;" />
        </h1>
        <div class="p">
            <ClassicCKEditor v-model="noteModel" @focus="permitSwipe = false" @blur="permitSwipe = true" />
            <ProgressBar v-if="fetchingNote" />
        </div>
        <br>
        <LazyClientOnly>
            <Teleport to="#additionalNav">
                <nav class="eventItemNav">
                    <NuxtLink v-if="eventItemIndex > 0" :to="`/schedule/${dayIndex}/${eventItemIndex - 1}`">
                        <Icon name="mdi:chevron-left" /> <span class="muted">{{ toHumanTime(previousEventData?.time) ||
                            'Předchozí den' }}</span> {{ previousEventData?.title ?? previousEventData?.subtitle }}
                    </NuxtLink>
                    <NuxtLink
                        :to="eventItemIndex < (cloudStore.days?.[dayIndex]?.program?.length ?? 0) - 1 ? `/schedule/${dayIndex}/${eventItemIndex + 1}` : (dayIndex < (cloudStore.days?.length ?? 0) - 1 ? `/schedule/${dayIndex + 1}/0` : route.fullPath)">
                        <span class="muted">{{ toHumanTime(nextEventData?.time) || 'Další den' }}</span> {{
                            nextEventData?.title ?? nextEventData?.subtitle }}
                        <Icon name="mdi:chevron-right" />
                    </NuxtLink>
                </nav>
            </Teleport>
        </LazyClientOnly>
    </article>
</template>

<script setup lang="ts">
import { setDoc } from '~/utils/trace'
import { doc } from 'firebase/firestore'
import { colorToHex, darkenColor } from '@/utils/colors'
import { useCloudStore } from '@/stores/cloud'
import type { Feedback } from '@/types/cloud'
import { useSettings } from '@/stores/settings'
import { toHumanTime, getParallelEvents } from '@/utils/types'
import { usePersistentRef } from '@/utils/persistence'

const route = useRoute()
const settings = useSettings()
const dayIndex = parseInt(route.params.day as string ?? 0)
const eventItemIndex = parseInt(route.params.event as string) || 0
const cloudStore = useCloudStore()
const globalBackground = inject('globalBackground', ref(''))
const eventData = computed(() => {
    const program = cloudStore.days ? cloudStore.days[dayIndex]?.program : []
    if (program) {
        const eventData = program[eventItemIndex]
        const hexColor = colorToHex(eventData?.color || 'gray')
        const darkened = darkenColor(hexColor, -0.2)
        globalBackground.value = darkened === '#ffffff' ? hexColor : darkened
        return eventData
    }
    return undefined
})

const previousEventData = computed(() => cloudStore.days?.[dayIndex]?.program?.[eventItemIndex - 1])
const nextEventData = computed(() => cloudStore.days?.[dayIndex]?.program?.[eventItemIndex + 1])
const noteError = ref()
const fetchingNote = ref(false)
const couldNotFetchNote = ref(false)

const currentFeedbackValue = computed(() => cloudStore.offlineFeedback?.[dayIndex]?.[eventItemIndex]?.[settings.userIdentifier] as Feedback | undefined)
const movingOrTrainsitioning = inject('trainsitioning', ref(false))
const permitSwipe = inject('permitSwipe', ref(false))

const notesDocument = useDocument(computed(() => cloudStore.notesCollection ? doc(cloudStore.notesCollection, settings.userIdentifier) : null), { once: !!import.meta.server })//TODO server vs client vs browser
const offlineNote = usePersistentRef(`note.${dayIndex}.${eventItemIndex}`, { time: new Date().getTime(), note: '' })
let noteSaving: NodeJS.Timeout | null

const noteModel = computed({
    get() {
        const onlineVal = notesDocument.value?.[dayIndex]?.[eventItemIndex]
        const onlineDate = new Date(onlineVal?.time ?? 0).getTime()
        if (onlineDate > offlineNote.value.time) {
            return onlineVal.note
        }
        return offlineNote.value.note
    },
    set(value: string) {
        const newValue = {
            time: settings.notesDirtyTime = new Date().getTime(),
            note: value,
        }
        offlineNote.value = newValue
        if (!noteSaving) {
            noteSaving = setTimeout(() => {
                if (cloudStore.notesCollection) {
                    fetchingNote.value = true
                    setDoc(doc(cloudStore.notesCollection, settings.userIdentifier), {
                        [dayIndex]: {
                            [eventItemIndex]: newValue,
                        },
                    },
                    { merge: true }).then(() => {
                        fetchingNote.value = couldNotFetchNote.value = false
                    }).catch((e) => { noteError.value = e })

                    setTimeout(() => {
                        couldNotFetchNote.value = fetchingNote.value
                        fetchingNote.value = false
                    }, 7000)
                }
                noteSaving = null
            }, 2000)
        }
    },
})

onBeforeRouteLeave(() => {
    globalBackground.value = ''
    permitSwipe.value = true
})

</script>

<style lang="scss">
article {
    padding: 1rem;
    overflow-x: auto;
}
</style>
