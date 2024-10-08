<template>
    <div style="padding: 4rem 0 3rem 0;">
        <nav role="navigation" class="days">
            <NuxtLink
                v-for="(day, index) in cloudStore.days" :key="`day${index}`" :style="{
                    'backdrop-filter': index === parseInt(dayIndex) ? 'brightness(0.8)' : undefined,
                    'border-top': isToday(day) ? '2px solid #0000ff99' : undefined
                }" :to="`/schedule/${index}`"
                @click="currentTransition = index > parseInt(dayIndex) ? 'slide-left' : 'slide-right'">
                {{ day?.name ?? index }}
            </NuxtLink>
        </nav>
        <ProgressBar :class="{ daysLoading: true, visible: cloudStore.scheduleLoading }" />
        <div
            v-drag="dragHandler" :style="{
                transition: transitioning || moving ? 'none' : 'transform .2s ease',
                transform: `translateX(${translateX}px)`
            }">
            <NuxtPage v-if="edit" />
            <LazyClientOnly v-else>
                <Transition
                    :name="currentTransition" :duration="{ enter: 200, leave: 100 }" appear
                    @after-leave="onTrainsitionAfterLeave" @after-enter="onTransitionAfterEnter"
                    @before-leave="onTrainsitionBeforeLeave">
                    <LazyProgramSchedule :key="dayIndex" />
                </Transition>
            </LazyClientOnly>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Vector2 } from '@vueuse/gesture'
import type { ScheduleDay } from '@/types/cloud'
import { useCloudStore } from '@/stores/cloud'
import { useSettings } from '~/stores/settings'

const cloudStore = useCloudStore()
const router = useRouter()
const settings = useSettings()
const lastDay = usePersistentRef('lastDay', '0')// workaround for nuxt not remembering nested page on reload
const dayIndex = computed(() => router.currentRoute.value.params.day as string ?? lastDay.value)
const edit = computed(() => router.currentRoute.value.params.edit as string | undefined)// a workaround for NuxtPage not rendering on first load
const now = new Date()
function isToday(scheduleDay: ScheduleDay) {
    const [year, month, day] = scheduleDay?.date?.split('-') ?? [0, 0, 0]
    return (now.getFullYear() === parseInt(year) && now.getMonth() + 1 === parseInt(month) && now.getDate() === parseInt(day))
}
//
// Automatic redirect when no day is selected
//
watch(cloudStore, (newCloud) => {
    if (typeof router.currentRoute.value.params.day === 'undefined' && newCloud.scheduleLoading === false) {
        findToday(newCloud)
    }
})

watch(dayIndex, (value) => {
    if (typeof value !== 'undefined') {
        lastDay.value = value
    }
})

if (import.meta.browser) {
    if (typeof router.currentRoute.value.params.day === 'undefined' && cloudStore?.scheduleLoading === false) {
        findToday(cloudStore)
    }
}

const eventIndex = computed(() => parseInt(router.currentRoute.value.params.event as string) || 0)

const currentTransition = ref('slide-left')
const movingOrTrainsitioning = inject('trainsitioning', ref(false))
const permitSwipe = ref(true)
provide('permitSwipe', permitSwipe)
const transitioning = ref(false)
const moving = ref(false)
const translateX = ref(0)

function findToday(newCloud: typeof cloudStore) {
    let index: number | string = dayIndex.value ?? 0
    if (newCloud.days?.length) {
        for (const i in newCloud.days) {
            const day = newCloud.days[i]
            if (isToday(day)) {
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
    if (transitioning.value || !permitSwipe.value || !settings.animations) {
        return
    }
    const intDay = parseInt(dayIndex.value)
    if (Math.abs(y) > 50 && (Math.abs(y) > 5 && Math.abs(y) > Math.abs(x))) {
        lastVerticalScroll = new Date().getTime()
    }
    const wasNearScrol = (new Date().getTime() - lastVerticalScroll) < 1000 * 0.500
    if (swipe[0] !== 0 && !wasNearScrol) {
        currentTransition.value = swipe[0] > 0 ? 'slide-right' : 'slide-left'
        transitioning.value = true

        if (typeof router.currentRoute.value.params.event === 'undefined') { // on event item detail page
            // move to the next event item
            if (x > 0 && eventIndex.value === 0) {
                router.push(`/schedule/${intDay - 1}/${(cloudStore.days![intDay - 1].program.length - 1 || 0)}`)// last event on the previous schedule part
            } else if (x < 0 && eventIndex.value === cloudStore.days![intDay].program.length - 1) {
                router.push(`/schedule/${intDay + 1}/0`)// first event item on next schedule part (e.g. day)
            } else {
                router.push(`/schedule/${intDay}/${eventIndex.value - swipe[0]}`)
            }
        } else {
            // move to the next schedule part
            router.push(`/schedule/${intDay - swipe[0]}`)
        }
        return
    } else if (!dragging || wasNearScrol) {
        moving.value = false
        translateX.value = 0
        return
    }
    const lastPartIndex = cloudStore.days!.length - 1
    if (isNaN(eventIndex.value)) {
        if ((x > 0 && intDay === 0) || (x < 0 && intDay === lastPartIndex)) {
            return
        }
    } else if ((x > 0 && eventIndex.value === 0 && intDay === 0) || (x < 0 && intDay === lastPartIndex && eventIndex.value === cloudStore.days![lastPartIndex].program.length - 1)) {
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
