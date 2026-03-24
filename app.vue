<template>
    <NuxtPwaAssets />
    <LazyClientOnly>

        <Head>
            <meta
                name="theme-color"
                :media="colorModeStore == 'auto' ? '(prefers-color-scheme: light)' : undefined"
                :content="colorModeState == 'dark' ? '#000000' : $config.public.themeColor">
            <meta
                name="theme-color"
                :media="colorModeStore == 'auto' ? '(prefers-color-scheme: dark)' : undefined"
                content="#000000">
            <meta name="color-scheme" :content="colorModeState == 'dark' ? 'dark light' : 'light dark'" >
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
const {store: colorModeStore, state: colorModeState} = useColorMode()
</script>