<template>
    <div>
        <nav role="navigation" class="days">
            <NuxtLink
                v-for="(day, index) in cloudStore.scheduleParts"
                :key="day?.name ?? `day${index}`"
                :style="{
                    'backdrop-filter': index === parseInt(schedulePartIndex) ? 'brightness(0.8)' : undefined,
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
                <NuxtPage :transition="{name: currentTransition, duration: {enter: 200, leave: 100}, appear: true, onAfterLeave: onTrainsitionAfterLeave, onAfterEnter: onTransitionAfterEnter, onBeforeLeave: onTrainsitionBeforeLeave}" />
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

const currentTransition = ref('slide-left')
const movingOrTrainsitioning = inject<Ref<boolean>>('trainsitioning') ?? ref(false)
const transitioning = ref(false)
const moving = ref(false)
const translateX = ref(0)

function onTrainsitionAfterLeave () {
    transitioning.value = false
    translateX.value = 0
}

function onTransitionAfterEnter() {
    movingOrTrainsitioning.value = false
}

function onTrainsitionBeforeLeave() {
    movingOrTrainsitioning.value = true
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
    movingOrTrainsitioning.value = true
    translateX.value = x
}

</script>

<style lang="scss">
@import "@/assets/styles/constants.scss";

main {
    padding-top: 4rem;
}

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
