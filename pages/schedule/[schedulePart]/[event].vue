<template>
    <article
        :style="{
            'overflow-x': movingOrTrainsitioning ? 'hidden' : undefined,
        }"
    >
        <h1>{{ eventData?.title }}&ensp;
            <span class="muted">
                {{ toHumanTime(eventData?.time) }}
            </span>
        </h1>
        <h3>{{ eventData?.subtitle }}</h3>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p v-html="eventData?.description ?? 'Žádné podrobnosti'" />

        <h1>
            <IconCSS name="mdi:rss" /> Zpětná vazba
        </h1>
        <template v-if="eventData?.feedbackType">
            <h4>Tvá zpětná vazba</h4>
            <small>Odpovídáš jako <NuxtLink
                class="dotted-underline" to="/settings"
                title="Jméno je možné nastavit v nastavení"
            >
                {{ settings?.userNickname || 'anonym' }}</NuxtLink></small>
            <FeedbackForm
                :data="currentFeedbackValue" :type="eventData?.feedbackType"
                :complicated-questions="eventData?.questions" :parallel-events="getParallelEvents(eventData)"
                @set-data="setFeedback"
            />
            <div v-if="fetchingFeedback">
                <IconCSS name="mdi:save" />&ensp;
                <ProgressBar />
            </div>
            <p v-if="couldNotFetch">
                Nepodařilo se uložit tvou odpověď
                <br>
                {{ error }}
                <br>
                <button v-if="lastNewFeedback" @click="setFeedback(lastNewFeedback)">
                    Zkusit uložit znovu
                </button>
            </p>
        </template>
        <p v-else>
            Není k dispozici
        </p>
        <h1>Tvé poznámky&ensp;
            <IconCSS title="Experimantální funkce" name="mdi:alert" style="color: rgb(97, 63, 0);opacity: .5;" />
        </h1>
        <p>
            <ckeditor v-model="noteModel" :editor="ClassicEditor" @focus="permitSwipe = false" @blur="permitSwipe = true" />
            <ProgressBar v-if="fetchingNote" />
        </p>
        <ClientOnly>
            <Teleport to="#additionalNav">
                <nav class="eventItemNav">
                    <NuxtLink v-if="eventItemIndex > 0" :to="`/schedule/${partIndex}/${eventItemIndex - 1}`">
                        <IconCSS name="mdi:chevron-left" /> {{ previousEventData?.title ?? previousEventData?.subtitle }}
                    </NuxtLink>
                    <NuxtLink
                        v-if="eventItemIndex < (cloudStore.scheduleParts?.[partIndex]?.program?.length ?? 0) - 1"
                        :to="`/schedule/${partIndex}/${eventItemIndex + 1}`"
                    >
                        {{ nextEventData?.title ?? nextEventData?.subtitle }}
                        <IconCSS name="mdi:chevron-right" />
                    </NuxtLink>
                </nav>
            </Teleport>
        </ClientOnly>
    </article>
</template>

<script setup lang="ts">
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import { setDoc } from 'firebase/firestore'
import { useDocument } from 'vuefire'
import { useStorage } from '@vueuse/core'
import { useCloudStore } from '@/stores/cloud'
import { useSettings } from '@/stores/settings'
import { toHumanTime, getParallelEvents } from '@/utils/types'
import type { Feedback } from '@/components/FeedbackForm.vue'

const route = useRoute()
const settings = useSettings()
const partIndex = parseInt(route.params.schedulePart as string ?? 0)
const eventItemIndex = parseInt(route.params.event as string ?? 0)
const cloudStore = useCloudStore()
const globalBackground = inject('globalBackground') as Ref<string>
const eventData = computed(() => {
    const program = cloudStore.scheduleParts ? cloudStore.scheduleParts[partIndex]?.program : []
    if (program) {
        const eventData = program[eventItemIndex]
        globalBackground.value = darkenColor(colorToHex(eventData?.color ?? 'gray'), -0.2)
        return eventData
    }
    return undefined
})

const previousEventData = computed(() => cloudStore.scheduleParts?.[partIndex]?.program?.[eventItemIndex - 1])
const nextEventData = computed(() => cloudStore.scheduleParts?.[partIndex]?.program?.[eventItemIndex + 1])
const error = ref()
const noteError = ref()
const fetchingFeedback = ref(false)
const fetchingNote = ref(false)
const couldNotFetch = ref(false)
const couldNotFetchNote = ref(false)

