<template>
    <NuxtPwaAssets />
    <LazyClientOnly>

        <Head>
            <meta
                name="theme-color"
                :content="colorModeState == 'dark' ? '#000000' : $config.public.themeColor">
            <meta name="color-scheme" :content="colorModeState == 'dark' ? 'dark' : 'light'" >
        </Head>
    </LazyClientOnly>
    <NuxtLayout :key="$route.path" :class="settings.blur.value ? 'transp' : ''" fallback="default">
        <NuxtPage />
    </NuxtLayout>
    <LazyClientOnly>
        <LazyHydratedCheck />
    </LazyClientOnly>
</template>

<script setup lang="ts">
const settings = useSettings()
const {state: colorModeState} = useColorMode()
</script>