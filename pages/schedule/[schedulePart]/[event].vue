<template>
    <article>
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
        <small>Odpovídáš jako <NuxtLink to="/settings" title="Jméno je možné nastavit v nastavení">
            {{ settings?.userNickname || 'anonym' }}</NuxtLink></small>
        <FeedbackForm
            v-if="eventData?.feedbackType" :data="currentFeedbackValue?.[partIndex]?.[route.params.event as string]?.[settings.userIdentifier]"
            :type="eventData?.feedbackType" :complicated-questions="eventData?.questions" @set-data="setFeedback"
        />
        <p v-else>
            Není k dispozici
        </p>
        <ProgressBar v-if="fetching" />
        <p v-if="couldNotFetch">
            Nepodařilo se uložit tvou odpověď
            <br>
            {{ error }}
            <br>
            <button @click="setFeedback(lastNewFeedback)">
                Uložit
            </button>
        </p>
    </article>
</template>

<script setup lang="ts">
import { doc, setDoc } from 'firebase/firestore'
import { useDocument } from 'vuefire'
import { useCloudStore } from '@/stores/cloud'
import { useSettings } from '@/stores/settings'
import type { Feedback } from '@/components/FeedbackForm.vue'
import { toHumanTime } from '@/utils/types'

const route = useRoute()
const settings = useSettings()
const partIndex = parseInt(route.params.schedulePart as string ?? 0)
const cloudStore = useCloudStore()
const globalBackground = inject('globalBackground') as Ref<string>
const eventData = computed(() => {
    const program = cloudStore.scheduleParts ? cloudStore.scheduleParts[partIndex]?.program : []
    if (route.params.event && program) {
        const eventData = program[route.params.event as string ?? 0]
        globalBackground.value = darkenColor(colorToHex(eventData?.color ?? 'gray'), -0.2)
        return eventData
    }
    return undefined
})
const error = ref()
const fetching = ref(false)
const couldNotFetch = ref(false)

const lastNewFeedback = ref<Feedback>(eventData.value?.feedback[settings.userIdentifier])
const firestore = useFirestore()
const currentFeedbackDoc = doc(firestore, `${cloudStore.eventDbName}/feedback`)
const currentFeedbackValue = useDocument(currentFeedbackDoc)
function setFeedback(value: Feedback) {
    fetching.value = true
    lastNewFeedback.value = value

    setDoc(currentFeedbackDoc, {
        [partIndex]: {
            [route.params.event as string]: {
                [settings.userIdentifier]: value
            }
        }
    }, {
        merge: true
    }).then(() => { fetching.value = couldNotFetch.value = false }).catch((e) => { error.value = e })
    setTimeout(() => {
        couldNotFetch.value = fetching.value
        fetching.value = false
    }, 7000)
}

onBeforeRouteLeave(() => {
    globalBackground.value = ''
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

.muted {
    opacity: .5
}
</style>
