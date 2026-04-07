<template>
    <NuxtPwaAssets />
    <LazyClientOnly>

        <Head>
            <meta name="theme-color" :content="$config.public.themeColor" media="(prefers-color-scheme: light)">
            <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
            <meta name="color-scheme" :content="colorModeState == 'dark' ? 'dark' : 'light'" >
            <meta name="apple-mobile-web-app-status-bar-style" :content="colorModeState == 'dark' ? 'black' : 'default'" >
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