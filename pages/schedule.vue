<template>
    <div style="padding-top: 4rem;">
        <nav role="navigation" class="days">
            <NuxtLink
                v-for="(day, index) in cloudStore.scheduleParts" :key="day?.name ?? `day${index}`" :style="{
                    'backdrop-filter': index === parseInt(schedulePartIndex) ? 'brightness(0.8)' : undefined,
                    'border-top': isToday(day) ? '2px solid #0000ff99' : undefined
                }" :to="`/schedule/${index}`"
                @click="currentTransition = index > parseInt(schedulePartIndex) ? 'slide-left' : 'slide-right'"
            >
                {{ day?.name ?? index }}
            </NuxtLink>
        </nav>
        <ProgressBar :class="{ daysLoading: true, visible: cloudStore.metaLoading }" />
        <div
            v-drag="dragHandler" :style="{
                transition: transitioning || moving ? 'none' : 'transform .2s ease',
                transform: `translateX(${translateX}px)`
            }"
        >
            <div>
                <NuxtPage
                    :transition="{ name: currentTransition, duration: { enter: 200, leave: 100 }, appear: true, onAfterLeave: onTrainsitionAfterLeave, onAfterEnter: onTransitionAfterEnter, onBeforeLeave: onTrainsitionBeforeLeave }"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Vector2 } from '@vueuse/gesture'
import { useCloudStore } from '@/stores/cloud'
import { SchedulePart } from '@/types/cloud'

const cloudStore = useCloudStore()
const router = useRouter()
const schedulePartIndex = computed(() => router.currentRoute.value.params.schedulePart as string)
const now = new Date()
function isToday(schedulePart: SchedulePart) {
    const [year, month, day] = schedulePart?.date?.split('-') ?? [0, 0, 0]
    return (now.getFullYear() === parseInt(year) && now.getMonth() + 1 === parseInt(month) && now.getDate() === parseInt(day))
}
//
// Automatic redirect when no day is selected
//
watch(cloudStore, (newCloud) => {
    if (typeof schedulePartIndex.value === 'undefined' && newCloud.metaLoading === false) {
        findToday(newCloud)
    }
})
onActivated(() => {
    if (typeof schedulePartIndex.value === 'undefined' && cloudStore?.metaLoading === false) {
        findToday(cloudStore)
    }
})
const eventIndex = computed(() => parseInt(router.currentRoute.value.params.event as string))

const currentTransition = ref('slide-left')
const movingOrTrainsitioning = inject('trainsitioning', ref(false))
const permitSwipe = ref(true)
provide('permitSwipe', permitSwipe)
const transitioning = ref(false)
const moving = ref(false)
const translateX = ref(0)

onBeforeRouteLeave((leaveGuard) => {
    const targetEventItemIndex = parseInt(leaveGuard.params.event as string)
    if (!isNaN(targetEventItemIndex)) {
        currentTransition.value = targetEventItemIndex > eventIndex.value ? 'slide-left' : 'slide-right'
    }
})

function findToday(newCloud: typeof cloudStore) {
    let index: number | string = 0
    if (newCloud.scheduleParts?.length) {
        for (const i in newCloud.scheduleParts) {
            const schedulePart = newCloud.scheduleParts[i]
            if (isToday(schedulePart)) {
                index = i
                break
            }
        }
    }
    router.replace(`/schedule/${index}`)
}

function onTrainsitionAfterLeave() {
    transitioning.value = false
    translateX.value = 0
}

function onTransitionAfterEnter() {
    movingOrTrainsitioning.value = false
}

function onTrainsitionBeforeLeave() {
    movingOrTrainsitioning.value = true
}

let lastVerticalScroll = new Date().getTime()
//
// Swipe Navigation
//
const dragHandler = ({ movement: [x, y], dragging, swipe }: { movement: number[], dragging: boolean, swipe: Vector2 }) => {
    const partIndex = parseInt(schedulePartIndex.value)
    if (transitioning.value || !permitSwipe.value) {
        return
    }
    if (Math.abs(y) > 50 && (Math.abs(y) > 5 && Math.abs(y) > Math.abs(x))) {
        lastVerticalScroll = new Date().getTime()
    }
    const wasNearScrol = (new Date().getTime() - lastVerticalScroll) < 1000 * 0.500
    if (swipe[0] !== 0 && !wasNearScrol) {
        currentTransition.value = swipe[0] > 0 ? 'slide-right' : 'slide-left'
        transitioning.value = true

        if (!isNaN(eventIndex.value)) { // on event item detail page
            // move to the next event item
            if (x > 0 && eventIndex.value === 0) {
                router.push(`/schedule/${partIndex - 1}/${(cloudStore.scheduleParts![partIndex - 1].program.length - 1 || 0)}`)// last event on the previous schedule part
            } else if (x < 0 && eventIndex.value === cloudStore.scheduleParts![partIndex].program.length - 1) {
                router.push(`/schedule/${partIndex + 1}/0`)// first event item on next schedule part (e.g. day)
            } else {
                router.push(`/schedule/${partIndex}/${eventIndex.value - swipe[0]}`)
            }
        } else {
            // move to the next schedule part
            router.push(`/schedule/${partIndex - swipe[0]}`)
        }
        return
    } else if (!dragging || wasNearScrol) {
        moving.value = false
        translateX.value = 0
        return
    }
    const lastPartIndex = cloudStore.scheduleParts!.length - 1
    if (isNaN(eventIndex.value)) {
        if ((x > 0 && partIndex === 0) || (x < 0 && partIndex === lastPartIndex)) {
            return
        }
    } else if ((x > 0 && eventIndex.value === 0 && partIndex === 0) || (x < 0 && partIndex === lastPartIndex && eventIndex.value === cloudStore.scheduleParts![lastPartIndex].program.length - 1)) {
        // on event item detail page
        return
    }
    if (Math.abs(x) > 3) {
        moving.value = true
        movingOrTrainsitioning.value = true
        translateX.value = x
    }
}

</script>

<style lang="scss">
@import "@/assets/styles/constants.scss";

nav.days {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1;

    border-bottom: 1px solid rgba($link-background, 0.1);
    overflow-x: auto;
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
