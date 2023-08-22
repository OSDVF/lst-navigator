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
                :complicated-questions="eventData?.questions" :select-options="getParallelEvents(eventData)"
                :detail-question="eventData?.detailQuestion"
                @set-data="(data: Feedback) => cloudStore.setFeedbackData(partIndex, eventItemIndex, data)"
            />
            <div v-if="fetchingFeedback">
                <IconCSS name="material-symbols:save" />&ensp;
                <ProgressBar />
            </div>
            <p v-if="cloudStore.couldNotFetchFeedback">
                Nepodařilo se uložit tvou odpověď
                <br>
                {{ cloudStore.feedbackError }}
                <br>
                <button @click="cloudStore.saveAgainAllFeedback">
                    <IconCSS name="material-symbols:save" /> Zkusit uložit znovu
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
            <ClientOnly>
                <ckeditor v-if="ClassicEditor" v-model="noteModel" :editor="ClassicEditor" @focus="permitSwipe = false" @blur="permitSwipe = true" />
            </ClientOnly>
            <ProgressBar v-if="fetchingNote" />
        </p>
        <p />
        <br>
        <ClientOnly>
            <Teleport to="#additionalNav">
                <nav class="eventItemNav">
                    <NuxtLink v-if="eventItemIndex > 0" :to="`/schedule/${partIndex}/${eventItemIndex - 1}`">
                        <IconCSS name="mdi:chevron-left" /> <span class="muted">{{ toHumanTime(previousEventData?.time) ||
                            'Předchozí den' }}</span> {{ previousEventData?.title ?? previousEventData?.subtitle }}
                    </NuxtLink>
                    <NuxtLink
                        :to="eventItemIndex < (cloudStore.scheduleParts?.[partIndex]?.program?.length ?? 0) - 1 ? `/schedule/${partIndex}/${eventItemIndex + 1}` : (partIndex < (cloudStore.scheduleParts?.length ?? 0) - 1 ? `/schedule/${partIndex + 1}/0` : null)"
                    >
                        <span class="muted">{{ toHumanTime(nextEventData?.time) || 'Další den' }}</span> {{
                            nextEventData?.title ?? nextEventData?.subtitle }}
                        <IconCSS name="mdi:chevron-right" />
                    </NuxtLink>
                </nav>
            </Teleport>
        </ClientOnly>
    </article>
</template>

<script setup lang="ts">
import { setDoc } from 'firebase/firestore'
import { useDocument } from 'vuefire'
import { Feedback, useCloudStore } from '@/stores/cloud'
import { useSettings } from '@/stores/settings'
import { toHumanTime, getParallelEvents } from '@/utils/types'
import { usePersistentRef } from '@/utils/storage'

const ClassicEditor = ref()
if (process.client) {
    import('@ckeditor/ckeditor5-build-classic').then((c) => {
        ClassicEditor.value = c.default
    })
}

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
        const hexColor = colorToHex(eventData?.color ?? 'gray')
        const darkened = darkenColor(hexColor, -0.2)
        globalBackground.value = darkened === '#ffffff' ? hexColor : darkened
        return eventData
    }
    return undefined
})

const previousEventData = computed(() => cloudStore.scheduleParts?.[partIndex]?.program?.[eventItemIndex - 1])
const nextEventData = computed(() => cloudStore.scheduleParts?.[partIndex]?.program?.[eventItemIndex + 1])
const noteError = ref()
const fetchingFeedback = ref(false)
const fetchingNote = ref(false)
const couldNotFetchNote = ref(false)

const currentFeedbackValue = computed(() => cloudStore.offlineFeedback?.[partIndex]?.[eventItemIndex]?.[settings.userIdentifier] as Feedback | undefined)
const movingOrTrainsitioning = inject<Ref<boolean>>('trainsitioning') ?? ref(false)
const permitSwipe = inject<Ref<boolean>>('permitSwipe') ?? ref(false)

const notesDocument = useDocument(cloudStore.notesDocument)
const offlineNote = usePersistentRef(`note.${partIndex}.${eventItemIndex}`, { time: new Date().getTime(), note: '' })
let noteSaving: NodeJS.Timeout | null

const noteModel = computed({
    get() {
        const onlineVal = notesDocument.data.value?.[partIndex]?.[eventItemIndex]?.[settings.userIdentifier]
        const onlineDate = new Date(onlineVal?.time ?? 0).getTime()
        if (onlineDate > offlineNote.value.time) {
            return onlineVal.note
        }
        return offlineNote.value.note
    },
    set(value: string) {
        const newValue = {
            time: settings.notesDirtyTime = new Date().getTime(),
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
    if (process.client) {
        const cvs = document.createElement('canvas')
        cvs.height = 1
        cvs.width = 1
        const ctx = cvs.getContext('2d')
        ctx!.fillStyle = color
        ctx!.fillRect(0, 0, 1, 1)
        return ctx!.getImageData(0, 0, 1, 1).data
    }
    return [0, 0, 0, 0]
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
