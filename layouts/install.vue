<template>
    <main>

        <Head>
            <Title>{{ config.public.title }}</Title>
        </Head>
        <NuxtPage :transition="{ name: currentTransition, duration: { enter: 200, leave: 100 }, appear: true }" />
        <nav class="installNav">
            <ClientOnly>
                <NuxtLink
                    :to="{
                        path: partIndex > 0 ? `/install/${partIndex - 1}` : route.query.to?.toString() || '/schedule/',
                        query: {
                            ...$route.query,
                            from: partIndex.toString(),
                            install: partIndex > 0 ? $route.query.install : undefined,
                        }
                    }" @click="currentTransition = 'slide-right'; partIndex == 0 ? settings.installStep = 1 : null">
                    <Icon :name="partIndex > 0 ? 'material-symbols:arrow-circle-left-outline' : 'mdi:trending-up'" size="2rem" />
                    {{ partIndex > 0 ? 'Předchozí' :
                        'Přeskočit instalaci' }}
                </NuxtLink>
                <NuxtLink
                    v-if="canGoNext" :to="{
                        path: `/install/${partIndex + 1}`,
                        query: {
                            ...$route.query,
                            from: undefined,
                        }
                    }" @click="currentTransition = 'slide-left'; onNextButtonClick()">
                    <Icon name="material-symbols:arrow-circle-right-outline" size="2rem" />
                    {{ next }}
                </NuxtLink>
                <NuxtLink v-else :to="route.query.to?.toString() || '/schedule'" @click="settings.installStep = partIndex + 1">
                    <Icon name="mdi:trending-up" size="2rem" />
                    Začít
                </NuxtLink>
            </ClientOnly>
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
const pathParts = computed(() => router.currentRoute.value.path.split('/'))
const lastPart = computed(() => pathParts.value[pathParts.value.length - 1])
const partIndex = computed(() => parseInt(lastPart.value))
const canGoNext = computed(() => partIndex.value < config.public.installStepCount - 1)
const defaultNext = 'Další'
const next = ref(defaultNext)
const currentTransition = ref('slide-left')

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
            if (from < partIndex.value) {
                onNextButtonClick()
            } else {
                next.value = defaultNext
            }
            router.replace({
                path: `/install/${Math.max(partIndex.value - 1, 0)}`,
                query: {
                    ...route.value.query,
                    from: partIndex.value,
                },
            })
        } else {
            onNextButtonClick()
            if (canGoNext.value) {
                router.replace({
                    path: `/install/${partIndex.value + 1}`,
                    query: {
                        ...route.value.query,
                        from: undefined,
                    },
                })
            } else {
                router.replace(route.value.query.to?.toString() || '/schedule')
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
