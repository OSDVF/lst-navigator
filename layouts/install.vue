<template>
    <main>

        <Head>
            <Title>{{ config.public.title }}</Title>
        </Head>
        <slot />
        <nav class="installNav">
            <LazyClientOnly>
                <NuxtLink v-if="partIndex > 0" :to="`/install/${partIndex - 1}?from=${partIndex}`">
                    <Icon name="material-symbols:arrow-circle-left-outline" size="2rem" /> Předchozí
                </NuxtLink>
                <NuxtLink v-if="canGoNext" :to="`/install/${partIndex + 1}`" @click="onNextButtonClick">
                    <Icon name="material-symbols:arrow-circle-right-outline" size="2rem" />
                    {{ next }}
                </NuxtLink>
                <NuxtLink v-else to="/schedule" @click="settings.installStep = partIndex + 1">
                    <Icon name="material-symbols:trending-up" size="2rem" />
                    Začít
                </NuxtLink>
                <ServerPlaceholder>
                    Počkejte na načtení aplikace...
                    <br>
                    <ProgressBar />
                </ServerPlaceholder>
            </LazyClientOnly>
        </nav>
    </main>
</template>

<script setup lang="ts">
import { useSettings } from '@/stores/settings'
import type { WatchHandle } from 'vue'

const settings = useSettings()
const router = useRouter()
const route = router.currentRoute
const config = useRuntimeConfig()
const defaultNext = 'Další'
const next = ref(defaultNext)
const pathParts = computed(() => route.value.path.split('/'))
const lastPart = computed(() => pathParts.value[pathParts.value.length - 1])
const partIndex = computed(() => parseInt(lastPart.value))
const canGoNext = computed(() => partIndex.value < config.public.installStepCount - 1)

const onNextButtonClickListeners = ref<(() => void)[]>([])
function onNextButtonClick() {
    onNextButtonClickListeners.value.forEach(listener => listener())
    onNextButtonClickListeners.value = []// clear after changing the page
    settings.installStep = partIndex.value + 1
    next.value = defaultNext
}

provide('onNextButtonClick', (listener: () => void) => {
    onNextButtonClickListeners.value.push(listener)
})

provide('nextText', next)
const stopWatching = ref<WatchHandle>()
watch(stopWatching, (_, prevVal) => {
    prevVal?.()//stop watching the previous one
})

provide('skipToNextIf', (predicate: Ref<boolean>) => {
    function skip() {
        const from = parseInt(route.value.query.from as string)
        if (!isNaN(from)) {
            router.replace(`/install/${Math.max(partIndex.value - 1, 0)}?from=${partIndex.value}`)
        } else {
            onNextButtonClick()
            if (canGoNext.value) {
                router.replace(`/install/${partIndex.value + 1}`)
            } else {
                router.replace('/schedule')
            }
        }
    }
    if (predicate.value) {
        skip()
    } else {
        stopWatching.value = watch(predicate, (value) => {
            if (value) {
                skip()
                stopWatching.value?.()
            }
        })
    }

})


</script>

<style lang="scss">
.installNav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;

    a>span {
        margin-bottom: 3px;
    }
}

article {
    padding: 1rem;
}
</style>
