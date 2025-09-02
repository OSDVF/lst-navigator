<template>
    <div style="padding: 4rem 0 3rem 0;">
        <nav role="navigation" class="days">
            <NuxtLink
                v-for="(day, index) in cloud.days" :key="`day${index}`" :style="{
                    'backdrop-filter': index === parseInt(dayIndex) ? 'brightness(0.8)' : undefined,
                    'border-top': isToday(day) ? '2px solid #0000ff99' : undefined
                }" :to="(dayIndex == index.toString() && !router.currentRoute.value.params.event) ? undefined : {
                    name: 'schedule-day',
                    params: { day: index.toString() },
                    query: $route.query,
                }">
                <template v-if="!day.name && !cloud.resolvedPermissions.editSchedule">{{ index }}</template>
                <EditableField v-if="index == parseInt(dayIndex)" :document="`schedule/${day.id}`" property="name">
                    <template #default="props">{{ props.value }}</template>
                    <template #editable="props">
                        <span
                            contenteditable class="editable" @focus="permitSwipe = false"
                            @blur="e => { props.sendValue((e.target as HTMLSpanElement).innerText); permitSwipe = true }"
                            v-text="props.value" />
                    </template>
                </EditableField>
                <template v-else>
                    {{ day.name ?? index }}
                </template>
            </NuxtLink>
        </nav>
        <ProgressBar :class="{ daysLoading: true, visible: cloud.scheduleLoading }" />
        <div
            ref="drag" :style="{
                transition: gestureTransPending || moving ? 'none' : 'transform .2s ease',
                transform: `translateX(${translateX}px)`,
                position: 'relative',
                'min-height': '75vh',
            }">
            <div style="width:100vw">
                <NuxtPage
                    :transition="!gestureTransPending && settings.transitions ? { name: currentTransition, duration: { enter: 200, leave: 100 }, appear: true, onAfterLeave: onTransitionAfterLeave, onAfterEnter: onTransitionAfterEnter, onBeforeLeave: onTransitionBeforeLeave } : undefined" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useDrag, type Vector2 } from '@vueuse/gesture'
import { useCloudStore } from '@/stores/cloud'
import { useSettings } from '~/stores/settings'
import type { ScheduleDay } from '~/types/cloud'

const cloud = useCloudStore()
const router = useRouter()
const settings = useSettings()
const lastDay = usePersistentRef('lastDay', '0')// workaround for nuxt not remembering nested page on reload
const dayIndex = computed(() => router.currentRoute.value.params.day as string ?? lastDay.value)

watch(dayIndex, (value) => {
    if (typeof value !== 'undefined') {
        lastDay.value = value
    }
})

function todayOr0(newCloud: typeof cloud) {
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
    router.replace({
        path: `/schedule/${index}`,
        query: router.currentRoute.value.query,
    })
}
//
// Automatic redirect when no day is selected
//
if (import.meta.browser) {
    watch(cloud, (newCloud) => {
        if (typeof router.currentRoute.value.params.day === 'undefined' && newCloud.scheduleLoading === false) {
            setTimeout(() => todayOr0(newCloud), 0)// timeout 0 for consistency with nuxt layout setup
        }
    }, { immediate: true })
}

const currentTransition = ref('slide-left')
onBeforeRouteUpdate((to, from) => {// guard slide direction and go to today when no day is selected
    const toDay = parseInt(to.params.day as string)
    const fromDay = parseInt(from.params.day as string)
    if (isNaN(toDay)) {
        todayOr0(cloud)
        return
    }
    else if (!isNaN(fromDay)) {
        if (toDay < fromDay) {
            currentTransition.value = 'slide-right'
            return
        }
        const toEvent = parseInt(to.params.event as string)
        const fromEvent = parseInt(from.params.event as string)
        if (isNaN(toEvent)) {
            drag.value!.addEventListener('transitionend', transEnd)
        }
        else {
            drag.value!.removeEventListener('transitionend', transEnd)
            returning.value = false
            if (!isNaN(fromEvent) && toEvent < fromEvent) {
                currentTransition.value = 'slide-right'
                return
            }
        }
    }

    returning.value = false
    currentTransition.value = 'slide-left'
})
const movingOrTransitioning = inject('transitioning', ref(false))
const permitSwipe = ref(true)
provide('permitSwipe', permitSwipe)
const gestureTransPending = ref(false)
const moving = ref(false)
const translateX = ref(0)

