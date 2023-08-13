<template>
    <article>
        <h1>{{ eventData?.title }}</h1>
        <h3>{{ eventData?.subtitle }}</h3>
        <p>{{ eventData?.description }}</p>

        <h1>
            <IconCSS name="mdi:rss" /> Zpětná vazba
        </h1>
        <small>Odpovídáš jako <NuxtLink to="/settings" title="Jméno je možné nastavit v nastavení">{{ settings.userNickname
            || 'anonym' }}</NuxtLink></small>
        <FeedbackForm
            v-if="eventData?.feedback" :data="eventData?.feedback[settings.userIdentifier.value]"
            @set-data="setFeedback"
        />
        <p v-else>
            Není k dispozici
        </p>
        <ProgressBar v-if="fetching" />
        <p v-if="couldNotFetch">
            Nepodařilo se uložit vaši odpověď
        </p>
    </article>
</template>

<script setup lang="ts">
import { DocumentReference, doc, getDoc, setDoc } from 'firebase/firestore'
import { useCloudStore } from '@/stores/cloud'
import { useSettings } from '@/stores/settings'
import type { Feedback } from '@/components/FeedbackForm.vue'

const firestore = useFirestore()
const route = useRoute()
const partIndex = parseInt(route.params.schedulePart as string ?? 0)
const cloudStore = useCloudStore()
const currentSchedulePartDoc = getDoc(doc(firestore, `${cloudStore.eventDbName}/schedule`)).then(document => document.data()?.parts[partIndex])
const settings = useSettings()
const eventData = computed(() => {
    const program = cloudStore.scheduleParts ? cloudStore.scheduleParts[partIndex]?.program : []
    if (route.params.event && program) {
        const eventData = program[route.params.event as string ?? 0]
        globalBackground.value = darkenColor(colorToHex(eventData?.color ?? 'gray'), -0.2)
        return eventData
    }
    return undefined
})
const fetching = ref(false)
const couldNotFetch = ref(false)

async function setFeedback(value: Feedback) {
    fetching.value = true
    setDoc(await currentSchedulePartDoc as DocumentReference, {
        feedback: {
            [settings.userIdentifier.value]: value
        }
    }, {
        merge: true
    }).then(() => { fetching.value = couldNotFetch.value = false })
    setTimeout(() => {
        couldNotFetch.value = fetching.value
        fetching.value = false
    }, 7000)
}

const globalBackground = inject('globalBackground') as Ref<string>

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
</style>
