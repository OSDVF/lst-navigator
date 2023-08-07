<template>
    <div>
        <nav role="navigation" class="days">
            <NuxtLink
                v-for="(day, index) in cloudStore.scheduleParts" :key="day?.name ?? `day${index}`" :style="{
                    background: day?.color
                }"
                :to="`/schedule/${index}`"
            >
                {{ day?.name ?? index }}
            </NuxtLink>
        </nav>
        <ProgressBar :class="{ daysLoading: true, visible: cloudStore.scheduleLoading }" />
        <NuxtPage />
    </div>
</template>

<script setup lang="ts">
import { useCloudStore } from '@/stores/cloud'

const cloudStore = useCloudStore()
const router = useRouter()
if (typeof router.currentRoute.value.params.schedulePart === 'undefined') {
    router.replace('/schedule/0')
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
</style>
