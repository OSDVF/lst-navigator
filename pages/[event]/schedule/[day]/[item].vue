<template>
    <article
        :style="{
            'overflow-x': movingOrTrainsitioning ? 'hidden' : undefined,
        }">
        <h1><template v-if="scheduleItemData?.icon">
                <Icon :name="scheduleItemData.icon" />
            </template>
            {{ scheduleItemData?.title }}&ensp;
            <span class="muted" style="float:right">
                {{ toHumanTime(scheduleItemData?.time) }}
                <NuxtLink
                    v-if="cloud.resolvedPermissions.editSchedule"
                    class="button"
                    :to="`/${cloud.selectedEvent}/schedule/${dayIndex}/edit/${scheduleItemIndex}`" title="Upravit program">
                    <Icon name="mdi:pencil" />
                </NuxtLink>
            </span>
        </h1>
        <h3>{{ scheduleItemData?.subtitle }}</h3>
        <h3 v-if="location">
            <Icon name="mdi:place" /> {{ location }}
        </h3>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="p" @click="scanImages" v-html="scheduleItemData?.description ?? 'Žádné podrobnosti'" />

        <hr>

        <h2>
            <Icon name="mdi:rss" /> Zpětná vazba
        </h2>
        <template v-if="scheduleItemData?.feedbackType">
            <h4>Tvá zpětná vazba. Bude zobrazena organizátorům.</h4>
            <small>Odpovídáš jako <NuxtLink
                class="dotted-underline" :to="`/${cloud.selectedEvent}/settings`"
                title="Jméno je možné nastavit v nastavení">
                {{ settings?.userNickname || 'anonym' }}</NuxtLink></small>
            <FeedbackForm
                :data="currentFeedbackValue" :type="scheduleItemData?.feedbackType"
                :complicated-questions="scheduleItemData?.questions" :select-options="getParallelEvents(scheduleItemData)"
                :detail-question="scheduleItemData?.detailQuestion"
                @set-data="data => cloud.feedback.set(dayIndex, scheduleItemIndex, data)" />
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
        <h2>
            <Icon name="mdi:note-add" /> Tvé poznámky
        </h2>
        <span class="muted">Viditelné a uložené pouze u tebe</span>
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
                    <NuxtLink v-if="scheduleItemIndex > 0" :to="`/${cloud.selectedEvent}/schedule/${dayIndex}/${scheduleItemIndex - 1}`">
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
import { useLocalStorage } from '@vueuse/core'

const route = useRoute()
const settings = useSettings()
const dayIndex = parseInt(route.params.day as string ?? 0)
const scheduleItemIndex = parseInt(route.params.item as string) || 0
const cloud = useCloudStore()
const globalBackground = inject('globalBackground', ref(''))
const scheduleItemData = computed(() => {
    const program = cloud.days ? cloud.days[dayIndex]?.program : []
    if (program) {
        const data = program[scheduleItemIndex]
        return data
    }
    return undefined
})
const location = computed(() => (cloud.days && typeof scheduleItemData.value?.location != 'undefined') ? cloud.days[dayIndex]?.locations?.[scheduleItemData.value.location] : undefined)
watch(scheduleItemData, (eventData) => {
    const hexColor = colorToHex(eventData?.color || 'gray')
    const darkened = darkenColor(hexColor, -0.2)
    globalBackground.value = darkened === '#ffffff' ? hexColor : darkened
}, { immediate: true })

const previousEventData = computed(() => cloud.days?.[dayIndex]?.program?.[scheduleItemIndex - 1])
const nextEventData = computed(() => cloud.days?.[dayIndex]?.program?.[scheduleItemIndex + 1])
const nextEventLink = computed(() => scheduleItemIndex < (cloud.days?.[dayIndex]?.program?.length ?? 0) - 1 ? `/${cloud.selectedEvent}/schedule/${dayIndex}/${scheduleItemIndex + 1}` : (dayIndex < (cloud.days?.length ?? 0) - 1 ? `/${cloud.selectedEvent}/schedule/${dayIndex + 1}/0` : route.fullPath))
const noteError = ref()
const fetchingNote = ref(false)
const couldNotFetchNote = ref(false)

const currentFeedbackValue = computed(() => cloud.offlineFeedback?.[dayIndex]?.[scheduleItemIndex]?.[settings.userIdentifier] as Feedback | undefined)
const movingOrTrainsitioning = inject('trainsitioning', ref(false))
const permitSwipe = inject('permitSwipe', ref(false))

const notesDocument = useDocumentT<any>(computed(() => cloud.notesCollection ? doc(cloud.notesCollection, settings.userIdentifier) : null), { once: !!import.meta.server })//TODO server vs client vs browser
const offlineNote = useLocalStorage(`note.${dayIndex}.${scheduleItemIndex}`, { time: new Date().getTime(), note: '' }, {initOnMounted: true})
let noteSaving: NodeJS.Timeout | null

const noteModel = computed<string>({
    get() {
        const onlineVal = notesDocument.value?.[dayIndex]?.[scheduleItemIndex]
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
                            [scheduleItemIndex]: newValue,
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

hr {
    border: 1px solid rgba(0, 0, 0, 0.252)
}
</style>