const currentFeedbackValue = computed(() => cloudStore.feedbackRef?.[partIndex]?.[eventItemIndex]?.[settings.userIdentifier] as Feedback | undefined)
const lastNewFeedback = ref(currentFeedbackValue.value)
const movingOrTrainsitioning = inject<Ref<boolean>>('trainsitioning') ?? ref(false)
const permitSwipe = inject<Ref<boolean>>('permitSwipe') ?? ref(false)

function setFeedback(value: Feedback) {
    fetchingFeedback.value = true
    lastNewFeedback.value = value

    setDoc(cloudStore.feedbackDoc!, {
        [partIndex]: {
            [eventItemIndex]: {
                [settings.userIdentifier]: value
            }
        }
    }, {
        merge: true
    }).then(() => { fetchingFeedback.value = couldNotFetch.value = false }).catch((e) => { error.value = e })
    setTimeout(() => {
        couldNotFetch.value = fetchingFeedback.value
        fetchingFeedback.value = false
    }, 7000)
}

const notesDocument = useDocument(cloudStore.notesDocument)
const offlineNote = useStorage(`note.${partIndex}.${eventItemIndex}`, { time: new Date(), note: '' })
let noteSaving: NodeJS.Timeout | null

const noteModel = computed({
    get() {
        const onlineVal = notesDocument.data.value?.[partIndex]?.[eventItemIndex]?.[settings.userIdentifier]
        const onlineDate = new Date(onlineVal?.time ?? 0)
        if (onlineDate > offlineNote.value.time) {
            return onlineVal.note
        }
        return offlineNote.value.note
    },
    set(value: string) {
        const newValue = {
            time: settings.notesDirtyTime = new Date(),
            note: value
        }
        offlineNote.value = newValue
        if (!noteSaving) {
            noteSaving = setTimeout(() => {
                if (cloudStore.notesDocument) {
                    fetchingNote.value = true
                    setDoc(cloudStore.notesDocument, {
                        [partIndex]: {
                            [eventItemIndex]: {
                                [settings.userIdentifier]: newValue
                            }
                        }
                    }, {
                        merge: true
                    }).then(() => { fetchingNote.value = couldNotFetchNote.value = false }).catch((e) => { noteError.value = e })
                    setTimeout(() => {
                        couldNotFetchNote.value = fetchingNote.value
                        fetchingFeedback.value = false
                    }, 7000)
                }
                noteSaving = null
            }, 2000)
        }
    }
})

onBeforeRouteLeave(() => {
    globalBackground.value = ''
    permitSwipe.value = true
})

// https://stackoverflow.com/questions/1573053/javascript-function-to-convert-color-names-to-hex-codes
function colorToRGBA(color: string) {
    // Returns the color as an array of [r, g, b, a] -- all range from 0 - 255
    // color must be a valid canvas fillStyle. This will cover most anything
    // you'd want to use.
    // Examples:
    // colorToRGBA('red')  # [255, 0, 0, 255]
    // colorToRGBA('#f00') # [255, 0, 0, 255]
    const cvs = document.createElement('canvas')
    cvs.height = 1
    cvs.width = 1
    const ctx = cvs.getContext('2d')
    ctx!.fillStyle = color
    ctx!.fillRect(0, 0, 1, 1)
    return ctx!.getImageData(0, 0, 1, 1).data
}

function byteToHex(num: number) {
    // Turns a number (0-255) into a 2-character hex number (00-ff)
    return ('0' + num.toString(16)).slice(-2)
}

function colorToHex(color: string) {
    // Convert any CSS color to a hex representation
    // Examples:
    // colorToHex('red')            # '#ff0000'
    // colorToHex('rgb(255, 0, 0)') # '#ff0000'
    const rgba = colorToRGBA(color)
    const hex = [0, 1, 2].map(
        function (idx) { return byteToHex(rgba[idx]) }
    ).join('')
    return '#' + hex
}

function darkenColor(color: string, amount: number) {
    return color.replace(/([0-9a-f]{2})/gi, (_match, hex) => {
        const number = parseInt(hex, 16)
        const newNumber = Math.round(Math.min(Math.max(0, number - (number * amount)), 255))
        return newNumber.toString(16).padStart(2, '0')
    })
}

</script>

<style lang="scss">
article {
    padding: 1rem;
    overflow-x: auto;
}
</style>
