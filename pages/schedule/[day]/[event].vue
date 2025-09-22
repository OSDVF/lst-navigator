<template>
    <article
        :style="{
            'overflow-x': movingOrTrainsitioning ? 'hidden' : undefined,
        }">
        <h1><template v-if="eventData?.icon">
                <Icon :name="eventData.icon" />
            </template>
            {{ eventData?.title }}&ensp;
            <span class="muted" style="float:right">
                {{ toHumanTime(eventData?.time) }}
                <NuxtLink
                    v-if="cloud.resolvedPermissions.editSchedule"
                    :to="`/schedule/${dayIndex}/edit/${eventItemIndex}`" title="Upravit program">
                    <Icon name="mdi:pencil" />
                </NuxtLink>
            </span>
        </h1>
        <h3>{{ eventData?.subtitle }}</h3>
        <h3 v-if="location"><Icon name="mdi:place" /> {{ location }}</h3>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="p" @click="scanImages" v-html="eventData?.description ?? 'Žádné podrobnosti'" />

        <h1>
            <Icon name="mdi:rss" /> Zpětná vazba
        </h1>
        <template v-if="eventData?.feedbackType">
            <h4>Tvá zpětná vazba. Bude zobrazena organizátorům.</h4>
            <small>Odpovídáš jako <NuxtLink
                class="dotted-underline" to="/settings"
                title="Jméno je možné nastavit v nastavení">
                {{ settings?.userNickname || 'anonym' }}</NuxtLink></small>
            <FeedbackForm
                :data="currentFeedbackValue" :type="eventData?.feedbackType"
                :complicated-questions="eventData?.questions" :select-options="getParallelEvents(eventData)"
                :detail-question="eventData?.detailQuestion"
                @set-data="(data: Feedback) => cloud.feedback.set(dayIndex, eventItemIndex, data)" />
            <p v-if="cloud.feedback.fetchFailed">
                Nepodařilo se uložit tvou odpověď
                <br>
                {{ cloud.feedback.error }}
                <br>
                <button @click="cloud.feedback.saveAgain(true)">
                    <Icon name="material-symbols:save" /> Zkusit uložit znovu
                </button>
            </p>
        </template>
        <p v-else>
            Není k dispozici
        </p>
        <h1><Icon name="mdi:note-add" /> Tvé poznámky</h1>
        <span class="muted">Slouží pouze pro tvou potřebu</span>
        <div class="p">
            <ClassicCKEditor
                v-model="noteModel" :plain="!settings.richNoteEditor" @focus="permitSwipe = false"
                @blur="permitSwipe = true" />
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
                        :title="nextEventLink == route.fullPath ? 'Jste již na posledním bodu programu' : undefined"
                        :to="nextEventLink">
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
import { setDoc, useDocument as useDocumentT } from '~/utils/trace'
import { doc } from 'firebase/firestore'
import { colorToHex, darkenColor } from '@/utils/colors'
import { useCloudStore } from '@/stores/cloud'
import type { Feedback } from '@/types/cloud'
import { useSettings } from '@/stores/settings'
import { toHumanTime, getParallelEvents } from '@/utils/utils'
import { usePersistentRef } from '@/utils/persistence'

const route = useRoute()
const settings = useSettings()
const dayIndex = parseInt(route.params.day as string ?? 0)
const eventItemIndex = parseInt(route.params.event as string) || 0
const cloud = useCloudStore()
const globalBackground = inject('globalBackground', ref(''))
const eventData = computed(() => {
    const program = cloud.days ? cloud.days[dayIndex]?.program : []
    if (program) {
        const eventData = program[eventItemIndex]
        return eventData
    }
    return undefined
})
const location = computed(()=>(cloud.days && eventData.value?.location) ? cloud.days[dayIndex]?.locations?.[eventData.value.location] : undefined)
watch(eventData, (eventData) => {
    const hexColor = colorToHex(eventData?.color || 'gray')
    const darkened = darkenColor(hexColor, -0.2)
    globalBackground.value = darkened === '#ffffff' ? hexColor : darkened
}, { immediate: true })

const previousEventData = computed(() => cloud.days?.[dayIndex]?.program?.[eventItemIndex - 1])
const nextEventData = computed(() => cloud.days?.[dayIndex]?.program?.[eventItemIndex + 1])
const nextEventLink = computed(() => eventItemIndex < (cloud.days?.[dayIndex]?.program?.length ?? 0) - 1 ? `/schedule/${dayIndex}/${eventItemIndex + 1}` : (dayIndex < (cloud.days?.length ?? 0) - 1 ? `/schedule/${dayIndex + 1}/0` : route.fullPath))
const noteError = ref()
const fetchingNote = ref(false)
const couldNotFetchNote = ref(false)

const currentFeedbackValue = computed(() => cloud.offlineFeedback?.[dayIndex]?.[eventItemIndex]?.[settings.userIdentifier] as Feedback | undefined)
const movingOrTrainsitioning = inject('trainsitioning', ref(false))
const permitSwipe = inject('permitSwipe', ref(false))

const notesDocument = useDocumentT<any>(computed(() => cloud.notesCollection ? doc(cloud.notesCollection, settings.userIdentifier) : null), { once: !!import.meta.server })//TODO server vs client vs browser
const offlineNote = usePersistentRef(`note.${dayIndex}.${eventItemIndex}`, { time: new Date().getTime(), note: '' })
let noteSaving: NodeJS.Timeout | null

const noteModel = computed<string>({
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
                if (cloud.notesCollection) {
                    fetchingNote.value = true
                    setDoc(doc(cloud.notesCollection, settings.userIdentifier), {
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

const ui = useUI()

function scanImages(event: MouseEvent) {
    if (event.target instanceof HTMLImageElement) {
        ui.showLightBox(event.target.src)
    }
}

</script>

<style lang="scss">
@use "@/assets/styles/constants" as c;

article {
    padding: 1rem;
    overflow-x: auto;

    figure {
        position: relative;

        &>img {
            max-width: 100%;
            height: auto;
            cursor: pointer;
        }

        &:hover::after {
            content: '';
            pointer-events: none;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba($color: c.$link-background, $alpha: 0.15)
        }
    }
}
</style>
