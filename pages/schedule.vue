<template>
    <div>
        <nav role="navigation" class="days">
            <NuxtLink
                v-for="(day, index) in cloudStore.scheduleParts"
                :key="day?.name ?? `day${index}`"
                :style="{
                    background: backgroundFor(day, index)
                }"
                :to="`/schedule/${index}`"
                @click="currentTransition = index > parseInt(schedulePartIndex) ? 'slide-left' : 'slide-right'"
            >
                {{ day?.name ?? index }}
            </NuxtLink>
        </nav>
        <ProgressBar :class="{ daysLoading: true, visible: cloudStore.scheduleLoading }" />
        <div
            ref="swipableContent" v-drag="dragHandler" :style="{
                transition: transitioning || moving ? 'none' : 'transform .2s ease',
                transform: `translateX(${translateX}px)`
            }"
        >
            <div>
                <NuxtPage :transition="{name: currentTransition, duration: {enter: 200, leave: 100}, appear: true, onAfterLeave: onTrainsitionAfterLeave}" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Vector2 } from '@vueuse/gesture'
import { useCloudStore } from '@/stores/cloud'

const cloudStore = useCloudStore()
const router = useRouter()
const schedulePartIndex = computed(() => router.currentRoute.value.params.schedulePart as string)
if (typeof schedulePartIndex.value === 'undefined') {
    router.replace('/schedule/0')
}
// https://stackoverflow.com/questions/1573053/javascript-function-to-convert-color-names-to-hex-codes
function colorToRGBA(color:string) {
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

function byteToHex(num:number) {
    // Turns a number (0-255) into a 2-character hex number (00-ff)
    return ('0' + num.toString(16)).slice(-2)
}

function colorToHex(color:string) {
    // Convert any CSS color to a hex representation
    // Examples:
    // colorToHex('red')            # '#ff0000'
    // colorToHex('rgb(255, 0, 0)') # '#ff0000'
    const rgba = colorToRGBA(color)
    const hex = [0, 1, 2].map(
        function(idx) { return byteToHex(rgba[idx]) }
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

function backgroundFor(day: any, index: number) {
    let color = day?.color ?? '#959595'
    color = colorToHex(color)
    if (index === parseInt(schedulePartIndex.value)) {
        return darkenColor(color, 0)
    }
    return color + '08'
}

const currentTransition = ref('slide-left')
const transitioning = ref(false)
const moving = ref(false)
const translateX = ref(0)

const onTrainsitionAfterLeave = () => {
    transitioning.value = false
    translateX.value = 0
}

const dragHandler = ({ movement: [x], dragging, swipe }: { movement: number[], dragging: boolean, swipe: Vector2 }) => {
    const partIndex = parseInt(schedulePartIndex.value)
    if (transitioning.value) {
        return
    }
    if (swipe[0] !== 0) {
        currentTransition.value = swipe[0] > 0 ? 'slide-right' : 'slide-left'
        transitioning.value = true
        router.push(`/schedule/${partIndex - swipe[0]}`)
        return
    } else if (!dragging) {
        moving.value = false
        translateX.value = 0
        return
    }
    if ((x > 0 && partIndex === 0) || (x < 0 && partIndex === cloudStore.scheduleParts.length - 1)) {
        return
    }
    moving.value = true
    translateX.value = x
}

</script>

<style lang="scss">
@import "@/assets/styles/constants.scss";

main {
    margin-top: 4rem;
}

nav.days {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1;

    border-bottom: 1px solid rgba($link-background, 0.1);
    overflow: scroll;
    width: 100vw;
}

.daysLoading {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;

    transform: translateY(-1rem);
    transition: transform .2s ease;

    &.visible {
        transform: translateY(0);
    }
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.2s;
}
.slide-left-enter-from {
  opacity: .1;
  transform: translate(50px, 0);
}
.slide-left-leave-to {
  opacity: .1;
  //transform: translate(-50px, 0);
}
.slide-right-enter-from {
  opacity: .1;
  transform: translate(-50px, 0);
}
.slide-right-leave-to {
  opacity: .1;
  //transform: translate(50px, 0);
}
</style>
