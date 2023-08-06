<template>
    <main>
        <Head>
            <Title>{{ $config.public.title }}</Title>
        </Head>
        <slot />
        <nav class="installNav">
            <NuxtLink v-if="partIndex > 0" :to="`/install/${partIndex - 1}`">
                <IconCSS name="material-symbols:arrow-circle-left-outline" size="2rem" /> Předchozí
            </NuxtLink>
            <NuxtLink v-if="canGoNext" :to="`/install/${partIndex + 1}`" @click="onNextButtonClick">
                <IconCSS name="material-symbols:arrow-circle-right-outline" size="2rem" />
                Další
            </NuxtLink>
            <NuxtLink v-else to="/schedule" @click="settings.setInstallStep(partIndex + 1)">
                <IconCSS name="material-symbols:trending-up" size="2rem" />
                Začít
            </NuxtLink>
        </nav>
    </main>
</template>

<script setup lang="ts">
import { useSettings } from '@/stores/settings'

const settings = useSettings()
const router = useRouter()
const route = router.currentRoute
const config = useRuntimeConfig()
const pathParts = computed(() => route.value.path.split('/'))
const lastPart = computed(() => pathParts.value[pathParts.value.length - 1])
const partIndex = computed(() => parseInt(lastPart.value))
const canGoNext = computed(() => partIndex.value < config.public.installStepCount - 1)

const onNextButtonClickListeners = ref<Function[]>([])
function onNextButtonClick() {
    onNextButtonClickListeners.value.forEach(listener => listener())
    onNextButtonClickListeners.value = []// clear after changing the page
    settings.setInstallStep(partIndex.value + 1)
}

provide('onNextButtonClick', (listener: Function) => {
    onNextButtonClickListeners.value.push(listener)
})

const skipToNextCondition = ref<boolean>(false)

provide('skipToNextIf', (predicate: Ref<boolean>) => {
    skipToNextCondition.value = predicate.value
})

watch(skipToNextCondition, (value) => {
    onNextButtonClick()
    if (value && canGoNext.value) {
        router.replace(`/install/${partIndex.value + 1}`)
    } else {
        router.replace('/schedule')
    }
})



</script>

<style lang="scss">
.installNav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;

    a > span {
        margin-bottom: 3px;
    }
}
article {
    padding: 1rem;
}
</style>