function onTransitionAfterLeave() {
    gestureTransPending.value = false
    translateX.value = 0
}

function onTransitionAfterEnter() {
    movingOrTransitioning.value = false
}

function onTransitionBeforeLeave() {
    movingOrTransitioning.value = true
}

//
// Swipe Navigation
//
const drag = useTemplateRef('drag')
const returning = ref(false)
function transEnd(e: TransitionEvent) {
    if ((drag.value!.contains(e.target as HTMLElement) || e.target == drag.value) && e.propertyName === 'transform') {
        setTimeout(() => returning.value = false, 100)
    }
}
onMounted(() => {
    drag.value?.addEventListener('transitionend', transEnd)
})
provide<ComputedRef<boolean>>('inMotion', computed(() => moving.value || returning.value))
onBeforeUnmount(() => moving.value = false)

if (settings.gestures) {
    function reset(noClick = true) {
        moving.value = false
        translateX.value = 0
        controller.reset()
        if (noClick) {
            returning.value = true
            setTimeout(() => {
                returning.value = false
            }, 1000)
        }
    }
    async function go(dir: number, url: string) {
        translateX.value = dir * window.innerWidth
        const p = router.push(url)// first event item on next schedule part (e.g. day)
        translateX.value = -translateX.value
        await p
        gestureTransPending.value = false
        reset(false)
    }
    const controller = useDrag(async ({ movement: [x], dragging, swipe }: { movement: number[], dragging: boolean, swipe: Vector2 }) => {
        // x positive when to left
        if (gestureTransPending.value || !permitSwipe.value) {
            return
        }
        const intDay = parseInt(dayIndex.value)
        const lastDayIndex = cloud.days!.length - 1
        const cantGoLeftDay = (x > 30 && intDay === 0)
        const cantGoRightDay = (x < -30 && intDay === lastDayIndex)
        const eventIndex = parseInt(router.currentRoute.value.params.event as string)
        const lastEventIndex = cloud.days![intDay].program.length - 1

        if (swipe[0] !== 0) {
            gestureTransPending.value = true

            if (isNaN(eventIndex)) {
                if (!cantGoLeftDay && !cantGoRightDay) {
                    // move to the next schedule part
                    await go(swipe[0], `/schedule/${intDay - swipe[0]}`)
                    return
                } else {
                    gestureTransPending.value = false
                    reset(false)
                    return
                }
            } else {
                // on event item detail page
                // move to the next or prev event item
                if (x > 0 && eventIndex === 0 && !cantGoLeftDay) {
                    await go(swipe[0], `/schedule/${intDay - 1}/${(cloud.days![intDay - 1].program.length - 1 || 0)}`)// last event on the previous schedule par)
                    return
                } else if (x < 0 && eventIndex === lastEventIndex && !cantGoRightDay) {
                    await go(swipe[0], `/schedule/${intDay + 1}/0`)
                    return
                } else if ((swipe[0] > 0 && eventIndex > 0) || swipe[0] < 0 && eventIndex < lastEventIndex) {
                    // move to next or prev day
                    await go(swipe[0], `/schedule/${intDay}/${eventIndex - swipe[0]}`)
                    return
                } else {
                    gestureTransPending.value = false
                    reset(false)
                    return
                }
            }
        } else if (!dragging) {
            if (Math.abs(x) > 5) {
                reset()
            }
            return
        } else {
            if (isNaN(eventIndex)) {
                if (cantGoLeftDay || cantGoRightDay) {
                    return
                }
            } else if ((x > 30 && eventIndex === 0 && intDay === 0) || (x < -30 && intDay === lastDayIndex && eventIndex === lastEventIndex)) {
                // on event item detail page
                return
            }
        }

        if (Math.abs(x) > 3) {
            moving.value = true
            movingOrTransitioning.value = true
            translateX.value = x
        }
    }, {
        domTarget: drag,
        filterTaps: true,
        eventOptions: { passive: true },
        axis: 'x',
        swipeVelocity: 0.2,
        swipeDuration: 400,
        threshold: 10,
    })
    watch(permitSwipe, (permit, was) => {
        if (permit && !was) {
            controller.bind()
        } else {
            controller.clean()
        }
    })
}

</script>

<style lang="scss">
@use "@/assets/styles/constants" as c;

nav.days {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1;

    border-bottom: 1px solid rgba(c.$link-background, 0.1);
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
</style>
